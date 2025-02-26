import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Venue } from './Venue';

@Entity('zone_assignments')
export class ZoneAssignment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    venueId: string;

    @Column()
    floorNumber: string;

    @Column()
    zoneId: string;

    @Column({ default: true })
    isActive: boolean;

    @Column()
    assignedBy: string;

    @Column({ nullable: true })
    endedAt: Date;

    @Column({ nullable: true })
    endedBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'assignedBy' })
    assignedByUser: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'endedBy' })
    endedByUser: User;

    @ManyToOne(() => Venue)
    @JoinColumn({ name: 'venueId' })
    venue: Venue;
} 