const express = require('express');
const { PrismaClient } = require('@prisma/client');
const {
    hashPassword,
    comparePassword,
    generateToken,
    generateVerificationCode
} = require('../utils/auth');
const { sendVerificationEmail } = require('../utils/email');
const validator = require('validator');

const router = express.Router();
const prisma = new PrismaClient();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role, nim, nidn } = req.body;

        // Validation
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Email tidak valid' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
        }

        // Role validation
        if (role === 'STUDENT' && !nim) {
            return res.status(400).json({ success: false, message: 'NIM diperlukan untuk mahasiswa' });
        }

        if (role === 'LECTURER' && !nidn) {
            return res.status(400).json({ success: false, message: 'NIDN diperlukan untuk dosen' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Generate verification code
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || 'STUDENT',
                nim: role === 'STUDENT' ? nim : null,
                nidn: role === 'LECTURER' ? nidn : null,
                verificationCode,
                verificationExpires
            }
        });

        // Send verification email
        await sendVerificationEmail(email, verificationCode);

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil. Silakan cek email untuk kode verifikasi.',
            userId: user.id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Verify email
router.post('/verify', async (req, res) => {
    try {
        const { email, verificationCode } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(400).json({ success: false, message: 'User tidak ditemukan' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email sudah terverifikasi' });
        }

        if (user.verificationCode !== verificationCode) {
            return res.status(400).json({ success: false, message: 'Kode verifikasi salah' });
        }

        if (new Date() > user.verificationExpires) {
            return res.status(400).json({ success: false, message: 'Kode verifikasi sudah kadaluarsa' });
        }

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                verificationExpires: null
            }
        });

        // Generate token
        const token = generateToken(user.id, user.role);

        res.json({
            success: true,
            message: 'Email berhasil diverifikasi',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                nim: user.nim,
                nidn: user.nidn
            }
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Email atau password salah' });
        }

        // Check password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, message: 'Email atau password salah' });
        }

        // Check if verified
        if (!user.isVerified) {
            // Generate new verification code
            const verificationCode = generateVerificationCode();
            const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationCode,
                    verificationExpires
                }
            });

            // Send verification email
            await sendVerificationEmail(email, verificationCode);

            return res.status(400).json({
                success: false,
                message: 'Email belum terverifikasi. Kode verifikasi baru telah dikirim.',
                requiresVerification: true
            });
        }

        // Generate token
        const token = generateToken(user.id, user.role);

        res.json({
            success: true,
            message: 'Login berhasil',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                nim: user.nim,
                nidn: user.nidn
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Email tidak terdaftar' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email sudah terverifikasi' });
        }

        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode,
                verificationExpires
            }
        });

        // Send verification email
        await sendVerificationEmail(email, verificationCode);

        res.json({
            success: true,
            message: 'Kode verifikasi baru telah dikirim'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                nim: true,
                nidn: true,
                isVerified: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;