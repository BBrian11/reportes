import React, { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";


export default function AlertasEventos() {
  const [alertas, setAlertas] = useState([]);
  const timersRef = useRef({}); // Guardamos timers por clave única (edificio o ubicacion)

  useEffect(() => {
    const q = query(collection(db, "novedades/edificios/eventos"), orderBy("fechaHoraEnvio", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const evento = change.doc.data();
          procesarEvento(evento, change.doc.id);
        }
      });
    });

    return () => unsub();
  }, []);

  const procesarEvento = (evento, idDoc) => {
    const clave = `${evento.edificio}-${evento.ubicacion || "sin-ubicacion"}`;

    if (evento["evento-edificio"] === "Corte de energía eléctrica") {
      console.log(`⚡ Corte detectado en ${clave}`);
      // ✅ Creamos timer de 1 hora
      if (!timersRef.current[clave]) {
        timersRef.current[clave] = setTimeout(() => {
          generarAlerta(clave, "No se detectó restauración tras 1 hora del corte");
        }, 60 * 60 * 1000); // 1 hora
      }
    }

    if (evento["evento-edificio"] === "Restauración de energía eléctrica") {
      console.log(`✅ Restauración detectada en ${clave}`);
      // ✅ Cancelar timer si existía
      if (timersRef.current[clave]) {
        clearTimeout(timersRef.current[clave]);
        delete timersRef.current[clave];
        eliminarAlerta(clave); // Por si estaba en la lista de alertas
      }
    }
  };

  const generarAlerta = (clave, mensaje) => {
    setAlertas((prev) => [...prev, { clave, mensaje, timestamp: new Date() }]);
    // Opcional: reproducir sonido
    const audio = new Audio("/alerta.mp3");
    audio.play();
    // Opcional: Notification API del navegador
    if (Notification.permission === "granted") {
      new Notification("⚠️ Alerta en edificio", { body: mensaje });
    }
  };

  const eliminarAlerta = (clave) => {
    setAlertas((prev) => prev.filter((a) => a.clave !== clave));
  };

  return (
    <div className="alertas-panel">
      <h3>Alertas pendientes</h3>
      {alertas.length === 0 ? (
        <p>No hay alertas activas</p>
      ) : (
        alertas.map((alerta, idx) => (
          <div key={idx} className="alerta">
            <strong>{alerta.mensaje}</strong>
            <span>{alerta.timestamp.toLocaleTimeString()}</span>
            <button onClick={() => eliminarAlerta(alerta.clave)}>❌</button>
          </div>
        ))
      )}
    </div>
  );
}
