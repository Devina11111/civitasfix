const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all notifications for current user
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const skip = (page - 1) * limit;

        let where = { userId: req.user.id };
        
        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: parseInt(limit)
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ 
                where: { 
                    userId: req.user.id,
                    isRead: false 
                }
            })
        ]);

        res.json({
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get unread notifications count
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const count = await prisma.notification.count({
            where: {
                userId: req.user.id,
                isRead: false
            }
        });

        res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' });
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });

        res.json({
            success: true,
            message: 'Notifikasi ditandai sebagai dibaca'
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Mark all notifications as read
router.post('/read-all', authenticate, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { 
                userId: req.user.id,
                isRead: false
            },
            data: { isRead: true }
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId: req.user.id,
                isRead: false
            }
        });

        res.json({
            success: true,
            message: 'Semua notifikasi ditandai sebagai dibaca',
            unreadCount
        });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' });
        }

        await prisma.notification.delete({
            where: { id: notificationId }
        });

        res.json({
            success: true,
            message: 'Notifikasi berhasil dihapus'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
