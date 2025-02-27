import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Venue } from './Venue';

@Entity('statistics')
export class Statistic {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    venueId: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'json' })
    hourlyStats: {
        hour: number;
        count: number;
        avgResponseTime?: number;
    }[];

    @Column({ type: 'json' })
    zoneStats: {
        zoneId: string;
        floorNumber: string;
        detectionCount: number;
        avgConfidence: number;
    }[];

    @Column({ type: 'json' })
    cameraStats: {
        cameraId: string;
        detectionCount: number;
        truePositives: number;
        falsePositives: number;
        avgConfidence: number;
        uptime: number;
    }[];

    @Column({ type: 'json' })
    dailyMetrics: {
        totalDetections: number;
        handledDetections: number;
        falseAlarms: number;
        avgHandlingTime: number; // dakika cinsinden
        avgConfidence: number;
    };

    @Column({ type: 'json', nullable: true })
    peakHours: {
        hour: number;
        count: number;
    }[];

    @Column({ type: 'json', nullable: true })
    trendData: {
        previousDay: number;
        weeklyAverage: number;
        monthlyAverage: number;
        yearlyAverage: number;
        percentageChange: {
            daily: number;
            weekly: number;
            monthly: number;
        };
    };

    @Column({ type: 'json', nullable: true })
    performanceMetrics: {
        responseTime: {
            min: number;
            max: number;
            avg: number;
        };
        accuracy: {
            truePositiveRate: number;
            falsePositiveRate: number;
            precision: number;
        };
        systemHealth: {
            uptime: number;
            avgCpuUsage: number;
            avgMemoryUsage: number;
        };
    };

    @ManyToOne(() => Venue)
    @JoinColumn({ name: 'venueId' })
    venue: Venue;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastUpdatedAt: Date;
} 