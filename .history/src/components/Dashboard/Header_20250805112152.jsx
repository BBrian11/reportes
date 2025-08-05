import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import notificationSound from "../../styles/sonido.mp3";
import { FaExclamationTriangle } from "react-icons/fa";

export default function Header() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // ✅ Mapa para obtener la key correcta
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

              // ✅ Obtener el evento correcto según cliente
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

              // ✅ Solo guardamos las últimas 5
              setNotificaciones((prev) => [nuevaNotif, ...prev.slice(0, 4)]);
              setUnreadCount((prev) => prev + 1);

              // ✅ Toast con sonido
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
                  draggable: true,
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
    <div className="dashboard-header">
      <div>
        <h1>📡 Dashboard G3T</h1>
        <p>Monitoreo avanzado y reportes en tiempo real</p>
      </div>
  
      <div className="header-actions">
        <div className="notification-bubble" onClick={() => setShowModal(true)}>
          <FaExclamationTriangle size={22} />
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </div>
      </div>
  
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Alertas recientes</h3>
            {notificaciones.length === 0 ? (
              <p>No hay mensajes nuevos</p>
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
            <button
              onClick={() => {
                setShowModal(false);
                setUnreadCount(0);
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
  
      {/* ✅ ToastContainer va dentro del return */}
      <ToastContainer />
    </div>
  );
  
}
