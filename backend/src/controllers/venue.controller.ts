import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Venue } from '../models/Venue';
import { User } from '../models/User';
import { AuthError } from '../errors/AuthError';
import { CreateVenueDto, UpdateVenueDto, VenueQueryParams } from '../dtos/venue.dto';
import { UserRole } from '../models/enums/UserRole';
import { v4 as uuidv4 } from 'uuid';

interface ZoneWithId {
    id: string;
    name: string;
    coordinates: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    };
    cameras: CameraWithId[];
}

interface CameraWithId {
    id: string;
    name: string;
    location: string;
    coordinates: {
        x: number;
        y: number;
    };
    coverageRadius: number;
    coverageAngle: number;
    smokeDetectionEnabled: boolean;
    status: 'active' | 'inactive';
}

export class VenueController {
    private venueRepository = AppDataSource.getRepository(Venue);
    private userRepository = AppDataSource.getRepository(User);

    // Mekan listesi
    public getVenues = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                isActive,
                sortBy = 'name',
                sortOrder = 'ASC'
            }: VenueQueryParams = req.query;

            const query = this.venueRepository.createQueryBuilder('venue')
                .leftJoinAndSelect('venue.users', 'users');

            // Arama filtresi
            if (search) {
                query.where(
                    'venue.name ILIKE :search OR venue.address ILIKE :search',
                    { search: `%${search}%` }
                );
            }

            // Aktiflik filtresi
            if (isActive !== undefined) {
                query.andWhere('venue.isActive = :isActive', { isActive });
            }

            // Toplam kayıt sayısı
            const total = await query.getCount();

            // Sıralama
            query.orderBy(`venue.${sortBy}`, sortOrder);

            // Sayfalama
            query.skip((page - 1) * limit)
                .take(limit);

            const venues = await query.getMany();

            // Venue listesi için özet bilgiler
            const venueList = venues.map(venue => ({
                id: venue.id,
                name: venue.name,
                address: venue.address,
                isActive: venue.isActive,
                totalFloors: venue.floors?.length || 0,
                totalZones: venue.floors?.reduce((acc, floor) => acc + floor.zones.length, 0) || 0,
                totalCameras: venue.floors?.reduce((acc, floor) => 
                    acc + floor.zones.reduce((zAcc, zone) => zAcc + zone.cameras.length, 0), 0) || 0,
                activeDetections: 0 // TODO: Detection sayısı eklenecek
            }));

            res.json({
                venues: venueList,
                total,
                page,
                limit,
                message: 'Mekanlar başarıyla listelendi'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Mekanlar listelenirken bir hata oluştu'
            });
        }
    };

    // Mekan detayı
    public getVenueById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const venue = await this.venueRepository.findOne({
                where: { id },
                relations: ['users']
            });

            if (!venue) {
                throw new AuthError(
                    'Venue not found',
                    404,
                    'Mekan bulunamadı'
                );
            }

            res.json({
                ...venue,
                message: 'Mekan detayları başarıyla getirildi'
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
                message: 'Mekan detayları getirilirken bir hata oluştu'
            });
        }
    };

    // Yeni mekan oluşturma
    public createVenue = async (req: Request, res: Response): Promise<void> => {
        try {
            const venueData: CreateVenueDto = req.body;

            // Katlardaki zone ve kameralara ID atama
            if (venueData.floors) {
                venueData.floors = venueData.floors.map(floor => ({
                    ...floor,
                    zones: floor.zones.map(zone => ({
                        ...zone,
                        id: uuidv4(),
                        cameras: zone.cameras.map(camera => ({
                            ...camera,
                            id: uuidv4(),
                            status: 'active' as const
                        }))
                    })) as ZoneWithId[]
                }));
            }

            const venue = this.venueRepository.create(venueData);
            await this.venueRepository.save(venue);

            res.status(201).json({
                ...venue,
                message: 'Mekan başarıyla oluşturuldu'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Mekan oluşturulurken bir hata oluştu'
            });
        }
    };

    // Mekan güncelleme
    public updateVenue = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData: UpdateVenueDto = req.body;

            const venue = await this.venueRepository.findOne({
                where: { id }
            });

            if (!venue) {
                throw new AuthError(
                    'Venue not found',
                    404,
                    'Mekan bulunamadı'
                );
            }

            // Yeni zone veya kamera eklenirse ID atama
            if (updateData.floors) {
                updateData.floors = updateData.floors.map(floor => ({
                    ...floor,
                    zones: floor.zones.map(zone => ({
                        ...zone,
                        id: (zone as ZoneWithId).id || uuidv4(),
                        cameras: zone.cameras.map(camera => ({
                            ...camera,
                            id: (camera as CameraWithId).id || uuidv4(),
                            status: (camera as CameraWithId).status || 'active' as const
                        }))
                    })) as ZoneWithId[]
                }));
            }

            // Mevcut veriyi güncelleme
            Object.assign(venue, updateData);
            await this.venueRepository.save(venue);

            res.json({
                ...venue,
                message: 'Mekan başarıyla güncellendi'
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
                message: 'Mekan güncellenirken bir hata oluştu'
            });
        }
    };

    // Mekan silme (soft delete - isActive = false)
    public deleteVenue = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const venue = await this.venueRepository.findOne({
                where: { id },
                relations: ['users']
            });

            if (!venue) {
                throw new AuthError(
                    'Venue not found',
                    404,
                    'Mekan bulunamadı'
                );
            }

            // Mekana bağlı kullanıcıları pasife alma
            if (venue.users) {
                venue.users.forEach(user => {
                    if (user.role !== UserRole.SYSTEM_ADMIN) {
                        user.isActive = false;
                    }
                });
                await this.userRepository.save(venue.users);
            }

            // Mekanı pasife alma
            venue.isActive = false;
            await this.venueRepository.save(venue);

            res.json({
                success: true,
                message: 'Mekan başarıyla silindi'
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
                message: 'Mekan silinirken bir hata oluştu'
            });
        }
    };
} 