import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function RequireAdmin({ children }) {
  const { admin, hydrated } = useAdminAuth();
  const location = useLocation();

  // 👇 Esperamos a que el contexto se hidrate (lea localStorage)
  if (!hydrated) return <div style={{ padding: 16 }}>Cargando…</div>;

  if (!admin) {
    // Guardá de dónde venía para volver después del login si querés
    return <Navigate to="/login-admin" replace state={{ from: location.pathname }} />;
  }
  return children;
}
