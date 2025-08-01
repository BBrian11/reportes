// src/components/Dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import Header from "./Header.jsx";
import StatsCards from "./StatsCards.jsx";
import Filters from "./Filters.jsx";
import Charts from "./Charts.jsx";
import EventsTable from "./EventsTable.jsx";
import ExportPDF from "./ExportPDF.jsx";

import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/dashboard.css";
import TgsStats from "./TgsStats.jsx";
import EdificioStats from "./EdificioStats.jsx";
import VtvStats from "./VtvStats.jsx";



export default function Dashboard() {
  const [eventos, setEventos] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente: "",
    evento: "",
    ubicacion: "",
    fechaInicio: "",
    fechaFin: "",
  });

  // 🔹 Cargar datos de TODAS las colecciones
  useEffect(() => {
    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS", eventoKey: "evento-tgs", ubicacionKey: "locaciones-tgs" },
      { path: "novedades/edificios/eventos", cliente: "Edificios", eventoKey: "evento-edificio" }, // 🔥 Sin ubicacionKey fijo
      { path: "novedades/vtv/eventos", cliente: "VTV", eventoKey: "evento-vtv", ubicacionKey: "planta-vtv" },
      { path: "novedades/barrios/eventos", cliente: "Barrios", eventoKey: "evento-barrios", ubicacionKey: "barrio" },
      { path: "novedades/otros/eventos", cliente: "Otros", eventoKey: "evento-otros", ubicacionKey: "otro" }
    ];
    

    const unsubscribes = collections.map(({ path, cliente, eventoKey, ubicacionKey }) =>
      onSnapshot(collection(db, path), (snapshot) => {
        const nuevos = snapshot.docs.map((doc) => {
          const d = doc.data();
        
          let ubicacion = "Sin Ubicación";
        
          if (cliente === "Edificios") {
            // ✅ Armar la ubicación con Edificio + Unidad
            const edificio = d["edificio"] || "";
            const unidad = d["unidad"] ? ` - ${d["unidad"]}` : "";
            ubicacion = edificio ? edificio + unidad : "Sin Ubicación";
          } else {
            // ✅ Para los demás clientes usamos ubicacionKey
            ubicacion = d[ubicacionKey] || "Sin Ubicación";
          }
        
          return {
            id: doc.id,
            cliente,
            evento: d[eventoKey] || "Sin Evento",
            ubicacion,
            fecha: d.fechaHoraEnvio
              ? new Date(d.fechaHoraEnvio.seconds * 1000).toLocaleString("es-AR")
              : "Sin Fecha",
            observacion: d[`observaciones-${cliente.toLowerCase()}`] || "Sin Observación",
          };
        });
        

        setEventos((prev) => {
          const filtradosPrev = prev.filter((e) => e.cliente !== cliente);
          return [...filtradosPrev, ...nuevos];
        });
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  // 🔍 Aplicar filtros
  const eventosFiltrados = eventos.filter((e) => {
    const fecha = new Date(e.fecha);
    const fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
    const fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;

    return (
      (!filtros.cliente || e.cliente === filtros.cliente) &&
      (!filtros.evento || e.evento === filtros.evento) &&
      (!filtros.ubicacion || e.ubicacion === filtros.ubicacion) &&
      (!fechaInicio || fecha >= fechaInicio) &&
      (!fechaFin || fecha <= fechaFin)
    );
  });

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content">
        <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />
  
        {/* ✅ Si NO hay cliente seleccionado → Vista general */}
        {!filtros.cliente && (
          <>
            <StatsCards eventos={eventosFiltrados} />
            
            <Charts eventos={eventosFiltrados} />
            <EventsTable eventos={eventosFiltrados} />
          </>
        )}
  
        {/* ✅ Si hay cliente seleccionado → Vista exclusiva */}
        {filtros.cliente && (
          <>
            {filtros.cliente === "TGS" && (
              <TgsStats eventos={eventosFiltrados.filter(e => e.cliente === "TGS")} />
            )}
            {filtros.cliente === "Edificios" && (
              <EdificioStats eventos={eventosFiltrados.filter(e => e.cliente === "Edificios")} />
            )}
            {filtros.cliente === "VTV" && (
              <VtvStats eventos={eventosFiltrados.filter(e => e.cliente === "VTV")} />
            )}
  
            <Charts eventos={eventosFiltrados} />
            <EventsTable eventos={eventosFiltrados} />
          </>
        )}
      </div>
    </div>
  );
  
   
  
}
