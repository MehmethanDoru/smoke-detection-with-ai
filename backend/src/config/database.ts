import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Venue } from '../models/Venue';
import { ZoneAssignment } from '../models/ZoneAssignment';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'smoke_detection',
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
    entities: [User, Venue, ZoneAssignment],
    subscribers: [],
    migrations: []
});

export const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize();
        console.log('Veritabanı bağlantısı başarılı!');
    } catch (error) {
        console.error('Veritabanı bağlantısı başarısız:', error);
        throw error;
    }
}; 