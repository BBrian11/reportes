import React from "react";

export default function StatsCards({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="flex justify-center items-center text-gray-500 mb-6 animate-pulse">
        Cargando estadísticas...
      </div>
    );
  }

  // Calcular métricas
  const eventCount = {};
  const locationCount = {};

  eventos.forEach((e) => {
    eventCount[e.evento] = (eventCount[e.evento] || 0) + 1;
    locationCount[e.ubicacion] = (locationCount[e.ubicacion] || 0) + 1;
  });

  const eventoMasFrecuente = Object.entries(eventCount).sort((a, b) => b[1] - a[1])[0][0];
  const ubicacionMasFrecuente = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0][0];

  const eventosCriticosLista = [
    "alarma", "puerta forzada", "coacción", "pánico", "intrusión", "robo"
  ];

  const eventoCritico =
    eventos.find((e) =>
      eventosCriticosLista.some((critico) =>
        e.evento.toLowerCase().includes(critico)
      )
    )?.evento || "Sin Evento Crítico";

  return (
    <div className="stats-grid">
      <div className="stat-card kpi-success">
        <span className="kpi-label">🚨 Evento más frecuente</span>
        <h2 className="kpi-value">{eventoMasFrecuente}</h2>
        <p className="kpi-footer">Este evento es el más recurrente del periodo analizado</p>
      </div>

      <div className="stat-card kpi-warning">
        <span className="kpi-label">📍 Ubicación más activa</span>
        <h2 className="kpi-value">{ubicacionMasFrecuente}</h2>
        <p className="kpi-footer">Mayor concentración de incidentes registrados</p>
      </div>

      <div className="stat-card kpi-danger">
        <span className="kpi-label">⚠ Evento Crítico Detectado</span>
        <h2 className="kpi-value">{eventoCritico}</h2>
        <p className="kpi-footer">Priorizar atención inmediata a este tipo de alertas</p>
      </div>
    </div>
  );
}
