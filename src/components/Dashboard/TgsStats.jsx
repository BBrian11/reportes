import React from "react";
import "../../styles/tgsstats.css";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e => e.evento.includes("Ingreso de Personal")).length;
  const cierres = eventos.filter(e => e.evento.includes("Salida de Personal")).length;
  const cortes = eventos.filter(e => e.evento.includes("Corte de energía eléctrica")).length;
  const restauraciones = eventos.filter(e => e.evento.includes("Restauración de energía eléctrica")).length;

  const stats = [
    { icon: "🚪", label: "Ingresos", value: aperturas },

    { icon: "⚡", label: "Cortes Energía", value: cortes },
    { icon: "🔌", label: "Restauraciones", value: restauraciones },
  ];

  // Ranking dinámico: top eventos TGS
  const eventosTgs = eventos.filter(e => e.cliente === "TGS");
  const countEventos = {};
  eventosTgs.forEach(e => {
    countEventos[e.evento] = (countEventos[e.evento] || 0) + 1;
  });
  const topEventos = Object.entries(countEventos).sort((a, b) => b[1] - a[1]).slice(0, 5);

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

      {/* Ranking */}
      <div className="ranking-card">
        <h4 className="ranking-title">Top Eventos TGS</h4>
        {topEventos.length > 0 ? (
          <ul className="ranking-list">
            {topEventos.map(([nombre, count], idx) => (
              <li key={idx} className="ranking-item">
                <span className="ranking-name">{nombre}</span>
                <span className="ranking-count">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ranking-empty">No hay datos</p>
        )}
      </div>
    </div>
  );
}
