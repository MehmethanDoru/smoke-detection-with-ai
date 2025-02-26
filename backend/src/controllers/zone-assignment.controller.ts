import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ZoneAssignment } from '../models/ZoneAssignment';
import { User } from '../models/User';
import { Venue } from '../models/Venue';
import { AuthError } from '../errors/AuthError';
import { CreateZoneAssignmentDto, UpdateZoneAssignmentDto, ZoneAssignmentQueryParams } from '../dtos/zone-assignment.dto';
import { UserRole } from '../models/enums/UserRole';

export class ZoneAssignmentController {
    private zoneAssignmentRepository = AppDataSource.getRepository(ZoneAssignment);
    private userRepository = AppDataSource.getRepository(User);
    private venueRepository = AppDataSource.getRepository(Venue);

    // Bölge atamalarını listeleme
    public getZoneAssignments = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                page = 1,
                limit = 10,
                userId,
                venueId,
                floorNumber,
                zoneId,
                isActive,
                sortBy = 'createdAt',
                sortOrder = 'DESC'
            }: ZoneAssignmentQueryParams = req.query;

            const query = this.zoneAssignmentRepository.createQueryBuilder('assignment')
                .leftJoinAndSelect('assignment.user', 'user')
                .leftJoinAndSelect('assignment.venue', 'venue')
                .leftJoinAndSelect('assignment.assignedByUser', 'assignedByUser')
                .leftJoinAndSelect('assignment.endedByUser', 'endedByUser');

            // Filtreler
            if (userId) {
                query.andWhere('assignment.userId = :userId', { userId });
            }
            if (venueId) {
                query.andWhere('assignment.venueId = :venueId', { venueId });
            }
            if (floorNumber) {
                query.andWhere('assignment.floorNumber = :floorNumber', { floorNumber });
            }
            if (zoneId) {
                query.andWhere('assignment.zoneId = :zoneId', { zoneId });
            }
            if (isActive !== undefined) {
                query.andWhere('assignment.isActive = :isActive', { isActive });
            }

            // Toplam kayıt sayısı
            const total = await query.getCount();

            // Sıralama ve sayfalama
            query.orderBy(`assignment.${sortBy}`, sortOrder)
                .skip((page - 1) * limit)
                .take(limit);

            const assignments = await query.getMany();

            // Response formatı
            const formattedAssignments = assignments.map(assignment => ({
                id: assignment.id,
                userId: assignment.userId,
                venueId: assignment.venueId,
                floorNumber: assignment.floorNumber,
                zoneId: assignment.zoneId,
                isActive: assignment.isActive,
                assignedBy: assignment.assignedBy,
                createdAt: assignment.createdAt,
                updatedAt: assignment.updatedAt,
                endedAt: assignment.endedAt,
                endedBy: assignment.endedBy,
                user: assignment.user ? {
                    id: assignment.user.id,
                    fullName: assignment.user.fullName,
                    email: assignment.user.email,
                    phone: assignment.user.phone
                } : undefined,
                venue: assignment.venue ? {
                    id: assignment.venue.id,
                    name: assignment.venue.name,
                    floor: assignment.venue.floors?.find(f => f.floorNumber === assignment.floorNumber) ? {
                        floorNumber: assignment.floorNumber,
                        floorName: assignment.venue.floors.find(f => f.floorNumber === assignment.floorNumber)?.floorName,
                        zone: assignment.venue.floors
                            .find(f => f.floorNumber === assignment.floorNumber)?.zones
                            .find(z => z.id === assignment.zoneId)
                    } : undefined
                } : undefined
            }));

            res.json({
                assignments: formattedAssignments,
                total,
                page,
                limit,
                message: 'Bölge atamaları başarıyla listelendi'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Bölge atamaları listelenirken bir hata oluştu'
            });
        }
    };

    // Bölge atama detayı
    public getZoneAssignmentById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const assignment = await this.zoneAssignmentRepository.findOne({
                where: { id },
                relations: ['user', 'venue', 'assignedByUser', 'endedByUser']
            });

            if (!assignment) {
                throw new AuthError(
                    'Zone assignment not found',
                    404,
                    'Bölge ataması bulunamadı'
                );
            }

            res.json({
                ...assignment,
                message: 'Bölge atama detayları başarıyla getirildi'
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
                message: 'Bölge atama detayları getirilirken bir hata oluştu'
            });
        }
    };

    // Yeni bölge ataması oluşturma
    public createZoneAssignment = async (req: Request, res: Response): Promise<void> => {
        try {
            const assignmentData: CreateZoneAssignmentDto = req.body;
            const adminId = (req.user as { id: string }).id;

            // Kullanıcı kontrolü
            const user = await this.userRepository.findOne({
                where: { id: assignmentData.userId }
            });

            if (!user) {
                throw new AuthError(
                    'User not found',
                    404,
                    'Kullanıcı bulunamadı'
                );
            }

            if (user.role !== UserRole.SECURITY_STAFF) {
                throw new AuthError(
                    'Invalid user role',
                    400,
                    'Sadece güvenlik personeli bölgelere atanabilir'
                );
            }

            // Mekan kontrolü
            const venue = await this.venueRepository.findOne({
                where: { id: assignmentData.venueId }
            });

            if (!venue) {
                throw new AuthError(
                    'Venue not found',
                    404,
                    'Mekan bulunamadı'
                );
            }

            // Bölge kontrolü
            const floor = venue.floors?.find(f => f.floorNumber === assignmentData.floorNumber);
            if (!floor) {
                throw new AuthError(
                    'Floor not found',
                    404,
                    'Kat bulunamadı'
                );
            }

            const zone = floor.zones.find(z => z.id === assignmentData.zoneId);
            if (!zone) {
                throw new AuthError(
                    'Zone not found',
                    404,
                    'Bölge bulunamadı'
                );
            }

            // Aktif atama kontrolü
            const existingAssignment = await this.zoneAssignmentRepository.findOne({
                where: {
                    userId: assignmentData.userId,
                    isActive: true
                }
            });

            if (existingAssignment) {
                throw new AuthError(
                    'Active assignment exists',
                    400,
                    'Kullanıcının aktif bir bölge ataması zaten var'
                );
            }

            const assignment = this.zoneAssignmentRepository.create({
                ...assignmentData,
                assignedBy: adminId
            });

            await this.zoneAssignmentRepository.save(assignment);

            res.status(201).json({
                ...assignment,
                message: 'Bölge ataması başarıyla oluşturuldu'
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
                message: 'Bölge ataması oluşturulurken bir hata oluştu'
            });
        }
    };

    // Bölge ataması güncelleme (sonlandırma)
    public updateZoneAssignment = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData: UpdateZoneAssignmentDto = req.body;
            const adminId = (req.user as { id: string }).id;

            const assignment = await this.zoneAssignmentRepository.findOne({
                where: { id }
            });

            if (!assignment) {
                throw new AuthError(
                    'Zone assignment not found',
                    404,
                    'Bölge ataması bulunamadı'
                );
            }

            // Atama sonlandırma
            if (updateData.isActive === false && assignment.isActive) {
                assignment.isActive = false;
                assignment.endedAt = new Date();
                assignment.endedBy = adminId;
            }

            await this.zoneAssignmentRepository.save(assignment);

            res.json({
                ...assignment,
                message: 'Bölge ataması başarıyla güncellendi'
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
                message: 'Bölge ataması güncellenirken bir hata oluştu'
            });
        }
    };
} 