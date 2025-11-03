// src/components/layout/AppShellGlobal.jsx
import React, { useState, useLayoutEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaCog, FaExclamationTriangle, FaSignInAlt } from "react-icons/fa";

import { useAdminAuth } from "../../context/AdminAuthContext";
import { normRol } from "../../utils/roles";

// (Opcional) Si usás estas notificaciones, mantené los imports;
// si no, podés quitarlos sin romper nada.
import NotificationBubbles from "../Dashboard/NotificationBubbles.jsx";
import useNotifications from "../Dashboard/hooks/useNotifications.js";

const PRIMARY_COLOR = "#1e3c72";
const ACCENT_COLOR = "#2563eb";
const HEADER_H = 64;

const styles = {
  header: {
    backgroundColor: PRIMARY_COLOR,
    color: "#fff",
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10000,
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
    "--app-header-height": "56px",
  },
  logo: { color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", fontWeight: 700, fontSize: 16 },
  headerActions: { marginLeft: "auto", marginRight: 16, display: "flex", alignItems: "center", gap: 10 },
  hdrFab: {
    position: "relative", width: 38, height: 38, borderRadius: 999, border: "none",
    display: "grid", placeItems: "center", boxShadow: "0 6px 14px rgba(0,0,0,.18)", cursor: "pointer", outline: "none",
  },
  badge: {
    position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px",
    background: "#111827", color: "#fff", borderRadius: 999, fontSize: 11, display: "grid", placeItems: "center",
    border: "2px solid rgba(255,255,255,.6)",
  },
  userMenu: { position: "relative" },
  userBtn: { background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8 },
  rolePill: { fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" },
  dd: { position: "absolute", right: 0, top: 44, background: "#fff", borderRadius: 8, minWidth: 220, boxShadow: "0 6px 18px rgba(0,0,0,.15)", overflow: "hidden", zIndex: 10001 },
  ddHeader: { padding: "12px 14px", borderBottom: "1px solid #eee" },
  ddHeaderSub: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  ddItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", color: PRIMARY_COLOR, textDecoration: "none", borderBottom: "1px solid #f3f4f6" },
  ddDanger: { color: "#dc2626" },
  layout: { display: "flex", minHeight: "100vh" },
  content: { flexGrow: 1, padding: 0, background: "#fff" },
};

function nameFromEmail(email = "") {
  const at = email.indexOf("@");
  const base = at > 0 ? email.slice(0, at) : email;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
function displayName(user) {
  return user?.nombre || nameFromEmail(user?.email || "Invitado");
}

export default function AppShellGlobal({ title = "Monitoreo G3T", sidebar = null, children, showHeader = true }) {
  const { admin: user, hydrated, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // re-render en cambios de ruta

  const { unreadCount = 0, alertCount = 0, markAllRead } = useNotifications?.() || {};
  const rol = normRol(user?.rol);
  const userText = displayName(user);

  const onLogout = () => {
    logout?.();
    navigate("/login-admin", { replace: true });
  };

  useLayoutEffect(() => {
    const hdr = document.getElementById("app-global-header");
    if (!hdr) return;
    const setVar = () => {
      const h = hdr.getBoundingClientRect().height || HEADER_H;
      document.documentElement.style.setProperty("--app-header-height", `${Math.round(h)}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(hdr);
    return () => ro.disconnect();
  }, []);

  const openInfoGlobal = () => {
    window.dispatchEvent(new CustomEvent("g3t:openInfo"));
    markAllRead?.();
  };
  const openAlertasGlobal = () => {
    window.dispatchEvent(new CustomEvent("g3t:openAlert"));
  };

  return (
    <>
      {showHeader && (
        <header id="app-global-header" style={styles.header}>
          {/* IZQUIERDA: logo */}
          <Link to="/login-admin" style={styles.logo}>
            <FaExclamationTriangle style={{ marginRight: 10, color: ACCENT_COLOR }} />
            {title}
          </Link>

          {/* CENTRO: notificaciones */}
          <div style={styles.headerActions}>
            <button
              type="button"
              title="Notificaciones"
              aria-label="Abrir notificaciones"
              onClick={openInfoGlobal}
              style={{ ...styles.hdrFab, background: "#2563eb" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z" fill="#fff"/>
              </svg>
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
            </button>

            <button
              type="button"
              title="Alertas críticas"
              aria-label="Abrir alertas"
              onClick={openAlertasGlobal}
              style={{ ...styles.hdrFab, background: "#ef4444" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" fill="#fff"/>
              </svg>
              {alertCount > 0 && <span style={styles.badge}>{alertCount}</span>}
            </button>
          </div>

          {/* DERECHA: usuario */}
          <div style={styles.userMenu}>
            {!hydrated ? null : user ? (
              <>
                <button style={styles.userBtn} onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>
                  <FaUserCircle size={20} />
                  <strong>{userText}</strong>
                  <span style={styles.rolePill}>{rol === "operador" ? "Operador" : "Admin"}</span>
                </button>
                {open && (
                  <div style={styles.dd} role="menu">
                    <div style={styles.ddHeader}>
                      <div style={{ fontWeight: 700 }}>{userText}</div>
                      <div style={styles.ddHeaderSub}>{user?.email}</div>
                    </div>
                    <Link to="/perfil" style={styles.ddItem}><FaUserCircle /> Mi Perfil</Link>
                    <Link to="/configuracion" style={styles.ddItem}><FaCog /> Configuración</Link>
                    <button
                      type="button"
                      onClick={onLogout}
                      style={{ ...styles.ddItem, ...styles.ddDanger, width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer" }}
                    >
                      <FaSignOutAlt /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link to="/login-admin" style={{ color: "#fff", textDecoration: "none", display: "flex", gap: 8, alignItems: "center" }}>
                <FaSignInAlt /> Ingresar
              </Link>
            )}
          </div>
        </header>
      )}

      <div style={styles.layout}>
        {sidebar}
        <main style={styles.content}>{children}</main>
      </div>
    </>
  );
}
