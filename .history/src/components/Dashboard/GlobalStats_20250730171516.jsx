import React from "react";
import "../../styles/globalstats.css";

export default function GlobalStats({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return <div className="loading-message">Cargando datos globales...</div>;
  }

  // ✅ Contadores principales
  const eventCount = {};
  const locationCount = {};
  const reasonCount = {};
  let totalDia = 0;
  let totalNoche = 0;

  eventos.forEach((e) => {
    // Contar eventos
    eventCount[e.evento] = (eventCount[e.evento] || 0) + 1;

    // Contar ubicaciones
    if (e.ubicacion) {
      locationCount[e.ubicacion] = (locationCount[e.ubicacion] || 0) + 1;
    }

    // Contar razones PMA
    if (e["razones-pma"]) {
      reasonCount[e["razones-pma"]] = (reasonCount[e["razones-pma"]] || 0) + 1;
    }

    // Contar turnos
    const fecha = e.fechaObj;
    if (fecha instanceof Date && !isNaN(fecha)) {
      const hora = fecha.getHours();
      if (hora >= 6 && hora < 18) {
        totalDia++;
      } else {
        totalNoche++;
      }
    }
  });

  // ✅ Métricas clave
  const totalEventos = eventos.length;
  const eventoMasFrecuente = Object.entries(eventCount).sort((a, b) => b[1] - a[1])[0] || ["Sin datos", 0];
  const ubicacionMasFrecuente = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0] || ["Sin datos", 0];
  const razonMasFrecuente = Object.entries(reasonCount).sort((a, b) => b[1] - a[1])[0] || ["Sin datos", 0];

  const eventosCriticosLista = ["alarma", "puerta forzada", "coacción", "pánico", "intrusión", "robo"];
  const eventosCriticos = eventos.filter(e =>
    eventosCriticosLista.some(crit => e.evento.toLowerCase().includes(crit))
  ).length;

  const eventosOrdenados = Object.entries(eventCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ✅ Cálculo porcentajes día/noche
  const diaPct = totalEventos > 0 ? Math.round((totalDia / totalEventos) * 100) : 0;
  const nochePct = totalEventos > 0 ? Math.round((totalNoche / totalEventos) * 100) : 0;

  return (
    <div className="global-card">
      <h3 className="global-title">📊 Analítica General</h3>

      {/* ✅ Cards Resumen */}
      <div className="global-grid">
        {/* Total Eventos */}
        <div className="global-item">
          <div className="icon-box">📊</div>
          <p className="global-label">Total de Eventos</p>
          <h2 className="global-value">{totalEventos}</h2>
          <p className="sub-info">
            Evento más frecuente: <strong>{eventoMasFrecuente[0]}</strong> ({eventoMasFrecuente[1]})
          </p>
        </div>

     
        {/* Razón PMA más frecuente */}
        <div className="global-item">
          <div className="icon-box">🔑</div>
          <p className="global-label">Razón PMA más frecuente</p>
          <h2 className="global-value">{razonMasFrecuente[0]}</h2>
          <p className="sub-info">{razonMasFrecuente[1]} ocurrencias</p>
        </div>
      </div>

      {/* ✅ Totales por turno */}
      <div className="shift-grid">
        <div className="shift-item day-card">
          <div className="shift-icon">🌞</div>
          <p className="shift-label">Turno Día (06:00-18:00)</p>
          <h3 className="shift-value">{totalDia} ({diaPct}%)</h3>
        </div>
        <div className="shift-item night-card">
          <div className="shift-icon">🌙</div>
          <p className="shift-label">Turno Noche (18:00-06:00)</p>
          <h3 className="shift-value">{totalNoche} ({nochePct}%)</h3>
        </div>
      </div>

      {/* ✅ Ranking Top 5 */}
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
