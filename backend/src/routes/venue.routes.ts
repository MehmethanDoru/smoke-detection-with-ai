import { Router } from 'express';
import { VenueController } from '../controllers/venue.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/enums/UserRole';

const router = Router();
const venueController = new VenueController();

// Public routes - none

// Protected routes - require authentication
router.get('/', authenticateToken, venueController.getVenues);
router.get('/:id', authenticateToken, venueController.getVenueById);

// Admin only routes
router.post(
    '/',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN]),
    venueController.createVenue
);

router.put(
    '/:id',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    venueController.updateVenue
);

router.delete(
    '/:id',
    authenticateToken,
    authorize([UserRole.SYSTEM_ADMIN]),
    venueController.deleteVenue
);

export default router; 