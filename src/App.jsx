import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { riesgoTheme, RiesgoGlobalStyles } from "./theme/riesgoTheme.jsx";

import Dashboard from "./components/Dashboard/Dashboard.jsx";
import FormBuilder from "./components/Dashboard/FormBuilder.jsx";
import DynamicForm from "./components/Dashboard/DynamicForm.jsx";
import FormRondin from "./components/Dashboard/FormRondin.jsx";
import FormRiesgoRondin from "./components/Dashboard/riesgoRondin/FormRiesgoRondin.jsx";
import LiveOpsDashboard from "./components/Dashboard/LiveOpsDashboard.jsx";

// ✅ IMPORTAR PROTECTOR DE RUTA
import RequireOperador from "./components/auth/RequireOperador.jsx";

export default function App() {
  return (
    <ThemeProvider theme={riesgoTheme}>
      <CssBaseline />
      <RiesgoGlobalStyles />
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/form-builder" element={<FormBuilder />} />
          <Route path="/formularios/:id" element={<DynamicForm />} />
          <Route path="/rondin" element={<FormRondin />} />

          {/* ✅ Protegida por login de operador */}
          <Route
            path="/rondin2"
            element={
              <RequireOperador>
                <FormRiesgoRondin />
              </RequireOperador>
            }
          />

          <Route path="/monitor" element={<LiveOpsDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
