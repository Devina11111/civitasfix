const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware untuk autentikasi
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak ditemukan' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'civitasfix-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token tidak valid' 
    });
  }
};

// Get all reports (with pagination and filters)
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, category } = req.query;
        const skip = (page - 1) * limit;

        let where = {};

        // Get user role
        const user = await prisma.user.findUnique({
          where: { id: req.userId }
        });

        if (user.role === 'STUDENT') {
            where.userId = req.userId;
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
                }
            }
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
        }

        // Get user role
        const user = await prisma.user.findUnique({
          where: { id: req.userId }
        });

        // Check permissions
        if (user.role === 'STUDENT' && report.userId !== req.userId) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        res.json({ success: true, report });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create report (Student only)
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, description, location, category, priority, imageUrl } = req.body;

        if (!title || !description || !location) {
            return res.status(400).json({ success: false, message: 'Judul, deskripsi, dan lokasi harus diisi' });
        }

        // Check user role
        const user = await prisma.user.findUnique({
          where: { id: req.userId }
        });

        if (user.role !== 'STUDENT') {
          return res.status(403).json({ success: false, message: 'Hanya mahasiswa yang dapat membuat laporan' });
        }

        const report = await prisma.report.create({
            data: {
                title,
                description,
                location,
                category: category || 'OTHER',
                priority: priority || 'MEDIUM',
                imageUrl,
                userId: req.userId
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
                userId: req.userId,
                title: 'Laporan Dibuat',
                message: `Laporan "${title}" berhasil dibuat dan sedang menunggu konfirmasi.`,
                type: 'SUCCESS',
                link: `/reports/${report.id}`
            }
        });

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
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const reportId = parseInt(req.params.id);

        // Check user role
        const user = await prisma.user.findUnique({
          where: { id: req.userId }
        });

        if (!['LECTURER', 'ADMIN'].includes(user.role)) {
          return res.status(403).json({ success: false, message: 'Hanya dosen atau admin yang dapat mengubah status' });
        }

        const report = await prisma.report.findUnique({
            where: { id: reportId }
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
        }

        // Update report status
        const updatedReport = await prisma.report.update({
            where: { id: reportId },
            data: { status }
        });

        // Create notification for student
        await prisma.notification.create({
            data: {
                userId: report.userId,
                title: 'Status Laporan Diperbarui',
                message: `Status laporan "${report.title}" diubah menjadi ${status}.`,
                type: 'INFO',
                reportId,
                link: `/reports/${report.id}`
            }
        });

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

// Get latest reports for dashboard
router.get('/dashboard/latest', authenticate, async (req, res) => {
    try {
        let where = {};

        // Check user role
        const user = await prisma.user.findUnique({
          where: { id: req.userId }
        });

        if (user.role === 'STUDENT') {
            where.userId = req.userId;
        }

        const reports = await prisma.report.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });

        res.json({ success: true, reports });
    } catch (error) {
        console.error('Get latest reports error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
