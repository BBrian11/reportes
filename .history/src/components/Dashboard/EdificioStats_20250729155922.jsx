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
      <h3 className="edificio-title">🏢 Edificios - Accesos</h3>
      <div className="edificio-stats">
        <div className="edificio-item blue">
          <p>Puertas Mantenidas</p>
          <h2>{totalPMA}</h2>
        </div>
        <div className="edificio-item red">
          <p>Puertas Forzadas</p>
          <h2>{totalForzada}</h2>
        </div>
      </div>
      <div className="ranking">
        <h4>Top Encargados (PMA)</h4>
        {topEncargados.length > 0 ? (
          <ul>
            {topEncargados.map(([nombre, count], idx) => (
              <li key={idx}>
                {nombre} <span>{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay datos</p>
        )}
      </div>
    </div>
  );
}
