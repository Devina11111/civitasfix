const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET stats summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        let where = {};
        
        // Perbaikan: Gunakan req.user dari middleware
        if (req.user.role === 'STUDENT') {
            where.userId = req.user.id;
        }

        const [total, pending, inProgress, completed, rejected] = await Promise.all([
            prisma.report.count({ where }),
            prisma.report.count({ where: { ...where, status: 'PENDING' } }),
            prisma.report.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.report.count({ where: { ...where, status: 'COMPLETED' } }),
            prisma.report.count({ where: { ...where, status: 'REJECTED' } })
        ]);

        res.json({
            success: true,
            summary: {
                total,
                pending,
                inProgress,
                completed,
                rejected
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET weekly stats
router.get('/weekly', authenticate, async (req, res) => {
    try {
        let where = {};
        
        if (req.user.role === 'STUDENT') {
            where.userId = req.user.id;
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
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
