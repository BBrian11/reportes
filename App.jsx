// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { riesgoTheme, RiesgoGlobalStyles } from "./theme/riesgoTheme.jsx";

import Dashboard from "./components/Dashboard/Dashboard.jsx";
import FormBuilder from "./components/Dashboard/FormBuilder.jsx";
import DynamicForm from "./components/Dashboard/DynamicForm.jsx";
import FormRondin from "./components/Dashboard/FormRondin.jsx";
import FormRiesgoRondin from "./components/Dashboard/riesgoRondin/FormRiesgoRondin.jsx";
import LiveOpsDashboard from "./components/Dashboard/LiveOpsDashboard.jsx";

import RequireOperador from "./components/auth/RequireOperador.jsx";
import RequireAdmin from "./components/auth/RequireAdmin.jsx";

import LoginAdmin from "./components/auth/LoginAdmin.jsx";
import AdminDashboard from "./components/admin/AdminDashboard.jsx";

import { AdminAuthProvider } from "./context/AdminAuthContext";

export default function App() {
  return (
    <ThemeProvider theme={riesgoTheme}>
      <CssBaseline />
      <RiesgoGlobalStyles />
      <AdminAuthProvider>
        <Router>
          <Routes>
            {/* 👇 Hacemos que la raíz muestre login admin */}
            <Route path="/" element={<Navigate to="/login-admin" replace />} />

            {/* Login de administración (Firestore only, sin Firebase Auth) */}
            <Route path="/login-admin" element={<LoginAdmin />} />

            {/* Dashboard general AHORA vive en /dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Formularios */}
            <Route path="/form-builder" element={<FormBuilder />} />
            <Route path="/formularios/:id" element={<DynamicForm />} />
            <Route path="/rondin" element={<FormRondin />} />
            <Route
              path="/rondin2"
              element={
                <RequireOperador>
                  <FormRiesgoRondin />
                </RequireOperador>
              }
            />

            {/* Vista de monitoreo */}
            <Route path="/monitor" element={<LiveOpsDashboard />} />

            {/* Admin protegido por contexto de admin */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />

            {/* Fallback → login admin */}
            <Route path="*" element={<Navigate to="/login-admin" replace />} />
          </Routes>
        </Router>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
