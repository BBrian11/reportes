// src/components/common/NotificationsBridge.jsx
import React, { useEffect, useState } from "react";
import Modal from "../common/Modal.jsx";

export default function NotificationsBridge({
  notificaciones = [],
  alertas = [],
  onAfterOpenInfo, // opcional (p.ej. markAllRead)
}) {
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  useEffect(() => {
    const onInfo = () => {
      setShowNotifModal(true);
      onAfterOpenInfo?.();
    };
    const onAlert = () => setShowAlertModal(true);

    window.addEventListener("g3t:openInfo", onInfo);
    window.addEventListener("g3t:openAlert", onAlert);
    return () => {
      window.removeEventListener("g3t:openInfo", onInfo);
      window.removeEventListener("g3t:openAlert", onAlert);
    };
  }, [onAfterOpenInfo]);

  return (
    <>
      {/* Modal Notificaciones */}
      <Modal open={showNotifModal} onClose={() => setShowNotifModal(false)} ariaTitle="Notificaciones">
        <h3>📬 Notificaciones</h3>
        {notificaciones.length === 0 ? (
          <p>No hay notificaciones nuevas</p>
        ) : (
          <ul className="notif-list">
            {notificaciones.map((n) => (
              <li key={n.id} className={`notif-item ${n.read ? "read" : "unread"}`}>
                <span className="evento">{n.evento}</span>
                <small>{n.cliente} · {n.ubicacion}</small>
                <small>{n.fecha}</small>
              </li>
            ))}
          </ul>
        )}
        <div className="modal-actions">
          <button className="btn primary" onClick={() => setShowNotifModal(false)}>Cerrar</button>
        </div>
      </Modal>

      {/* Modal Alertas */}
      <Modal open={showAlertModal} onClose={() => setShowAlertModal(false)} ariaTitle="Alertas">
        <h3>⚠️ Alertas críticas</h3>
        {alertas.length === 0 ? (
          <p>No hay alertas activas</p>
        ) : (
          alertas.map((a, idx) => (
            <div key={idx} className="alerta-item">
              <strong>{a.mensaje}</strong>
              <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
            </div>
          ))
        )}
        <div className="modal-actions">
          <button className="btn primary" onClick={() => setShowAlertModal(false)}>Cerrar</button>
        </div>
      </Modal>
    </>
  );
}
