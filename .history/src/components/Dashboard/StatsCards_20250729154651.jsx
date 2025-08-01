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

  const eventoMasFrecuente =
    Object.entries(eventCount).sort((a, b) => b[1] - a[1])[0][0];
  const ubicacionMasFrecuente =
    Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0][0];

  const eventosCriticosLista = [
    "alarma", "puerta forzada", "coacción", "pánico", "intrusión", "robo",
  ];

  const eventoCritico =
    eventos.find((e) =>
      eventosCriticosLista.some((critico) =>
        e.evento.toLowerCase().includes(critico)
      )
    )?.evento || "Sin Evento Crítico";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg p-6 hover:scale-105 transition-transform">
        <div className="flex items-center justify-between">
          <span className="text-3xl">📊</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded">Principal</span>
        </div>
        <h2 className="text-2xl font-bold mt-3">{eventoMasFrecuente}</h2>
        <p className="text-sm text-white/80">Evento más recurrente</p>
      </div>

      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg p-6 hover:scale-105 transition-transform">
        <div className="flex items-center justify-between">
          <span className="text-3xl">📍</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded">Ubicación</span>
        </div>
        <h2 className="text-2xl font-bold mt-3">{ubicacionMasFrecuente}</h2>
        <p className="text-sm text-white/80">Mayor actividad registrada</p>
      </div>

      <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl shadow-lg p-6 hover:scale-105 transition-transform">
        <div className="flex items-center justify-between">
          <span className="text-3xl">⚠</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded">Crítico</span>
        </div>
        <h2 className="text-2xl font-bold mt-3">{eventoCritico}</h2>
        <p className="text-sm text-white/80">Atención prioritaria</p>
      </div>
    </div>
  );
}
