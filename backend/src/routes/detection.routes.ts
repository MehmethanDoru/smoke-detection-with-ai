import { Router } from 'express';
import { DetectionController } from '../controllers/detection.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/enums/UserRole';

const router = Router();
const detectionController = new DetectionController();

// Public routes - none

// Protected routes - require authentication
router.get('/', authenticateToken, detectionController.getDetections);
router.get('/statistics', authenticateToken, detectionController.getStatistics);
router.get('/:id', authenticateToken, detectionController.getDetectionById);

// AI system route - requires special authentication
router.post('/', authenticateToken, detectionController.createDetection);

// Security staff and admin routes
router.put(
    '/:id',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN, UserRole.SECURITY_STAFF]),
    detectionController.updateDetection
);

export default router; 