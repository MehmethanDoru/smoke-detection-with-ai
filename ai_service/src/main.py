import asyncio
import torch
from pathlib import Path
from .detection_service import DetectionService
from .logger import setup_logger

logger = setup_logger("main")

async def main():
    """
    Ana uygulama fonksiyonu
    """
    try:
        # GPU kontrolü
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Cihaz: {device}")
        
        # Model dosyasını kontrol et
        model_path = Path("models/best.pt")
        if not model_path.exists():
            logger.error(f"Model dosyası bulunamadı: {model_path}")
            return
            
        # Servisi başlat
        service = DetectionService()
        await service.run()
        
    except Exception as e:
        logger.error(f"Uygulama çalışırken hata oluştu: {str(e)}")
        
if __name__ == "__main__":
    asyncio.run(main()) 