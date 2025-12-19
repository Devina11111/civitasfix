const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Compression untuk mempercepat response
app.use(compression());

// CORS configuration yang lebih lengkap
const corsOptions = {
  origin: [
    'https://civitasfix.netlify.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use(morgan('dev'));

// BUAT UPLOADS DIRECTORY JIKA BELUM ADA
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// Static files untuk uploads - PERBAIKAN PATH
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    // Set content type berdasarkan ekstensi file
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');

// Routes dengan API prefix
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

// Test endpoint dengan CORS headers
app.get('/api/test', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '2.0.0'
  });
});

// Simple endpoint for Railway health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'CivitasFix Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'CivitasFix API v2.0 - UPN Veteran Jawa Timur',
    version: '2.0.0',
    status: 'Active',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        test: 'GET /api/auth/test'
      },
      users: {
        profile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile',
        changePassword: 'POST /api/users/change-password',
        lecturers: 'GET /api/users/lecturers'
      },
      reports: {
        list: 'GET /api/reports',
        create: 'POST /api/reports',
        detail: 'GET /api/reports/:id',
        updateStatus: 'PATCH /api/reports/:id/status',
        updateRepair: 'PATCH /api/reports/:id/repair',
        latest: 'GET /api/reports/dashboard/latest'
      },
      notifications: {
        list: 'GET /api/notifications',
        unreadCount: 'GET /api/notifications/unread-count',
        markAsRead: 'PATCH /api/notifications/:id/read',
        markAllRead: 'POST /api/notifications/read-all',
        delete: 'DELETE /api/notifications/:id'
      },
      stats: {
        summary: 'GET /api/stats/summary',
        weekly: 'GET /api/stats/weekly'
      },
      system: {
        health: 'GET /health',
        test: 'GET /test',
        uploads: 'GET /uploads/:filename'
      }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CivitasFix Backend API - UPN Veteran Jawa Timur',
    version: '2.0.0',
    status: 'Running',
    frontend: 'https://civitasfix.netlify.app',
    documentation: '/api',
    health: '/health',
    test: '/api/test'
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    requested: `${req.method} ${req.url}`,
    available_endpoints: [
      'GET /',
      'GET /api',
      'GET /health',
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me'
    ]
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  console.error(err.stack);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed by CORS'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`✅ Health check: https://civitasfix-backend.up.railway.app/health`);
  console.log(`✅ Test endpoint: https://civitasfix-backend.up.railway.app/api/test`);
  console.log(`📸 Image uploads: https://civitasfix-backend.up.railway.app/uploads/`);
});
