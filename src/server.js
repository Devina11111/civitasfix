const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
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

// Test database connection
const testDatabase = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');

// Test endpoint untuk memastikan server bekerja
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: process.env.DATABASE_URL ? 'Configured' : 'Not configured'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

// Health check dengan database test
app.get('/api/health', async (req, res) => {
  const dbConnected = await testDatabase();
  
  res.json({
    status: dbConnected ? 'OK' : 'ERROR',
    message: dbConnected ? 'CivitasFix Backend API is running' : 'Database connection failed',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: dbConnected ? 'Connected' : 'Disconnected',
    features: {
      registration: 'Instant activation (no email verification)',
      notifications: 'Internal website system',
      authentication: 'JWT token based'
    }
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
        me: 'GET /api/auth/me'
      },
      reports: {
        list: 'GET /api/reports',
        create: 'POST /api/reports',
        detail: 'GET /api/reports/:id'
      },
      notifications: {
        list: 'GET /api/notifications',
        unreadCount: 'GET /api/notifications/unread-count'
      },
      stats: {
        summary: 'GET /api/stats/summary',
        weekly: 'GET /api/stats/weekly'
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
    health: '/api/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    requested: `${req.method} ${req.originalUrl}`,
    available_endpoints: [
      'GET /',
      'GET /api',
      'GET /api/health',
      'GET /test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testDatabase();
    
    if (!dbConnected) {
      console.error('⚠️  Cannot start server: Database connection failed');
      console.log('💡 TIPS: Check DATABASE_URL in Railway Variables');
      process.exit(1);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`🌐 CORS Origin: https://civitasfix.netlify.app`);
      console.log(`✅ Health: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Test: http://localhost:${PORT}/test`);
      console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
