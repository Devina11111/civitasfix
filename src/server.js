const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://civitasfix.netlify.app',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'CivitasFix Backend API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    emailSystem: 'DISABLED - Using internal notifications',
    features: {
      registration: 'Instant activation (no email verification)',
      notifications: 'Internal website notifications',
      reports: 'Full CRUD with status tracking'
    }
  });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'CivitasFix API v2.0',
    version: '2.0.0',
    changes: 'Removed email verification, added internal notifications',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        demo: 'POST /api/auth/demo/login'
      },
      reports: {
        list: 'GET /api/reports',
        create: 'POST /api/reports',
        detail: 'GET /api/reports/:id',
        updateStatus: 'PATCH /api/reports/:id/status',
        updateRepair: 'PATCH /api/reports/:id/repair'
      },
      notifications: {
        list: 'GET /api/notifications',
        unreadCount: 'GET /api/notifications/unread-count',
        markRead: 'PATCH /api/notifications/:id/read',
        markAllRead: 'POST /api/notifications/read-all',
        delete: 'DELETE /api/notifications/:id'
      },
      stats: {
        summary: 'GET /api/stats/summary',
        weekly: 'GET /api/stats/weekly'
      },
      users: {
        profile: 'GET /api/users/profile',
        update: 'PUT /api/users/profile'
      }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CivitasFix Backend API v2.0',
    version: '2.0.0',
    status: 'Running with internal notifications system',
    frontend: process.env.FRONTEND_URL || 'https://civitasfix.netlify.app',
    timestamp: new Date().toISOString()
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
      'GET /api/reports',
      'POST /api/reports',
      'GET /api/notifications'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`📧 Email System: DISABLED - Using internal notifications`);
  console.log(`✅ Health check: https://civitasfix-backend.up.railway.app/api/health`);
});
