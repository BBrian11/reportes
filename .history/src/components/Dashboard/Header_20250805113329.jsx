import React, { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaBell, FaExclamationTriangle } from "react-icons/fa";
import notificationSound from "../../styles/sonido.mp3";

export default function Header() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const timersRef = useRef({});
  const audio = new Audio(notificationSound);

  const eventoKeyMap = {
    TGS: "evento-tgs",
    Edificios: "evento-edificio",
    VTV: "evento-vtv",
    Barrios: "evento-barrios",
    Otros: "evento-otros",
  };

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

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
            const eventTimestamp = data.fechaHoraEnvio?.seconds
              ? data.fechaHoraEnvio.seconds * 1000
              : 0;

            if (eventTimestamp > startTime) {
              const fecha = new Date(eventTimestamp).toLocaleString("es-AR");
              const evento = data[eventoKeyMap[cliente]] || "Evento no disponible";

              const ubicacion =
                cliente === "Edificios"
                  ? `${data["edificio"] || "Sin ubicación"}${
                      data["unidad"] ? ` - ${data["unidad"]}` : ""
                    }`
                  : data["locaciones-tgs"] ||
                    data["planta-vtv"] ||
                    data["barrio"] ||
                    data["otro"] ||
                    "Sin ubicación";

              const nuevaNotif = { id: change.doc.id, evento, cliente, ubicacion, fecha };

              // ✅ Agregar a notificaciones
              setNotificaciones((prev) => [nuevaNotif, ...prev.slice(0, 4)]);
              toast.info(
                <div>
                  <strong>{evento}</strong>
                  <div style={{ fontSize: "0.85rem", color: "#555" }}>
                    {cliente} · {ubicacion}
                  </div>
                  <small>{fecha}</small>
                </div>,
                {
                  position: "bottom-right",
                  autoClose: false,
                  closeOnClick: true,
                }
              );
              audio.play().catch(() => console.log("Sonido bloqueado"));

              // ✅ Si es Corte de energía → iniciar timer
              if (evento === "Corte de energía eléctrica") {
                const clave = `${cliente}-${ubicacion}`;
                if (!timersRef.current[clave]) {
                  timersRef.current[clave] = setTimeout(() => {
                    generarAlerta(clave, `No se detectó restauración tras 1 hora en ${ubicacion}`);
                  }, 60 * 60 * 1000); // 1 hora
                }
              }

              // ✅ Si es Restauración → cancelar alerta
              if (evento === "Restauración de energía eléctrica") {
                const clave = `${cliente}-${ubicacion}`;
                if (timersRef.current[clave]) {
                  clearTimeout(timersRef.current[clave]);
                  delete timersRef.current[clave];
                  eliminarAlerta(clave);
                }
              }
            }
          }
        });
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  const generarAlerta = (clave, mensaje) => {
    setAlertas((prev) => [...prev, { clave, mensaje, timestamp: new Date() }]);
    audio.play().catch(() => {});
    if (Notification.permission === "granted") {
      new Notification("⚠️ Alerta crítica", { body: mensaje });
    }
  };

  const eliminarAlerta = (clave) => {
    setAlertas((prev) => prev.filter((a) => a.clave !== clave));
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1>📡 Dashboard G3T</h1>
        <p>Monitoreo avanzado y alertas críticas</p>
      </div>

      <div className="header-actions">
        {/* Botón Notificaciones */}
        <button className="icon-btn blue" onClick={() => setShowNotifModal(true)}>
          <FaBell size={20} />
          {notificaciones.length > 0 && <span className="badge">{notificaciones.length}</span>}
        </button>

        {/* Botón Alertas */}
        <button className="icon-btn red" onClick={() => setShowAlertModal(true)}>
          <FaExclamationTriangle size={20} />
          {alertas.length > 0 && <span className="badge">{alertas.length}</span>}
        </button>
      </div>

      {/* Modal Notificaciones */}
      {showNotifModal && (
        <div className="modal-overlay" onClick={() => setShowNotifModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📬 Notificaciones recientes</h3>
            {notificaciones.length === 0 ? (
              <p>No hay notificaciones nuevas</p>
            ) : (
              <ul>
                {notificaciones.map((n) => (
                  <li key={n.id}>
                    <strong>{n.evento}</strong>
                    <br />
                    <span style={{ fontSize: "0.8rem", color: "#555" }}>
                      {n.cliente} · {n.ubicacion}
                    </span>
                    <br />
                    <small>{n.fecha}</small>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowNotifModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal Alertas */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Alertas críticas</h3>
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
