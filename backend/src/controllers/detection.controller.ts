import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { DetectionEvent } from '../models/DetectionEvent';
import { Venue } from '../models/Venue';
import { AuthError } from '../errors/AuthError';
import { CreateDetectionDto, UpdateDetectionDto, DetectionQueryParams } from '../dtos/detection.dto';

export class DetectionController {
    private detectionRepository = AppDataSource.getRepository(DetectionEvent);
    private venueRepository = AppDataSource.getRepository(Venue);

    // Tespit listesi
    public getDetections = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                page = 1,
                limit = 10,
                venueId,
                floorNumber,
                zoneId,
                cameraId,
                status,
                startDate,
                endDate,
                minConfidence,
                sortBy = 'detectedAt',
                sortOrder = 'DESC'
            }: DetectionQueryParams = req.query;

            const query = this.detectionRepository.createQueryBuilder('detection')
                .leftJoinAndSelect('detection.venue', 'venue')
                .leftJoinAndSelect('detection.handler', 'handler');

            // Filtreler
            if (venueId) {
                query.andWhere('detection.venueId = :venueId', { venueId });
            }
            if (floorNumber) {
                query.andWhere('detection.floorNumber = :floorNumber', { floorNumber });
            }
            if (zoneId) {
                query.andWhere('detection.zoneId = :zoneId', { zoneId });
            }
            if (cameraId) {
                query.andWhere('detection.cameraId = :cameraId', { cameraId });
            }
            if (status) {
                query.andWhere('detection.status = :status', { status });
            }
            if (startDate && endDate) {
                query.andWhere('detection.detectedAt BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate
                });
            } else if (startDate) {
                query.andWhere('detection.detectedAt >= :startDate', { startDate });
            } else if (endDate) {
                query.andWhere('detection.detectedAt <= :endDate', { endDate });
            }
            if (minConfidence) {
                query.andWhere('(detection.location->\'confidence\')::float >= :minConfidence', { minConfidence });
            }

            // Toplam kayıt sayısı
            const total = await query.getCount();

            // Sıralama ve sayfalama
            if (sortBy === 'confidence') {
                query.orderBy('(detection.detectionDetails->\'confidence\')::float', sortOrder);
            } else {
                query.orderBy(`detection.${sortBy}`, sortOrder);
            }
            query.skip((page - 1) * limit)
                .take(limit);

            const detections = await query.getMany();

            // Response formatı
            const formattedDetections = detections.map(detection => ({
                id: detection.id,
                venueId: detection.venueId,
                floorNumber: detection.floorNumber,
                zoneId: detection.zoneId,
                cameraId: detection.cameraId,
                location: detection.location,
                detectionDetails: detection.detectionDetails,
                status: detection.status,
                detectedAt: detection.detectedAt,
                handledBy: detection.handledBy,
                handledAt: detection.handledAt,
                notes: detection.notes,
                imageData: detection.imageData,
                systemMetrics: detection.systemMetrics,
                notificationDetails: detection.notificationDetails,
                venue: detection.venue ? {
                    id: detection.venue.id,
                    name: detection.venue.name,
                    floor: detection.venue.floors?.find(f => f.floorNumber === detection.floorNumber) ? {
                        floorNumber: detection.floorNumber,
                        floorName: detection.venue.floors.find(f => f.floorNumber === detection.floorNumber)?.floorName,
                        zone: detection.venue.floors
                            .find(f => f.floorNumber === detection.floorNumber)?.zones
                            .find(z => z.id === detection.zoneId)
                    } : undefined
                } : undefined,
                handler: detection.handler ? {
                    id: detection.handler.id,
                    fullName: detection.handler.fullName,
                    email: detection.handler.email,
                    phone: detection.handler.phone
                } : undefined
            }));

            res.json({
                detections: formattedDetections,
                total,
                page,
                limit,
                message: 'Tespit listesi başarıyla getirildi'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Tespit listesi getirilirken bir hata oluştu'
            });
        }
    };

    // Tespit detayı
    public getDetectionById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const detection = await this.detectionRepository.findOne({
                where: { id },
                relations: ['venue', 'handler']
            });

            if (!detection) {
                throw new AuthError(
                    'Detection not found',
                    404,
                    'Tespit bulunamadı'
                );
            }

            res.json({
                ...detection,
                message: 'Tespit detayları başarıyla getirildi'
            });

        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.userMessage
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Tespit detayları getirilirken bir hata oluştu'
            });
        }
    };

    // Yeni tespit oluşturma (AI sisteminden gelecek)
    public createDetection = async (req: Request, res: Response): Promise<void> => {
        try {
            const detectionData: CreateDetectionDto = req.body;

            // Mekan kontrolü
            const venue = await this.venueRepository.findOne({
                where: { id: detectionData.venueId }
            });

            if (!venue) {
                throw new AuthError(
                    'Venue not found',
                    404,
                    'Mekan bulunamadı'
                );
            }

            // Bölge ve kamera kontrolü
            const floor = venue.floors?.find(f => f.floorNumber === detectionData.floorNumber);
            if (!floor) {
                throw new AuthError(
                    'Floor not found',
                    404,
                    'Kat bulunamadı'
                );
            }

            const zone = floor.zones.find(z => z.id === detectionData.zoneId);
            if (!zone) {
                throw new AuthError(
                    'Zone not found',
                    404,
                    'Bölge bulunamadı'
                );
            }

            const camera = zone.cameras.find(c => c.id === detectionData.cameraId);
            if (!camera) {
                throw new AuthError(
                    'Camera not found',
                    404,
                    'Kamera bulunamadı'
                );
            }

            // Yeni tespit oluşturma
            const detection = this.detectionRepository.create({
                ...detectionData,
                detectedAt: new Date()
            });

            await this.detectionRepository.save(detection);

            // TODO: Bildirim gönderme işlemi burada yapılacak

            res.status(201).json({
                ...detection,
                message: 'Tespit başarıyla kaydedildi'
            });

        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.userMessage
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Tespit kaydedilirken bir hata oluştu'
            });
        }
    };

    // Tespit güncelleme (işleme alma, yanlış alarm olarak işaretleme)
    public updateDetection = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData: UpdateDetectionDto = req.body;
            const userId = (req.user as { id: string }).id;

            const detection = await this.detectionRepository.findOne({
                where: { id }
            });

            if (!detection) {
                throw new AuthError(
                    'Detection not found',
                    404,
                    'Tespit bulunamadı'
                );
            }

            // Tespit işleme alma veya yanlış alarm olarak işaretleme
            if (updateData.status) {
                detection.status = updateData.status;
                if (updateData.status === 'handled' || updateData.status === 'false_alarm') {
                    detection.handledBy = userId;
                    detection.handledAt = new Date();
                }
            }

            if (updateData.notes) {
                detection.notes = updateData.notes;
            }

            await this.detectionRepository.save(detection);

            res.json({
                ...detection,
                message: 'Tespit başarıyla güncellendi'
            });

        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.userMessage
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Tespit güncellenirken bir hata oluştu'
            });
        }
    };

    // İstatistikler
    public getStatistics = async (req: Request, res: Response): Promise<void> => {
        try {
            const { venueId, startDate, endDate } = req.query;

            const query = this.detectionRepository.createQueryBuilder('detection');

            if (venueId) {
                query.where('detection.venueId = :venueId', { venueId });
            }

            if (startDate && endDate) {
                query.andWhere('detection.detectedAt BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate
                });
            }

            // Toplam tespit sayısı
            const totalDetections = await query.getCount();

            // Durum bazında tespit sayıları
            const statusCounts = await query
                .select('detection.status, COUNT(*) as count')
                .groupBy('detection.status')
                .getRawMany();

            // Ortalama işleme süresi (dakika)
            const avgHandlingTime = await query
                .select('AVG(EXTRACT(EPOCH FROM (detection.handledAt - detection.detectedAt)))/60', 'avgTime')
                .where('detection.status = :status', { status: 'handled' })
                .getRawOne();

            // Bölge bazında tespit sayıları
            const zoneStats = await query
                .select('detection.zoneId, COUNT(*) as count')
                .groupBy('detection.zoneId')
                .getRawMany();

            // Kamera bazında tespit sayıları
            const cameraStats = await query
                .select('detection.cameraId, COUNT(*) as count')
                .groupBy('detection.cameraId')
                .getRawMany();

            res.json({
                totalDetections,
                byStatus: statusCounts,
                avgHandlingTime: avgHandlingTime?.avgTime || 0,
                byZone: zoneStats,
                byCamera: cameraStats,
                message: 'İstatistikler başarıyla getirildi'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'İstatistikler getirilirken bir hata oluştu'
            });
        }
    };
} 