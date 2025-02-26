import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { AuthError } from '../errors/AuthError';
import { compare, hash } from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.utils';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto, AuthResponseDto } from '../dtos/auth.dto';

export class AuthController {
    private userRepository = AppDataSource.getRepository(User);

    // Kullanıcı kaydı
    public register = async (req: Request, res: Response): Promise<void> => {
        try {
            const userData: RegisterDto = req.body;

            // Email kontrolü
            const existingUser = await this.userRepository.findOne({
                where: { email: userData.email }
            });

            if (existingUser) {
                throw new AuthError(
                    'Email already exists',
                    400,
                    'Bu e-posta adresi zaten kullanımda'
                );
            }

            // Şifre hashleme
            const hashedPassword = await hash(userData.password, 12);

            // Yeni kullanıcı oluşturma
            const newUser = this.userRepository.create({
                ...userData,
                password: hashedPassword
            });

            await this.userRepository.save(newUser);

            // Token oluşturma
            const payload = {
                userId: newUser.id,
                email: newUser.email,
                role: newUser.role,
                venueId: newUser.venueId
            };

            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);

            // Refresh token'ı kaydetme
            newUser.refreshToken = refreshToken;
            await this.userRepository.save(newUser);

            const response: AuthResponseDto = {
                accessToken,
                refreshToken,
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    role: newUser.role,
                    venueId: newUser.venueId
                },
                messages: {
                    success: 'Kayıt işlemi başarılı'
                }
            };

            res.status(201).json(response);

        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.userMessage
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Kayıt işlemi sırasında bir hata oluştu'
            });
        }
    };

    // Kullanıcı girişi
    public login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password }: LoginDto = req.body;

            // Kullanıcı kontrolü
            const user = await this.userRepository.findOne({
                where: { email }
            });

            if (!user) {
                throw new AuthError(
                    'User not found',
                    401,
                    'E-posta veya şifre hatalı'
                );
            }

            // Şifre kontrolü
            const isValidPassword = await compare(password, user.password);
            if (!isValidPassword) {
                throw new AuthError(
                    'Invalid password',
                    401,
                    'E-posta veya şifre hatalı'
                );
            }

            if (!user.isActive) {
                throw new AuthError(
                    'User is inactive',
                    403,
                    'Hesabınız aktif değil'
                );
            }

            // Token oluşturma
            const payload = {
                userId: user.id,
                email: user.email,
                role: user.role,
                venueId: user.venueId
            };

            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);

            // Refresh token'ı kaydetme ve son giriş tarihini güncelleme
            user.refreshToken = refreshToken;
            user.lastLoginAt = new Date();
            await this.userRepository.save(user);

            const response: AuthResponseDto = {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    venueId: user.venueId
                },
                messages: {
                    success: 'Giriş başarılı'
                }
            };

            res.json(response);

        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.userMessage
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Giriş işlemi sırasında bir hata oluştu'
            });
        }
    };

    // Token yenileme
    public refreshToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { refreshToken }: RefreshTokenDto = req.body;

            // Token'ı doğrulama
            const decoded = verifyToken(refreshToken, true);

            // Kullanıcı kontrolü
            const user = await this.userRepository.findOne({
                where: { 
                    id: decoded.userId,
                    refreshToken 
                }
            });

            if (!user) {
                throw new AuthError(
                    'Invalid refresh token',
                    401,
                    'Oturum süresi doldu, lütfen tekrar giriş yapın'
                );
            }

            if (!user.isActive) {
                throw new AuthError(
                    'User is inactive',
                    403,
                    'Hesabınız aktif değil'
                );
            }

            // Yeni token'lar oluşturma
            const payload = {
                userId: user.id,
                email: user.email,
                role: user.role,
                venueId: user.venueId
            };

            const newAccessToken = generateAccessToken(payload);
            const newRefreshToken = generateRefreshToken(payload);

            // Yeni refresh token'ı kaydetme
            user.refreshToken = newRefreshToken;
            await this.userRepository.save(user);

            const response: AuthResponseDto = {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    venueId: user.venueId
                },
                messages: {
                    success: 'Token yenilendi'
                }
            };

            res.json(response);

        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.userMessage
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Token yenileme işlemi sırasında bir hata oluştu'
            });
        }
    };

    // Şifre değiştirme
    public changePassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const { currentPassword, newPassword, confirmNewPassword }: ChangePasswordDto = req.body;

            if (!userId) {
                throw new AuthError(
                    'User not authenticated',
                    401,
                    'Lütfen giriş yapın'
                );
            }

            if (newPassword !== confirmNewPassword) {
                throw new AuthError(
                    'Passwords do not match',
                    400,
                    'Yeni şifreler eşleşmiyor'
                );
            }

            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                throw new AuthError(
                    'User not found',
                    404,
                    'Kullanıcı bulunamadı'
                );
            }

            // Mevcut şifre kontrolü
            const isValidPassword = await compare(currentPassword, user.password);
            if (!isValidPassword) {
                throw new AuthError(
                    'Invalid current password',
                    401,
                    'Mevcut şifre hatalı'
                );
            }

            // Yeni şifreyi hashleme ve kaydetme
            const hashedNewPassword = await hash(newPassword, 12);
            user.password = hashedNewPassword;
            await this.userRepository.save(user);

            res.json({
                success: true,
                message: 'Şifreniz başarıyla değiştirildi'
            });

        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.userMessage
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Şifre değiştirme işlemi sırasında bir hata oluştu'
            });
        }
    };

    // Çıkış yapma
    public logout = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;

            if (userId) {
                const user = await this.userRepository.findOne({
                    where: { id: userId }
                });

                if (user) {
                    user.refreshToken = null;
                    await this.userRepository.save(user);
                }
            }

            res.json({
                success: true,
                message: 'Çıkış başarılı'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Çıkış işlemi sırasında bir hata oluştu'
            });
        }
    };
} 