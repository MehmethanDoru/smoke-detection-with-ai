export class AuthError extends Error {
    constructor(
        message: string,
        public statusCode: number = 401,
        public userMessage: string = 'Kimlik doğrulama hatası'
    ) {
        super(message);
        this.name = 'AuthError';
    }
} 