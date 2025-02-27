import { Router } from 'express';
import { CameraController } from '../controllers/camera.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/enums/UserRole';

const router = Router();
const cameraController = new CameraController();

// Public routes - none

// Protected routes - require authentication
router.get('/', authenticateToken, cameraController.getCameras);
router.get('/:id', authenticateToken, cameraController.getCameraById);

// Admin only routes
router.post(
    '/',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    cameraController.createCamera
);

router.put(
    '/:id',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    cameraController.updateCamera
);

router.delete(
    '/:id',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    cameraController.deleteCamera
);

// Camera status and statistics routes
router.patch(
    '/:id/status',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    cameraController.updateCameraStatus
);

router.patch(
    '/:id/statistics',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN]),
    cameraController.updateCameraStatistics
);

export default router; 