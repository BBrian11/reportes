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
import { FaTasks, FaBars, FaWpforms } from "react-icons/fa";
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
    q: "", // búsqueda libre
  });
  const [vista, setVista] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cargar eventos desde Firestore
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
        const nuevos = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();

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

          // ⏱️ Fecha/hora de envío (común)
          const fechaEnvioObj = d.fechaHoraEnvio
            ? new Date((d.fechaHoraEnvio.seconds ?? d.fechaHoraEnvio._seconds) * 1000)
            : null;

          // ⏱️ Fecha/hora REAL del evento (solo Edificios)
          const fechaEventoObj =
            cliente === "Edificios" && d.fechaHoraEvento
              ? new Date((d.fechaHoraEvento.seconds ?? d.fechaHoraEvento._seconds) * 1000)
              : null;

          // Texto de fecha visible (no crítico: usamos envío, y en tabla mostramos columnas separadas)
          const fecha = (fechaEnvioObj || fechaEventoObj)
            ? (fechaEnvioObj || fechaEventoObj).toLocaleString("es-AR", {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "Sin Fecha";

          const observacion =
            d[`observaciones-${cliente.toLowerCase()}`] ??
            d["observaciones-edificios"] ??
            d.observacion ??
            "Sin Observación";

          const razonesValue =
            d["razones-pma"] ??
            d["razones_pma"] ??
            d["razonesPma"] ??
            d.razones ??
            "";

          const resolucionValue =
            d["resolusion-evento"] ??
            d["resolucion-evento"] ??
            d.resolucion ??
            d.resolucionEvento ??
            d.resolusionEvento ??
            "";

          const respuestaResidente = d["respuesta-residente"] ?? d.respuesta ?? "";
          const linkDrive = (d.linkDrive || "").toString().trim() || null;

          return {
            id: docSnap.id,
            cliente,
            grupo:
              cliente === "Edificios"
                ? edificio || "General"
                : (d[ubicacionKey]?.split(" ")[0] || "General"),
            evento: d[eventoKey] || "Sin Evento",
            ubicacion,

            // Texto simple (por compatibilidad)
            fecha,

            // Fechas en Date para orden/filtrado/tabla
            fechaObj: fechaEnvioObj,      // ← envío
            fechaEventoObj,               // ← evento (solo Edificios)

            observacion,
            ["resolusion-evento"]: d["resolusion-evento"] ?? null,
            resolucion: resolucionValue,
            razones: razonesValue,
            ["razones-pma"]: d["razones-pma"] ?? null,
            ["razones_pma"]: d["razones_pma"] ?? null,
            razonesPma: d["razonesPma"] ?? null,
            ["respuesta-residente"]: respuestaResidente,
            edificio,
            unidad,
            linkDrive, 
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

  // Helpers de búsqueda (ignora tildes, AND por términos)
  const normalize = (s) =>
    (s ?? "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  const matchesQuery = (evt, q) => {
    if (!q) return true;
    const haystack = normalize(
      [
        evt.cliente,
        evt.evento,
        evt.ubicacion,
        evt.grupo,
        evt.observacion,
        evt.resolucion,
        evt["resolusion-evento"],
        evt["razones-pma"],
        evt.razonesPma,
        evt["respuesta-residente"],
        evt.edificio,
        evt.unidad,
        evt.proveedor,
        evt["proveedor-personal"],
        evt.proveedor_personal,
        evt.proveedorPersonal,
      ]
        .filter(Boolean)
        .join(" · ")
    );
    const terms = normalize(q).split(/\s+/).filter(Boolean);
    return terms.every((t) => haystack.includes(t));
  };

  // Filtrado final — en Edificios usa fechaEventoObj; otros usan fechaObj
  const eventosFiltrados = eventos.filter((e) => {
    const fechaBase =
      e.cliente === "Edificios"
        ? (e.fechaEventoObj || e.fechaObj || (e.fecha ? new Date(e.fecha) : null))
        : (e.fechaObj || (e.fecha ? new Date(e.fecha) : null));

    const fechaInicio = filtros.fechaInicio ? new Date(`${filtros.fechaInicio}T00:00:00`) : null;
    const fechaFin    = filtros.fechaFin    ? new Date(`${filtros.fechaFin}T23:59:59`)   : null;

    return (
      (!filtros.cliente || filtros.cliente === "Todos" || e.cliente === filtros.cliente) &&
      (!filtros.grupo || e.grupo === filtros.grupo) &&
      (!filtros.ubicacion || e.ubicacion === filtros.ubicacion) &&
      (!fechaInicio || (fechaBase && fechaBase >= fechaInicio)) &&
      (!fechaFin    || (fechaBase && fechaBase <= fechaFin)) &&
      matchesQuery(e, filtros.q)
    );
  });

  return (
    <div className="dashboard-layout">
      <div className="floating-controls">
        <button className="icon-btn dark" onClick={() => setSidebarOpen(true)}>
          <FaBars size={20} />
        </button>

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

      <Sidebar
        eventos={eventos}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectCliente={(cliente) =>
          setFiltros({
            ...filtros,
            cliente: cliente === "Todos" ? "" : cliente,
            ubicacion: "",
            grupo: "",
          })
        }
        onSelectUbicacion={(cliente, ubicacion) =>
          setFiltros({ ...filtros, cliente, ubicacion, grupo: "" })
        }
        onSelectGrupo={(cliente, grupo) =>
          setFiltros({ ...filtros, cliente, grupo, ubicacion: "" })
        }
      />

      <main className="dashboard-main">
        <Header />
        <div className="dashboard-content">
          {vista === "dashboard" ? (
            <>
              {/* BUSCADOR GLOBAL */}
              <div
                className="search-row"
                style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 16px" }}
              >
                <input
                  type="search"
                  placeholder="Buscar por cliente, evento, ubicación, observación, proveedor, etc."
                  value={filtros.q}
                  onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
                  className="input"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />

              {!filtros.cliente ? (
                <>
                  <div className="grid-layout">
                    <div id="kpi-cards">
                      <GlobalStats eventos={eventosFiltrados} />
                    </div>

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
                    <div id="mini-charts-capture">
                      <MiniCharts eventos={eventosFiltrados} />
                    </div>

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
                        <div id="edificio-stats-capture" className="seccion-edificio">
                          <EdificioStats eventos={eventosFiltrados} noWrapper showTitle={false} />
                        </div>

                        <div id="analitica-pma-capture" className="seccion-analitica">
                          <AnaliticaDetalladaPMA eventos={eventosFiltrados} noWrapper />
                        </div>
                      </>
                    )}

                    {filtros.cliente === "VTV" && <VtvStats eventos={eventosFiltrados} />}
                    {filtros.cliente === "Otros" && <OtrosStats eventos={eventosFiltrados} />}
                  </div>

                  <div className="table-section">
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
