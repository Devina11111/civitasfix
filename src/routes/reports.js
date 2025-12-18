const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all reports (with pagination and filters)
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, category } = req.query;
        const skip = (page - 1) * limit;

        let where = {};

        // Filter by user role
        if (req.user.role === 'STUDENT') {
            where.userId = req.user.id;
        }

        // Additional filters
        if (status) where.status = status;
        if (category) where.category = category;

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        }
                    },
                    repairs: {
                        include: {
                            lecturer: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: parseInt(limit)
            }),
            prisma.report.count({ where })
        ]);

        res.json({
            success: true,
            reports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get report by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const report = await prisma.report.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                repairs: {
                    include: {
                        lecturer: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
        }

        // Check permissions
        if (req.user.role === 'STUDENT' && report.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        res.json({ success: true, report });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create report (Student only)
router.post('/', authenticate, authorize('STUDENT'), async (req, res) => {
    try {
        const { title, description, location, category, priority, imageUrl } = req.body;

        if (!title || !description || !location) {
            return res.status(400).json({ success: false, message: 'Judul, deskripsi, dan lokasi harus diisi' });
        }

        const report = await prisma.report.create({
            data: {
                title,
                description,
                location,
                category: category || 'OTHER',
                priority: priority || 'MEDIUM',
                imageUrl,
                userId: req.user.id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // Buat notifikasi untuk user
        await prisma.notification.create({
            data: {
                userId: req.user.id,
                title: 'Laporan Dibuat',
                message: `Laporan "${title}" berhasil dibuat dan sedang menunggu konfirmasi.`,
                type: 'SUCCESS',
                link: `/reports/${report.id}`
            }
        });

        // Buat notifikasi untuk dosen (jika ada)
        if (req.user.role === 'LECTURER' || req.user.role === 'ADMIN') {
            const lecturers = await prisma.user.findMany({
                where: { role: 'LECTURER' },
                select: { id: true }
            });

            for (const lecturer of lecturers) {
                await prisma.notification.create({
                    data: {
                        userId: lecturer.id,
                        title: 'Laporan Baru',
                        message: `Ada laporan baru: "${title}" di ${location}`,
                        type: 'INFO',
                        link: `/reports/${report.id}`
                    }
                });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Laporan berhasil dibuat',
            report
        });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update report status (Lecturer/Admin only)
router.patch('/:id/status', authenticate, authorize('LECTURER', 'ADMIN'), async (req, res) => {
    try {
        const { status, notes, estimatedCost } = req.body;
        const reportId = parseInt(req.params.id);

        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: {
                user: true
            }
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
        }

        // Update report status
        const updatedReport = await prisma.report.update({
            where: { id: reportId },
            data: { status }
        });

        // Create repair record for confirmed reports
        if (status === 'CONFIRMED') {
            await prisma.repair.create({
                data: {
                    reportId,
                    lecturerId: req.user.id,
                    notes,
                    estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
                    status: 'CONFIRMED'
                }
            });

            // Create notification for student
            await prisma.notification.create({
                data: {
                    userId: report.userId,
                    title: 'Laporan Dikonfirmasi',
                    message: `Laporan "${report.title}" telah dikonfirmasi oleh dosen dan akan segera ditangani.`,
                    type: 'SUCCESS',
                    reportId,
                    link: `/reports/${report.id}`
                }
            });
        }

        // Create notification for status change
        const statusMessages = {
            'CONFIRMED': 'dikonfirmasi',
            'IN_PROGRESS': 'sedang dalam proses',
            'COMPLETED': 'telah selesai',
            'REJECTED': 'ditolak'
        };

        if (statusMessages[status]) {
            await prisma.notification.create({
                data: {
                    userId: report.userId,
                    title: 'Status Laporan Diperbarui',
                    message: `Status laporan "${report.title}" ${statusMessages[status]}.`,
                    type: 'INFO',
                    reportId,
                    link: `/reports/${report.id}`
                }
            });
        }

        res.json({
            success: true,
            message: 'Status laporan berhasil diperbarui',
            report: updatedReport
        });
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update repair (Lecturer only)
router.patch('/:id/repair', authenticate, authorize('LECTURER', 'ADMIN'), async (req, res) => {
    try {
        const { status, notes, actualCost } = req.body;
        const reportId = parseInt(req.params.id);

        // Find existing repair
        const repair = await prisma.repair.findFirst({
            where: {
                reportId,
                lecturerId: req.user.id
            }
        });

        if (!repair) {
            return res.status(404).json({ success: false, message: 'Data perbaikan tidak ditemukan' });
        }

        const updateData = {
            status,
            notes,
            ...(actualCost && { actualCost: parseFloat(actualCost) })
        };

        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
            updateData.repairDate = new Date();

            // Update report status
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'COMPLETED' }
            });
        }

        const updatedRepair = await prisma.repair.update({
            where: { id: repair.id },
            data: updateData
        });

        // Get report for notification
        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: { user: true }
        });

        // Create notification for status changes
        if (['IN_PROGRESS', 'COMPLETED'].includes(status)) {
            const statusMessages = {
                'IN_PROGRESS': 'sedang dalam proses perbaikan',
                'COMPLETED': 'telah selesai diperbaiki'
            };

            await prisma.notification.create({
                data: {
                    userId: report.userId,
                    title: 'Status Perbaikan Diperbarui',
                    message: `Perbaikan untuk laporan "${report.title}" ${statusMessages[status]}.`,
                    type: 'INFO',
                    reportId,
                    link: `/reports/${report.id}`
                }
            });
        }

        res.json({
            success: true,
            message: 'Data perbaikan berhasil diperbarui',
            repair: updatedRepair
        });
    } catch (error) {
        console.error('Update repair error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get notifications for current user
router.get('/:id/notifications', authenticate, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const notifications = await prisma.notification.findMany({
            where: { 
                userId: req.user.id 
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit)
        });

        res.json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Mark notification as read
router.patch('/notifications/:id/read', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' });
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });

        res.json({
            success: true,
            message: 'Notifikasi ditandai sebagai dibaca'
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Mark all notifications as read
router.post('/notifications/read-all', authenticate, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { 
                userId: req.user.id,
                isRead: false
            },
            data: { isRead: true }
        });

        res.json({
            success: true,
            message: 'Semua notifikasi ditandai sebagai dibaca'
        });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
