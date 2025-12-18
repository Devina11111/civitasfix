const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory routes for now (NO DATABASE NEEDED)
// Authentication routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, dan nama harus diisi'
    });
  }
  
  // Simulate email sending
  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  
  res.json({
    success: true,
    message: 'Registrasi berhasil! Kode verifikasi: ' + verificationCode,
    userId: Date.now(),
    verificationCode: verificationCode.toString(),
    note: 'Ini adalah simulasi. Di production, kode akan dikirim via email.'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Demo accounts
  const demoAccounts = {
    'mahasiswa@demo.com': { password: 'demo123', role: 'STUDENT', name: 'Mahasiswa Demo' },
    'dosen@demo.com': { password: 'demo123', role: 'LECTURER', name: 'Dosen Demo' },
    'admin@demo.com': { password: 'demo123', role: 'ADMIN', name: 'Admin Demo' }
  };
  
  if (demoAccounts[email] && demoAccounts[email].password === password) {
    const user = demoAccounts[email];
    const token = `demo-token-${Date.now()}`;
    
    return res.json({
      success: true,
      message: 'Login berhasil (Demo Account)',
      token,
      user: {
        id: Date.now(),
        email,
        name: user.name,
        role: user.role,
        isVerified: true
      }
    });
  }
  
  res.status(401).json({
    success: false,
    message: 'Email atau password salah'
  });
});

app.post('/api/auth/verify', (req, res) => {
  const { email, verificationCode } = req.body;
  
  res.json({
    success: true,
    message: 'Email berhasil diverifikasi!',
    token: `verified-${Date.now()}`,
    user: {
      id: Date.now(),
      email,
      name: 'User Verified',
      role: 'STUDENT',
      isVerified: true
    }
  });
});

// Reports routes
app.get('/api/reports', (req, res) => {
  const reports = [
    {
      id: 1,
      title: 'Kursi Rusak di Lab Komputer',
      description: 'Kursi mengalami kerusakan pada bagian sandaran',
      location: 'Gedung A, Lantai 2, Ruang 201',
      status: 'PENDING',
      category: 'FURNITURE',
      priority: 'MEDIUM',
      createdAt: '2024-12-15T10:30:00Z'
    },
    {
      id: 2,
      title: 'AC Tidak Dingin',
      description: 'AC di ruang dosen tidak mengeluarkan udara dingin',
      location: 'Gedung B, Ruang 102',
      status: 'IN_PROGRESS',
      category: 'ELECTRONIC',
      priority: 'HIGH',
      createdAt: '2024-12-14T14:20:00Z'
    }
  ];
  
  res.json({
    success: true,
    reports,
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      pages: 1
    }
  });
});

app.post('/api/reports', (req, res) => {
  const report = {
    id: Date.now(),
    ...req.body,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Laporan berhasil dibuat',
    report
  });
});

// Stats routes
app.get('/api/stats/weekly', (req, res) => {
  res.json({
    success: true,
    stats: {
      byStatus: { PENDING: 5, IN_PROGRESS: 3, COMPLETED: 12 },
      byCategory: { FURNITURE: 8, ELECTRONIC: 7, BUILDING: 3, OTHER: 2 },
      dailyCounts: [
        { date: '2024-12-15', count: 3 },
        { date: '2024-12-16', count: 5 },
        { date: '2024-12-17', count: 4 }
      ],
      totals: { all: 20, pending: 5, completed: 12 }
    }
  });
});

app.get('/api/stats/summary', (req, res) => {
  res.json({
    success: true,
    summary: {
      total: 20,
      pending: 5,
      inProgress: 3,
      completed: 12,
      weekly: 8,
      monthly: 20
    }
  });
});

// Users routes
app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 1,
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'STUDENT',
      nim: '12345678',
      isVerified: true,
      createdAt: '2024-12-01T00:00:00Z'
    }
  });
});

// Health check - IMPORTANT FOR RAILWAY
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'CivitasFix Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected (Simulated)'
  });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'CivitasFix API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'POST /api/auth/verify'
      },
      reports: {
        list: 'GET /api/reports',
        create: 'POST /api/reports'
      },
      stats: {
        weekly: 'GET /api/stats/weekly',
        summary: 'GET /api/stats/summary'
      },
      users: {
        profile: 'GET /api/users/profile'
      },
      health: 'GET /api/health'
    },
    demo_accounts: {
      mahasiswa: 'mahasiswa@demo.com / demo123',
      dosen: 'dosen@demo.com / demo123',
      admin: 'admin@demo.com / demo123'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CivitasFix Backend API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      api_docs: '/api',
      health_check: '/api/health',
      demo_login: '/api/auth/login'
    },
    frontend_url: process.env.FRONTEND_URL || 'Not configured',
    timestamp: new Date().toISOString()
  });
});

// Test email endpoint
app.get('/api/test-email', (req, res) => {
  res.json({
    success: true,
    message: 'Email system check',
    status: 'SIMULATED - No real email sent in demo mode',
    note: 'In production, emails are sent via SMTP',
    demo_mode: true
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    available_endpoints: [
      'GET /',
      'GET /api',
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/verify',
      'GET /api/reports',
      'POST /api/reports',
      'GET /api/stats/weekly'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api`);
  console.log(`🏠 Home: http://localhost:${PORT}/`);
});
