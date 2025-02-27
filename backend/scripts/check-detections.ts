import { AppDataSource } from '../src/config/database';
import { DetectionEvent } from '../src/models/DetectionEvent';
import { MoreThan } from 'typeorm';

async function checkDetections() {
    try {
        await AppDataSource.initialize();
        
        const detectionRepository = AppDataSource.getRepository(DetectionEvent);
        
        // Son 5 dakika içindeki tespitleri getir
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const detections = await detectionRepository.find({
            where: {
                detectedAt: MoreThan(fiveMinutesAgo)
            },
            order: {
                detectedAt: 'DESC'
            },
            take: 10
        });
        
        console.log('Son tespitler:', JSON.stringify(detections.map(d => ({
            id: d.id,
            venueId: d.venueId,
            detectedAt: d.detectedAt,
            confidence: d.detectionDetails.confidence,
            status: d.status,
            location: d.location
        })), null, 2));
        
        console.log('Toplam tespit sayısı:', await detectionRepository.count());
        
    } catch (error) {
        console.error('Hata:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

checkDetections(); 