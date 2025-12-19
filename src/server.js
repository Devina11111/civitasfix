const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: ['https://civitasfix.netlify.app', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}
app.use('/uploads', express.static(uploadsDir));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
    version: '2.0.0'
  });
});

// Simple endpoint for Railway health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'CivitasFix Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Health check with database test
app.get('/api/health', async (req, res) => {
  try {
    // Try to query database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check uploads directory
    const uploadsExists = fs.existsSync(uploadsDir);
    
    res.json({
      status: 'OK',
      message: 'CivitasFix Backend API is running',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      database: 'Connected',
      uploads: uploadsExists ? 'Available' : 'Not available',
      features: {
        registration: 'Instant activation',
        notifications: 'Internal system',
        authentication: 'JWT based',
        fileUpload: 'Enabled',
        users: 'Profile management'
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      database: 'Disconnected',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
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
        lecturers: 'GET /api/users/lecturers',
        test: 'GET /api/users/test'
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
        health: 'GET /api/health',
        test: 'GET /test',
        uploads: 'GET /uploads/:filename'
      }
    },
    features: {
      instant_registration: 'No email verification required',
      file_upload: 'Image upload for reports (max 5MB)',
      realtime_notifications: 'Internal notification system',
      role_based_access: 'Student, Lecturer, Admin',
      image_preview: 'Direct image display from uploads'
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
    health: '/api/health',
    test: '/test',
    uploads: '/uploads/',
    important_notes: [
      'All endpoints require authentication except /auth/register, /auth/login, and test endpoints',
      'Image uploads are stored in /uploads directory',
      'No email verification required - accounts are instantly active',
      'Notifications are internal only - no email notifications'
    ]
  });
});

// Uploads directory info
app.get('/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      message: 'Uploads directory',
      path: uploadsDir,
      fileCount: files.length,
      files: files,
      note: 'Images are served statically at /uploads/filename'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Could not read uploads directory',
      message: error.message
    });
  }
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
      'GET /api/health',
      'GET /test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/users/profile',
      'PUT /api/users/profile',
      'GET /api/reports',
      'POST /api/reports',
      'GET /api/notifications'
    ],
    common_issues: [
      'Check if you are authenticated (include Authorization header)',
      'Check if the endpoint path is correct',
      'For file uploads, use multipart/form-data'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  
  // Handle multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 5MB.'
    });
  }
  
  // Handle multer file type errors
  if (err.message === 'Hanya file gambar yang diperbolehkan') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed.'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting CivitasFix Backend...');
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    
    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
      console.log('💡 TIPS: Check if migrations have been applied: npx prisma migrate deploy');
    }
    
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 Creating uploads directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 CORS Origin: https://civitasfix.netlify.app`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🧪 Test Endpoint: http://localhost:${PORT}/test`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
      console.log('\n📋 Available Endpoints:');
      console.log('  GET  /                    - API info');
      console.log('  GET  /api                 - Documentation');
      console.log('  GET  /api/health          - Health check');
      console.log('  POST /api/auth/register   - Register user');
      console.log('  POST /api/auth/login      - Login');
      console.log('  GET  /api/auth/me         - Get current user');
      console.log('  GET  /api/users/profile   - User profile');
      console.log('  PUT  /api/users/profile   - Update profile');
      console.log('  POST /api/reports         - Create report (with image upload)');
      console.log('  GET  /api/reports         - List reports');
      console.log('  GET  /api/notifications   - User notifications');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  console.log('Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Terminating server...');
  await prisma.$disconnect();
  console.log('Database disconnected');
  process.exit(0);
});
