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
    "alarma",
    "puerta forzada",
    "coacción",
    "pánico",
    "intrusión",
    "robo",
  ];

  const eventoCritico =
    eventos.find((e) =>
      eventosCriticosLista.some((critico) =>
        e.evento.toLowerCase().includes(critico)
      )
    )?.evento || "Sin Evento Crítico";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
        <span className="text-blue-500 text-3xl">🚨</span>
        <h2 className="text-xl font-bold mt-2">{eventoMasFrecuente}</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Evento más frecuente del período
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
        <span className="text-green-500 text-3xl">📍</span>
        <h2 className="text-xl font-bold mt-2">{ubicacionMasFrecuente}</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Ubicación con más actividad
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
        <span className="text-red-500 text-3xl">⚠</span>
        <h2 className="text-xl font-bold mt-2">{eventoCritico}</h2>
        <p className="text-gray-500 mt-1 text-sm">Evento crítico detectado</p>
      </div>
    </div>
  );
}
