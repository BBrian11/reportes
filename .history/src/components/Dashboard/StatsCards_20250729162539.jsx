import React from "react";
import "../../styles/statscards.css"; // Nuevo CSS

export default function StatsCards({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="loading-message">Cargando estadísticas...</div>
    );
  }

  const eventCount = {};
  const locationCount = {};

  eventos.forEach((e) => {
    eventCount[e.evento] = (eventCount[e.evento] || 0) + 1;
    locationCount[e.ubicacion] = (locationCount[e.ubicacion] || 0) + 1;
  });

  const eventoMasFrecuente = Object.entries(eventCount).sort((a, b) => b[1] - a[1])[0][0];
  const ubicacionMasFrecuente = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0][0];
  const eventosCriticosLista = ["alarma", "puerta forzada", "coacción", "pánico", "intrusión", "robo"];
  const eventoCritico =
    eventos.find((e) =>
      eventosCriticosLista.some((critico) =>
        e.evento.toLowerCase().includes(critico)
      )
    )?.evento || "Sin Evento Crítico";

  const stats = [
    { icon: "📊", title: "Evento más frecuente", value: eventoMasFrecuente },
    { icon: "📍", title: "Ubicación con más eventos", value: ubicacionMasFrecuente },
    { icon: "⚠", title: "Evento crítico detectado", value: eventoCritico },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className="stats-card">
          <div className="stats-icon">{stat.icon}</div>
          <div>
            <p className="stats-title">{stat.title}</p>
            <h2 className="stats-value">{stat.value}</h2>
          </div>
        </div>
      ))}
    </div>
  );
}
