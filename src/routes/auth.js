const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware untuk logging
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Test endpoint untuk Railway
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth endpoint working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    console.log('Register request body:', req.body);
    
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid'
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
        isVerified: true
      }
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Selamat Datang!',
        message: `Halo ${name}, akun Anda berhasil dibuat. Selamat menggunakan CivitasFix!`,
        type: 'SUCCESS'
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'civitasfix-upn-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data without password
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
      message: 'Registrasi berhasil! Akun Anda sudah aktif.',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Email atau NPM/NIDN sudah terdaftar'
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server. Silakan coba lagi.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt for email:', req.body.email);
    
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
      console.log('User not found for email:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Email atau password salah' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for email:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Email atau password salah' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'civitasfix-upn-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data without password
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

    console.log('Login successful for user:', user.email);

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server. Silakan coba lagi.' 
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
        message: 'Token tidak ditemukan. Silakan login kembali.' 
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'civitasfix-upn-secret-key');
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid. Silakan login kembali.'
      });
    }

    const userId = decoded.userId;

    // Find user in database
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
      message: 'Terjadi kesalahan server' 
    });
  }
});

module.exports = router;
