const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware untuk autentikasi
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak ditemukan' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'civitasfix-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token tidak valid' 
    });
  }
};

// Get stats summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
          where: { id: req.userId }
        });

        let where = {};
        if (user.role === 'STUDENT') {
            where.userId = req.userId;
        }

        const [
          total,
          pending,
          inProgress,
          completed
        ] = await Promise.all([
          prisma.report.count({ where }),
          prisma.report.count({ where: { ...where, status: 'PENDING' } }),
          prisma.report.count({ where: { ...where, status: 'IN_PROGRESS' } }),
          prisma.report.count({ where: { ...where, status: 'COMPLETED' } })
        ]);

        res.json({
            success: true,
            summary: {
                total,
                pending,
                inProgress,
                completed,
                weekly: Math.floor(total * 0.4), // Contoh statistik
                monthly: Math.floor(total * 0.8) // Contoh statistik
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get weekly stats
router.get('/weekly', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
          where: { id: req.userId }
        });

        let where = {};
        if (user.role === 'STUDENT') {
            where.userId = req.userId;
        }

        // Count by status
        const byStatus = {
            PENDING: await prisma.report.count({ where: { ...where, status: 'PENDING' } }),
            CONFIRMED: await prisma.report.count({ where: { ...where, status: 'CONFIRMED' } }),
            IN_PROGRESS: await prisma.report.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            COMPLETED: await prisma.report.count({ where: { ...where, status: 'COMPLETED' } }),
            REJECTED: await prisma.report.count({ where: { ...where, status: 'REJECTED' } })
        };

        // Count by category
        const byCategory = {
            FURNITURE: await prisma.report.count({ where: { ...where, category: 'FURNITURE' } }),
            ELECTRONIC: await prisma.report.count({ where: { ...where, category: 'ELECTRONIC' } }),
            BUILDING: await prisma.report.count({ where: { ...where, category: 'BUILDING' } }),
            SANITARY: await prisma.report.count({ where: { ...where, category: 'SANITARY' } }),
            OTHER: await prisma.report.count({ where: { ...where, category: 'OTHER' } })
        };

        res.json({
            success: true,
            stats: {
                byStatus,
                byCategory,
                totals: {
                    all: Object.values(byStatus).reduce((a, b) => a + b, 0),
                    pending: byStatus.PENDING,
                    completed: byStatus.COMPLETED
                }
            }
        });
    } catch (error) {
        console.error('Get weekly stats error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
