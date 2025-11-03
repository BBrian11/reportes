// src/components/auth/RequireAdmin.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { normRol } from "../../utils/roles";

export default function RequireAdmin({ children }) {
  const { admin, hydrated } = useAdminAuth();
  const location = useLocation();

  if (!hydrated) return null; // o un loader si preferís

  // No logueado → a login
  if (!admin) {
    return <Navigate to="/login-admin" replace state={{ from: location.pathname }} />;
  }

  // Logueado como OPERADOR → a monitoreo
  const rol = normRol(admin.rol);
  if (rol !== "admin") {
    return <Navigate to="/monitoreo" replace />;
  }

  return children;
}
