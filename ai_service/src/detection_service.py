import cv2
import torch
import time
import asyncio
import base64
import numpy as np
from pathlib import Path
from ultralytics import YOLO
from typing import Dict, Any, Optional, List
from pygame import mixer
import psutil

from config.config import (
    DEFAULT_MODEL_PATH, CONFIDENCE_THRESHOLD, CAMERA_SOURCE,
    CAMERA_ID, VENUE_ID, ZONE_ID, FLOOR_NUMBER,
    BUFFER_SIZE, ALERT_COOLDOWN, SEQUENCE_RESET_TIME, DETECTION_THRESHOLD,
    FRAME_WIDTH, FRAME_HEIGHT, BLUR_KERNEL_SIZE,
    BRIGHTNESS_ALPHA, BRIGHTNESS_BETA, ALERT_SOUND_PATH
)
from .logger import setup_logger
from .api_client import APIClient

logger = setup_logger("detection_service")

class DetectionService:
    def __init__(self):
        self.model = None
        self.cap = None
        self.api_client = APIClient()
        self.detection_buffer = []
        self.last_alert_time = 0
        self.total_detections = 0
        self.detection_sequences = 0
        self.sequence_start_time = time.time()
        self.last_detection_state = False
        self.start_time = time.time()
        self.frame_count = 0
        self.fps = 0
        self.fps_start_time = time.time()
        
    def initialize(self) -> bool:
        """
        Servisi başlatır ve gerekli bileşenleri yükler.
        
        Returns:
            bool: Başarılı/başarısız durumu
        """
        try:
            # Model yükleme
            self.model = YOLO(DEFAULT_MODEL_PATH)
            logger.info(f"Model yüklendi: {DEFAULT_MODEL_PATH}")
            
            # Kamera başlatma
            if CAMERA_SOURCE.isnumeric():
                self.cap = cv2.VideoCapture(int(CAMERA_SOURCE))
            else:
                self.cap = cv2.VideoCapture(CAMERA_SOURCE)
                
            if not self.cap.isOpened():
                raise Exception("Kamera açılamadı!")
                
            # Kamera çözünürlüğünü ayarla
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
            
            # Ses sistemini başlat
            if Path(ALERT_SOUND_PATH).exists():
                mixer.init()
                
            logger.info("Servis başarıyla başlatıldı")
            return True
            
        except Exception as e:
            logger.error(f"Servis başlatılamadı: {str(e)}")
            return False
            
    def process_frame(self, frame: np.ndarray) -> tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Görüntü karesini işler ve tespitleri yapar.
        
        Args:
            frame: İşlenecek görüntü karesi
            
        Returns:
            tuple: İşlenmiş kare ve tespit listesi
        """
        # Görüntü ön işleme
        processed_frame = cv2.GaussianBlur(frame, BLUR_KERNEL_SIZE, 0)
        processed_frame = cv2.convertScaleAbs(
            processed_frame, 
            alpha=BRIGHTNESS_ALPHA, 
            beta=BRIGHTNESS_BETA
        )
        
        # Model tahmini
        results = self.model(processed_frame, conf=CONFIDENCE_THRESHOLD)[0]
        
        # Tespitleri işle
        detections = []
        output_frame = frame.copy()
        
        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            
            # Tespit verilerini hazırla
            detection = {
                "boundingBox": {
                    "x1": x1, "y1": y1,
                    "x2": x2, "y2": y2
                },
                "confidence": conf,
                "center": {
                    "x": (x1 + x2) // 2,
                    "y": (y1 + y2) // 2
                }
            }
            detections.append(detection)
            
            # Görüntüye tespit kutusunu çiz
            cv2.rectangle(output_frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
            label = f"Sigara: {conf:.2f}"
            
            # Etiket arka planı
            (label_width, label_height), _ = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2
            )
            cv2.rectangle(
                output_frame,
                (x1, y1 - label_height - 10),
                (x1 + label_width, y1),
                (0, 0, 255),
                -1
            )
            
            # Etiketi yaz
            cv2.putText(
                output_frame,
                label,
                (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2
            )
            
        return output_frame, detections
        
    def update_metrics(self, detections: List[Dict[str, Any]]):
        """
        Tespit metriklerini günceller.
        
        Args:
            detections: Tespit listesi
        """
        current_time = time.time()
        
        # FPS hesaplama
        self.frame_count += 1
        if self.frame_count % 30 == 0:
            self.fps = 30 / (current_time - self.fps_start_time)
            self.fps_start_time = current_time
            
        # Tespit durumunu güncelle
        current_detection = len(detections) > 0
        if current_detection:
            self.total_detections += 1
            
        # Buffer'a ekle
        self.detection_buffer.append(current_detection)
        if len(self.detection_buffer) > BUFFER_SIZE:
            self.detection_buffer.pop(0)
            
        # Tespit-kayıp döngüsünü takip et
        if current_detection != self.last_detection_state:
            if not current_detection and self.last_detection_state:
                self.detection_sequences += 1
            self.last_detection_state = current_detection
            
        # Döngü sayacını sıfırla
        if current_time - self.sequence_start_time > SEQUENCE_RESET_TIME:
            self.detection_sequences = 0
            self.sequence_start_time = current_time
            
    def should_alert(self) -> bool:
        """
        Uyarı verilip verilmeyeceğini kontrol eder.
        
        Returns:
            bool: Uyarı verilmeli mi
        """
        current_time = time.time()
        buffer_ratio = sum(self.detection_buffer) / len(self.detection_buffer)
        
        return (
            buffer_ratio >= DETECTION_THRESHOLD and
            self.detection_sequences <= 3 and
            current_time - self.last_alert_time > ALERT_COOLDOWN
        )
        
    def play_alert(self):
        """Sesli uyarı verir"""
        if Path(ALERT_SOUND_PATH).exists():
            try:
                mixer.music.load(ALERT_SOUND_PATH)
                mixer.music.play()
            except Exception as e:
                logger.error(f"Ses çalınamadı: {str(e)}")
                
    def prepare_detection_data(self, frame: np.ndarray, detections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Backend'e gönderilecek tespit verilerini hazırlar.
        
        Args:
            frame: Görüntü karesi
            detections: Tespit listesi
            
        Returns:
            Dict[str, Any]: Hazırlanan veri
        """
        # Görüntüyü küçült ve sıkıştır
        scale_percent = 50  # orijinal boyutun %50'si
        width = int(frame.shape[1] * scale_percent / 100)
        height = int(frame.shape[0] * scale_percent / 100)
        frame_resized = cv2.resize(frame, (width, height))
        
        # JPEG kalitesini düşür
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 60]
        _, buffer = cv2.imencode('.jpg', frame_resized, encode_param)
        
        return {
            "venueId": VENUE_ID,
            "floorNumber": FLOOR_NUMBER,
            "zoneId": ZONE_ID,
            "cameraId": CAMERA_ID,
            "location": {
                "x": 0,  # Kamera konumundan hesaplanabilir
                "y": 0,
                "boundingBox": detections[0]["boundingBox"] if detections else None,
                "confidence": detections[0]["confidence"] if detections else 0
            },
            "detectionDetails": {
                "confidence": detections[0]["confidence"] if detections else 0,
                "detectionSequences": len(self.detection_buffer),
                "fps": self.fps
            },
            "imageData": {
                "originalImage": base64.b64encode(buffer).decode('utf-8'),
                "processedImage": base64.b64encode(buffer).decode('utf-8'),
                "annotatedImage": base64.b64encode(buffer).decode('utf-8'),
                "confidence": detections[0]["confidence"] if detections else 0
            },
            "systemMetrics": {
                "cpuPercent": psutil.cpu_percent(),
                "ramPercent": psutil.virtual_memory().percent,
                "detectionRate": self.total_detections / (time.time() - self.start_time) if time.time() - self.start_time > 0 else 0,
                "totalDetections": self.total_detections,
                "elapsedTime": time.time() - self.start_time
            }
        }
        
    async def run(self):
        """Ana servis döngüsü"""
        if not self.initialize():
            return
            
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    logger.error("Kameradan görüntü alınamadı")
                    break
                    
                # Görüntüyü işle ve tespitleri yap
                output_frame, detections = self.process_frame(frame)
                
                # Metrikleri güncelle
                self.update_metrics(detections)
                
                # Uyarı kontrolü
                if self.should_alert():
                    self.play_alert()
                    self.last_alert_time = time.time()
                    
                # Backend'e veri gönder
                if detections:
                    detection_data = self.prepare_detection_data(output_frame, detections)
                    await self.api_client.send_ws_notification(detection_data)
                    self.api_client.send_detection(detection_data)
                    
                # Görüntüyü göster (debug modu için)
                cv2.imshow('Sigara Tespiti', output_frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except Exception as e:
            logger.error(f"Servis çalışırken hata oluştu: {str(e)}")
            
        finally:
            self.cleanup()
            
    def cleanup(self):
        """Kaynakları temizler"""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        mixer.quit()
        asyncio.create_task(self.api_client.close_websocket()) 