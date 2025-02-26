import { UserRole } from '../models/enums/UserRole';

export interface RegisterDto {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: UserRole;
    venueId?: string;
    notificationPreferences?: {
        email?: boolean;
        sms?: boolean;
        pushNotification?: boolean;
    };
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponseDto {
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

export interface RefreshTokenDto {
    refreshToken: string;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    newPassword: string;
    confirmNewPassword: string;
} 