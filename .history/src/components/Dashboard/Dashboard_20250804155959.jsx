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
import ExportPDF from "./ExportPDF.jsx";
import MiniCharts from "./MiniCharts.jsx";
import OtrosStats from "./OtrosStats.jsx";


import LineAnalytics from "./LineAnalytics.jsx";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/dashboard.css";

export default function Dashboard() {
  const [eventos, setEventos] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente: "",
    ubicacion: "",
    grupo: "",
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
            fecha: d.fechaHoraEnvio
            ? new Date(d.fechaHoraEnvio.seconds * 1000).toLocaleString("es-AR", {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              })
            : "Sin Fecha",
          fechaObj: d.fechaHoraEnvio ? new Date(d.fechaHoraEnvio.seconds * 1000) : null,
            observacion: d[`observaciones-${cliente.toLowerCase()}`] || "Sin Observación",
          };
        });

        setEventos((prev) => [...prev.filter((e) => e.cliente !== cliente), ...nuevos]);
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);
  const handleSelectGrupo = (cliente, grupo) => {
    setFiltros({ ...filtros, cliente, grupo }); // ✅ Filtra todo el edificio
  };
  
  // ✅ Filtrado dinámico
  const eventosFiltrados = eventos.filter((e) => {
    const fechaEvento = e.fechaObj; // Asegurate que tengas un Date aquí
    const fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
    const fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;
  
    // ✅ Condiciones dinámicas
    const coincideCliente = !filtros.cliente || filtros.cliente === "Todos" || e.cliente === filtros.cliente;
    const coincideGrupo = !filtros.grupo || e.grupo === filtros.grupo;
    const coincideUbicacion = !filtros.ubicacion || e.ubicacion === filtros.ubicacion;
    const coincideEvento = !filtros.evento || e.evento === filtros.evento;
    const coincideFechaInicio = !fechaInicio || fechaEvento >= fechaInicio;
    const coincideFechaFin = !fechaFin || fechaEvento <= fechaFin;
  
    return coincideCliente && coincideGrupo && coincideUbicacion && coincideEvento && coincideFechaInicio && coincideFechaFin;
  });
  

  return (
    <div className="dashboard-layout">
<Sidebar
  eventos={eventos}
  onSelectCliente={(cliente) =>
    setFiltros({ cliente, ubicacion: "", grupo: "" })
  }
  onSelectUbicacion={(cliente, ubicacion) =>
    setFiltros({ cliente, ubicacion, grupo: "" })
  }
  onSelectGrupo={(cliente, grupo) =>
    setFiltros({ cliente, grupo, ubicacion: "" }) // ✅ Grupo completo
  }
/>

  
      <main className="dashboard-main">
        <Header />
        <div className="dashboard-content">
          <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />
  
          {!filtros.cliente ? (
            <>
              <div className="grid-layout">
                <GlobalStats eventos={eventosFiltrados} />
                <Charts eventos={eventosFiltrados} />
              </div>
  
              {/* ✅ Tabla FULL WIDTH */}
              <div className="table-section">
              <EventsTable eventos={eventosFiltrados} filtros={filtros} />

              </div>
            </>
          ) : (
            <>
              <div className="grid-layout">
                <MiniCharts eventos={eventosFiltrados} />
                <LineAnalytics
                  eventos={eventosFiltrados}
                  cliente={filtros.cliente}
                  fechaInicio={filtros.fechaInicio}
                  fechaFin={filtros.fechaFin}
                />
  
                {/* ✅ Estadísticas específicas */}
                {filtros.cliente === "TGS" && <TgsStats eventos={eventosFiltrados} />}
                {filtros.cliente === "Edificios" && <EdificioStats eventos={eventosFiltrados} />}
                {filtros.cliente === "VTV" && <VtvStats eventos={eventosFiltrados} />}
                {filtros.cliente === "Otros" && <OtrosStats eventos={eventosFiltrados} />}
              </div>
  
              {/* ✅ Tabla FULL WIDTH */}
              <div className="table-section">
              <ExportPDF eventos={eventosFiltrados} />
              <EventsTable eventos={eventosFiltrados} filtros={filtros} />

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
  
}
