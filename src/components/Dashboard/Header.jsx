import React, { useEffect, useRef, useState, useCallback } from "react";
import Modal from "../common/Modal.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminUserMenu from "../auth/AdminUserMenu.jsx";
import { FiBell, FiSettings, FiActivity, FiAlertTriangle } from "react-icons/fi";
import "../../styles/header.css";

const HEADER_H = 92;

export default function Header({
  notificaciones = [],
  alertas = [],
  showNotifModal = undefined,
  showAlertModal = undefined,
  onOpenNotif,
  onOpenAlert,
  onCloseNotif,
  onCloseAlert,
}) {
  // Estado local (fallback) para modales
  const [localNotifOpen, setLocalNotifOpen] = useState(false);
  const [localAlertOpen, setLocalAlertOpen] = useState(false);
  const notifOpen = (typeof showNotifModal === "boolean") ? showNotifModal : localNotifOpen;
  const alertOpen = (typeof showAlertModal === "boolean") ? showAlertModal : localAlertOpen;

  const headerRef = useRef(null);

  // Elevación al scrollear (agrega .is-scrolled al header)
  useEffect(() => {
    const onScroll = () => {
      if (!headerRef.current) return;
      if (window.scrollY > 2) headerRef.current.classList.add("is-scrolled");
      else headerRef.current.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Abrir rutas en nueva pestaña
  const goAdminPanel = useCallback((path) => {
    const url = `${window.location.origin}${path}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // Handlers modales
  const handleOpenNotif = () => { onOpenNotif?.(); setLocalNotifOpen(true); };
  const handleCloseNotif = () => { onCloseNotif?.(); setLocalNotifOpen(false); };
  const handleOpenAlert = () => { onOpenAlert?.(); setLocalAlertOpen(true); };
  const handleCloseAlert = () => { onCloseAlert?.(); setLocalAlertOpen(false); };

  const notifCount = notificaciones.filter(n => !n.read).length;
  const alertCount = alertas.length;

  return (
    <>
      {/* ===== HEADER ===== */}
      <header ref={headerRef} className="header-pro theme-light" role="banner">
        <div className="header-container">
          {/* IZQUIERDA */}
          <div className="header-left">
            <button className="brand" type="button" aria-label="Menú de usuario">
              <span className="brand-mark">G3</span>
              <span className="brand-text">
                <span className="brand-title">Grupo 3T</span>
                <span className="brand-sub">Centro de monitoreo</span>
              </span>
            </button>
            <AdminUserMenu />
          </div>

          {/* CENTRO */}
          <div className="header-center" role="group" aria-label="Título">
            <h1>Monitoreo en tiempo real</h1>
            <p>Panel de clientes, eventos y alertas</p>
          </div>

          {/* DERECHA (acciones) */}
          <div className="header-right" role="toolbar" aria-label="Acciones rápidas">
          
            <button className="icon-btn" type="button" aria-label="Ajustes" title="Ajustes">
              <FiSettings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Spacer para que el header no tape el contenido */}
      <div aria-hidden style={{ height: HEADER_H }} />

      {/* ===== MODAL NOTIFICACIONES ===== */}
      <Modal open={notifOpen} onClose={handleCloseNotif} ariaTitle="Notificaciones">
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
          <button className="btn primary" onClick={handleCloseNotif}>Cerrar</button>
        </div>
      </Modal>

      {/* ===== MODAL ALERTAS ===== */}
      <Modal open={alertOpen} onClose={handleCloseAlert} ariaTitle="Alertas">
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
          <button className="btn primary" onClick={handleCloseAlert}>Cerrar</button>
        </div>
      </Modal>

      <ToastContainer />

      {/* === Ejemplo de menú (abre en pestaña nueva) === */}
      {/* 
      <div className="menu">
        <button role="menuitem" onClick={() => goAdminPanel("/admin")}        style={menuItemStyle}>Panel de Administración</button>
        <button role="menuitem" onClick={() => goAdminPanel("/form-builder")} style={menuItemStyle}>Form Builder</button>
        <button role="menuitem" onClick={() => goAdminPanel("/rondin2")}      style={menuItemStyle}>Rondín</button>
        <button role="menuitem" onClick={() => goAdminPanel("/novedades")}    style={menuItemStyle}>Novedades</button>
        <button role="menuitem" onClick={() => goAdminPanel("/clientes")}     style={menuItemStyle}>Clientes Críticos</button>
      </div>
      */}
    </>
  );
}
