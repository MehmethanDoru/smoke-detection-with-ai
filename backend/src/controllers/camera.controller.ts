import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Camera } from '../models/Camera';
import { Venue } from '../models/Venue';
import { AuthError } from '../errors/AuthError';

export class CameraController {
    private cameraRepository = AppDataSource.getRepository(Camera);
    private venueRepository = AppDataSource.getRepository(Venue);

    // Kamera listesi
    public getCameras = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                venueId,
                floorNumber,
                zoneId,
                status,
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'DESC'
            } = req.query;

            const query = this.cameraRepository.createQueryBuilder('camera')
                .leftJoinAndSelect('camera.venue', 'venue');

            // Filtreler
            if (venueId) {
                query.andWhere('camera.venueId = :venueId', { venueId });
            }
            if (floorNumber) {
                query.andWhere('camera.floorNumber = :floorNumber', { floorNumber });
            }
            if (zoneId) {
                query.andWhere('camera.zoneId = :zoneId', { zoneId });
            }
            if (status) {
                query.andWhere('camera.status = :status', { status });
            }

            // Toplam kayıt sayısı
            const total = await query.getCount();

            // Sıralama ve sayfalama
            query.orderBy(`camera.${sortBy}`, sortOrder as 'ASC' | 'DESC')
                .skip((+page - 1) * +limit)
                .take(+limit);

            const cameras = await query.getMany();

            res.json({
                cameras,
                total,
                page: +page,
                limit: +limit,
                message: 'Kameralar başarıyla listelendi'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Kameralar listelenirken bir hata oluştu'
            });
        }
    };

    // Kamera detayı
    public getCameraById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const camera = await this.cameraRepository.findOne({
                where: { id },
                relations: ['venue']
            });

            if (!camera) {
                throw new AuthError(
                    'Camera not found',
                    404,
                    'Kamera bulunamadı'
                );
            }

            res.json({
                ...camera,
                message: 'Kamera detayları başarıyla getirildi'
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
                message: 'Kamera detayları getirilirken bir hata oluştu'
            });
        }
    };

    // Yeni kamera ekleme
    public createCamera = async (req: Request, res: Response): Promise<void> => {
        try {
            const cameraData = req.body;

            // Mekan kontrolü
            const venue = await this.venueRepository.findOne({
                where: { id: cameraData.venueId }
            });

            if (!venue) {
                throw new AuthError(
                    'Venue not found',
                    404,
                    'Mekan bulunamadı'
                );
            }

            // Bölge kontrolü
            const floor = venue.floors?.find(f => f.floorNumber === cameraData.floorNumber);
            if (!floor) {
                throw new AuthError(
                    'Floor not found',
                    404,
                    'Kat bulunamadı'
                );
            }

            const zone = floor.zones.find(z => z.id === cameraData.zoneId);
            if (!zone) {
                throw new AuthError(
                    'Zone not found',
                    404,
                    'Bölge bulunamadı'
                );
            }

            const camera = this.cameraRepository.create(cameraData);
            await this.cameraRepository.save(camera);

            res.status(201).json({
                ...camera,
                message: 'Kamera başarıyla eklendi'
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
                message: 'Kamera eklenirken bir hata oluştu'
            });
        }
    };

    // Kamera güncelleme
    public updateCamera = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const camera = await this.cameraRepository.findOne({
                where: { id }
            });

            if (!camera) {
                throw new AuthError(
                    'Camera not found',
                    404,
                    'Kamera bulunamadı'
                );
            }

            // Mekan değişiyorsa kontrol
            if (updateData.venueId && updateData.venueId !== camera.venueId) {
                const venue = await this.venueRepository.findOne({
                    where: { id: updateData.venueId }
                });

                if (!venue) {
                    throw new AuthError(
                        'Venue not found',
                        404,
                        'Mekan bulunamadı'
                    );
                }
            }

            Object.assign(camera, updateData);
            await this.cameraRepository.save(camera);

            res.json({
                ...camera,
                message: 'Kamera başarıyla güncellendi'
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
                message: 'Kamera güncellenirken bir hata oluştu'
            });
        }
    };

    // Kamera silme
    public deleteCamera = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const camera = await this.cameraRepository.findOne({
                where: { id }
            });

            if (!camera) {
                throw new AuthError(
                    'Camera not found',
                    404,
                    'Kamera bulunamadı'
                );
            }

            await this.cameraRepository.remove(camera);

            res.json({
                success: true,
                message: 'Kamera başarıyla silindi'
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
                message: 'Kamera silinirken bir hata oluştu'
            });
        }
    };

    // Kamera durumu güncelleme
    public updateCameraStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const camera = await this.cameraRepository.findOne({
                where: { id }
            });

            if (!camera) {
                throw new AuthError(
                    'Camera not found',
                    404,
                    'Kamera bulunamadı'
                );
            }

            camera.status = status;
            if (status === 'maintenance') {
                camera.lastMaintenanceDate = new Date();
            }

            await this.cameraRepository.save(camera);

            res.json({
                ...camera,
                message: 'Kamera durumu başarıyla güncellendi'
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
                message: 'Kamera durumu güncellenirken bir hata oluştu'
            });
        }
    };

    // Kamera istatistiklerini güncelleme
    public updateCameraStatistics = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const statistics = req.body;

            const camera = await this.cameraRepository.findOne({
                where: { id }
            });

            if (!camera) {
                throw new AuthError(
                    'Camera not found',
                    404,
                    'Kamera bulunamadı'
                );
            }

            camera.statistics = {
                ...camera.statistics,
                ...statistics
            };

            await this.cameraRepository.save(camera);

            res.json({
                ...camera,
                message: 'Kamera istatistikleri başarıyla güncellendi'
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
                message: 'Kamera istatistikleri güncellenirken bir hata oluştu'
            });
        }
    };
} 