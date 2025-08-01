import React from "react";
import "../../styles/globalstats.css";

export default function GlobalStats({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return <div className="loading-message">Cargando datos globales...</div>;
  }

  const eventCount = {};
  const locationCount = {};
  const reasonCount = {};
  let totalDia = 0;
  let totalNoche = 0;

  eventos.forEach((e) => {
    // ✅ Contar eventos generales
    const evento = e.evento || e["evento-edificio"] || "Desconocido";
    eventCount[evento] = (eventCount[evento] || 0) + 1;

    // ✅ Contar ubicaciones
    if (e.ubicacion) {
      locationCount[e.ubicacion] = (locationCount[e.ubicacion] || 0) + 1;
    }

    // ✅ Contar razones SOLO para Edificios con PMA
    if (
      e["evento-edificio"] &&
      e["evento-edificio"].toLowerCase().includes("puerta mantenida") &&
      e["razones-pma"]
    ) {
      reasonCount[e["razones-pma"]] = (reasonCount[e["razones-pma"]] || 0) + 1;
    }

    // ✅ Contar por turno
    const fecha = e.fechaObj;
    if (fecha instanceof Date && !isNaN(fecha)) {
      const hora = fecha.getHours();
      if (hora >= 6 && hora < 18) totalDia++;
      else totalNoche++;
    }
  });

  // ✅ Métricas clave
  const totalEventos = eventos.length;
  const eventoMasFrecuente =
    Object.entries(eventCount).sort((a, b) => b[1] - a[1])[0] || [
      "Sin datos",
      0,
    ];
  const ubicacionMasFrecuente =
    Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0] || [
      "Sin datos",
      0,
    ];

  const razonesOrdenadas = Object.entries(reasonCount).sort((a, b) => b[1] - a[1]);
  const razonMasFrecuente = razonesOrdenadas[0] || ["Sin datos", 0];

  const diaPct = totalEventos > 0 ? Math.round((totalDia / totalEventos) * 100) : 0;
  const nochePct = totalEventos > 0 ? Math.round((totalNoche / totalEventos) * 100) : 0;

  const eventosOrdenados = Object.entries(eventCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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

        {/* Ubicación más recurrente */}
        <div className="global-item">
          <div className="icon-box">📍</div>
          <p className="global-label">Ubicación más frecuente</p>
          <h2 className="global-value">{ubicacionMasFrecuente[0]}</h2>
          <p className="sub-info">{ubicacionMasFrecuente[1]} registros</p>
        </div>

        {/* Razones PMA */}
        <div className="global-item">
          <div className="icon-box">🔑</div>
          <p className="global-label">Razón PMA más frecuente</p>
          <h2 className="global-value">
            {razonMasFrecuente[0] !== "Sin datos" ? razonMasFrecuente[0] : "No aplica"}
          </h2>
          <p className="sub-info">
            {razonMasFrecuente[1] > 0
              ? `${razonMasFrecuente[1]} ocurrencias`
              : "Solo para Edificios"}
          </p>
          {razonesOrdenadas.length > 1 && (
            <ul className="ranking-list" style={{ marginTop: "10px" }}>
              {razonesOrdenadas.slice(0, 3).map(([razon, count], idx) => (
                <li key={idx} className="ranking-item">
                  <span className="ranking-name">{razon}</span>
                  <span className="ranking-count">{count}</span>
                </li>
              ))}
            </ul>
          )}
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

      {/* ✅ Ranking Top 5 Eventos */}
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
