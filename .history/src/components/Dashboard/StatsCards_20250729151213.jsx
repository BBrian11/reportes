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
      <div className="p-4 bg-gray-100 min-h-screen">
        <Header />
        <StatsCards eventos={eventosFiltrados} />
    
        {/* Nuevas métricas */}
        <TgsStats eventos={eventosFiltrados.filter(e => e.cliente === "TGS")} />
        <EdificioStats eventos={eventosFiltrados.filter(e => e.cliente === "Edificios")} />
    
        <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />
        <Charts eventos={eventosFiltrados} />
        <EventsTable eventos={eventosFiltrados} />
        <ExportPDF eventos={eventosFiltrados} />
      </div>
    );
    
    
}
