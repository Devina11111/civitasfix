const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get weekly statistics
router.get('/weekly', authenticate, async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const stats = await prisma.report.groupBy({
            by: ['status', 'category'],
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                }
            },
            _count: {
                id: true
            }
        });

        // Format data for chart
        const formattedStats = {
            byStatus: {},
            byCategory: {},
            dailyCounts: []
        };

        // Get daily counts for last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const dailyCount = await prisma.report.count({
                where: {
                    createdAt: {
                        gte: date,
                        lt: nextDay
                    }
                }
            });

            formattedStats.dailyCounts.push({
                date: date.toISOString().split('T')[0],
                count: dailyCount
            });
        }

        // Group by status
        stats.forEach(stat => {
            if (!formattedStats.byStatus[stat.status]) {
                formattedStats.byStatus[stat.status] = 0;
            }
            formattedStats.byStatus[stat.status] += stat._count.id;
        });

        // Group by category
        stats.forEach(stat => {
            if (!formattedStats.byCategory[stat.category]) {
                formattedStats.byCategory[stat.category] = 0;
            }
            formattedStats.byCategory[stat.category] += stat._count.id;
        });

        // Total reports
        const totalReports = await prisma.report.count();
        const pendingReports = await prisma.report.count({ where: { status: 'PENDING' } });
        const completedReports = await prisma.report.count({ where: { status: 'COMPLETED' } });

        res.json({
            success: true,
            stats: {
                ...formattedStats,
                totals: {
                    all: totalReports,
                    pending: pendingReports,
                    completed: completedReports
                }
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get dashboard summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        let where = {};

        if (req.user.role === 'STUDENT') {
            where.userId = req.user.id;
        }

        const [
            totalReports,
            pendingReports,
            inProgressReports,
            completedReports,
            weeklyReports,
            monthlyReports
        ] = await Promise.all([
            prisma.report.count({ where }),
            prisma.report.count({ where: { ...where, status: 'PENDING' } }),
            prisma.report.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.report.count({ where: { ...where, status: 'COMPLETED' } }),
            prisma.report.count({
                where: {
                    ...where,
                    createdAt: {
                        gte: new Date(new Date().setDate(new Date().getDate() - 7))
                    }
                }
            }),
            prisma.report.count({
                where: {
                    ...where,
                    createdAt: {
                        gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
                    }
                }
            })
        ]);

        res.json({
            success: true,
            summary: {
                total: totalReports,
                pending: pendingReports,
                inProgress: inProgressReports,
                completed: completedReports,
                weekly: weeklyReports,
                monthly: monthlyReports
            }
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;