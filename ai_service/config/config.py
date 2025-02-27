import os
from dotenv import load_dotenv
from pathlib import Path

# .env dosyasını yükle
load_dotenv()

# Temel dizin yolları
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
LOGS_DIR = BASE_DIR / "logs"

# API ve WebSocket ayarları
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000/api")
WS_BASE_URL = os.getenv("WS_BASE_URL", "ws://localhost:3000")
API_KEY = os.getenv("API_KEY", "")

# Model ayarları
DEFAULT_MODEL_PATH = os.getenv("MODEL_PATH", str(MODELS_DIR / "best.pt"))
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))

# Kamera ayarları
CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "0")
CAMERA_ID = os.getenv("CAMERA_ID", "1")
VENUE_ID = os.getenv("VENUE_ID", "1")
ZONE_ID = os.getenv("ZONE_ID", "1")
FLOOR_NUMBER = int(os.getenv("FLOOR_NUMBER", "1"))

# Buffer ayarları
BUFFER_SIZE = int(os.getenv("BUFFER_SIZE", "15"))
ALERT_COOLDOWN = int(os.getenv("ALERT_COOLDOWN", "10"))
SEQUENCE_RESET_TIME = int(os.getenv("SEQUENCE_RESET_TIME", "5"))
DETECTION_THRESHOLD = float(os.getenv("DETECTION_THRESHOLD", "0.7"))

# Görüntü işleme ayarları
FRAME_WIDTH = int(os.getenv("FRAME_WIDTH", "1280"))
FRAME_HEIGHT = int(os.getenv("FRAME_HEIGHT", "720"))
BLUR_KERNEL_SIZE = (3, 3)
BRIGHTNESS_ALPHA = 1.1
BRIGHTNESS_BETA = 10

# Ses ayarları
ALERT_SOUND_PATH = os.getenv("ALERT_SOUND_PATH", str(BASE_DIR / "anons.mp3"))

# Loglama ayarları
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s" 