import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Venue } from './Venue';

@Entity('cameras')
export class Camera {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    ipAddress: string;

    @Column()
    location: string;

    @Column()
    floorNumber: string;

    @Column()
    zoneId: string;

    @Column({ type: 'json' })
    coordinates: {
        x: number;
        y: number;
    };

    @Column({ type: 'float' })
    coverageRadius: number;

    @Column({ type: 'float' })
    coverageAngle: number;

    @Column({ default: true })
    smokeDetectionEnabled: boolean;

    @Column({
        type: 'enum',
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    })
    status: 'active' | 'inactive' | 'maintenance';

    @Column({ nullable: true })
    lastMaintenanceDate: Date;

    @Column({ type: 'json', nullable: true })
    statistics: {
        totalDetections: number;
        truePositives: number;
        falsePositives: number;
        averageConfidence: number;
        lastDetectionAt?: Date;
        uptimePercentage: number;
    };

    @Column({ type: 'json', nullable: true })
    technicalDetails: {
        model?: string;
        manufacturer?: string;
        resolution?: string;
        firmware?: string;
        lastFirmwareUpdate?: Date;
    };

    @ManyToOne(() => Venue, venue => venue.cameras)
    venue: Venue;

    @Column()
    venueId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 