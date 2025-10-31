// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { riesgoTheme, RiesgoGlobalStyles } from "./theme/riesgoTheme.jsx";

import AppShellGlobal from "./components/layout/AppShellGlobal.jsx";

import Dashboard from "./components/Dashboard/Dashboard.jsx";
import FormBuilder from "./components/Dashboard/FormBuilder.jsx";
import DynamicForm from "./components/Dashboard/DynamicForm.jsx";
import FormRondin from "./components/Dashboard/FormRondin.jsx";
import FormRiesgoRondin from "./components/Dashboard/riesgoRondin/FormRiesgoRondin.jsx";
import LiveOpsDashboard from "./components/Dashboard/LiveOpsDashboard.jsx";
import NovedadesWall from "./components/Dashboard/NovedadesWall.jsx";
import RequireOperador from "./components/auth/RequireOperador.jsx";
import RequireAdmin from "./components/auth/RequireAdmin.jsx";
import ClientesCriticosList from "./components/Dashboard/ClientesCriticosList";
import LoginAdmin from "./components/auth/LoginAdmin.jsx";
import AdminDashboard from "./components/admin/AdminDashboard.jsx";
import NovedadesForm from "./components/Dashboard/NovedadesForm";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import PortalPendientes from "./components/Dashboard/PortalPendientes.jsx";
import DashboardOperador from "./components/Dashboard/DashboardOperador";
import RondinCCTV from "./components/Dashboard/RondinCCTV";

export default function App() {
  return (
    <ThemeProvider theme={riesgoTheme}>
      <CssBaseline />
      <RiesgoGlobalStyles />
      <AdminAuthProvider>
        <Router>
          {/* 🔥 Header global SIEMPRE visible */}
          <AppShellGlobal title="Monitoreo G3T">
            <Routes>
              {/* raíz → login admin */}
              <Route path="/" element={<Navigate to="/login-admin" replace />} />

              {/* Login (visible bajo header; si no lo querés, lo movemos a otra variante) */}
              <Route path="/login-admin" element={<LoginAdmin />} />

              {/* Dashboard general */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Formularios */}
              <Route path="/form-builder" element={<FormBuilder />} />
              <Route path="/formularios/:id" element={<DynamicForm />} />
              <Route path="/monitoreo" element={<DashboardOperador />} />
              <Route path="/novedades" element={<NovedadesWall />} />
              <Route path="/clientes" element={<ClientesCriticosList />} />
              <Route path="/formulario" element={<NovedadesForm />} />
              <Route path="/pendientes" element={<PortalPendientes />} />
              <Route path="/ron" element={<RondinCCTV />} />

              <Route
                path="/rondin2"
                element={
                  <RequireOperador>
                    <FormRiesgoRondin />
                  </RequireOperador>
                }
              />

              {/* Monitoreo en vivo */}
              <Route path="/monitor" element={<LiveOpsDashboard />} />

              {/* Admin protegido por contexto de admin */}
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <Dashboard />
                  </RequireAdmin>
                }
              />

              {/* Fallback → login admin */}
              <Route path="*" element={<Navigate to="/login-admin" replace />} />
            </Routes>
          </AppShellGlobal>
        </Router>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
