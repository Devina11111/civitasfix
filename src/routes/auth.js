const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Register endpoint - Tanpa verifikasi email
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, nim, nidn } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, dan nama harus diisi' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password minimal 6 karakter' 
      });
    }

    // Check existing user
    const existingUser = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email sudah terdaftar' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user langsung aktif
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'STUDENT',
        nim: role === 'STUDENT' ? nim : null,
        nidn: role === 'LECTURER' ? nidn : null,
        isVerified: true // Langsung verified tanpa email
      }
    });

    // Buat notifikasi selamat datang
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Selamat Datang!',
        message: 'Akun Anda berhasil dibuat. Selamat menggunakan CivitasFix!',
        type: 'SUCCESS'
      }
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Akun Anda sudah aktif.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        nim: user.nim,
        nidn: user.nidn,
        isVerified: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email dan password harus diisi' 
      });
    }

    // Cari user
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email atau password salah' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email atau password salah' 
      });
    }

    // Generate token
    const token = generateToken(user.id);

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
        nidn: user.nidn,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak ditemukan' 
      });
    }

    // Verify token
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.userId;

    // Database user
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    res.json({ 
      success: true, 
      user 
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Token tidak valid' 
    });
  }
});

// Demo accounts (untuk testing)
router.post('/demo/login', async (req, res) => {
  const { type = 'student' } = req.body;
  
  let demoUser;
  
  switch(type) {
    case 'student':
      demoUser = {
        id: 1001,
        email: 'mahasiswa@demo.com',
        name: 'Mahasiswa Demo',
        role: 'STUDENT',
        nim: '12345678',
        isVerified: true
      };
      break;
    case 'lecturer':
      demoUser = {
        id: 1002,
        email: 'dosen@demo.com',
        name: 'Dosen Demo',
        role: 'LECTURER',
        nidn: '87654321',
        isVerified: true
      };
      break;
    case 'admin':
      demoUser = {
        id: 1003,
        email: 'admin@demo.com',
        name: 'Admin Demo',
        role: 'ADMIN',
        isVerified: true
      };
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Type must be student, lecturer, or admin'
      });
  }

  const token = require('jsonwebtoken').sign(
    { userId: demoUser.id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Login demo berhasil',
    token,
    user: demoUser
  });
});

module.exports = router;
