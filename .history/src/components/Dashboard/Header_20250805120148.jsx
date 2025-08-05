import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ToastContainer, toast } from "react-toastify";
import { FaBell, FaExclamationTriangle } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import notificationSound from "../../styles/sonido.mp3";

export default function Header() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const audio = new Audio(notificationSound);

  // ✅ Lista de eventos críticos
  const CRITICOS = ["Corte de energía eléctrica", "Intrusión detectada"];

  const eventoKeyMap = {
    TGS: "evento-tgs",
    Edificios: "evento-edificio",
    VTV: "evento-vtv",
    Barrios: "evento-barrios",
    Otros: "evento-otros",
  };

  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();
    const startTime = Date.now();

    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS" },
      { path: "novedades/edificios/eventos", cliente: "Edificios" },
      { path: "novedades/vtv/eventos", cliente: "VTV" },
      { path: "novedades/barrios/eventos", cliente: "Barrios" },
      { path: "novedades/otros/eventos", cliente: "Otros" },
    ];

    const unsubscribes = collections.map(({ path, cliente }) => {
      const q = query(collection(db, path), orderBy("fechaHoraEnvio", "desc"));
      return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const eventTimestamp = data.fechaHoraEnvio?.seconds * 1000 || 0;

            if (eventTimestamp > startTime) {
              const evento = data[eventoKeyMap[cliente]] || "Evento no disponible";
              const fecha = new Date(eventTimestamp).toLocaleString("es-AR");
              const ubicacion =
                cliente === "Edificios"
                  ? `${data["edificio"] || "Sin ubicación"}${data["unidad"] ? ` - ${data["unidad"]}` : ""}`
                  : data["locaciones-tgs"] || data["planta-vtv"] || data["barrio"] || data["otro"] || "Sin ubicación";

              const clave = `${cliente}-${ubicacion}`;
              const info = { id: change.doc.id, evento, cliente, ubicacion, fecha, read: false };

              // ✅ Notificación normal
              if (!CRITICOS.includes(evento)) {
                setNotificaciones((prev) => [info, ...prev.slice(0, 9)]);
                toast.info(`${evento} | ${ubicacion}`, { position: "bottom-right", autoClose: 6000 });
              }

              // ✅ Evento crítico → alerta inmediata
              if (CRITICOS.includes(evento)) {
                generarAlerta(clave, `⚠️ ${evento} en ${ubicacion}`);
              }

              audio.play().catch(() => {});
            }
          }
        });
      });
    });

    return () => unsubscribes.forEach((u) => u());
  }, []);

  const generarAlerta = (clave, mensaje) => {
    setAlertas((prev) => [...prev, { clave, mensaje, timestamp: new Date() }]);
    if (Notification.permission === "granted") new Notification("⚠️ Alerta crítica", { body: mensaje });
  };

  const eliminarAlerta = (clave) => {
    setAlertas((prev) => prev.filter((a) => a.clave !== clave));
  };

  const marcarNotificacionesLeidas = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1>📡 MONITOREO</h1>
        <p>Monitoreo avanzado y alertas críticas</p>
      </div>

      <div className="header-actions">
        {/* Notificaciones normales */}
        <button
          className="icon-btn blue"
          onClick={() => {
            setShowNotifModal(true);
            marcarNotificacionesLeidas();
          }}
        >
          <FaBell size={20} />
          {notificaciones.some((n) => !n.read) && (
            <span className="badge">{notificaciones.filter((n) => !n.read).length}</span>
          )}
        </button>

        {/* Alertas críticas */}
        <button className="icon-btn red" onClick={() => setShowAlertModal(true)}>
          <FaExclamationTriangle size={20} />
          {alertas.length > 0 && <span className="badge">{alertas.length}</span>}
        </button>
      </div>

      {/* Modal Notificaciones */}
      {showNotifModal && (
        <div className="modal-overlay" onClick={() => setShowNotifModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📬 Notificaciones</h3>
            {notificaciones.length === 0 ? (
              <p>No hay notificaciones nuevas</p>
            ) : (
              <ul>
                {notificaciones.map((n) => (
                  <li key={n.id} className={`notif-item ${n.read ? "read" : "unread"}`}>
                    <span className="evento">{n.evento}</span>
                    <small>{n.cliente} · {n.ubicacion}</small>
                    <small>{n.fecha}</small>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowNotifModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal Alertas Críticas */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Alertas Críticas</h3>
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
            <button onClick={() => setShowAlertModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      <ToastContainer />
    </header>
  );
}
