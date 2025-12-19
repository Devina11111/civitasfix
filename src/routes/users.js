const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Test endpoint
router.get('/test', authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'Users endpoint is working',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                nim: true,
                nidn: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User tidak ditemukan' 
            });
        }

        // Get report statistics
        let statistics = { totalReports: 0, activeReports: 0, completedReports: 0, pendingReports: 0 };
        const reportWhere = req.user.role === 'STUDENT' ? { userId: req.user.id } : {};

        if (req.user.role === 'STUDENT' || req.user.role === 'LECTURER' || req.user.role === 'ADMIN') {
            const [total, active, completed, pending] = await Promise.all([
                prisma.report.count({ where: reportWhere }),
                prisma.report.count({ 
                    where: { 
                        ...reportWhere,
                        status: { in: ['CONFIRMED', 'IN_PROGRESS'] }
                    }
                }),
                prisma.report.count({ 
                    where: { 
                        ...reportWhere,
                        status: 'COMPLETED'
                    }
                }),
                prisma.report.count({ 
                    where: { 
                        ...reportWhere,
                        status: 'PENDING'
                    }
                })
            ]);

            statistics = { totalReports: total, activeReports: active, completedReports: completed, pendingReports: pending };
        }

        res.json({ 
            success: true, 
            user: {
                ...user,
                statistics
            }
        });
    } catch (error) {
        console.error('[USERS] GET /profile Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data profil' 
        });
    }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { name, nim, nidn } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nama harus diisi'
            });
        }

        const updateData = { name: name.trim() };

        // Validasi berdasarkan role
        if (req.user.role === 'STUDENT' && nim && nim.trim() !== '') {
            if (nim.trim().length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'NIM minimal 8 karakter'
                });
            }
            updateData.nim = nim.trim();
        }

        if (req.user.role === 'LECTURER' && nidn && nidn.trim() !== '') {
            if (nidn.trim().length < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'NIDN minimal 10 karakter'
                });
            }
            updateData.nidn = nidn.trim();
        }

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                nim: true,
                nidn: true,
                isVerified: true,
                updatedAt: true
            }
        });

        res.json({
            success: true,
            message: 'Profil berhasil diperbarui',
            user
        });
    } catch (error) {
        console.error('[USERS] PUT /profile Error:', error);
        
        if (error.code === 'P2025') {
            return res.status(404).json({ 
                success: false, 
                message: 'User tidak ditemukan' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Gagal memperbarui profil' 
        });
    }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password saat ini dan password baru harus diisi' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password baru minimal 6 karakter' 
            });
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User tidak ditemukan' 
            });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password saat ini salah' 
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword, updatedAt: new Date() }
        });

        res.json({
            success: true,
            message: 'Password berhasil diubah'
        });
    } catch (error) {
        console.error('[USERS] POST /change-password Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengubah password' 
        });
    }
});

// Get all lecturers
router.get('/lecturers', authenticate, async (req, res) => {
    try {
        const lecturers = await prisma.user.findMany({
            where: { 
                role: 'LECTURER',
                isVerified: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                nidn: true,
                createdAt: true
            },
            orderBy: { name: 'asc' }
        });

        res.json({ 
            success: true, 
            lecturers,
            count: lecturers.length
        });
    } catch (error) {
        console.error('[USERS] GET /lecturers Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data dosen' 
        });
    }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID user tidak valid'
            });
        }

        //
