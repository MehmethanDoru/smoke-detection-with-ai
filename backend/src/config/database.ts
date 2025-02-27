import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Venue } from '../models/Venue';
import { ZoneAssignment } from '../models/ZoneAssignment';
import { DetectionEvent } from '../models/DetectionEvent';
import { Camera } from '../models/Camera';
import dotenv from 'dotenv';

// load environment variables
dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
    entities: [User, Venue, ZoneAssignment, DetectionEvent, Camera],
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