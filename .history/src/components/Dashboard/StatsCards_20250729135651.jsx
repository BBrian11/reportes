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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Card 1 */}
      <div className="relative rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white p-6 shadow-lg hover:scale-105 transform transition duration-300">
        <div className="absolute top-3 right-3 text-white/40 text-4xl">📊</div>
        <p className="text-sm font-semibold opacity-90">Evento más recurrente</p>
        <h2 className="text-2xl font-extrabold mt-3">{eventoMasFrecuente}</h2>
        <span className="block mt-4 text-xs opacity-80">Dato en tiempo real</span>
      </div>

      {/* Card 2 */}
      <div className="relative rounded-2xl bg-gradient-to-br from-yellow-300 to-yellow-500 text-black p-6 shadow-lg hover:scale-105 transform transition duration-300">
        <div className="absolute top-3 right-3 text-black/30 text-4xl">📍</div>
        <p className="text-sm font-semibold opacity-80">Ubicación con más eventos</p>
        <h2 className="text-2xl font-extrabold mt-3">{ubicacionMasFrecuente}</h2>
        <span className="block mt-4 text-xs opacity-80">Actualizado en vivo</span>
      </div>

      {/* Card 3 */}
      <div className="relative rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white p-6 shadow-lg hover:scale-105 transform transition duration-300">
        <div className="absolute top-3 right-3 text-white/30 text-4xl">⚠</div>
        <p className="text-sm font-semibold opacity-90">Evento Crítico</p>
        <h2 className="text-2xl font-extrabold mt-3">{eventoCritico}</h2>
        <span className="block mt-4 text-xs opacity-80">Monitoreo constante</span>
      </div>
    </div>
  );
}
