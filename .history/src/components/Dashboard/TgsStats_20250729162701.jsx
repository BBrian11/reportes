import React from "react";
import "../../styles/tgsstats.css";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e => e.evento.includes("Ingreso de Personal")).length;
  const cierres = eventos.filter(e => e.evento.includes("Salida de Personal")).length;
  const cortes = eventos.filter(e => e.evento.includes("Corte de energía eléctrica")).length;
  const restauraciones = eventos.filter(e => e.evento.includes("Restauración de energía eléctrica")).length;

  const stats = [
    { icon: "🚪", label: "Ingresos", value: aperturas },
    { icon: "🔓", label: "Salidas", value: cierres },
    { icon: "⚡", label: "Cortes Energía", value: cortes },
    { icon: "🔌", label: "Restauraciones", value: restauraciones },
  ];

  return (
    <div className="tgs-card">
      <h3 className="section-title">TGS - Resumen Operativo</h3>
      <div className="stats-grid">
        {stats.map((item, idx) => (
          <div key={idx} className="stats-card">
            <div className="stats-icon">{item.icon}</div>
            <div>
              <p className="stats-title">{item.label}</p>
              <h2 className="stats-value">{item.value}</h2>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
