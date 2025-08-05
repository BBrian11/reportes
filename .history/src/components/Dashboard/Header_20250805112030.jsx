import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import notificationSound from "../../styles/sonido.mp3";
import { FaBell, FaExclamationTriangle } from "react-icons/fa";

export default function Header() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const eventoKeyMap = {
    TGS: "evento-tgs",
    Edificios: "evento-edificio",
    VTV: "evento-vtv",
    Barrios: "evento-barrios",
    Otros: "evento-otros",
  };

  useEffect(() => {
    const audio = new Audio(notificationSound);
    const startTime = Date.now();

    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS" },
      { path: "novedades/edificios/eventos", cliente: "Edificios" },
      { path: "novedades/vtv/eventos", cliente: "VTV" },
      { path: "novedades/barrios/eventos", cliente: "Barrios" },
      { path: "novedades/otros/eventos", cliente: "Otros" },
    ];

    const unsubscribes = collections.map(({ path, cliente }) =>
      onSnapshot(collection(db, path), (snapshot) => {
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

              // ✅ Notificaciones normales
              setNotificaciones((prev) => [nuevaNotif, ...prev.slice(0, 4)]);
              setUnreadCount((prev) => prev + 1);

              // ✅ Si es corte eléctrico → crear alerta crítica
              if (evento === "Corte de energía eléctrica") {
                setAlertas((prev) => [
                  ...prev,
                  { ...nuevaNotif, tipo: "corte", timestamp: Date.now() },
                ]);
              }

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
                }
              );

              audio.play().catch(() => console.log("Sonido bloqueado"));
            }
          }
        });
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1>📡 Dashboard G3T</h1>
        <p>Monitoreo avanzado y alertas críticas</p>
      </div>

      <div className="header-actions">
        {/* Notificaciones normales */}
        <div className="icon-btn">
          <FaBell size={20} />
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </div>

        {/* Botón de alertas críticas */}
        <div className="icon-btn alert-btn" onClick={() => setShowAlertModal(true)}>
          <FaExclamationTriangle size={22} />
          {alertas.length > 0 && <span className="badge">{alertas.length}</span>}
        </div>
      </div>

      {/* Modal de alertas críticas */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Alertas críticas</h3>
            {alertas.length === 0 ? (
              <p>No hay alertas activas</p>
            ) : (
              <ul>
                {alertas.map((a) => (
                  <li key={a.id}>
                    <strong>{a.evento}</strong>
                    <br />
                    <span>{a.cliente} · {a.ubicacion}</span>
                    <br />
                    <small>{a.fecha}</small>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowAlertModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      <ToastContainer />
    </header>
  );
}
