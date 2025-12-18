const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

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

        res.json({ success: true, user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { name, nim, nidn } = req.body;

        const updateData = { name };

        if (req.user.role === 'STUDENT' && nim) {
            updateData.nim = nim;
        }

        if (req.user.role === 'LECTURER' && nidn) {
            updateData.nidn = nidn;
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
                isVerified: true
            }
        });

        res.json({
            success: true,
            message: 'Profil berhasil diperbarui',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Password saat ini dan password baru harus diisi' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter' });
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Password saat ini salah' });
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
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get all lecturers (for students to see)
router.get('/lecturers', authenticate, async (req, res) => {
    try {
        const lecturers = await prisma.user.findMany({
            where: { role: 'LECTURER' },
            select: {
                id: true,
                name: true,
                email: true,
                nidn: true,
                createdAt: true
            },
            orderBy: { name: 'asc' }
        });

        res.json({ success: true, lecturers });
    } catch (error) {
        console.error('Get lecturers error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;