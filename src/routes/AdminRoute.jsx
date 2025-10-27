

// =======================================================
// File: src/routes/AdminRoute.jsx (guard de ruta /admin)
// =======================================================
import React from "react";
import { Navigate } from "react-router-dom";
import { useIsAdmin } from "../hooks/useIsAdmin";

export default function AdminRoute({ children }) {
  const { loading, isAdmin } = useIsAdmin();
  if (loading) return <div className="p-6">Cargando…</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
