import { AppDataSource } from '../src/config/database';
import { Venue } from '../src/models/Venue';

async function createTestVenue() {
    try {
        await AppDataSource.initialize();
        
        const venueRepository = AppDataSource.getRepository(Venue);
        
        // Test mekanı oluştur
        const venue = venueRepository.create({
            name: 'Test Mekan',
            address: 'Test Adres',
            location: {
                latitude: 41.0082,
                longitude: 28.9784
            },
            floors: [{
                floorNumber: '1',
                floorName: 'Zemin Kat',
                zones: [{
                    id: 'test-zone-1',
                    name: 'Test Bölge 1',
                    coordinates: {
                        x1: 0,
                        y1: 0,
                        x2: 100,
                        y2: 100
                    },
                    cameras: [{
                        id: 'test-camera-1',
                        name: 'Test Kamera 1',
                        location: 'Giriş',
                        coordinates: {
                            x: 50,
                            y: 50
                        },
                        coverageRadius: 10,
                        coverageAngle: 90,
                        smokeDetectionEnabled: true,
                        status: 'active'
                    }]
                }]
            }]
        });
        
        const savedVenue = await venueRepository.save(venue);
        console.log('Test mekanı oluşturuldu:', {
            venueId: savedVenue.id,
            zoneId: savedVenue.floors[0].zones[0].id,
            cameraId: savedVenue.floors[0].zones[0].cameras[0].id
        });
        
    } catch (error) {
        console.error('Hata:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

createTestVenue(); 