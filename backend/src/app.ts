import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import { authenticateToken, authorize } from './middleware/auth.middleware';
import { UserRole } from './models/enums/UserRole';
import { generateAccessToken, generateRefreshToken } from './utils/jwt.utils';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoints
app.get('/api/test/public', (_req, res) => {
    res.json({
        success: true,
        message: 'Public endpoint çalışıyor!',
        timestamp: new Date()
    });
});

// Temporary endpoint for token generation (REMOVE IN PRODUCTION)
app.post('/api/test/generate-token', (req, res) => {
    const { role = UserRole.SECURITY } = req.body;
    
    const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: role,
        venueId: role === UserRole.SYSTEM_ADMIN ? undefined : 'test-venue-id'
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
        success: true,
        message: 'Test token oluşturuldu',
        accessToken,
        refreshToken,
        user: payload
    });
});

app.get('/api/test/protected', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Protected endpoint çalışıyor!',
        user: req.user,
        timestamp: new Date()
    });
});

app.get('/api/test/admin', authenticateToken, authorize([UserRole.SYSTEM_ADMIN]), (req, res) => {
    res.json({
        success: true,
        message: 'Admin endpoint çalışıyor!',
        user: req.user,
        timestamp: new Date()
    });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Bir hata oluştu',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Database connection and server start
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        await AppDataSource.initialize();
        console.log('Database connection successful!');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

startServer(); 