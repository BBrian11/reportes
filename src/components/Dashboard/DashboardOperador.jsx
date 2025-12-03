// src/components/Dashboard/DashboardOperador.jsx
import React, { useMemo, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaClipboardList, FaUsers, FaTasks, FaChartLine, FaVideo, FaWalking
} from "react-icons/fa";
import { useAdminAuth } from "../../context/AdminAuthContext";

const ACCENT_COLOR = "#2563eb";
import NotificationsBridge from "../common/NotificationsBridge.jsx";
 import useNotifications from "./hooks/useNotifications.js";
const dashboardStyles = {
  mainLayout: { display: "flex", minHeight: "100vh" },
  contentArea: { flexGrow: 1, padding: "30px", backgroundColor: "#fff" },
  container: { maxWidth: "1200px", margin: "0 auto" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    padding: "20px",
    textAlign: "center",
    textDecoration: "none",
    color: "#333",
    transition: "transform 0.2s, box-shadow 0.2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "150px",
    borderLeft: `5px solid ${ACCENT_COLOR}`,
  },
  cardHover: { boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)" },
  icon: { fontSize: "40px", color: ACCENT_COLOR, marginBottom: "10px" },
  subtitle: { fontSize: "18px", fontWeight: 600, margin: "5px 0 0" },
  description: { fontSize: "14px", color: "#666" },
  title: { color: "#1e3c72", borderBottom: "2px solid #ccc", paddingBottom: "10px", marginBottom: "30px" },
};

export default function DashboardOperador() {
  const navigate = useNavigate();
  const { admin: sessionUser, hydrated, logout } = useAdminAuth();
  const { notificaciones = [], alertas = [], markAllRead } = useNotifications();
  // 🔒 Nunca navegues en el render: hacelo en un efecto
  useEffect(() => {
    if (hydrated && !sessionUser) {
      navigate("/login-admin", { replace: true });
    }
  }, [hydrated, sessionUser, navigate]);

  // ✅ Hooks SIEMPRE en el tope, sin condicionales
  const modules = useMemo(
    () => [
     
      { title: "Crear Novedad/Reporte", path: "/formulario", icon: <FaClipboardList />, description: "Inicio rápido para nuevos reportes.", color: "#2563eb" },
      { title: "Muro de Novedades", path: "/novedades", icon: <FaChartLine />, description: "Listado y estado de reportes recientes.", color: "#059669" },

      { title: "Formulario Rondín", path: "/rondin2", icon: <FaWalking />, description: "Gestión de riesgo por rondín.", color: "#dc2626" },
      { title: "Clientes Críticos", path: "/clientes", icon: <FaUsers />, description: "Lista y detalles de clientes críticos.", color: "#9333ea" },
    ],
    []
  );

  const cardModules = useMemo(() => modules.filter((m) => m.path !== "/"), [modules]);

  const handleLogout = useCallback(() => {
    logout?.();
    navigate("/login-admin", { replace: true });
  }, [logout, navigate]);

  // ⏳ Mientras no esté hidratado o no haya sesión, renderizá un placeholder (NO returns antes de hooks)
  if (!hydrated || !sessionUser) {
    return <div style={{ padding: 24 }}>Cargando…</div>;
  }

  // ✅ Render normal
  return (
    <div style={dashboardStyles.mainLayout}>
        <NotificationsBridge
       notificaciones={notificaciones}
       alertas={alertas}
     />

      <main style={dashboardStyles.contentArea}>
        <div style={dashboardStyles.container}>
          <h1 style={dashboardStyles.title}>Resumen Operativo y Módulos</h1>
          <p style={dashboardStyles.description}>
            Seleccione un módulo para comenzar o retome sus tareas de monitoreo.
          </p>

          <div style={dashboardStyles.grid}>
            {cardModules.map((module) => (
              <Link
                key={module.path}
                to={module.path}
                style={{ ...dashboardStyles.card, borderLeftColor: module.color }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = dashboardStyles.cardHover.boxShadow)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)")}
              >
                {React.cloneElement(module.icon, { style: { ...dashboardStyles.icon, color: module.color } })}
                <h2 style={dashboardStyles.subtitle}>{module.title}</h2>
                <p style={dashboardStyles.description}>{module.description}</p>
              </Link>
            ))}
          </div>

          {/* Si querés botón de salir dentro de la página */}
          {/* <button onClick={handleLogout}>Cerrar sesión</button> */}
        </div>
      </main>
    </div>
  );
}
