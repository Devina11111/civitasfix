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
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Izinkan gambar dari origin lain
}));

// Compression untuk mempercepat response
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://civitasfix.netlify.app',
      'http://localhost:5173',
      'http://localhost:5174'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Terapkan CORS untuk semua route
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// BUAT UPLOADS DIRECTORY JIKA BELUM ADA
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// Static files untuk uploads - TAMBAHKAN CORS HEADERS
app.use('/uploads', (req, res, next) => {
  // Set CORS headers untuk static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(uploadsDir, {
  maxAge: '1d', // Cache untuk 1 hari
  setHeaders: (res, filePath) => {
    // Set content type berdasarkan ekstensi file
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') res.setHeader('Content-Type', 'image/png');
    if (ext === '.jpg' || ext === '.jpeg') res.setHeader('Content-Type', 'image/jpeg');
    if (ext === '.gif') res.setHeader('Content-Type', 'image/gif');
    if (ext === '.webp') res.setHeader('Content-Type', 'image/webp');
  }
}));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');

// Routes dengan timeout handling
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
    test: '/test',
    uploads: '/uploads/:filename'
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
      'GET /test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me'
    ]
  });
});

// Global timeout middleware
app.use((req, res, next) => {
  // Set timeout untuk 30 detik (30,000ms)
  req.setTimeout(30000, () => {
    console.log(`Request timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        message: 'Request timeout'
      });
    }
  });
  
  res.setTimeout(30000, () => {
    console.log(`Response timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        message: 'Response timeout'
      });
    }
  });
  
  next();
});

// Error handling middleware
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
  
  // Handle timeout errors
  if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
    return res.status(504).json({
      success: false,
      message: 'Request timeout'
    });
  }
  
  // Handle Prisma/DB errors
  if (err.name === 'PrismaClientKnownRequestError') {
    console.error('Database error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database error occurred'
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication error'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`✅ Health check: https://civitasfix-backend.up.railway.app/health`);
  console.log(`✅ Test endpoint: https://civitasfix-backend.up.railway.app/test`);
  console.log(`📸 Image uploads: https://civitasfix-backend.up.railway.app/uploads/`);
});
