import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../services/firebase";
import notificationSound from "../../styles/sonido.mp3"; // ✅ agrega un sonido en assets
export default function Header() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const audio = new Audio(notificationSound);

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
            const fecha =
              data.fechaHoraEnvio?.seconds
                ? new Date(data.fechaHoraEnvio.seconds * 1000).toLocaleString("es-AR")
                : "Sin Fecha";

            const nuevaNotificacion = {
              id: change.doc.id,
              cliente,
              evento: data[`evento-${cliente.toLowerCase()}`] || "Sin Evento",
              ubicacion:
                cliente === "Edificios"
                  ? `${data["edificio"] || "Sin ubicación"} ${data["unidad"] ? ` - ${data["unidad"]}` : ""}`
                  : data["locaciones-tgs"] || data["planta-vtv"] || data["barrio"] || data["otro"] || "Sin ubicación",
              fecha,
            };

            setNotificaciones((prev) => [nuevaNotificacion, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // ✅ Sonido
            audio.play().catch(() => console.log("Sonido bloqueado por el navegador"));
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

        {/* Burbuja de notificaciones */}
        <div className="notification-bubble" onClick={() => setShowModal(true)}>
          🔔
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </div>
      </div>

      {/* Modal */}
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
                    <strong>{n.cliente}</strong><br />
                    {n.evento}<br />
                    {n.ubicacion}<br />
                    {n.fecha}
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
    </div>
  );
}