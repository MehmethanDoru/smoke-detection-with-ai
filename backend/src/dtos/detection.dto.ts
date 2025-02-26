export interface CreateDetectionDto {
    venueId: string;
    floorNumber: string;
    zoneId: string;
    cameraId: string;
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
    detectionDetails: {
        confidence: number;
        detectionSequences: number;
        fps: number;
    };
    imageData: {
        originalImage: string;
        processedImage: string;
        annotatedImage: string;
        confidence: number;
    };
    systemMetrics?: {
        cpuPercent: number;
        ramPercent: number;
        detectionRate: number;
        totalDetections: number;
        elapsedTime: number;
    };
}

export interface UpdateDetectionDto {
    status?: 'pending' | 'notified' | 'handled' | 'false_alarm';
    handledBy?: string;
    notes?: string;
}

export interface DetectionResponseDto {
    id: string;
    venueId: string;
    floorNumber: string;
    zoneId: string;
    cameraId: string;
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
    detectionDetails: {
        confidence: number;
        detectionSequences: number;
        fps: number;
    };
    status: 'pending' | 'notified' | 'handled' | 'false_alarm';
    detectedAt: Date;
    handledBy?: string;
    handledAt?: Date;
    notes?: string;
    imageData: {
        originalImage: string;
        processedImage: string;
        annotatedImage: string;
        confidence: number;
    };
    systemMetrics?: {
        cpuPercent: number;
        ramPercent: number;
        detectionRate: number;
        totalDetections: number;
        elapsedTime: number;
    };
    notificationDetails?: {
        sentTo: string[];
        sentAt: Date;
        method: 'email' | 'sms' | 'push';
        status: 'sent' | 'delivered' | 'failed';
    }[];
    venue?: {
        id: string;
        name: string;
        floor?: {
            floorNumber: string;
            floorName: string;
            zone?: {
                id: string;
                name: string;
                camera?: {
                    id: string;
                    name: string;
                    location: string;
                };
            };
        };
    };
    handler?: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
    };
}

export interface DetectionListResponseDto {
    detections: DetectionResponseDto[];
    total: number;
    page: number;
    limit: number;
    message?: string;
}

export interface DetectionQueryParams {
    page?: number;
    limit?: number;
    venueId?: string;
    floorNumber?: string;
    zoneId?: string;
    cameraId?: string;
    status?: 'pending' | 'notified' | 'handled' | 'false_alarm';
    startDate?: Date;
    endDate?: Date;
    minConfidence?: number;
    sortBy?: 'detectedAt' | 'handledAt' | 'confidence';
    sortOrder?: 'ASC' | 'DESC';
} 