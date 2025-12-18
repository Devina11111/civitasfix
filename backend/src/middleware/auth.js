const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../utils/auth');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            throw new Error('Authentication required');
        }

        const decoded = verifyToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isVerified: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (!user.isVerified) {
            throw new Error('Please verify your email first');
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Insufficient permissions'
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };