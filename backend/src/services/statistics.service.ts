import { AppDataSource } from '../config/database';
import { DetectionEvent } from '../models/DetectionEvent';
import { Camera } from '../models/Camera';
import { Statistic } from '../models/Statistic';
import { Between } from 'typeorm';

export class StatisticsService {
    private detectionRepository = AppDataSource.getRepository(DetectionEvent);
    private cameraRepository = AppDataSource.getRepository(Camera);
    private statisticRepository = AppDataSource.getRepository(Statistic);

    // Günlük istatistikleri hesapla ve kaydet
    public async calculateAndSaveDailyStats(venueId: string, date: Date = new Date()): Promise<Statistic> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Mevcut istatistikleri kontrol et
        let statistic = await this.statisticRepository.findOne({
            where: {
                venueId,
                date: startOfDay
            }
        });

        // Saatlik istatistikler
        const hourlyStats = await this.getHourlyDetections(venueId, date);

        // Bölge istatistikleri
        const zoneStats = await this.getZoneHeatmap(venueId, startOfDay, endOfDay);

        // Kamera istatistikleri
        const cameraStats = await this.getCameraPerformance(venueId);

        // Günlük metrikler
        const dailyMetrics = await this.detectionRepository
            .createQueryBuilder('detection')
            .select([
                'COUNT(*) as totalDetections',
                'COUNT(CASE WHEN detection.status = \'handled\' THEN 1 END) as handledDetections',
                'COUNT(CASE WHEN detection.status = \'false_alarm\' THEN 1 END) as falseAlarms',
                'AVG(CASE WHEN detection.status = \'handled\' THEN EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt))/60 END) as avgHandlingTime',
                'AVG(detection.detectionDetails->\'confidence\') as avgConfidence'
            ])
            .where('detection.venueId = :venueId', { venueId })
            .andWhere('detection.detectedAt BETWEEN :startOfDay AND :endOfDay', {
                startOfDay,
                endOfDay
            })
            .getRawOne();

        // Yoğun saatler
        const peakHours = hourlyStats
            .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
            .slice(0, 5);

        // Trend verileri
        const previousDay = await this.detectionRepository.count({
            where: {
                venueId,
                detectedAt: Between(
                    new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000),
                    startOfDay
                )
            }
        });

        const weeklyAverage = await this.getAverageDetections(venueId, 7);
        const monthlyAverage = await this.getAverageDetections(venueId, 30);
        const yearlyAverage = await this.getAverageDetections(venueId, 365);

        // Performans metrikleri
        const performanceMetrics = await this.calculatePerformanceMetrics(venueId, startOfDay, endOfDay);

        // İstatistik nesnesini oluştur veya güncelle
        if (!statistic) {
            statistic = this.statisticRepository.create({
                venueId,
                date: startOfDay
            });
        }

        // İstatistikleri güncelle
        Object.assign(statistic, {
            hourlyStats,
            zoneStats,
            cameraStats,
            dailyMetrics,
            peakHours,
            trendData: {
                previousDay,
                weeklyAverage,
                monthlyAverage,
                yearlyAverage,
                percentageChange: {
                    daily: previousDay ? ((dailyMetrics.totalDetections - previousDay) / previousDay) * 100 : 0,
                    weekly: weeklyAverage ? ((dailyMetrics.totalDetections - weeklyAverage) / weeklyAverage) * 100 : 0,
                    monthly: monthlyAverage ? ((dailyMetrics.totalDetections - monthlyAverage) / monthlyAverage) * 100 : 0
                }
            },
            performanceMetrics,
            lastUpdatedAt: new Date()
        });

        // Veritabanına kaydet
        await this.statisticRepository.save(statistic);

        return statistic;
    }

    // Ortalama tespit sayısını hesapla
    private async getAverageDetections(venueId: string, days: number): Promise<number> {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

        const result = await this.detectionRepository
            .createQueryBuilder('detection')
            .select('AVG(daily_count) as average')
            .from(qb => {
                return qb
                    .select('DATE(detection.detectedAt) as date, COUNT(*) as daily_count')
                    .from(DetectionEvent, 'detection')
                    .where('detection.venueId = :venueId', { venueId })
                    .andWhere('detection.detectedAt BETWEEN :startDate AND :endDate', {
                        startDate,
                        endDate
                    })
                    .groupBy('DATE(detection.detectedAt)');
            }, 'daily_stats')
            .getRawOne();

        return result?.average || 0;
    }

    // Performans metriklerini hesapla
    private async calculatePerformanceMetrics(venueId: string, startDate: Date, endDate: Date) {
        const responseTimeStats = await this.detectionRepository
            .createQueryBuilder('detection')
            .select([
                'MIN(EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt))/60) as min',
                'MAX(EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt))/60) as max',
                'AVG(EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt))/60) as avg'
            ])
            .where('detection.venueId = :venueId', { venueId })
            .andWhere('detection.detectedAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
            .andWhere('detection.status = :status', { status: 'handled' })
            .getRawOne();

        const accuracyStats = await this.detectionRepository
            .createQueryBuilder('detection')
            .select([
                'COUNT(CASE WHEN detection.status = \'handled\' THEN 1 END)::float / COUNT(*) as truePositiveRate',
                'COUNT(CASE WHEN detection.status = \'false_alarm\' THEN 1 END)::float / COUNT(*) as falsePositiveRate',
                'COUNT(CASE WHEN detection.status = \'handled\' THEN 1 END)::float / NULLIF(COUNT(CASE WHEN detection.status IN (\'handled\', \'false_alarm\') THEN 1 END), 0) as precision'
            ])
            .where('detection.venueId = :venueId', { venueId })
            .andWhere('detection.detectedAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
            .getRawOne();

        // Sistem sağlığı metriklerini hesapla
        const systemMetrics = await this.detectionRepository
            .createQueryBuilder('detection')
            .select([
                'AVG(CASE WHEN detection.systemMetrics->\'cpuPercent\' IS NOT NULL THEN (detection.systemMetrics->\'cpuPercent\')::float ELSE NULL END) as avgCpuUsage',
                'AVG(CASE WHEN detection.systemMetrics->\'ramPercent\' IS NOT NULL THEN (detection.systemMetrics->\'ramPercent\')::float ELSE NULL END) as avgMemoryUsage',
                'COUNT(DISTINCT DATE_TRUNC(\'hour\', detection.detectedAt))::float / 24 * 100 as uptime'
            ])
            .where('detection.venueId = :venueId', { venueId })
            .andWhere('detection.detectedAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
            .getRawOne();

        const systemHealth = {
            uptime: systemMetrics?.uptime || 0,
            avgCpuUsage: systemMetrics?.avgCpuUsage || 0,
            avgMemoryUsage: systemMetrics?.avgMemoryUsage || 0
        };

        return {
            responseTime: responseTimeStats,
            accuracy: accuracyStats,
            systemHealth
        };
    }

    // Saatlik tespit sayıları
    public async getHourlyDetections(venueId: string, date: Date): Promise<any> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const hourlyStats = await this.detectionRepository
            .createQueryBuilder('detection')
            .select('EXTRACT(HOUR FROM detection.detectedAt) as hour')
            .addSelect('COUNT(*)', 'count')
            .where('detection.venueId = :venueId', { venueId })
            .andWhere('detection.detectedAt BETWEEN :startOfDay AND :endOfDay', {
                startOfDay,
                endOfDay
            })
            .groupBy('hour')
            .orderBy('hour', 'ASC')
            .getRawMany();

        return hourlyStats;
    }

    // Bölge bazlı yoğunluk haritası
    public async getZoneHeatmap(venueId: string, startDate: Date, endDate: Date): Promise<any> {
        const zoneStats = await this.detectionRepository
            .createQueryBuilder('detection')
            .select([
                'detection.zoneId',
                'detection.floorNumber',
                'COUNT(*) as detectionCount',
                'AVG(detection.detectionDetails->\'confidence\') as avgConfidence'
            ])
            .where('detection.venueId = :venueId', { venueId })
            .andWhere('detection.detectedAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
            .groupBy('detection.zoneId')
            .addGroupBy('detection.floorNumber')
            .getRawMany();

        return zoneStats;
    }

    // Kamera performans metrikleri
    public async getCameraPerformance(venueId: string): Promise<any> {
        const cameras = await this.cameraRepository.find({
            where: { venueId }
        });

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const performanceData = await Promise.all(cameras.map(async camera => {
            const detections = await this.detectionRepository
                .createQueryBuilder('detection')
                .where('detection.cameraId = :cameraId', { cameraId: camera.id })
                .andWhere('detection.detectedAt >= :last24Hours', { last24Hours })
                .getCount();

            return {
                cameraId: camera.id,
                name: camera.name,
                location: camera.location,
                statistics: camera.statistics,
                lastDayDetections: detections,
                status: camera.status,
                uptime: camera.statistics?.uptimePercentage || 0
            };
        }));

        return performanceData;
    }

    // Trend analizi
    public async getTrendAnalysis(venueId: string, days: number = 7): Promise<any> {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

        const dailyStats = await this.detectionRepository
            .createQueryBuilder('detection')
            .select([
                'DATE(detection.detectedAt) as date',
                'COUNT(*) as totalDetections',
                'COUNT(CASE WHEN detection.status = \'handled\' THEN 1 END) as handledDetections',
                'COUNT(CASE WHEN detection.status = \'false_alarm\' THEN 1 END) as falseAlarms',
                'AVG(CASE WHEN detection.status = \'handled\' THEN EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt))/60 END) as avgHandlingTime'
            ])
            .where('detection.venueId = :venueId', { venueId })
            .andWhere('detection.detectedAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany();

        return dailyStats;
    }

    // Performans özeti
    public async getPerformanceSummary(venueId: string): Promise<any> {
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.setDate(1));

        const [todayStats, weekStats, monthStats] = await Promise.all([
            // Bugünün istatistikleri
            this.detectionRepository.createQueryBuilder('detection')
                .select([
                    'COUNT(*) as totalDetections',
                    'AVG(CASE WHEN detection.status = \'handled\' THEN EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt))/60 END) as avgResponseTime',
                    'COUNT(CASE WHEN detection.status = \'false_alarm\' THEN 1 END)::float / COUNT(*) * 100 as falseAlarmRate'
                ])
                .where('detection.venueId = :venueId', { venueId })
                .andWhere('detection.detectedAt >= :startDate', { startDate: startOfToday })
                .getRawOne(),

            // Haftalık istatistikler
            this.detectionRepository.createQueryBuilder('detection')
                .select([
                    'COUNT(*) as totalDetections',
                    'AVG(CASE WHEN detection.status = \'handled\' THEN EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt))/60 END) as avgResponseTime',
                    'COUNT(CASE WHEN detection.status = \'false_alarm\' THEN 1 END)::float / COUNT(*) * 100 as falseAlarmRate'
                ])
                .where('detection.venueId = :venueId', { venueId })
                .andWhere('detection.detectedAt >= :startDate', { startDate: startOfWeek })
                .getRawOne(),

            // Aylık istatistikler
            this.detectionRepository.createQueryBuilder('detection')
                .select([
                    'COUNT(*) as totalDetections',
                    'AVG(CASE WHEN detection.status = \'handled\' THEN EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt))/60 END) as avgResponseTime',
                    'COUNT(CASE WHEN detection.status = \'false_alarm\' THEN 1 END)::float / COUNT(*) * 100 as falseAlarmRate'
                ])
                .where('detection.venueId = :venueId', { venueId })
                .andWhere('detection.detectedAt >= :startDate', { startDate: startOfMonth })
                .getRawOne()
        ]);

        return {
            today: todayStats,
            thisWeek: weekStats,
            thisMonth: monthStats
        };
    }

    // Günlük istatistikleri getir
    public async getDailyStats(venueId: string, date: Date): Promise<Statistic | null> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const statistic = await this.statisticRepository.findOne({
            where: {
                venueId,
                date: startOfDay
            }
        });

        if (!statistic) {
            // İstatistik bulunamadıysa, hesapla ve kaydet
            return this.calculateAndSaveDailyStats(venueId, date);
        }

        return statistic;
    }
} 