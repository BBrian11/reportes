// src/router/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { normRol } from "../utils/roles";

export default function ProtectedRoute({ allow = ["admin"], children }) {
  const { admin, hydrated } = useAdminAuth();
  const location = useLocation();

  if (!hydrated) {
    return null; // opcional: spinner/loader
  }

  if (!admin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const rol = normRol(admin.rol);
  const allowNorm = allow.map(normRol);
  if (!allowNorm.includes(rol)) {
    const fallback = rol === "operador" ? "/monitoreo" : "/admin";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
