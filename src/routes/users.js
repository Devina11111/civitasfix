const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Users endpoint is working',
        timestamp: new Date().toISOString(),
        endpoints: {
            profile: 'GET /api/users/profile',
            updateProfile: 'PUT /api/users/profile',
            changePassword: 'POST /api/users/change-password',
            lecturers: 'GET /api/users/lecturers'
        }
    });
});

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        console.log('Getting profile for user:', req.user.id);
        
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

        // Get report statistics based on user role
        let statistics = {
            totalReports: 0,
            activeReports: 0,
            completedReports: 0,
            pendingReports: 0
        };

        if (req.user.role === 'STUDENT') {
            // For students, only count their own reports
            statistics.totalReports = await prisma.report.count({
                where: { userId: req.user.id }
            });

            statistics.activeReports = await prisma.report.count({
                where: { 
                    userId: req.user.id,
                    status: { in: ['CONFIRMED', 'IN_PROGRESS'] }
                }
            });

            statistics.completedReports = await prisma.report.count({
                where: { 
                    userId: req.user.id,
                    status: 'COMPLETED'
                }
            });

            statistics.pendingReports = await prisma.report.count({
                where: { 
                    userId: req.user.id,
                    status: 'PENDING'
                }
            });
        } else if (req.user.role === 'LECTURER') {
            // For lecturers, count all reports
            statistics.totalReports = await prisma.report.count();
            
            statistics.activeReports = await prisma.report.count({
                where: { 
                    status: { in: ['CONFIRMED', 'IN_PROGRESS'] }
                }
            });

            statistics.completedReports = await prisma.report.count({
                where: { 
                    status: 'COMPLETED'
                }
            });

            statistics.pendingReports = await prisma.report.count({
                where: { 
                    status: 'PENDING'
                }
            });
        }

        res.json({ 
            success: true, 
            user: {
                ...user,
                statistics
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
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

        // Validate and update based on role
        if (req.user.role === 'STUDENT') {
            if (nim && nim.trim() !== '') {
                if (nim.trim().length < 8) {
                    return res.status(400).json({
                        success: false,
                        message: 'NPM minimal 8 karakter'
                    });
                }
                updateData.nim = nim.trim();
            }
        }

        if (req.user.role === 'LECTURER') {
            if (nidn && nidn.trim() !== '') {
                if (nidn.trim().length < 10) {
                    return res.status(400).json({
                        success: false,
                        message: 'NIP minimal 10 karakter'
                    });
                }
                updateData.nidn = nidn.trim();
            }
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
        console.error('Update profile error:', error);
        
        if (error.code === 'P2025') {
            return res.status(404).json({ 
                success: false, 
                message: 'User tidak ditemukan' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
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

        // Check if new password is same as old password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password baru tidak boleh sama dengan password lama' 
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({
            success: true,
            message: 'Password berhasil diubah'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Get all lecturers (for students to see)
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
        console.error('Get lecturers error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Get user by ID (for internal use)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (req.user.role !== 'LECTURER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki izin untuk mengakses data user'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                nim: true,
                nidn: true,
                isVerified: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User tidak ditemukan' 
            });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

module.exports = router;
