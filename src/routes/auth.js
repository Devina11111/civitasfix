const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { sendVerificationEmail, testSMTP } = require('../utils/email');
const { generateVerificationCode } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Test email connection endpoint
router.get('/test-email', async (req, res) => {
  try {
    const testResult = await testSMTP();
    res.json({
      success: true,
      smtpTest: testResult,
      environment: process.env.NODE_ENV,
      smtpUser: process.env.SMTP_USER ? 'Configured' : 'Not configured',
      tip: testResult ? 'Email system is ready' : 'Check SMTP configuration in Railway Variables'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Register endpoint
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

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
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
    const emailResult = await sendVerificationEmail(email, verificationCode);
    
    if (!emailResult.success) {
      console.error('Email sending failed, but user created. User ID:', user.id);
      // Continue anyway, user can request resend
    }

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Silakan cek email untuk verifikasi.',
      userId: user.id,
      emailSent: emailResult.success,
      previewUrl: emailResult.previewUrl || null,
      tip: emailResult.previewUrl ? `Check email at: ${emailResult.previewUrl}` : 'Check your inbox'
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

// Verify email endpoint
router.post('/verify', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email dan kode verifikasi harus diisi' 
      });
    }

    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email tidak terdaftar' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email sudah terverifikasi' 
      });
    }

    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode verifikasi salah' 
      });
    }

    if (new Date() > user.verificationExpires) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode verifikasi sudah kadaluarsa' 
      });
    }

    // Update user to verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationExpires: null
      }
    });

    // Generate JWT token (simple version for now)
    const token = `verified-token-${user.id}-${Date.now()}`;

    res.json({
      success: true,
      message: 'Email berhasil diverifikasi!',
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
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email harus diisi' 
      });
    }

    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email tidak terdaftar' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email sudah terverifikasi' 
      });
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Update user with new code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationExpires
      }
    });

    // Send new verification email
    const emailResult = await sendVerificationEmail(email, verificationCode);

    res.json({
      success: true,
      message: 'Kode verifikasi baru telah dikirim',
      emailSent: emailResult.success,
      previewUrl: emailResult.previewUrl || null
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Login endpoint (with demo accounts)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email dan password harus diisi' 
      });
    }

    // DEMO ACCOUNTS (for testing without database)
    const demoAccounts = {
      'mahasiswa@demo.com': {
        id: 1001,
        email: 'mahasiswa@demo.com',
        password: 'demo123', // In real app, this would be hashed
        name: 'Mahasiswa Demo',
        role: 'STUDENT',
        nim: '12345678',
        isVerified: true
      },
      'dosen@demo.com': {
        id: 1002,
        email: 'dosen@demo.com',
        password: 'demo123',
        name: 'Dosen Demo',
        role: 'LECTURER',
        nidn: '87654321',
        isVerified: true
      },
      'admin@demo.com': {
        id: 1003,
        email: 'admin@demo.com',
        password: 'demo123',
        name: 'Admin Demo',
        role: 'ADMIN',
        isVerified: true
      }
    };

    // Check if demo account
    if (demoAccounts[email]) {
      const demoUser = demoAccounts[email];
      
      if (password !== demoUser.password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email atau password salah' 
        });
      }

      // Generate token for demo user
      const token = `demo-token-${demoUser.id}-${Date.now()}`;

      return res.json({
        success: true,
        message: 'Login berhasil (Demo Account)',
        token,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          nim: demoUser.nim,
          nidn: demoUser.nidn,
          isVerified: true
        }
      });
    }

    // Regular database user
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

    // Check if verified
    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email belum terverifikasi',
        requiresVerification: true,
        email: user.email
      });
    }

    // Generate token
    const token = `jwt-token-${user.id}-${Date.now()}`;

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

    // Simple token parsing (in real app, use JWT verify)
    const tokenParts = token.split('-');
    const userId = parseInt(tokenParts[2]);
    
    if (token.startsWith('demo-token-')) {
      // Demo users
      const demoUsers = {
        1001: {
          id: 1001,
          email: 'mahasiswa@demo.com',
          name: 'Mahasiswa Demo',
          role: 'STUDENT',
          nim: '12345678',
          isVerified: true
        },
        1002: {
          id: 1002,
          email: 'dosen@demo.com',
          name: 'Dosen Demo',
          role: 'LECTURER',
          nidn: '87654321',
          isVerified: true
        },
        1003: {
          id: 1003,
          email: 'admin@demo.com',
          name: 'Admin Demo',
          role: 'ADMIN',
          isVerified: true
        }
      };

      const demoUser = demoUsers[userId];
      if (demoUser) {
        return res.json({ 
          success: true, 
          user: demoUser 
        });
      }
    }

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
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Create demo account endpoint
router.post('/create-demo', async (req, res) => {
  try {
    const { type = 'student' } = req.body;
    
    let demoData;
    
    switch(type) {
      case 'student':
        demoData = {
          email: `student${Date.now()}@demo.com`,
          name: 'Mahasiswa Demo',
          role: 'STUDENT',
          nim: Math.floor(10000000 + Math.random() * 90000000).toString(),
          password: 'demo123',
          isVerified: true
        };
        break;
      case 'lecturer':
        demoData = {
          email: `lecturer${Date.now()}@demo.com`,
          name: 'Dosen Demo',
          role: 'LECTURER',
          nidn: Math.floor(10000000 + Math.random() * 90000000).toString(),
          password: 'demo123',
          isVerified: true
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Type must be student or lecturer'
        });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(demoData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: demoData.email,
        password: hashedPassword,
        name: demoData.name,
        role: demoData.role,
        nim: demoData.nim,
        nidn: demoData.nidn,
        isVerified: true
      }
    });

    res.json({
      success: true,
      message: 'Akun demo berhasil dibuat',
      account: {
        email: demoData.email,
        password: demoData.password,
        name: demoData.name,
        role: demoData.role,
        credentials: `${demoData.email} / ${demoData.password}`
      },
      tip: 'Gunakan kredensial di atas untuk login'
    });
  } catch (error) {
    console.error('Create demo error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat akun demo'
    });
  }
});

module.exports = router;
