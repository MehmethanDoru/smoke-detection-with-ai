import base64
import json
import psycopg2
from datetime import datetime
from pathlib import Path

# Veritabanı bağlantı bilgileri
conn = psycopg2.connect(
    dbname="smoke_detection_db",
    user="postgres",
    password="X2JNe&0tO6h.",
    host="localhost",
    port="5432"
)

# Çıktı klasörü oluştur
output_dir = Path("decoded_images")
output_dir.mkdir(exist_ok=True)

try:
    cur = conn.cursor()
    
    # Son tespitleri al
    cur.execute("SELECT id, \"imageData\", \"detectedAt\" FROM detection_events ORDER BY \"detectedAt\" DESC")
    rows = cur.fetchall()
    
    for row in rows:
        detection_id = row[0]
        image_data = row[1]
        detected_at = row[2]
        
        # Base64 görüntüyü çöz
        if isinstance(image_data, str):
            image_data = json.loads(image_data)
        
        # Original ve annotated görüntüleri kaydet
        for img_type in ['originalImage', 'annotatedImage']:
            if img_type in image_data:
                img_base64 = image_data[img_type]
                
                # Base64 başlığını kaldır
                if ',' in img_base64:
                    img_base64 = img_base64.split(',')[1]
                
                # Görüntüyü kaydet
                img_bytes = base64.b64decode(img_base64)
                
                filename = f"{detection_id}_{img_type}_{detected_at.strftime('%Y%m%d_%H%M%S')}.jpg"
                with open(output_dir / filename, 'wb') as f:
                    f.write(img_bytes)
                print(f"Kaydedildi: {filename}")

finally:
    cur.close()
    conn.close()

print("Tüm görüntüler başarıyla çözüldü ve kaydedildi.") 