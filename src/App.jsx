import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { riesgoTheme, RiesgoGlobalStyles } from "./theme/riesgoTheme.jsx";

import Dashboard from "./components/Dashboard/Dashboard.jsx";
import FormBuilder from "./components/Dashboard/FormBuilder.jsx";
import DynamicForm from "./components/Dashboard/DynamicForm.jsx";
import FormRondin from "./components/Dashboard/FormRondin.jsx";
import FormRiesgoRondin from "./components/Dashboard/riesgoRondin/FormRiesgoRondin.jsx";

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
          <Route path="/rondin2" element={<FormRiesgoRondin />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
