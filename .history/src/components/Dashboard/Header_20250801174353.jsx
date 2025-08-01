import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import notificationSound from "../../styles/sonido.mp3";

export default function Header() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const audio = new Audio(notificationSound);
    const startTime = Date.now(); // Marca tiempo al montar el componente

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

            // Mostrar solo si es nuevo
            if (eventTimestamp > startTime) {
              const fecha = new Date(eventTimestamp).toLocaleString("es-AR");
              const evento = data[`evento-${cliente.toLowerCase()}`] || "Sin Evento";
              const ubicacion =
                cliente === "Edificios"
                  ? `${data["edificio"] || "Sin ubicación"}${data["unidad"] ? ` - ${data["unidad"]}` : ""}`
                  : data["locaciones-tgs"] ||
                    data["planta-vtv"] ||
                    data["barrio"] ||
                    data["otro"] ||
                    "Sin ubicación";

              const nuevaNotif = { id: change.doc.id, evento, cliente, ubicacion, fecha };

              // Guardar en lista (máximo 5 últimas)
              setNotificaciones((prev) => [nuevaNotif, ...prev.slice(0, 4)]);
              setUnreadCount((prev) => prev + 1);

              // Mostrar toast
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

              // Sonido
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
        <button className="btn-primary">📄 Generar Reporte</button>

        {/* Burbuja notificaciones */}
        <div className="notification-bubble" onClick={() => setShowModal(true)}>
          🔔
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </div>
      </div>

      {/* Modal compacto */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📬 Notificaciones</h3>
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
                setUnreadCount(0); // Reset contador
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
