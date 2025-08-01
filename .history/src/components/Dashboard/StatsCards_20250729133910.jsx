// src/components/Dashboard/StatsCards.jsx
import React from "react";

export default function StatsCards({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="flex justify-center items-center text-gray-500 mb-6">
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

  // ✅ Evento crítico → detecta si hay alguno con palabra clave
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1 */}
      <div className="bg-teal-500 text-white rounded-xl shadow-lg p-4 text-center">
        <p className="text-sm font-semibold">🚨 Evento más recurrente</p>
        <h2 className="text-xl font-bold mt-2">{eventoMasFrecuente}</h2>
      </div>

      {/* Card 2 */}
      <div className="bg-yellow-400 text-black rounded-xl shadow-lg p-4 text-center">
        <p className="text-sm font-semibold">📍 Ubicación con más eventos</p>
        <h2 className="text-xl font-bold mt-2">{ubicacionMasFrecuente}</h2>
      </div>

      {/* Card 3 */}
      <div className="bg-red-600 text-white rounded-xl shadow-lg p-4 text-center">
        <p className="text-sm font-semibold">⚠ Evento Crítico</p>
        <h2 className="text-xl font-bold mt-2">{eventoCritico}</h2>
      </div>
    </div>
  );
}
