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
    "Alarma", "Puerta Forzada", "Coacción", "Pánico", "Intrusión", "Robo"
  ];

  const eventoCritico =
    eventos.find((e) =>
      eventosCriticosLista.some((critico) =>
        e.evento.toLowerCase().includes(critico.toLowerCase())
      )
    )?.evento || "Sin Evento Crítico";
    return (
      <div className="stats-grid">
        <div className="stat-card" style={{ background: "var(--color-success)" }}>
          <p>🚨 Evento más recurrente</p>
          <h2>{eventoMasFrecuente}</h2>
        </div>
        <div className="stat-card" style={{ background: "var(--color-warning)", color: "#000" }}>
          <p>📍 Ubicación con más eventos</p>
          <h2>{ubicacionMasFrecuente}</h2>
        </div>
        <div className="stat-card" style={{ background: "var(--color-danger)" }}>
          <p>⚠ Evento Crítico</p>
          <h2>{eventoCritico}</h2>
        </div>
      </div>
    );
    
}
