// src/components/auth/RequireOperador.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { normRol } from "../../utils/roles";

export default function RequireOperador({ children }) {
  const { admin, hydrated } = useAdminAuth();
  const location = useLocation();

  if (!hydrated) return null;

  // No logueado → login
  if (!admin) {
    return <Navigate to="/login-admin" replace state={{ from: location.pathname }} />;
  }

  // Si es admin, puede pasar (o si querés, lo podés redirigir a /dashboard)
  const rol = normRol(admin.rol);
  if (rol !== "operador" && rol !== "admin") {
    return <Navigate to="/login-admin" replace />;
  }

  return children;
}
