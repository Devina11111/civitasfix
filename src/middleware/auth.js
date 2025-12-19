const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
    try {
        // Debug: Log headers untuk debugging
        console.log('[AUTH] Headers:', req.headers);
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            console.log('[AUTH] No authorization header found');
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan'
            });
        }

        if (!authHeader.startsWith('Bearer ')) {
            console.log('[AUTH] Invalid authorization format');
            return res.status(401).json({
                success: false,
                message: 'Format token tidak valid'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        
        if (!token || token === 'undefined' || token === 'null') {
            console.log('[AUTH] Token is empty or invalid');
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid'
            });
        }

        console.log('[AUTH] Token found, verifying...');

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'upn-veteran-jwt-secret-key-2024'
            );
            console.log('[AUTH] Token decoded successfully:', decoded);
        } catch (jwtError) {
            console.error('[AUTH] JWT verification error:', jwtError.message);
            
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token telah kadaluarsa, silakan login kembali'
                });
            }
            
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token tidak valid'
                });
            }
            
            return res.status(401).json({
                success: false,
                message: 'Error verifikasi token'
            });
        }

        // Check if user still exists in database
        console.log('[AUTH] Looking for user with ID:', decoded.userId);
        
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
            console.log('[AUTH] User not found in database');
            return res.status(401).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        console.log('[AUTH] User found:', user.email);

        // Check if user is verified
        if (!user.isVerified) {
            console.log('[AUTH] User is not verified');
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

        console.log('[AUTH] Authentication successful for:', user.email);
        next();
    } catch (error) {
        console.error('[AUTH] Authentication error:', error.message);
        console.error('[AUTH] Error stack:', error.stack);

        if (error.name === 'PrismaClientKnownRequestError') {
            console.error('[AUTH] Prisma database error');
            return res.status(500).json({
                success: false,
                message: 'Kesalahan database'
            });
        }

        // Handle other unexpected errors
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
            console.log(`[AUTH] Unauthorized access attempt. User role: ${req.user.role}, Required: ${roles}`);
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
        console.log('[AUTH] Optional auth error (non-critical):', error.message);
        req.user = null;
        next();
    }
};

module.exports = { authenticate, authorize, optionalAuthenticate };
