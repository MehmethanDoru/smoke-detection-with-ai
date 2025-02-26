import jwt, { SignOptions } from 'jsonwebtoken';
import { TokenPayload } from '../types/auth.types';

/**
 * Generate access token for authenticated user
 */
export const generateAccessToken = (payload: TokenPayload): string => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }

    const options: SignOptions = {
        expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '86400') // 1 day in seconds
    };

    return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Generate refresh token for maintaining user session
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
    if (!process.env.REFRESH_TOKEN_SECRET) {
        throw new Error('REFRESH_TOKEN_SECRET is not defined');
    }

    const options: SignOptions = {
        expiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '604800') // 7 days in seconds
    };

    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, options);
};

/**
 * Verify JWT token and return decoded payload
 */
export const verifyToken = (token: string, isRefreshToken: boolean = false): TokenPayload => {
    const secret = isRefreshToken ? process.env.REFRESH_TOKEN_SECRET : process.env.JWT_SECRET;
    
    if (!secret) {
        throw new Error(`${isRefreshToken ? 'REFRESH_TOKEN_SECRET' : 'JWT_SECRET'} is not defined`);
    }

    try {
        return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
        throw new Error('Invalid token');
    }
}; 