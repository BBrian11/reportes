import React from "react";
import "../../styles/globalstats.css";

export default function GlobalStats({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="loading-message">Cargando datos globales...</div>
    );
  }

  // Contar frecuencia de eventos
  const eventCount = {};
  eventos.forEach(e => {
    eventCount[e.evento] = (eventCount[e.evento] || 0) + 1;
  });

  const eventosOrdenados = Object.entries(eventCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 eventos

  const totalEventos = eventos.length;

  return (
    <div className="global-card">
      <h3 className="global-title">📊 Analítica General</h3>
      <div className="global-grid">
        <div className="global-item">
          <p className="global-label">Total Eventos</p>
          <h2 className="global-value">{totalEventos}</h2>
        </div>
        <div className="global-item">
          <p className="global-label">Eventos únicos</p>
          <h2 className="global-value">{Object.keys(eventCount).length}</h2>
        </div>
      </div>

      <div className="ranking-card">
        <h4 className="ranking-title">Eventos más frecuentes</h4>
        <ul className="ranking-list">
          {eventosOrdenados.map(([evento, count], idx) => (
            <li key={idx} className="ranking-item">
              <span className="ranking-name">{evento}</span>
              <span className="ranking-count">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
