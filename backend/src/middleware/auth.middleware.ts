import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/enums/UserRole';
import { verifyToken } from '../utils/jwt.utils';
import { AuthError } from '../errors/AuthError';

// Extend Express Request type to include user information
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: UserRole;
                venueId?: string;
            };
        }
    }
}

/**
 * Middleware to verify JWT token and add user to request object
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            throw new AuthError('No token provided', 401, 'Lütfen giriş yapın');
        }

        const decoded = verifyToken(token);
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            venueId: decoded.venueId
        };

        next();
    } catch (error) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.userMessage
            });
            return;
        }
        res.status(401).json({
            success: false,
            message: 'Oturum süreniz doldu, lütfen tekrar giriş yapın'
        });
    }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (allowedRoles: UserRole[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw new AuthError('User not authenticated', 401, 'Lütfen giriş yapın');
            }

            if (!allowedRoles.includes(req.user.role)) {
                throw new AuthError(
                    'User not authorized', 
                    403, 
                    'Bu işlem için yetkiniz bulunmuyor'
                );
            }

            next();
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.userMessage
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Bir hata oluştu'
            });
        }
    };
}; 