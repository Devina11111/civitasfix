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

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');

// Routes
app.use('/api/auth', authRoutes);
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
    
    res.json({
      status: 'OK',
      message: 'CivitasFix Backend API is running',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      database: 'Connected',
      features: {
        registration: 'Instant activation',
        notifications: 'Internal system',
        authentication: 'JWT based'
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
    health: '/api/health',
    test: '/test'
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
    console.log('🚀 Starting CivitasFix Backend...');
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
    
    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
      console.log('💡 TIPS: Check if migrations have been applied');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 CORS Origin: https://civitasfix.netlify.app`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🧪 Test Endpoint: http://localhost:${PORT}/test`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
