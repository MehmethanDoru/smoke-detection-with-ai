import { Router } from 'express';
import { StatisticsController } from '../controllers/statistics.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/enums/UserRole';

const router = Router();
const statisticsController = new StatisticsController();

// Tüm route'lar yetkilendirme gerektirir
router.use(authenticateToken);

// Günlük istatistikleri hesaplama ve kaydetme
router.post(
    '/venues/:venueId/daily',
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    statisticsController.calculateDailyStats
);

// Günlük istatistikleri getirme
router.get(
    '/venues/:venueId/daily/:date?',
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    statisticsController.getDailyStats
);

// Mekan bazlı istatistikler
router.get(
    '/venues/:venueId/hourly',
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    statisticsController.getHourlyStats
);

router.get(
    '/venues/:venueId/heatmap',
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    statisticsController.getHeatmap
);

router.get(
    '/venues/:venueId/cameras',
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    statisticsController.getCameraStats
);

router.get(
    '/venues/:venueId/trends',
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    statisticsController.getTrends
);

router.get(
    '/venues/:venueId/performance',
    authorize([UserRole.SYSTEM_ADMIN, UserRole.VENUE_ADMIN]),
    statisticsController.getPerformanceSummary
);

export default router; 