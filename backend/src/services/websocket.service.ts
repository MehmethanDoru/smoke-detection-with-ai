import WebSocket from 'ws';
import { Server } from 'http';
import { DetectionEvent } from '../models/DetectionEvent';
import { UserRole } from '../models/enums/UserRole';

interface WebSocketClient {
    ws: WebSocket;
    userId: string;
    role: UserRole;
    venueId?: string;
}

export class WebSocketService {
    private wss: WebSocket.Server;
    private clients: Map<string, WebSocketClient> = new Map();

    constructor(server: Server) {
        this.wss = new WebSocket.Server({ server });
        this.initialize();
    }

    private initialize() {
        this.wss.on('connection', (ws: WebSocket, req: any) => {
            // Token ve kullanıcı bilgilerini al
            const token = req.url?.split('token=')[1];
            if (!token) {
                ws.close(1008, 'Yetkilendirme başarısız');
                return;
            }

            try {
                // Token'dan kullanıcı bilgilerini al
                const [userId, role, venueId] = token.split('.');
                const clientId = req.headers['sec-websocket-key'];

                // Client'ı kaydet
                this.clients.set(clientId, {
                    ws,
                    userId,
                    role: role as UserRole,
                    venueId: venueId === 'undefined' ? undefined : venueId
                });

                console.log(`Yeni WebSocket bağlantısı: ${clientId} (${role})`);

                ws.send(JSON.stringify({
                    type: 'connection',
                    message: 'WebSocket bağlantısı başarılı'
                }));

                ws.on('close', () => {
                    this.clients.delete(clientId);
                    console.log(`WebSocket bağlantısı kapandı: ${clientId}`);
                });

                ws.on('error', (error) => {
                    console.error(`WebSocket hatası (${clientId}):`, error);
                    this.clients.delete(clientId);
                });

            } catch (error) {
                console.error('WebSocket bağlantı hatası:', error);
                ws.close(1008, 'Yetkilendirme başarısız');
            }
        });
    }

    // Yetkili client'lara mesaj gönder
    private sendToAuthorizedClients(data: any, venueId?: string) {
        this.clients.forEach((client) => {
            const { ws, role, venueId: clientVenueId } = client;

            // Sistem yöneticileri her şeyi görebilir
            if (role === UserRole.SYSTEM_ADMIN) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(data));
                }
                return;
            }

            // Mekan yöneticileri ve güvenlik görevlileri sadece kendi mekanlarını görebilir
            if (venueId && clientVenueId === venueId) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(data));
                }
            }
        });
    }

    // Yeni tespit bildirimi gönder
    public sendDetectionNotification(detection: DetectionEvent) {
        const notificationData = {
            type: 'detection',
            data: {
                id: detection.id,
                venueId: detection.venueId,
                floorNumber: detection.floorNumber,
                zoneId: detection.zoneId,
                location: detection.location,
                detectionDetails: detection.detectionDetails,
                imageData: {
                    annotatedImage: detection.imageData.annotatedImage
                },
                detectedAt: detection.detectedAt
            }
        };

        this.sendToAuthorizedClients(notificationData, detection.venueId);
    }

    // İstatistik güncellemesi gönder
    public sendStatisticsUpdate(statistics: any, venueId?: string) {
        const statsData = {
            type: 'statistics',
            data: statistics
        };

        this.sendToAuthorizedClients(statsData, venueId);
    }
} 