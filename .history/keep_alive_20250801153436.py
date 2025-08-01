import time
import requests

URL = "https://tu-app-en-render.onrender.com"  # Reemplaza con tu URL de Render

while True:
    try:
        response = requests.get(URL)
        print(f"[OK] Servicio activo: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] No se pudo conectar: {e}")
    time.sleep(300)  # Cada 5 minutos
