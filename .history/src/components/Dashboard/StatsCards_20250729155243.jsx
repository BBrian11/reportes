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

  const eventosCriticosLista = ["alarma", "puerta forzada", "coacción", "pánico", "intrusión", "robo"];

  const eventoCritico =
    eventos.find((e) =>
      eventosCriticosLista.some((critico) =>
        e.evento.toLowerCase().includes(critico)
      )
    )?.evento || "Sin Evento Crítico";

  const stats = [
    { icon: "📊", title: "Evento más frecuente", value: eventoMasFrecuente, color: "text-blue-600" },
    { icon: "📍", title: "Ubicación con más eventos", value: ubicacionMasFrecuente, color: "text-green-600" },
    { icon: "⚠", title: "Evento crítico detectado", value: eventoCritico, color: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 flex flex-col"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-3xl ${stat.color}`}>{stat.icon}</div>
            <h4 className="text-gray-700 font-semibold">{stat.title}</h4>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{stat.value}</h2>
        </div>
      ))}
    </div>
  );
}
