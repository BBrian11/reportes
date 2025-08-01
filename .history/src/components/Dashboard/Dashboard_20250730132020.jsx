import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import Filters from "./Filters.jsx";
import Charts from "./Charts.jsx";
import EventsTable from "./EventsTable.jsx";
import TgsStats from "./TgsStats.jsx";
import EdificioStats from "./EdificioStats.jsx";
import VtvStats from "./VtvStats.jsx";
import GlobalStats from "./GlobalStats.jsx";
import MiniCharts from "./MiniCharts.jsx";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/dashboard.css";

export default function Dashboard() {
  const [eventos, setEventos] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente: "",
    ubicacion: "",
    evento: "",
    fechaInicio: "",
    fechaFin: "",
  });

  // ✅ Sidebar handlers
  const handleSelectCliente = (cliente) => {
    setFiltros({ ...filtros, cliente: cliente === "Todos" ? "" : cliente, ubicacion: "" });
  };

  const handleSelectUbicacion = (cliente, ubicacion) => {
    setFiltros({ ...filtros, cliente, ubicacion });
  };

  // ✅ Firestore listener
  useEffect(() => {
    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS", eventoKey: "evento-tgs", ubicacionKey: "locaciones-tgs" },
      { path: "novedades/edificios/eventos", cliente: "Edificios", eventoKey: "evento-edificio" },
      { path: "novedades/vtv/eventos", cliente: "VTV", eventoKey: "evento-vtv", ubicacionKey: "planta-vtv" },
      { path: "novedades/barrios/eventos", cliente: "Barrios", eventoKey: "evento-barrios", ubicacionKey: "barrio" },
      { path: "novedades/otros/eventos", cliente: "Otros", eventoKey: "evento-otros", ubicacionKey: "otro" },
    ];

    const unsubscribes = collections.map(({ path, cliente, eventoKey, ubicacionKey }) =>
      onSnapshot(collection(db, path), (snapshot) => {
        const nuevos = snapshot.docs.map((doc) => {
          const d = doc.data();
          let ubicacion = "Sin Ubicación";

          if (cliente === "Edificios") {
            const edificio = d["edificio"] || "";
            const unidad = d["unidad"] ? ` - ${d["unidad"]}` : "";
            ubicacion = edificio ? edificio + unidad : "Sin Ubicación";
          } else {
            ubicacion = d[ubicacionKey] || "Sin Ubicación";
          }

          return {
            id: doc.id,
            cliente,
            evento: d[eventoKey] || "Sin Evento",
            ubicacion,
            fecha: d.fechaHoraEnvio ? new Date(d.fechaHoraEnvio.seconds * 1000).toLocaleString("es-AR") : "Sin Fecha",
            fechaObj: d.fechaHoraEnvio ? new Date(d.fechaHoraEnvio.seconds * 1000) : null,
            observacion: d[`observaciones-${cliente.toLowerCase()}`] || "Sin Observación",
          };
        });

        setEventos((prev) => [...prev.filter((e) => e.cliente !== cliente), ...nuevos]);
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  // ✅ Filtrado dinámico
  const eventosFiltrados = eventos.filter((e) => {
    const fechaEvento = e.fechaObj;
    const fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
    const fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;

    return (
      (!filtros.cliente || e.cliente === filtros.cliente) &&
      (!filtros.ubicacion || e.ubicacion === filtros.ubicacion) &&
      (!filtros.evento || e.evento === filtros.evento) &&
      (!fechaInicio || fechaEvento >= fechaInicio) &&
      (!fechaFin || fechaEvento <= fechaFin)
    );
  });

  return (
    <div className="dashboard-layout">
      <Sidebar eventos={eventos} onSelectCliente={handleSelectCliente} onSelectUbicacion={handleSelectUbicacion} />

      <main className="dashboard-main">
        <Header />
        <div className="dashboard-content">
          <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />

          {!filtros.cliente ? (
            <div className="grid-layout">
              <GlobalStats eventos={eventosFiltrados} />
              <Charts eventos={eventosFiltrados} />
              <EventsTable eventos={eventosFiltrados} />
            </div>
          ) : (
            <div className="grid-layout">
              <MiniCharts eventos={eventosFiltrados} />

              {filtros.cliente === "TGS" && <TgsStats eventos={eventosFiltrados} />}
              {filtros.cliente === "Edificios" && <EdificioStats eventos={eventosFiltrados} />}
              {filtros.cliente === "VTV" && <VtvStats eventos={eventosFiltrados} />}

             
              <EventsTable eventos={eventosFiltrados} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
