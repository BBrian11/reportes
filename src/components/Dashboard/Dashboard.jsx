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
import TareasPanel from "./TareasPanel.jsx";
import TgsKpi from "./TgsKpi.jsx";
import TgsProviders from "./TgsProviders.jsx";

import AnaliticaDetalladaPMA from "./AnaliticaDetalladaPMA.jsx";


import { Link } from "react-router-dom";
import { FaSync, FaTasks, FaBars, FaWpforms } from "react-icons/fa";
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
  const [vista, setVista] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Función para cargar eventos desde Firestore
  const loadEventos = () => {
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
        
          // 🚩 Normalizaciones
          const edificio = d["edificio"] || "";
          const unidad = d["unidad"] || "";
          const proveedorTgs =
          d["proveedor-personal"] ??
          d.proveedor_personal ??
          d.proveedorPersonal ??
          d.proveedor ??
          d.personal ??
          "";
        
          const ubicacion =
            cliente === "Edificios"
              ? (edificio ? edificio + (unidad ? ` - ${unidad}` : "") : "Sin Ubicación")
              : (d[ubicacionKey] || "Sin Ubicación");
        
          // ⏱️ Fecha
          const fechaObj = d.fechaHoraEnvio
            ? new Date(
                (d.fechaHoraEnvio.seconds ?? d.fechaHoraEnvio._seconds) * 1000
              )
            : null;
        
          const fecha = fechaObj
            ? fechaObj.toLocaleString("es-AR", {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "Sin Fecha";
        
          // 📝 Observación (mantengo tu convención existente)
          const observacion =
            d[`observaciones-${cliente.toLowerCase()}`] ??
            d["observaciones-edificios"] ??
            d.observacion ??
            "Sin Observación";
        // ✅ RAZONES (todas las variantes + alias normalizado)
const razonesValue =
d["razones-pma"] ??
d["razones_pma"] ??
d["razonesPma"] ??
d.razones ??
"";

          // ✅ RESOLUCIÓN (traerla del doc y exponerla con varios alias)
          const resolucionValue =
            d["resolusion-evento"] ??
            d["resolucion-evento"] ??
            d.resolucion ??
            d.resolucionEvento ??
            d.resolusionEvento ??
            "";
        
          // (opcional) RESPUESTA residente si la querés mostrar luego
          const respuestaResidente =
            d["respuesta-residente"] ?? d.respuesta ?? "";
        
            
          return {
            id: doc.id,
            cliente,
            grupo:
              cliente === "Edificios"
                ? edificio || "General"
                : (d[ubicacionKey]?.split(" ")[0] || "General"),
            evento: d[eventoKey] || "Sin Evento",
            ubicacion,
            fecha,
            fechaObj,
            observacion,
        
            // 👇 Agrego explícitamente los campos que te faltaban
            //   (dejo la clave EXACTA con guion para que la tabla la pueda leer por bracket)
            ["resolusion-evento"]: d["resolusion-evento"] ?? null,
            // y también una versión normalizada por si querés cambiar el selector
            resolucion: resolucionValue,
            razones: razonesValue,                 // alias sin guion (cómodo para buscar/filtrar)
            ["razones-pma"]: d["razones-pma"] ?? null,
            ["razones_pma"]: d["razones_pma"] ?? null,
            razonesPma: d["razonesPma"] ?? null,
            // extras útiles para columnas futuras
            ["respuesta-residente"]: respuestaResidente,
            edificio,
            unidad,
            ...(cliente === "TGS"
            ? {
                ["proveedor-personal"]: proveedorTgs,
                proveedor_personal: proveedorTgs,
                proveedorPersonal: proveedorTgs,
                proveedor: proveedorTgs,
                personal: proveedorTgs,
              }
            : {}),
          };
        });
        
        setEventos((prev) => [...prev.filter((e) => e.cliente !== cliente), ...nuevos]);
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  };

  useEffect(() => {
    const unsubscribe = loadEventos();
    return unsubscribe;
  }, []);

  // ✅ Filtrar datos según filtros activos
  const eventosFiltrados = eventos.filter((e) => {
    const fechaEvento = e.fechaObj || new Date(e.fecha);
    const fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
    const fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;

    return (
      (!filtros.cliente || filtros.cliente === "Todos" || e.cliente === filtros.cliente) &&
      (!filtros.grupo || e.grupo === filtros.grupo) &&
      (!filtros.ubicacion || e.ubicacion === filtros.ubicacion) &&
      (!fechaInicio || fechaEvento >= fechaInicio) &&
      (!fechaFin || fechaEvento <= fechaFin)
    );
  });

  return (
    <div className="dashboard-layout">
      {/* ✅ Botones flotantes al costado izquierdo */}
      <div className="floating-controls">
        {/* Botón Sidebar */}
        <button className="icon-btn dark" onClick={() => setSidebarOpen(true)}>
          <FaBars size={20} />
        </button>
  
        {/* Botón Cambiar Vista */}
        <button
          className={`icon-btn purple ${vista === "tareas" ? "active" : ""}`}
          onClick={() => setVista(vista === "dashboard" ? "tareas" : "dashboard")}
        >
          <FaTasks size={20} />
        </button>
  
        <Link to="/form-builder">
          <button className="icon-btn blue">
            <FaWpforms size={20} />
          </button>
        </Link>
      </div>
  
      {/* ✅ Sidebar (intacto con submenús) */}
      <Sidebar
        eventos={eventos}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectCliente={(cliente) =>
          setFiltros({ cliente: cliente === "Todos" ? "" : cliente, ubicacion: "", grupo: "" })
        }
        onSelectUbicacion={(cliente, ubicacion) =>
          setFiltros({ cliente, ubicacion, grupo: "" })
        }
        onSelectGrupo={(cliente, grupo) =>
          setFiltros({ cliente, grupo, ubicacion: "" })
        }
      />
  
      {/* ✅ Contenido principal */}
      <main className="dashboard-main">
        <Header />
        <div className="dashboard-content">
          {vista === "dashboard" ? (
            <>
              <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />
  
              {!filtros.cliente ? (
                <>
                  <div className="grid-layout">
                    {/* KPI globales */}
                    <div id="kpi-cards">
                      <GlobalStats eventos={eventosFiltrados} />
                    </div>
  
                    {/* Charts principales */}
                    <div id="charts-capture">
                      <Charts eventos={eventosFiltrados} />
                    </div>
                  </div>
  
                  <div className="table-section">
                    <EventsTable eventos={eventosFiltrados} filtros={filtros} />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid-layout">
                    {/* Mini charts */}
                    <div id="mini-charts-capture">
                      <MiniCharts eventos={eventosFiltrados} />
                    </div>
  
                    {/* Line analytics */}
                    <div id="line-analytics-capture">
                      <LineAnalytics
                        eventos={eventosFiltrados}
                        cliente={filtros.cliente}
                        fechaInicio={filtros.fechaInicio}
                        fechaFin={filtros.fechaFin}
                      />
                    </div>
                    {filtros.cliente === "TGS" && (
                        <>
    <div className="seccion-edificio">
      <TgsKpi eventos={eventosFiltrados} />
    </div>
    <div className="seccion-analitica">
      <TgsProviders eventos={eventosFiltrados} />
    </div>

    </>

)}

                    {filtros.cliente === "Edificios" && (
                      <>
                        {/* EdificioStats (para captura en PDF) */}
                        <div id="edificio-stats-capture" className="seccion-edificio">
                          <EdificioStats eventos={eventosFiltrados} noWrapper showTitle={false} />
                        </div>
  
                        {/* Analítica Detallada PMA (si querés capturarla, avisá y le agrego un id) */}
                        <div id="analitica-pma-capture" className="seccion-analitica">
  <AnaliticaDetalladaPMA eventos={eventosFiltrados} noWrapper />
</div>
                      </>
                    )}
  
                    {filtros.cliente === "VTV" && <VtvStats eventos={eventosFiltrados} />}
                    {filtros.cliente === "Otros" && <OtrosStats eventos={eventosFiltrados} />}
                  </div>
  
                  <div className="table-section">
                    {/* ⬇️ Exportador nuevo que captura KPI + gráficos + EdificioStats y exporta Excel */}
                    <ExportPDF eventos={eventosFiltrados} />
                    <EventsTable eventos={eventosFiltrados} filtros={filtros} />
                  </div>
                </>
              )}
            </>
          ) : (
            <TareasPanel />
          )}
        </div>
      </main>
    </div>
  );
  
}
