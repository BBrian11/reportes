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

    // ✅ Escuchar solo NUEVOS formularios
    const q = query(collection(db, "formularios"), orderBy("fecha", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newData = { id: change.doc.id, ...change.doc.data() };

          setNotificaciones((prev) => [newData, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // ✅ Reproducir sonido
          audio.play().catch(() => console.log("No se pudo reproducir el sonido"));
        }
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="dashboard-header">
      <div>
        <h1>📡 Dashboard G3T</h1>
        <p>Monitoreo avanzado y reportes en tiempo real</p>
      </div>

      <div className="header-actions">
      

        {/* ✅ Botón burbuja de notificaciones */}
        <div className="notification-bubble" onClick={() => setShowModal(true)}>
          🔔
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </div>
      </div>

      {/* ✅ Modal */}
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
                    <strong>{n.nombre}</strong>: {n.mensaje || "Nuevo formulario enviado"}
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => { setShowModal(false); setUnreadCount(0); }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
