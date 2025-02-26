import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';

@Entity('venues')
export class Venue {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    address: string;

    @Column({ type: 'json', nullable: true })
    location: {
        latitude: number;
        longitude: number;
    };

    @Column({ nullable: true })
    description: string;

    // Contact Information
    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ default: true })
    isActive: boolean;

    // Floor and Zone Information
    @Column({ type: 'json', nullable: true })
    floors: {
        floorNumber: string;
        floorName: string;
        dimensions?: {
            width: number;  // metre cinsinden
            length: number; // metre cinsinden
        };
        zones: {
            id: string;
            name: string;
            coordinates: {
                x1: number; // sol üst köşe
                y1: number;
                x2: number; // sağ alt köşe
                y2: number;
            };
            cameras: {
                id: string;
                name: string;
                location: string;
                coordinates: {
                    x: number;
                    y: number;
                };
                coverageRadius: number; // metre cinsinden kapsama alanı
                coverageAngle: number;  // derece cinsinden görüş açısı
                smokeDetectionEnabled: boolean;
                status: 'active' | 'inactive';
                lastMaintenanceDate?: Date;
            }[];
        }[];
    }[];

    @Column({ type: 'json', nullable: true })
    settings: {
        notificationEmail?: string;
        smokeDetectionSensitivity?: 'low' | 'medium' | 'high';
        notificationChannels?: {
            email?: boolean;
            sms?: boolean;
            pushNotification?: boolean;
        };
        analytics?: {
            keepHistoricalData: boolean;
            dataRetentionDays: number;
            heatmapResolution: 'low' | 'medium' | 'high';
            generateReports: boolean;
            reportFrequency: 'daily' | 'weekly' | 'monthly';
        };
    };

    @OneToMany(() => User, user => user.venue)
    users: User[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 