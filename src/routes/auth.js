const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function untuk generate token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'civitasfix-upn-veteran-jwt-secret-2024';
  return jwt.sign(
    { userId: userId.toString() }, // Pastikan string
    secret,
    { expiresIn: '7d' }
  );
};

// Test endpoint untuk memastikan route bekerja
router.get('/test', (req, res) => {
  console.log('Auth test endpoint hit');
  res.json({
    success: true,
    message: 'Auth endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Register endpoint
router.post('/register', async (req, res) => {
  console.log('Register request received:', req.body);
  
  try {
    const { email, password, name, role = 'STUDENT', nim, nidn } = req.body;

    // Validasi dasar
    if (!email || !password || !name) {
      console.log('Validation failed - missing fields');
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

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid'
      });
    }

    // Cek apakah user sudah ada
    console.log('Checking for existing user with email:', email);
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Data user
    const userData = {
      email,
      password: hashedPassword,
      name,
      role,
      isVerified: true, // Langsung aktif tanpa verifikasi
      nim: role === 'STUDENT' ? nim : null,
      nidn: role === 'LECTURER' ? nidn : null
    };

    console.log('Creating user with data:', { ...userData, password: '***' });

    // Buat user
    const user = await prisma.user.create({
      data: userData
    });

    console.log('User created successfully with ID:', user.id);

    // Buat notifikasi selamat datang
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Selamat Datang!',
        message: `Halo ${name}, akun Anda berhasil dibuat. Selamat menggunakan CivitasFix!`,
        type: 'SUCCESS'
      }
    });

    // Generate token
    const token = generateToken(user.id);
    console.log('Token generated for user:', user.id);

    // Response data user (tanpa password)
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

    console.log('Registration successful for:', email);

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Akun Anda sudah aktif.',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error details:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat registrasi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  console.log('Login request received:', { email: req.body.email });
  
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password harus diisi'
      });
    }

    console.log('Looking for user with email:', email);

    // Cari user
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

    console.log('User found:', user.id, user.email);

    // Verifikasi password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    console.log('Password verified for user:', user.email);

    // Generate token
    const token = generateToken(user.id);
    console.log('Token generated for login:', user.id);

    // Response data user (tanpa password)
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

    console.log('Login successful for:', email);

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error details:', error);
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  console.log('GET /me request');
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    console.log('Token received:', token.substring(0, 20) + '...');

    // Verify token
    const secret = process.env.JWT_SECRET || 'civitasfix-upn-veteran-jwt-secret-2024';
    let decoded;
    
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    console.log('Token decoded:', decoded);

    const userId = parseInt(decoded.userId);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    // Cari user di database
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

    console.log('User found for /me:', user.email);

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('/me endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

module.exports = router;
