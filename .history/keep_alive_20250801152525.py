import time
import requests

# URL de tu servicio Render (la URL pública que Render te dio)
URL = "https://reportes-ju74.onrender.com/"

# Intervalo en segundos (5 minutos recomendado para evitar exceso)
INTERVAL = 300

def keep_alive():
    while True:
        try:
            response = requests.get(URL, timeout=10)
            if response.status_code == 200:
                print(f"[OK] Servicio activo: {response.status_code}")
            else:
                print(f"[ERROR] Respuesta inesperada: {response.status_code}")
        except Exception as e:
            print(f"[ERROR] No se pudo acceder: {e}")
        
        time.sleep(INTERVAL)

if __name__ == "__main__":
    keep_alive()
