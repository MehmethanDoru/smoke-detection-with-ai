import { Request, Response } from 'express';
import { StatisticsService } from '../services/statistics.service';

export class StatisticsController {
    private statisticsService = new StatisticsService();

    // Günlük istatistikleri hesapla ve kaydet
    public calculateDailyStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const { venueId } = req.params;
            const date = req.query.date ? new Date(req.query.date as string) : new Date();

            const stats = await this.statisticsService.calculateAndSaveDailyStats(venueId, date);

            res.json({
                success: true,
                data: stats,
                message: 'Günlük istatistikler başarıyla hesaplandı ve kaydedildi'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'İstatistikler hesaplanırken bir hata oluştu'
            });
        }
    };

    // Günlük istatistikleri getir
    public getDailyStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const { venueId, date } = req.params;
            const statsDate = date ? new Date(date) : new Date();

            const stats = await this.statisticsService.getDailyStats(venueId, statsDate);

            res.json({
                success: true,
                data: stats,
                message: 'Günlük istatistikler başarıyla getirildi'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'İstatistikler getirilirken bir hata oluştu'
            });
        }
    };

    // Saatlik tespit istatistikleri
    public getHourlyStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const { venueId } = req.params;
            const date = req.query.date ? new Date(req.query.date as string) : new Date();

            const stats = await this.statisticsService.getHourlyDetections(venueId, date);

            res.json({
                success: true,
                data: stats,
                message: 'Saatlik istatistikler başarıyla getirildi'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'İstatistikler getirilirken bir hata oluştu'
            });
        }
    };

    // Bölge bazlı yoğunluk haritası
    public getHeatmap = async (req: Request, res: Response): Promise<void> => {
        try {
            const { venueId } = req.params;
            const startDate = new Date(req.query.startDate as string);
            const endDate = new Date(req.query.endDate as string);

            const heatmap = await this.statisticsService.getZoneHeatmap(
                venueId,
                startDate,
                endDate
            );

            res.json({
                success: true,
                data: heatmap,
                message: 'Yoğunluk haritası başarıyla getirildi'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Yoğunluk haritası getirilirken bir hata oluştu'
            });
        }
    };

    // Kamera performans metrikleri
    public getCameraStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const { venueId } = req.params;

            const stats = await this.statisticsService.getCameraPerformance(venueId);

            res.json({
                success: true,
                data: stats,
                message: 'Kamera istatistikleri başarıyla getirildi'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Kamera istatistikleri getirilirken bir hata oluştu'
            });
        }
    };

    // Trend analizi
    public getTrends = async (req: Request, res: Response): Promise<void> => {
        try {
            const { venueId } = req.params;
            const days = req.query.days ? parseInt(req.query.days as string) : 7;

            const trends = await this.statisticsService.getTrendAnalysis(venueId, days);

            res.json({
                success: true,
                data: trends,
                message: 'Trend analizi başarıyla getirildi'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Trend analizi getirilirken bir hata oluştu'
            });
        }
    };

    // Performans özeti
    public getPerformanceSummary = async (req: Request, res: Response): Promise<void> => {
        try {
            const { venueId } = req.params;

            const summary = await this.statisticsService.getPerformanceSummary(venueId);

            res.json({
                success: true,
                data: summary,
                message: 'Performans özeti başarıyla getirildi'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Performans özeti getirilirken bir hata oluştu'
            });
        }
    };
} 