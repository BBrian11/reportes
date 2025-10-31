import React, { useEffect, useRef, useState, useCallback } from "react";
import Modal from "../common/Modal.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminUserMenu from "../auth/AdminUserMenu.jsx";
import { FiBell, FiSettings, FiAlertTriangle } from "react-icons/fi";
import "../../styles/header.css";

const HEADER_H = 92;

export default function Header({
  notificaciones = [],
  alertas = [],
  showNotifModal = undefined,
  showAlertModal = undefined,
  onOpenNotif,     // opcional: callback para abrir modal de notifs en la página
  onOpenAlert,     // opcional: callback para abrir modal de alertas en la página
  onCloseNotif,
  onCloseAlert,
}) {
  // --- Estado local (fallback) si no pasan controlado ---
  const [localNotifOpen, setLocalNotifOpen] = useState(false);
  const [localAlertOpen, setLocalAlertOpen] = useState(false);
  const notifOpen = (typeof showNotifModal === "boolean") ? showNotifModal : localNotifOpen;
  const alertOpen = (typeof showAlertModal === "boolean") ? showAlertModal : localAlertOpen;

  const headerRef = useRef(null);

  // Elevar al scrollear (sombra)
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

  // Abrir rutas en nueva pestaña (por si usás el menú)
  const goAdminPanel = useCallback((path) => {
    const url = `${window.location.origin}${path}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // --- Handlers modales (props controladas + fallback local + eventos globales) ---
  const emitGlobal = (name) => {
    try {
      window.dispatchEvent(new CustomEvent(name));
    } catch {}
  };

  const handleOpenNotif = () => {
    onOpenNotif?.();               // abre desde la página (si pasó callback)
    setLocalNotifOpen(true);       // fallback local
    emitGlobal("g3t:openInfo");    // evento global para otras páginas
  };
  const handleCloseNotif = () => {
    onCloseNotif?.();
    setLocalNotifOpen(false);
  };

  const handleOpenAlert = () => {
    onOpenAlert?.();
    setLocalAlertOpen(true);
    emitGlobal("g3t:openAlert");
  };
  const handleCloseAlert = () => {
    onCloseAlert?.();
    setLocalAlertOpen(false);
  };

  // --- Contadores ---
  const notifCount = Array.isArray(notificaciones)
    ? notificaciones.filter((n) => !(n.read || n.leido)).length
    : 0;
  const alertCount = Array.isArray(alertas) ? alertas.length : 0;
  const totalBadge = Math.min((notifCount || 0) + (alertCount || 0), 99);

  return (
    <>
      {/* ===== HEADER ===== */}
      <header ref={headerRef} className="header-pro theme-light" role="banner" style={{ zIndex: 9000 }}>
        <div className="header-container">
          {/* IZQUIERDA */}
          <div className="header-left">
            <AdminUserMenu />
          </div>

          {/* CENTRO (opcional: título/breadcrumb) */}
          <div className="header-center" role="group" aria-label="Título" />

          {/* DERECHA: acciones */}
          <div className="header-right" role="toolbar" aria-label="Acciones rápidas" style={{ gap: 8 }}>
            {/* Botón ALERTAS */}
            <button
              className="icon-btn"
              type="button"
              aria-label="Ver alertas"
              title="Alertas"
              onClick={handleOpenAlert}
              style={{ position: "relative" }}
            >
              <FiAlertTriangle size={18} />
              {alertCount > 0 && (
                <span
                  aria-live="polite"
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                    borderRadius: 999,
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 2px #fff",
                  }}
                >
                  {Math.min(alertCount, 99)}
                </span>
              )}
            </button>

            {/* Botón NOTIFICACIONES */}
            <button
              className="icon-btn"
              type="button"
              aria-label="Ver notificaciones"
              title="Notificaciones"
              onClick={handleOpenNotif}
              style={{ position: "relative" }}
            >
              <FiBell size={18} />
              {notifCount > 0 && (
                <span
                  aria-live="polite"
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                    borderRadius: 999,
                    background: "#2563eb",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 2px #fff",
                  }}
                >
                  {Math.min(notifCount, 99)}
                </span>
              )}
            </button>

            {/* Ajustes */}
            <button className="icon-btn" type="button" aria-label="Ajustes" title="Ajustes">
              <FiSettings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Spacer para que el header no tape contenido (no usar fixed) */}
      <div aria-hidden style={{ height: HEADER_H }} />

      {/* ===== MODAL NOTIFICACIONES (controlado o fallback) ===== */}
      <Modal open={notifOpen} onClose={handleCloseNotif} ariaTitle="Notificaciones">
        <h3>📬 Notificaciones</h3>
        {Array.isArray(notificaciones) && notificaciones.length ? (
          <ul className="notif-list">
            {notificaciones.map((n, i) => (
              <li key={n.id || i} className={`notif-item ${(n.read || n.leido) ? "read" : "unread"}`}>
                <span className="evento">{n.title || n.evento || "Notificación"}</span>
                <small>{[n.cliente, n.ubicacion].filter(Boolean).join(" · ")}</small>
                {n.fecha && <small>{n.fecha}</small>}
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay notificaciones nuevas</p>
        )}
        <div className="modal-actions">
          <button className="btn primary" onClick={handleCloseNotif}>Cerrar</button>
        </div>
      </Modal>

      {/* ===== MODAL ALERTAS (controlado o fallback) ===== */}
      <Modal open={alertOpen} onClose={handleCloseAlert} ariaTitle="Alertas">
        <h3>⚠️ Alertas críticas</h3>
        {Array.isArray(alertas) && alertas.length ? (
          alertas.map((a, idx) => (
            <div key={a.id || idx} className="alerta-item">
              <strong>{a.title || a.mensaje || "Alerta"}</strong>
              {a.timestamp && (
                <span>{new Date(a.timestamp).toLocaleString("es-AR", { hour12: false })}</span>
              )}
            </div>
          ))
        ) : (
          <p>No hay alertas activas</p>
        )}
        <div className="modal-actions">
          <button className="btn primary" onClick={handleCloseAlert}>Cerrar</button>
        </div>
      </Modal>

      <ToastContainer />
    </>
  );
}
