// src/components/Dashboard/Header.jsx
import React from "react";

export default function Header() {
  return (
    <div className="dashboard-header">
      <div>
        <h1>📡 Dashboard G3T</h1>
        <p>Monitoreo avanzado y reportes en tiempo real</p>
      </div>
      <button className="btn-primary">📄 Generar Reporte</button>
    </div>
  );
}
