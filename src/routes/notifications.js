const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET all notifications for current user
router.get('/', authenticate, async (req, res) => {
    try {
        const { limit = 10, page = 1 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: parseInt(limit),
                include: {
                    report: {
                        select: {
                            id: true,
                            title: true,
                            status: true
                        }
                    }
                }
            }),
            prisma.notification.count({ where: { userId: req.user.id } })
        ]);

        res.json({
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[NOTIFICATIONS] GET / Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// GET unread count
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
        console.error('[NOTIFICATIONS] GET /unread-count Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// MARK as read
router.patch('/:id/read', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notifikasi tidak ditemukan' 
            });
        }

        if (notification.userId !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak' 
            });
        }

        const updatedNotification = await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });

        res.json({
            success: true,
            notification: updatedNotification
        });
    } catch (error) {
        console.error('[NOTIFICATIONS] PATCH /:id/read Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// MARK all as read
router.post('/read-all', authenticate, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { 
                userId: req.user.id,
                isRead: false
            },
            data: { isRead: true }
        });

        res.json({
            success: true,
            message: 'Semua notifikasi telah ditandai sebagai dibaca'
        });
    } catch (error) {
        console.error('[NOTIFICATIONS] POST /read-all Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// DELETE notification
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notifikasi tidak ditemukan' 
            });
        }

        if (notification.userId !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak' 
            });
        }

        await prisma.notification.delete({
            where: { id: notificationId }
        });

        res.json({
            success: true,
            message: 'Notifikasi berhasil dihapus'
        });
    } catch (error) {
        console.error('[NOTIFICATIONS] DELETE /:id Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
