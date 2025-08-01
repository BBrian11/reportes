import React from "react";
import "../../styles/globalstats.css";

export default function GlobalStats({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return <div className="loading-message">Cargando datos globales...</div>;
  }

  // ✅ Contadores
  const eventCount = {};
  let totalDia = 0;
  let totalNoche = 0;

  eventos.forEach((e) => {
    eventCount[e.evento] = (eventCount[e.evento] || 0) + 1;

    const fecha = e.fechaObj; // ✅ Usar fechaObj directamente
    if (fecha instanceof Date && !isNaN(fecha)) {
      const hora = fecha.getHours();
      if (hora >= 6 && hora < 18) totalDia++;
      else totalNoche++;
    }
  });

  // ✅ Top 5 eventos
  const eventosOrdenados = Object.entries(eventCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalEventos = eventos.length;

  return (
    <div className="global-card">
      <h3 className="global-title">📊 Analítica General</h3>

      {/* ✅ Totales */}
      <div className="global-grid">
  {/* Total Eventos */}
  <div className="global-item highlight-card">
    <p className="global-label">Total de Eventos</p>
    <h2 className="global-value">{totalEventos}</h2>
  </div>

  {/* Eventos Críticos */}
  <div className="global-item critical-card">
    <p className="global-label">Eventos Críticos</p>
    <h2 className="global-value">{eventosCriticos}</h2>
  </div>

  {/* % Día vs Noche */}
  <div className="global-item ratio-card">
    <p className="global-label">Distribución Turnos</p>
    <h2 className="global-value">
      {Math.round((totalDia / totalEventos) * 100)}% Día /{" "}
      {Math.round((totalNoche / totalEventos) * 100)}% Noche
    </h2>
  </div>

  {/* Ubicaciones Monitoreadas */}
  <div className="global-item locations-card">
    <p className="global-label">Ubicaciones</p>
    <h2 className="global-value">{ubicacionesUnicas}</h2>
  </div>
</div>


      {/* ✅ Totales por turno en cards */}
  {/* ✅ Totales por turno en cards */}
<div className="global-grid">
  <div className="shift-item day-card">
    <div className="shift-icon">🌞</div>
    <p className="shift-label">Turno Día (06:00-18:00)</p>
    <h3 className="shift-value">{totalDia}</h3>
  </div>
  <div className="shift-item night-card">
    <div className="shift-icon">🌙</div>
    <p className="shift-label">Turno Noche (18:00-06:00)</p>
    <h3 className="shift-value">{totalNoche}</h3>
  </div>
</div>


      {/* ✅ Ranking */}
      <div className="ranking-card">
        <h4 className="ranking-title">Top 5 Eventos</h4>
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
