import logging
import sys
from pathlib import Path
from pythonjsonlogger import jsonlogger
from config.config import LOGS_DIR, LOG_LEVEL, LOG_FORMAT

def setup_logger(name: str) -> logging.Logger:
    """
    Belirtilen isimde bir logger oluşturur ve yapılandırır.
    
    Args:
        name: Logger ismi
        
    Returns:
        logging.Logger: Yapılandırılmış logger nesnesi
    """
    # Logs dizinini oluştur
    Path(LOGS_DIR).mkdir(parents=True, exist_ok=True)
    
    # Logger'ı oluştur
    logger = logging.getLogger(name)
    logger.setLevel(LOG_LEVEL)
    
    # Formatları oluştur
    console_formatter = logging.Formatter(LOG_FORMAT)
    json_formatter = jsonlogger.JsonFormatter(LOG_FORMAT)
    
    # Konsol handler'ı
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # Dosya handler'ı (JSON formatında)
    file_handler = logging.FileHandler(
        filename=LOGS_DIR / f"{name}.json",
        mode='a',
        encoding='utf-8'
    )
    file_handler.setFormatter(json_formatter)
    logger.addHandler(file_handler)
    
    return logger 