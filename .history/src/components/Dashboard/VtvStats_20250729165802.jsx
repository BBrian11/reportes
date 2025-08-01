import React from "react";
import "../../styles/vtvstats.css";

export default function VtvStats({ eventos }) {
  // Filtrar solo eventos VTV
  const eventosVtv = eventos.filter(e => e.cliente === "VTV");

  const totalEventos = eventosVtv.length;
  const falsosPositivos = eventosVtv.filter(e => e.evento.includes("Falso positivo")).length;

  // Contar eventos por planta
  const plantas = {};
  eventosVtv.forEach(e => {
    plantas[e.ubicacion] = (plantas[e.ubicacion] || 0) + 1;
  });
  const topPlantas = Object.entries(plantas).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stats = [
    { icon: "📊", label: "Total Eventos", value: totalEventos },
    { icon: "⚠", label: "Falsos Positivos", value: falsosPositivos },
  ];

  return (
    <div className="vtv-card">
      <h3 className="section-title">VTV - Estadísticas</h3>
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
        <h4 className="ranking-title">Top Plantas con Eventos</h4>
        {topPlantas.length > 0 ? (
          <ul className="ranking-list">
            {topPlantas.map(([planta, count], idx) => (
              <li key={idx} className="ranking-item">
                <span className="ranking-name">{planta}</span>
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
