import json
import asyncio
import websockets
import requests
from typing import Dict, Any, Optional
from config.config import API_BASE_URL, WS_BASE_URL, API_KEY
from .logger import setup_logger

logger = setup_logger("api_client")

class APIClient:
    def __init__(self):
        self.api_base_url = API_BASE_URL
        self.ws_base_url = WS_BASE_URL
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        }
        self.ws_connection = None
        
    def send_detection(self, detection_data: Dict[str, Any]) -> bool:
        """
        Tespit verilerini backend'e gönderir.
        
        Args:
            detection_data: Tespit verileri
            
        Returns:
            bool: Başarılı/başarısız durumu
        """
        try:
            response = requests.post(
                f"{self.api_base_url}/detections",
                headers=self.headers,
                json=detection_data
            )
            response.raise_for_status()
            logger.info("Detection data sent successfully", extra={"detection": detection_data})
            return True
        except Exception as e:
            logger.error(f"Detection data not sent: {str(e)}", 
                        extra={"detection": detection_data, "error": str(e)})
            return False
            
    def get_camera_config(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """
        Get camera configuration from backend.
        
        Args:
            camera_id: Kamera ID'si
            
        Returns:
            Dict[str, Any]: Kamera konfigürasyonu veya None
        """
        try:
            response = requests.get(
                f"{self.api_base_url}/cameras/{camera_id}",
                headers=self.headers
            )
            response.raise_for_status()
            config = response.json()
            logger.info("Camera config fetched", extra={"camera_id": camera_id, "config": config})
            return config
        except Exception as e:
            logger.error(f"Camera config not fetched: {str(e)}", 
                        extra={"camera_id": camera_id, "error": str(e)})
            return None
            
    async def connect_websocket(self):
        """WebSocket connection starts"""
        try:
            self.ws_connection = await websockets.connect(
                f"{self.ws_base_url}/ai",
                extra_headers={"Authorization": f"Bearer {API_KEY}"}
            )
            logger.info("WebSocket connection successful")
            return True
        except Exception as e:
            logger.error(f"WebSocket connection failed: {str(e)}")
            return False
            
    async def send_ws_notification(self, notification_data: Dict[str, Any]):
        """
        Send notification via WebSocket.
        
        Args:
            notification_data: Bildirim verileri
        """
        if not self.ws_connection:
            success = await self.connect_websocket()
            if not success:
                return
                
        try:
            await self.ws_connection.send(json.dumps(notification_data))
            logger.info("Notification sent via WebSocket", extra={"notification": notification_data})
        except Exception as e:
            logger.error(f"Notification not sent via WebSocket: {str(e)}", 
                        extra={"notification": notification_data, "error": str(e)})
            self.ws_connection = None  # Reset connection
            
    async def close_websocket(self):
        """Close WebSocket connection"""
        if self.ws_connection:
            await self.ws_connection.close()
            self.ws_connection = None
            logger.info("WebSocket connection closed") 