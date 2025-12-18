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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stats', require('./routes/stats'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CivitasFix Backend API',
    version: '1.0.0',
    timestamp: new Date(),
    endpoints: {
      auth: '/api/auth',
      reports: '/api/reports',
      users: '/api/users',
      notifications: '/api/notifications',
      stats: '/api/stats'
    }
  });
});

// Root endpoint - FIX untuk "Cannot GET /"
app.get('/', (req, res) => {
  res.json({
    message: 'CivitasFix Backend API',
    version: '1.0.0',
    status: 'Running',
    documentation: 'API endpoints available under /api',
    frontend: process.env.FRONTEND_URL || 'Not configured',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/verify',
      'GET /api/reports',
      'POST /api/reports',
      'GET /api/users/profile'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 SMTP: ${process.env.SMTP_USER ? 'Configured' : 'Not configured'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not connected'}`);
});
