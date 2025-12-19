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
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'report-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan (jpeg, jpg, png, gif, webp)'), false);
        }
    }
});

// Fungsi untuk mendapatkan URL gambar yang benar - FIXED
const getImageUrl = (filename, req = null) => {
    if (!filename) return null;
    
    // Jika sudah URL lengkap
    if (filename.startsWith('http')) return filename;
    
    // Gunakan base URL dari environment atau dari request
    let baseUrl = process.env.API_BASE_URL || 'https://civitasfix-backend.up.railway.app';
    
    if (req) {
        baseUrl = `${req.protocol}://${req.get('host')}`;
    }
    
    // Jika filename sudah mengandung uploads/, sesuaikan
    if (filename.includes('uploads/')) {
        // Cek apakah sudah ada awalan /
        const cleanPath = filename.startsWith('/') ? filename : `/${filename}`;
        return `${baseUrl}${cleanPath}`;
    }
    
    // Default: tambahkan /uploads/
    return `${baseUrl}/uploads/${filename}`;
};

// GET all reports
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

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: parseInt(limit)
            }),
            prisma.report.count({ where })
        ]);

        const transformedReports = reports.map(report => ({
            ...report,
            imageUrl: getImageUrl(report.imageUrl, req)
        }));

        res.json({
            success: true,
            reports: transformedReports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[REPORTS] GET / Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// GET latest reports for dashboard
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
                    select: { id: true, name: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const transformedReports = reports.map(report => ({
            ...report,
            imageUrl: getImageUrl(report.imageUrl, req)
        }));

        res.json({
            success: true,
            reports: transformedReports
        });
    } catch (error) {
        console.error('[REPORTS] GET /dashboard/latest Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// GET single report
router.get('/:id', authenticate, async (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });

        if (!report) {
            return res.status(404).json({ 
                success: false, 
                message: 'Laporan tidak ditemukan' 
            });
        }

        if (req.user.role === 'STUDENT' && report.userId !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak' 
            });
        }

        res.json({ 
            success: true, 
            report: {
                ...report,
                imageUrl: getImageUrl(report.imageUrl, req)
            }
        });
    } catch (error) {
        console.error('[REPORTS] GET /:id Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// CREATE report
router.post('/', authenticate, upload.single('image'), async (req, res) => {
    try {
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

        let imageFilename = null;
        if (req.file) {
            imageFilename = req.file.filename;
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
                    select: { id: true, name: true, email: true }
                }
            }
        });

        // Buat notifikasi untuk admin/dosen tentang laporan baru
        const adminsLecturers = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'LECTURER'] }
            }
        });

        for (const user of adminsLecturers) {
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    title: 'Laporan Baru',
                    message: `Laporan baru dibuat oleh ${req.user.name}: ${title}`,
                    type: 'INFO',
                    link: `/reports/${report.id}`,
                    reportId: report.id
                }
            });
        }

        // Buat notifikasi untuk user yang membuat laporan
        await prisma.notification.create({
            data: {
                userId: req.user.id,
                title: 'Laporan Berhasil Dibuat',
                message: `Laporan Anda "${title}" berhasil dibuat dan sedang menunggu konfirmasi.`,
                type: 'SUCCESS',
                link: `/reports/${report.id}`,
                reportId: report.id
            }
        });

        res.status(201).json({
            success: true,
            message: 'Laporan berhasil dibuat',
            report: {
                ...report,
                imageUrl: getImageUrl(report.imageUrl, req)
            }
        });
    } catch (error) {
        console.error('[REPORTS] POST / Error:', error);
        
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('[REPORTS] Error deleting file:', err);
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Gagal membuat laporan' 
        });
    }
});

// UPDATE report status
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

        const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status tidak valid'
            });
        }

        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: {
                user: true
            }
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

        // Buat notifikasi untuk user yang melaporkan
        await prisma.notification.create({
            data: {
                userId: report.userId,
                title: 'Status Laporan Diperbarui',
                message: `Laporan Anda "${report.title}" telah diubah statusnya menjadi ${status}`,
                type: 'INFO',
                link: `/reports/${report.id}`,
                reportId: report.id
            }
        });

        res.json({
            success: true,
            message: 'Status laporan berhasil diperbarui',
            report: updatedReport
        });
    } catch (error) {
        console.error('[REPORTS] PATCH /:id/status Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal memperbarui status laporan' 
        });
    }
});

module.exports = router;
