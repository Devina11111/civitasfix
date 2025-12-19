const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Notifications endpoint is working',
        timestamp: new Date().toISOString(),
        endpoints: {
            list: 'GET /api/notifications',
            unreadCount: 'GET /api/notifications/unread-count',
            markAsRead: 'PATCH /api/notifications/:id/read',
            markAllRead: 'POST /api/notifications/read-all',
            delete: 'DELETE /api/notifications/:id'
        }
    });
});

// Get all notifications for current user
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const skip = (page - 1) * parseInt(limit);

        let where = { userId: req.user.id };
        
        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: parseInt(limit),
                include: {
                    report: {
                        select: {
                            id: true,
                            title: true,
                            status: true
                        }
                    }
                }
            }),
            prisma.notification.count({ where })
        ]);

        const unreadCount = await prisma.notification.count({
            where: { 
                userId: req.user.id,
                isRead: false 
            }
        });

        res.json({
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Get unread notifications count
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const count = await prisma.notification.count({
            where: {
                userId: req.user.id,
                isRead: false
            }
        });

        res.json({
            success: true,
            count,
            message: count > 0 ? `Anda memiliki ${count} notifikasi belum dibaca` : 'Tidak ada notifikasi baru'
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        if (isNaN(notificationId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID notifikasi tidak valid' 
            });
        }

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notifikasi tidak ditemukan' 
            });
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });

        // Get updated unread count
        const unreadCount = await prisma.notification.count({
            where: { 
                userId: req.user.id,
                isRead: false 
            }
        });

        res.json({
            success: true,
            message: 'Notifikasi ditandai sebagai dibaca',
            unreadCount
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Mark all notifications as read
router.post('/read-all', authenticate, async (req, res) => {
    try {
        const updated = await prisma.notification.updateMany({
            where: { 
                userId: req.user.id,
                isRead: false
            },
            data: { isRead: true }
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId: req.user.id,
                isRead: false
            }
        });

        res.json({
            success: true,
            message: `Semua notifikasi (${updated.count}) ditandai sebagai dibaca`,
            unreadCount
        });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        if (isNaN(notificationId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID notifikasi tidak valid' 
            });
        }

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notifikasi tidak ditemukan' 
            });
        }

        await prisma.notification.delete({
            where: { id: notificationId }
        });

        // Get updated unread count
        const unreadCount = await prisma.notification.count({
            where: { 
                userId: req.user.id,
                isRead: false 
            }
        });

        res.json({
            success: true,
            message: 'Notifikasi berhasil dihapus',
            unreadCount
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Create notification (for internal use - e.g., when report status changes)
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, message, type = 'INFO', link, reportId } = req.body;

        if (!title || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Judul dan pesan harus diisi' 
            });
        }

        // Check if user is lecturer or admin to create notifications for others
        if (req.user.role !== 'LECTURER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ 
                success: false, 
                message: 'Hanya dosen atau admin yang dapat membuat notifikasi' 
            });
        }

        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                type,
                link,
                reportId: reportId ? parseInt(reportId) : null,
                userId: req.user.id
            }
        });

        res.status(201).json({
            success: true,
            message: 'Notifikasi berhasil dibuat',
            notification
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Get notification by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        if (isNaN(notificationId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID notifikasi tidak valid' 
            });
        }

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: req.user.id
            },
            include: {
                report: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        location: true
                    }
                }
            }
        });

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notifikasi tidak ditemukan' 
            });
        }

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Get notification by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

module.exports = router;
