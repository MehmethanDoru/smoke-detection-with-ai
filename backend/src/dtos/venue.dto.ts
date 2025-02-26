export interface CreateVenueDto {
    name: string;
    address: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    description?: string;
    phone?: string;
    email?: string;
    floors?: {
        floorNumber: string;
        floorName: string;
        dimensions?: {
            width: number;
            length: number;
        };
        zones: {
            name: string;
            coordinates: {
                x1: number;
                y1: number;
                x2: number;
                y2: number;
            };
            cameras: {
                name: string;
                location: string;
                coordinates: {
                    x: number;
                    y: number;
                };
                coverageRadius: number;
                coverageAngle: number;
                smokeDetectionEnabled: boolean;
            }[];
        }[];
    }[];
    settings?: {
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
}

export interface UpdateVenueDto extends Partial<CreateVenueDto> {
    isActive?: boolean;
}

export interface VenueResponseDto {
    id: string;
    name: string;
    address: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    description?: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    floors?: {
        floorNumber: string;
        floorName: string;
        dimensions?: {
            width: number;
            length: number;
        };
        zones: {
            id: string;
            name: string;
            coordinates: {
                x1: number;
                y1: number;
                x2: number;
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
                coverageRadius: number;
                coverageAngle: number;
                smokeDetectionEnabled: boolean;
                status: 'active' | 'inactive';
                lastMaintenanceDate?: Date;
            }[];
        }[];
    }[];
    settings?: {
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
    createdAt: Date;
    updatedAt: Date;
    message?: string;
}

export interface VenueListResponseDto {
    venues: Array<{
        id: string;
        name: string;
        address: string;
        isActive: boolean;
        totalFloors: number;
        totalZones: number;
        totalCameras: number;
        activeDetections: number;
    }>;
    total: number;
    page: number;
    limit: number;
    message?: string;
}

export interface VenueQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: 'name' | 'createdAt' | 'activeDetections';
    sortOrder?: 'ASC' | 'DESC';
} 