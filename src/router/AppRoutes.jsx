// src/router/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { normRol } from "@/utils/roles";

// Páginas
import LoginAdmin from "@/pages/admin/LoginAdmin";
import DashboardAdmin from "@/pages/admin/DashboardAdmin";
import DashboardOperador from "@/pages/operador/DashboardOperador";
import Monitor from "@/pages/Monitor";
import Formulario from "@/pages/Formulario";
import Novedades from "@/pages/Novedades";
import Pendientes from "@/pages/Pendientes";
import Rondin2 from "@/pages/Rondin2";
import ClientesCriticos from "@/pages/Clientes";

function RootRedirect() {
  const { admin, hydrated } = useAdminAuth();
  if (!hydrated) return null;
  if (!admin) return <Navigate to="/login" replace />;
  const rol = normRol(admin.rol);
  return <Navigate to={rol === "operador" ? "/monitoreo" : "/admin"} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginAdmin />} />

      <Route path="/admin" element={
        <ProtectedRoute allow={["admin"]}>
          <DashboardAdmin />
        </ProtectedRoute>
      }/>

      <Route path="/monitoreo" element={
        <ProtectedRoute allow={["operador","admin"]}>
          <DashboardOperador />
        </ProtectedRoute>
      }/>

      <Route path="/monitor" element={
        <ProtectedRoute allow={["operador","admin"]}>
          <Monitor />
        </ProtectedRoute>
      }/>

      <Route path="/formulario" element={
        <ProtectedRoute allow={["operador","admin"]}>
          <Formulario />
        </ProtectedRoute>
      }/>

      <Route path="/novedades" element={
        <ProtectedRoute allow={["operador","admin"]}>
          <Novedades />
        </ProtectedRoute>
      }/>

      <Route path="/pendientes" element={
        <ProtectedRoute allow={["operador","admin"]}>
          <Pendientes />
        </ProtectedRoute>
      }/>

      <Route path="/rondin2" element={
        <ProtectedRoute allow={["operador","admin"]}>
          <Rondin2 />
        </ProtectedRoute>
      }/>

      <Route path="/clientes" element={
        <ProtectedRoute allow={["admin"]}>
          <ClientesCriticos />
        </ProtectedRoute>
      }/>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
