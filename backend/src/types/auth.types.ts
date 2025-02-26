import { UserRole } from '../models/enums/UserRole';

export interface TokenPayload {
    userId: string;
    email: string;
    role: UserRole;
    venueId?: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        role: UserRole;
        venueId?: string;
    };
    messages: {
        success: string;  
        error?: string;  
    };
} 