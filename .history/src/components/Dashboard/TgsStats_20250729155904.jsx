import React from "react";
import "../../styles/tgsstats.css";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e => e.evento.includes("Ingreso de Personal")).length;
  const cierres = eventos.filter(e => e.evento.includes("Salida de Personal")).length;
  const cortes = eventos.filter(e => e.evento.includes("Corte de energía eléctrica")).length;
  const restauraciones = eventos.filter(e => e.evento.includes("Restauración de energía eléctrica")).length;

  const stats = [
    { label: "Ingresos", value: aperturas },
    { label: "Salidas", value: cierres },
    { label: "Cortes Energía", value: cortes },
    { label: "Restauraciones", value: restauraciones },
  ];

  return (
    <div className="tgs-card">
      <h3 className="tgs-title">🚛 TGS - Resumen Operativo</h3>
      <div className="tgs-grid">
        {stats.map((item, idx) => (
          <div key={idx} className="tgs-item">
            <p>{item.label}</p>
            <h2>{item.value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
