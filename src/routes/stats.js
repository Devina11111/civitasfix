const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET stats summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        let where = {};
        
        if (req.user.role === 'STUDENT') {
            where.userId = req.user.id;
        }

        const [total, pending, confirmed, inProgress, completed, rejected] = await Promise.all([
            prisma.report.count({ where }),
            prisma.report.count({ where: { ...where, status: 'PENDING' } }),
            prisma.report.count({ where: { ...where, status: 'CONFIRMED' } }),
            prisma.report.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.report.count({ where: { ...where, status: 'COMPLETED' } }),
            prisma.report.count({ where: { ...where, status: 'REJECTED' } })
        ]);

        const responseData = {
            success: true,
            summary: {
                total,
                pending,
                confirmed,
                inProgress,
                completed,
                rejected
            }
        };

        // Tambahkan data tambahan untuk LECTURER/ADMIN
        if (['LECTURER', 'ADMIN'].includes(req.user.role)) {
            const [totalStudents, totalLecturers] = await Promise.all([
                prisma.user.count({ where: { role: 'STUDENT' } }),
                prisma.user.count({ where: { role: 'LECTURER' } })
            ]);

            responseData.summary.totalUsers = {
                students: totalStudents,
                lecturers: totalLecturers,
                total: totalStudents + totalLecturers
            };
        }

        res.json(responseData);
    } catch (error) {
        console.error('[STATS] GET /summary Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data statistik',
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

        // Hitung berdasarkan status
        const statusCounts = await Promise.all([
            prisma.report.count({ where: { ...where, status: 'PENDING' } }),
            prisma.report.count({ where: { ...where, status: 'CONFIRMED' } }),
            prisma.report.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.report.count({ where: { ...where, status: 'COMPLETED' } }),
            prisma.report.count({ where: { ...where, status: 'REJECTED' } })
        ]);

        const byStatus = {
            PENDING: statusCounts[0],
            CONFIRMED: statusCounts[1],
            IN_PROGRESS: statusCounts[2],
            COMPLETED: statusCounts[3],
            REJECTED: statusCounts[4]
        };

        // Hitung berdasarkan kategori
        const categoryCounts = await Promise.all([
            prisma.report.count({ where: { ...where, category: 'FURNITURE' } }),
            prisma.report.count({ where: { ...where, category: 'ELECTRONIC' } }),
            prisma.report.count({ where: { ...where, category: 'BUILDING' } }),
            prisma.report.count({ where: { ...where, category: 'SANITARY' } }),
            prisma.report.count({ where: { ...where, category: 'OTHER' } })
        ]);

        const byCategory = {
            FURNITURE: categoryCounts[0],
            ELECTRONIC: categoryCounts[1],
            BUILDING: categoryCounts[2],
            SANITARY: categoryCounts[3],
            OTHER: categoryCounts[4]
        };

        // Data untuk chart mingguan (7 hari terakhir)
        const weeklyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const dailyWhere = {
                ...where,
                createdAt: {
                    gte: date,
                    lt: nextDate
                }
            };
            
            const dailyCount = await prisma.report.count({ where: dailyWhere });
            
            weeklyData.push({
                date: date.toISOString().split('T')[0],
                count: dailyCount
            });
        }

        res.json({
            success: true,
            stats: {
                byStatus,
                byCategory,
                weekly: weeklyData,
                totals: {
                    all: Object.values(byStatus).reduce((a, b) => a + b, 0),
                    pending: byStatus.PENDING,
                    completed: byStatus.COMPLETED
                }
            }
        });
    } catch (error) {
        console.error('[STATS] GET /weekly Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data statistik mingguan',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
