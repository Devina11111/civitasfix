const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Setup multer untuk upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan'), false);
        }
    }
});

// GET all reports dengan pagination dan filter
router.get('/', authenticate, async (req, res) => {
    try {
        console.log('[REPORTS] GET / - User:', req.user.email);
        
        const { page = 1, limit = 10, status, category } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let where = {};

        if (req.user.role === 'STUDENT') {
            where.userId = req.user.id;
        }

        if (status && status !== '') where.status = status;
        if (category && category !== '') where.category = category;

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
                orderBy: { createdAt: 'desc' },
                skip: skip,
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
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[REPORTS] Error in GET /:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET latest reports for dashboard
router.get('/dashboard/latest', authenticate, async (req, res) => {
    try {
        console.log('[REPORTS] GET /dashboard/latest - User:', req.user.email);
        
        let where = {};

        if (req.user.role === 'STUDENT') {
            where.userId = req.user.id;
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
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        res.json({
            success: true,
            reports
        });
    } catch (error) {
        console.error('[REPORTS] Error in GET /dashboard/latest:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET report by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        console.log(`[REPORTS] GET /${reportId} - User:`, req.user.email);

        const report = await prisma.report.findUnique({
            where: { id: reportId },
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
            return res.status(404).json({ 
                success: false, 
                message: 'Laporan tidak ditemukan' 
            });
        }

        // Check permissions
        if (req.user.role === 'STUDENT' && report.userId !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak' 
            });
        }

        res.json({ 
            success: true, 
            report
        });
    } catch (error) {
        console.error('[REPORTS] Error in GET /:id:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// CREATE report dengan upload gambar
router.post('/', authenticate, upload.single('image'), async (req, res) => {
    try {
        console.log('[REPORTS] POST / - User:', req.user.email);
        
        const { title, description, location, category, priority } = req.body;

        if (!title || !description || !location) {
            return res.status(400).json({ 
                success: false, 
                message: 'Judul, deskripsi, dan lokasi harus diisi' 
            });
        }

        if (req.user.role !== 'STUDENT') {
            return res.status(403).json({ 
                success: false, 
                message: 'Hanya mahasiswa yang dapat membuat laporan' 
            });
        }

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const report = await prisma.report.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
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

        console.log('[REPORTS] Report created successfully:', report.id);

        res.status(201).json({
            success: true,
            message: 'Laporan berhasil dibuat',
            report
        });
    } catch (error) {
        console.error('[REPORTS] Error in POST /:', error);
        
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('[REPORTS] Error deleting file:', err);
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// UPDATE report status (Lecturer/Admin only)
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const reportId = parseInt(req.params.id);

        if (!['LECTURER', 'ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Hanya dosen atau admin yang dapat mengubah status' 
            });
        }

        const report = await prisma.report.findUnique({
            where: { id: reportId }
        });

        if (!report) {
            return res.status(404).json({ 
                success: false, 
                message: 'Laporan tidak ditemukan' 
            });
        }

        const updatedReport = await prisma.report.update({
            where: { id: reportId },
            data: { status }
        });

        res.json({
            success: true,
            message: 'Status laporan berhasil diperbarui',
            report: updatedReport
        });
    } catch (error) {
        console.error('[REPORTS] Update report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Endpoint repair di-nonaktifkan sementara
router.patch('/:id/repair', authenticate, async (req, res) => {
    return res.status(501).json({
        success: false,
        message: 'Fitur perbaikan sedang dalam pengembangan'
    });
});

module.exports = router;
