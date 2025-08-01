import React from "react";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e => e.evento.includes("Ingreso de Personal")).length;

  const cortes = eventos.filter(e => e.evento.includes("Corte de energía eléctrica")).length;
  const restauraciones = eventos.filter(e => e.evento.includes("Restauración de energía eléctrica")).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="stat-card" style={{ background: "#2563eb" }}>
        <p>Ingresos</p>
        <h2>{aperturas}</h2>
      </div>
  
      <div className="stat-card" style={{ background: "#f59e0b" }}>
        <p>Cortes energía</p>
        <h2>{cortes}</h2>
      </div>
      <div className="stat-card" style={{ background: "#ef4444" }}>
        <p>Restauraciones</p>
        <h2>{restauraciones}</h2>
      </div>
    </div>
  );
}
