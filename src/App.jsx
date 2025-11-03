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
import ClientesCriticosList from "./components/Dashboard/ClientesCriticosList.jsx";
import LoginAdmin from "./components/auth/LoginAdmin.jsx";
import AdminDashboard from "./components/admin/AdminDashboard.jsx";
import NovedadesForm from "./components/Dashboard/NovedadesForm.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";
import PortalPendientes from "./components/Dashboard/PortalPendientes.jsx";
import DashboardOperador from "./components/Dashboard/DashboardOperador.jsx";
import RondinCCTV from "./components/Dashboard/RondinCCTV.jsx";

export default function App() {
  return (
    <ThemeProvider theme={riesgoTheme}>
      <CssBaseline />
      <RiesgoGlobalStyles />
      <AdminAuthProvider>
        <Router>
          <AppShellGlobal title="Monitoreo G3T">
            <Routes>
              {/* Landing → login */}
              <Route path="/" element={<Navigate to="/login-admin" replace />} />
              <Route path="/login-admin" element={<LoginAdmin />} />

              {/* === ADMIN (protegido) === */}
              <Route
                path="/dashboard"
                element={
                  <RequireAdmin>
                    <Dashboard />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminDashboard />
                  </RequireAdmin>
                }
              />
              <Route
                path="/form-builder"
                element={
                  <RequireAdmin>
                    <FormBuilder />
                  </RequireAdmin>
                }
              />
              <Route
                path="/formularios/:id"
                element={
                  <RequireAdmin>
                    <DynamicForm />
                  </RequireAdmin>
                }
              />
              <Route
                path="/clientes"
                element={
                  <RequireAdmin>
                    <ClientesCriticosList />
                  </RequireAdmin>
                }
              />

              {/* === OPERADOR (protegido) === */}
              <Route
                path="/monitoreo"
                element={
                  <RequireOperador>
                    <DashboardOperador />
                  </RequireOperador>
                }
              />
              <Route
                path="/novedades"
                element={
                  <RequireOperador>
                    <NovedadesWall />
                  </RequireOperador>
                }
              />
              <Route
                path="/formulario"
                element={
                  <RequireOperador>
                    <NovedadesForm />
                  </RequireOperador>
                }
              />
              <Route
                path="/pendientes"
                element={
                  <RequireOperador>
                    <PortalPendientes />
                  </RequireOperador>
                }
              />
              <Route
                path="/ron"
                element={
                  <RequireOperador>
                    <RondinCCTV />
                  </RequireOperador>
                }
              />
              <Route
                path="/rondin2"
                element={
                  <RequireOperador>
                    <FormRiesgoRondin />
                  </RequireOperador>
                }
              />
              <Route
                path="/monitor"
                element={
                  <RequireOperador>
                    <LiveOpsDashboard />
                  </RequireOperador>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login-admin" replace />} />
            </Routes>
          </AppShellGlobal>
        </Router>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
