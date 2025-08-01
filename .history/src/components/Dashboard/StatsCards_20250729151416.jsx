import React from "react";

export default function StatsCards({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="flex justify-center items-center text-gray-500 mb-6 animate-pulse">
        Cargando estadísticas...
      </div>
    );
  }

  // ✅ Calcular estadísticas
  const eventCount = {};
  const locationCount = {};

  eventos.forEach((e) => {
    eventCount[e.evento] = (eventCount[e.evento] || 0) + 1;
    locationCount[e.ubicacion] = (locationCount[e.ubicacion] || 0) + 1;
  });

  const eventoMasFrecuente = Object.entries(eventCount).sort((a, b) => b[1] - a[1])[0][0];
  const ubicacionMasFrecuente = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0][0];

  // ✅ Evento crítico
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
      {/* Card 1 */}
      <div className="stat-card kpi-success">
        <span className="kpi-label">🚨 Evento más recurrente</span>
        <h2 className="kpi-value">{eventoMasFrecuente}</h2>
        <p className="kpi-footer">Dato en tiempo real</p>
      </div>

      {/* Card 2 */}
      <div className="stat-card kpi-warning">
        <span className="kpi-label">📍 Ubicación con más eventos</span>
        <h2 className="kpi-value">{ubicacionMasFrecuente}</h2>
        <p className="kpi-footer">Actualización dinámica</p>
      </div>

      {/* Card 3 */}
      <div className="stat-card kpi-danger">
        <span className="kpi-label">⚠ Evento Crítico</span>
        <h2 className="kpi-value">{eventoCritico}</h2>
        <p className="kpi-footer">Monitoreo continuo</p>
      </div>
    </div>
  );
}
