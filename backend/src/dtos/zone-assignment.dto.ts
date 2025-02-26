export interface CreateZoneAssignmentDto {
    userId: string;
    venueId: string;
    floorNumber: string;
    zoneId: string;
}

export interface UpdateZoneAssignmentDto {
    isActive?: boolean;
}

export interface ZoneAssignmentResponseDto {
    id: string;
    userId: string;
    venueId: string;
    floorNumber: string;
    zoneId: string;
    isActive: boolean;
    assignedBy: string;
    createdAt: Date;
    updatedAt: Date;
    endedAt?: Date;
    endedBy?: string;
    user?: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
    };
    venue?: {
        id: string;
        name: string;
        floor?: {
            floorNumber: string;
            floorName: string;
            zone?: {
                id: string;
                name: string;
            };
        };
    };
    message?: string;
}

export interface ZoneAssignmentListResponseDto {
    assignments: ZoneAssignmentResponseDto[];
    total: number;
    page: number;
    limit: number;
    message?: string;
}

export interface ZoneAssignmentQueryParams {
    page?: number;
    limit?: number;
    userId?: string;
    venueId?: string;
    floorNumber?: string;
    zoneId?: string;
    isActive?: boolean;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'ASC' | 'DESC';
} 