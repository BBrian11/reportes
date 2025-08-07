import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import FormBuilder from "./components/Dashboard/FormBuilder.jsx";
import DynamicForm from "./components/Dashboard/DynamicForm.jsx";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/form-builder" element={<FormBuilder />} />
        <Route path="/formularios/:id" element={<DynamicForm />} />
      </Routes>
    </Router>
  );
}
