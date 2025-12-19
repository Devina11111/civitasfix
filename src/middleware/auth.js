const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid'
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'upn-veteran-jwt-secret-key-2024'
        );

        // Check if user still exists in database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                nim: true,
                nidn: true,
                isVerified: true
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Akun Anda belum diverifikasi'
            });
        }

        // Add user to request object
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            nim: user.nim,
            nidn: user.nidn,
            isVerified: user.isVerified
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token telah kadaluarsa, silakan login kembali'
            });
        }

        if (error.name === 'PrismaClientKnownRequestError') {
            return res.status(500).json({
                success: false,
                message: 'Kesalahan database'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Autentikasi gagal'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Anda harus login terlebih dahulu'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki izin untuk mengakses ini'
            });
        }

        next();
    };
};

// Optional: Soft authentication (doesn't fail if no token)
const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            req.user = null;
            return next();
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'upn-veteran-jwt-secret-key-2024'
        );

        // Check if user still exists
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                nim: true,
                nidn: true,
                isVerified: true
            }
        });

        if (user && user.isVerified) {
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                nim: user.nim,
                nidn: user.nidn,
                isVerified: user.isVerified
            };
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        // Don't fail on authentication errors for optional auth
        console.log('Optional auth error (non-critical):', error.message);
        req.user = null;
        next();
    }
};

module.exports = { authenticate, authorize, optionalAuthenticate };
