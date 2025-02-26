import { Router } from 'express';
import { ZoneAssignmentController } from '../controllers/zone-assignment.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/enums/UserRole';

const router = Router();
const zoneAssignmentController = new ZoneAssignmentController();

// Public routes - none

// Protected routes - require authentication
router.get('/', authenticateToken, zoneAssignmentController.getZoneAssignments);
router.get('/:id', authenticateToken, zoneAssignmentController.getZoneAssignmentById);

// Admin only routes
router.post(
    '/',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    zoneAssignmentController.createZoneAssignment
);

router.put(
    '/:id',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    zoneAssignmentController.updateZoneAssignment
);

export default router; 