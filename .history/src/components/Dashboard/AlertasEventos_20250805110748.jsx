import React, { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { FaExclamationTriangle } from "react-icons/fa";
export default function AlertasEventos() {
  const [alertas, setAlertas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const timersRef = useRef({});

  // ✅ Pedir permisos para notificaciones
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // ✅ Escuchar Firestore
  useEffect(() => {
    const q = query(collection(db, "novedades/edificios/eventos"), orderBy("fechaHoraEnvio", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const evento = change.doc.data();
          procesarEvento(evento);
        }
      });
    });
    return () => unsub();
  }, []);

  const procesarEvento = (evento) => {
    const clave = `${evento.edificio}-${evento.unidad || "sin-unidad"}`;
    if (evento["evento-edificio"] === "Corte de energía eléctrica") {
      if (!timersRef.current[clave]) {
        timersRef.current[clave] = setTimeout(() => {
          generarAlerta(clave, `No se detectó restauración tras 1 hora del corte en ${clave}`);
        }, 60 * 60 * 1000); // 1 hora
      }
    }

    if (evento["evento-edificio"] === "Restauración de energía eléctrica") {
      if (timersRef.current[clave]) {
        clearTimeout(timersRef.current[clave]);
        delete timersRef.current[clave];
        eliminarAlerta(clave);
      }
    }
  };

  const generarAlerta = (clave, mensaje) => {
    setAlertas((prev) => [...prev, { clave, mensaje, timestamp: new Date() }]);
    const audio = new Audio("/alerta.mp3");
    audio.play();
    if (Notification.permission === "granted") {
      new Notification("⚠️ Alerta en edificio", { body: mensaje });
    }
  };

  const eliminarAlerta = (clave) => {
    setAlertas((prev) => prev.filter((a) => a.clave !== clave));
  };

  return (
    <>
      {/* Botón flotante */}
      <button className="alerta-btn" onClick={() => setMostrarModal(true)}>
  <FaExclamationTriangle size={22} color="#fff" />
  {alertas.length > 0 && <span className="badge">{alertas.length}</span>}
</button>


      {/* Modal */}
      {mostrarModal && (
        <div className="modal-alertas">
          <div className="modal-content">
            <h3>Alertas pendientes</h3>
            {alertas.length === 0 ? (
              <p>No hay alertas activas</p>
            ) : (
              alertas.map((a, idx) => (
                <div key={idx} className="alerta-item">
                  <strong>{a.mensaje}</strong>
                  <span>{a.timestamp.toLocaleTimeString()}</span>
                  <button onClick={() => eliminarAlerta(a.clave)}>❌</button>
                </div>
              ))
            )}
            <button onClick={() => setMostrarModal(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
