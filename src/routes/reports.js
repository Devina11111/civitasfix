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

// Helper function untuk URL gambar
const getImageUrl = (filename) => {
    if (!filename) return null;
    const baseUrl = process.env.API_URL || 'https://civitasfix-backend.up.railway.app';
    return `${baseUrl}/uploads/${filename}`;
};

// Logging middleware
router.use((req, res, next) => {
    console.log(`[REPORTS] ${req.method} ${req.path} - User: ${req.user?.email || 'Unauthenticated'}`);
    next();
});

// GET report by ID - OPTIMIZED
router.get('/:id', authenticate, async (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        
        if (isNaN(reportId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID laporan tidak valid' 
            });
        }

        console.log(`[REPORTS] Fetching report ${reportId} for user ${req.user.email}`);

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
            console.log(`[REPORTS] Report ${reportId} not found`);
            return res.status(404).json({ 
                success: false, 
                message: 'Laporan tidak ditemukan' 
            });
        }

        // Check permissions - hanya student yang bisa melihat laporan mereka sendiri
        if (req.user.role === 'STUDENT' && report.userId !== req.user.id) {
            console.log(`[REPORTS] Access denied: Student ${req.user.id} trying to access report ${reportId} owned by ${report.userId}`);
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak' 
            });
        }

        // Format response dengan URL gambar yang benar
        const formattedReport = {
            ...report,
            imageUrl: getImageUrl(report.imageUrl),
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString()
        };

        console.log(`[REPORTS] Successfully fetched report ${reportId}`);
        
        res.json({ 
            success: true, 
            report: formattedReport
        });
    } catch (error) {
        console.error(`[REPORTS] Error fetching report ${req.params.id}:`, error);
        
        if (error.code === 'P2025') {
            return res.status(404).json({ 
                success: false, 
                message: 'Laporan tidak ditemukan' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET all reports dengan pagination dan filter - OPTIMIZED
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, category } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let where = {};

        if (req.user.role === 'STUDENT') {
            where.userId = req.user.id;
        }

        if (status && status !== '') where.status = status;
        if (category && category !== '') where.category = category;

        console.log(`[REPORTS] Fetching reports with filters:`, where);

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

        // Format reports dengan URL gambar yang benar
        const formattedReports = reports.map(report => ({
            ...report,
            imageUrl: getImageUrl(report.imageUrl),
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString()
        }));

        res.json({
            success: true,
            reports: formattedReports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[REPORTS] Error fetching reports:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET latest reports for dashboard - OPTIMIZED
router.get('/dashboard/latest', authenticate, async (req, res) => {
    try {
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

        // Format reports dengan URL gambar yang benar
        const formattedReports = reports.map(report => ({
            ...report,
            imageUrl: getImageUrl(report.imageUrl),
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString()
        }));

        res.json({
            success: true,
            reports: formattedReports
        });
    } catch (error) {
        console.error('[REPORTS] Error fetching latest reports:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// CREATE report dengan upload gambar
router.post('/', authenticate, upload.single('image'), async (req, res) => {
    try {
        console.log('[REPORTS] Creating new report by user:', req.user.email);
        
        const { title, description, location, category, priority } = req.body;

        // Validasi input
        if (!title || !description || !location) {
            return res.status(400).json({ 
                success: false, 
                message: 'Judul, deskripsi, dan lokasi harus diisi' 
            });
        }

        // Hanya student yang bisa membuat laporan
        if (req.user.role !== 'STUDENT') {
            return res.status(403).json({ 
                success: false, 
                message: 'Hanya mahasiswa yang dapat membuat laporan' 
            });
        }

        let imageFilename = null;
        if (req.file) {
            imageFilename = req.file.filename;
            console.log('[REPORTS] Image uploaded:', imageFilename);
        }

        const report = await prisma.report.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                category: category || 'OTHER',
                priority: priority || 'MEDIUM',
                imageUrl: imageFilename,
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

        // Format response dengan URL gambar yang benar
        const formattedReport = {
            ...report,
            imageUrl: getImageUrl(report.imageUrl),
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString()
        };

        console.log('[REPORTS] Report created successfully:', report.id);

        res.status(201).json({
            success: true,
            message: 'Laporan berhasil dibuat',
            report: formattedReport
        });
    } catch (error) {
        console.error('[REPORTS] Error creating report:', error);
        
        // Hapus file jika ada error
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('[REPORTS] Error deleting file:', err);
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// UPDATE report status (Lecturer/Admin only)
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const reportId = parseInt(req.params.id);

        // Validasi role
        if (!['LECTURER', 'ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Hanya dosen atau admin yang dapat mengubah status' 
            });
        }

        // Validasi input
        if (!['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status tidak valid'
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
            data: { 
                status,
                updatedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Status laporan berhasil diperbarui',
            report: updatedReport
        });
    } catch (error) {
        console.error('[REPORTS] Error updating report status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
