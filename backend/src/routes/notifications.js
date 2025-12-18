const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get user notifications
router.get('/', authenticate, async (req, res) => {
    try {
        const { limit = 20, unreadOnly } = req.query;

        let where = { userId: req.user.id };
        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const notifications = await prisma.notification.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit)
        });

        // Get unread count
        const unreadCount = await prisma.notification.count({
            where: {
                userId: req.user.id,
                isRead: false
            }
        });

        res.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
    try {
        const notification = await prisma.notification.update({
            where: {
                id: parseInt(req.params.id),
                userId: req.user.id // Ensure user owns the notification
            },
            data: {
                isRead: true
            }
        });

        res.json({
            success: true,
            message: 'Notifikasi ditandai sebagai telah dibaca',
            notification
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Mark all as read
router.post('/mark-all-read', authenticate, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.user.id,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        res.json({
            success: true,
            message: 'Semua notifikasi ditandai sebagai telah dibaca'
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;