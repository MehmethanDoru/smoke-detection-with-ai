import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Venue } from './Venue';

@Entity('detection_events')
export class DetectionEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    venueId: string;

    @Column()
    floorNumber: string;

    @Column()
    zoneId: string;

    @Column()
    cameraId: string;

    @Column({ type: 'json' })
    location: {
        x: number;
        y: number;
        boundingBox: {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        };
        confidence: number;
    };

    @Column({ type: 'json' })
    detectionDetails: {
        confidence: number;
        detectionSequences: number;
        fps: number;
    };

    @Column({ type: 'timestamp' })
    detectedAt: Date;

    @Column({ 
        type: 'enum', 
        enum: ['pending', 'notified', 'handled', 'false_alarm'],
        default: 'pending'
    })
    status: 'pending' | 'notified' | 'handled' | 'false_alarm';

    @Column({ nullable: true })
    handledBy: string;

    @Column({ nullable: true })
    handledAt: Date;

    @Column({ type: 'json', nullable: true })
    notificationDetails: {
        sentTo: string[];
        sentAt: Date;
        method: 'email' | 'sms' | 'push';
        status: 'sent' | 'delivered' | 'failed';
    }[];

    @Column({ nullable: true })
    notes: string;

    @Column({ type: 'json' })
    imageData: {
        originalImage: string;
        processedImage: string;
        annotatedImage: string;
        confidence: number;
    };

    @Column({ type: 'json', nullable: true })
    systemMetrics: {
        cpuPercent: number;
        ramPercent: number;
        detectionRate: number;
        totalDetections: number;
        elapsedTime: number;
        bufferMetrics?: {
            bufferSize: number;
            detectionFrequency: number;  // Tespitlerin sıklığı (tespit/saniye)
            falsePositiveRate: number;   // Yanlış tespit oranı
            timeSinceLastDetection: number; // Son tespiten bu yana geçen süre (saniye)
            consecutiveDetections: number;   // Ardışık tespit sayısı
        };
    };

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Venue)
    @JoinColumn({ name: 'venueId' })
    venue: Venue;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'handledBy' })
    handler: User;
} 