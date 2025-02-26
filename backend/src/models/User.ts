import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { UserRole } from './enums/UserRole';
import { Venue } from './Venue';
import { ZoneAssignment } from './ZoneAssignment';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    fullName: string;

    // Additional Contact Information
    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    profileImage: string;

    @Column({ type: 'json', nullable: true })
    notificationPreferences: {
        email?: boolean;
        sms?: boolean;
        pushNotification?: boolean;
    };

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.SECURITY
    })
    role: UserRole;

    @ManyToOne(() => Venue, venue => venue.users)
    @JoinColumn({ name: 'venueId' })
    venue: Venue;

    @Column({ nullable: true })
    venueId: string;

    // Work Information
    @Column({ type: 'json', nullable: true })
    workSchedule: {
        monday?: { start: string; end: string; };
        tuesday?: { start: string; end: string; };
        wednesday?: { start: string; end: string; };
        thursday?: { start: string; end: string; };
        friday?: { start: string; end: string; };
        saturday?: { start: string; end: string; };
        sunday?: { start: string; end: string; };
    };

    @OneToMany(() => ZoneAssignment, assignment => assignment.user)
    zoneAssignments: ZoneAssignment[];

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    lastLoginAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    refreshToken: string | null;

    // Helper method to check if user has specific role
    hasRole(role: UserRole): boolean {
        return this.role === role;
    }

    // Helper method to check if user belongs to venue
    belongsToVenue(venueId: string): boolean {
        return this.venueId === venueId;
    }

    // Helper method to check if user is currently assigned to zone
    async isAssignedToZone(zoneId: string): Promise<boolean> {
        return this.zoneAssignments?.some(
            assignment => assignment.zoneId === zoneId && assignment.isActive
        ) || false;
    }
}