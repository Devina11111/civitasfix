const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth endpoint is working',
    timestamp: new Date().toISOString(),
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me'
    }
  });
});

// SIMPLE REGISTER (Tanpa validasi lengkap untuk testing)
router.post('/register', async (req, res) => {
  try {
    console.log('Register request received:', req.body);
    
    const { email, password, name, role = 'STUDENT', nim, nidn } = req.body;

    // Basic validation
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

    // Check if user exists
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

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        nim: role === 'STUDENT' ? nim : null,
        nidn: role === 'LECTURER' ? nidn : null,
        isVerified: true
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Selamat Datang!',
        message: `Halo ${name}, akun Anda berhasil dibuat. Selamat menggunakan CivitasFix!`,
        type: 'SUCCESS'
      }
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'upn-veteran-jwt-secret-key-2024',
      { expiresIn: '7d' }
    );

    // User response (without password)
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      nim: user.nim,
      nidn: user.nidn,
      isVerified: true,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Akun Anda langsung aktif.',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }

    // If table doesn't exist, create it
    if (error.code === 'P2021' || error.code === 'P1001') {
      console.log('Database table might not exist. Please run migrations.');
      
      return res.status(500).json({
        success: false,
        message: 'Database belum siap. Silakan coba lagi dalam beberapa saat.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// SIMPLE LOGIN
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password harus diisi'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'upn-veteran-jwt-secret-key-2024',
      { expiresIn: '7d' }
    );

    // User response
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      nim: user.nim,
      nidn: user.nidn,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Handle database errors
    if (error.code === 'P2021' || error.code === 'P1001') {
      return res.status(500).json({
        success: false,
        message: 'Database belum siap. Silakan coba lagi dalam beberapa saat.'
      });
    }

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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'upn-veteran-jwt-secret-key-2024'
    );

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
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

module.exports = router;
