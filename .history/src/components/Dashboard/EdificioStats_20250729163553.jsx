import React from "react";
import "../../styles/edificiostats.css";

export default function EdificioStats({ eventos }) {
  const totalPMA = eventos.filter(e => e.evento.includes("Puerta Mantenida Abierta")).length;
  const totalForzada = eventos.filter(e => e.evento.includes("Puerta Forzada")).length;

  const encargados = {};
  eventos.forEach(e => {
    if (e.evento.includes("Puerta Mantenida Abierta") && e.observacion?.includes("Encargado")) {
      encargados[e.observacion] = (encargados[e.observacion] || 0) + 1;
    }
  });

  const topEncargados = Object.entries(encargados).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="edificio-card">
      <h3 className="section-title">Edificios - Accesos</h3>
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-icon">🚪</div>
          <div>
            <p className="stats-title">Puertas Mantenidas</p>
            <h2 className="stats-value">{totalPMA}</h2>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon">🔓</div>
          <div>
            <p className="stats-title">Puertas Forzadas</p>
            <h2 className="stats-value">{totalForzada}</h2>
          </div>
        </div>
      </div>

      {/* Ranking Mejorado */}
      <div className="ranking-card">
        <h4 className="ranking-title">Top Encargados (PMA)</h4>
        {topEncargados.length > 0 ? (
          <ul className="ranking-list">
            {topEncargados.map(([nombre, count], idx) => (
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
