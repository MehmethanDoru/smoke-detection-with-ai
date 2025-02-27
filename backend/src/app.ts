import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initializeDatabase } from './config/database';
import { authenticateToken, authorize } from './middleware/auth.middleware';
import { UserRole } from './models/enums/UserRole';
import { generateAccessToken, generateRefreshToken } from './utils/jwt.utils';
import { WebSocketService } from './services/websocket.service';
import authRoutes from './routes/auth.routes';
import venueRoutes from './routes/venue.routes';
import zoneAssignmentRoutes from './routes/zone-assignment.routes';
import detectionRoutes from './routes/detection.routes';
import cameraRoutes from './routes/camera.routes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// WebSocket servisi başlat
export const wsService = new WebSocketService(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/zone-assignments', zoneAssignmentRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/cameras', cameraRoutes);

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
        message: 'Bir hata oluştu'
    });
});

// Server başlatma
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        await initializeDatabase();
        server.listen(PORT, () => {
            console.log(`Server ${PORT} portunda çalışıyor`);
            console.log('WebSocket servisi aktif');
        });
    } catch (error) {
        console.error('Server başlatılırken hata oluştu:', error);
        process.exit(1);
    }
};

startServer(); 