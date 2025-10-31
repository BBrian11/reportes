// src/components/layout/AppShell.jsx
import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaCog, FaExclamationTriangle } from "react-icons/fa";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { normRol } from "@/utils/roles";

const PRIMARY_COLOR = "#1e3c72";
const ACCENT_COLOR = "#2563eb";

const styles = {
  header: {
    backgroundColor: PRIMARY_COLOR,
    color: "#fff",
    padding: "15px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  logo: { color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", fontWeight: 700, fontSize: 18 },
  userMenu: { position: "relative" },
  userBtn: {
    background: "none", border: "none", color: "#fff", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8
  },
  rolePill: { fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" },
  dd: { position: "absolute", right: 0, top: 44, background: "#fff", borderRadius: 8, minWidth: 220, boxShadow: "0 6px 18px rgba(0,0,0,.15)", overflow: "hidden" },
  ddHeader: { padding: "12px 14px", borderBottom: "1px solid #eee" },
  ddHeaderSub: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  ddItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", color: PRIMARY_COLOR, textDecoration: "none", borderBottom: "1px solid #f3f4f6" },
  ddDanger: { color: "#dc2626" },
  main: { display: "flex", minHeight: "100vh" },
  content: { flexGrow: 1, padding: 30, background: "#fff" }
};

function nameFromEmail(email = "") {
  const at = email.indexOf("@");
  const base = at > 0 ? email.slice(0, at) : email;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
function displayName(user) {
  return user?.nombre || nameFromEmail(user?.email || "usuario");
}

/** AppShell: Header global con datos de sesión + espacio para sidebar opcional + <Outlet/> */
export default function AppShell({ sidebar = null, title = "Monitoreo G3T" }) {
  const navigate = useNavigate();
  const { admin: user, hydrated, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);

  if (!hydrated) return null;        // opcional: loader
  if (!user) {                       // si no hay sesión, a /login
    navigate("/login", { replace: true });
    return null;
  }

  const rol = normRol(user.rol);
  const userText = displayName(user);

  const onLogout = () => {
    logout?.();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header style={styles.header}>
        <Link to="/" style={styles.logo}>
          <FaExclamationTriangle style={{ marginRight: 10, color: ACCENT_COLOR }} />
          {title}
        </Link>

        <div style={styles.userMenu}>
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
              <button type="button" onClick={onLogout}
                style={{ ...styles.ddItem, ...styles.ddDanger, width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer" }}>
                <FaSignOutAlt /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={styles.main}>
        {sidebar /* si querés pasar un sidebar global */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
