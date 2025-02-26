import { AppDataSource } from './database';

/**
 * Test database connection and perform a simple query
 * to verify everything is working correctly
 */
const testConnection = async () => {
    try {
        await AppDataSource.initialize();
        console.log('Database connection successful!');
        
        // Run a test query to verify connection
        const result = await AppDataSource.query('SELECT NOW()');
        console.log('Database time:', result[0].now);
        
        await AppDataSource.destroy();
        console.log('Connection closed successfully.');
    } catch (error) {
        console.error('Database connection failed:', error);
    }
};

testConnection(); 