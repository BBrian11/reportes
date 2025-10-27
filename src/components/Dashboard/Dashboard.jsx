import React, { useEffect, useMemo, useRef, useState } from "react";
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
import NotificationBubbles from "./NotificationBubbles.jsx";
import useNotifications from "./hooks/useNotifications.js";
import { Link } from "react-router-dom";
import { FaTasks, FaBars, FaWpforms } from "react-icons/fa";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
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
    q: "",
    eventosSeleccionados: [],
  });
  const [vista, setVista] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // === NUEVO: lógica de carga 100 -> full ===
  const unsubRef = useRef(null);
  const isLimitedRef = useRef(true);   // arranca limitado
  const fullLoadedRef = useRef(false); // ya hicimos la carga completa

  // criterio “hay filtro”
  const hasUsefulFilter = useMemo(() => {
    if (filtros.cliente || filtros.ubicacion || filtros.grupo) return true;
    if (filtros.fechaInicio || filtros.fechaFin) return true;
    if ((filtros.q || "").trim().length >= 2) return true;
    return false;
  }, [filtros]);
  // ▶ handlers para los botones de notificaciones

  // ------------ suscripción ------------
  const loadEventos = (opts = {}) => {
    const { limitCount = null } = opts; // null = sin límite (full), número = limitado

    // limpiar subs anterior
    if (typeof unsubRef.current === "function") {
      unsubRef.current();
      unsubRef.current = null;
    }

    const toDate = (v) => {
      if (!v) return null;
      if (v instanceof Date && !isNaN(v)) return v;
      if (typeof v === "object" && (v.seconds || v._seconds)) {
        const s = v.seconds ?? v._seconds;
        return new Date(s * 1000);
      }
      if (typeof v === "string") {
        const d = new Date(v);
        return isNaN(d) ? null : d;
      }
      return null;
    };

    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS", eventoKey: "evento-tgs", ubicacionKey: "locaciones-tgs" },
      { path: "novedades/edificios/eventos", cliente: "Edificios", eventoKey: "evento-edificio" },
      { path: "novedades/vtv/eventos", cliente: "VTV", eventoKey: "evento-vtv", ubicacionKey: "planta-vtv" },
      { path: "novedades/barrios/eventos", cliente: "Barrios", eventoKey: "evento-barrios", ubicacionKey: "barrio" },
      { path: "novedades/otros/eventos", cliente: "Otros", eventoKey: "evento-otros", ubicacionKey: "otro" },
    ];

    const unsubs = collections.map(({ path, cliente, eventoKey, ubicacionKey }) => {
      const base = collection(db, path);
      const qRef = limitCount ? query(base, limit(limitCount)) : base; // 👈 limitado o full

      return onSnapshot(qRef, (snapshot) => {
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
              : (d?.[ubicacionKey] || d?.ubicacion || "Sin Ubicación");

          // Fechas
          const fechaObj = toDate(d.fechaHoraEnvio) || toDate(d.fecha) || null;
          const fechaEventoObj =
            cliente === "Edificios"
              ? (toDate(d.fechaHoraEvento) || toDate(d.fechaHoraEventoISO) || toDate(d.fechaHoraEventoLocal))
              : null;

          const fechaTxt =
            (fechaObj || fechaEventoObj)?.toLocaleString("es-AR", {
              hour12: false,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }) || "Sin Fecha";

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
                : (d?.[ubicacionKey]?.split(" ")[0] || "General"),
            evento: d[eventoKey] || "Sin Evento",
            ubicacion,
            fecha: fechaTxt,
            fechaObj,
            fechaEventoObj,
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

        setEventos((prev) => {
          const otros = prev.filter((e) => e.cliente !== cliente);
          return [...otros, ...nuevos];
        });
      });
    });

    unsubRef.current = () => unsubs.forEach((u) => u && u());
    isLimitedRef.current = !!limitCount;
    if (!limitCount) fullLoadedRef.current = true;
  };
  useEffect(() => {
    document.body.classList.remove("modal-open");
    document.body.style.paddingRight = "";
    delete document.body.dataset.modalCount;
  }, []);
  
  // 1) Al montar: carga rápida (100)
  useEffect(() => {
    loadEventos({ limitCount: 100 });
    return () => {
      if (typeof unsubRef.current === "function") unsubRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Cuando el usuario FILTRA: pasar a carga completa (una sola vez)
  useEffect(() => {
    if (hasUsefulFilter && !fullLoadedRef.current) {
      loadEventos({ limitCount: null }); // full
    }
  }, [hasUsefulFilter]);

  // ------------ Buscador ------------
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
   const {
      notificaciones,
     alertas,
      unreadCount,
      alertCount,
       markAllRead,
     } = useNotifications();
    
     const [showNotifModal, setShowNotifModal] = useState(false);
     const [showAlertModal, setShowAlertModal] = useState(false);
    
     const abrirInfo = () => {
      setShowNotifModal(true);
       markAllRead();
     };
    const abrirAlertas = () => setShowAlertModal(true);
  // ------------ Filtrado final ------------
// ...imports y estado

// ⬇️ Helpers robustos (ponelos una sola vez, arriba del useMemo)
const parseSafeDate = (val, endOfDay = false) => {
  if (!val) return null;
  const s = endOfDay ? "T23:59:59" : "T00:00:00";
  const d = new Date(`${val}${s}`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const eq = (a, b) => (a ?? "").toString().trim() === (b ?? "").toString().trim();
const includesAllTerms = (haystack, q) => {
  const norm = (s) =>
    (s ?? "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  if (!q) return true;
  const text = norm(haystack);
  const terms = norm(q).split(/\s+/).filter(Boolean);
  return terms.every((t) => text.includes(t));
};

// ⬇️ REEMPLAZÁ tu useMemo de eventosFiltrados por este:
const eventosFiltrados = useMemo(() => {
  let inicio = parseSafeDate(filtros.fechaInicio);
  let fin = parseSafeDate(filtros.fechaFin, true);
  if (inicio && fin && inicio > fin) [inicio, fin] = [fin, inicio];

  const haySeleccionEventos =
    Array.isArray(filtros.eventosSeleccionados) && filtros.eventosSeleccionados.length > 0;

  return (eventos || []).filter((e) => {
    const base =
      e.cliente === "Edificios"
        ? (e.fechaEventoObj || e.fechaObj || null)
        : (e.fechaObj || null);

    if (inicio && (!base || base < inicio)) return false;
    if (fin && (!base || base > fin)) return false;

    if (filtros.cliente && filtros.cliente !== "Todos" && !eq(e.cliente, filtros.cliente)) return false;
    if (filtros.grupo && !eq(e.grupo, filtros.grupo)) return false;
    if (filtros.ubicacion && !eq(e.ubicacion, filtros.ubicacion)) return false;

    if (haySeleccionEventos && !filtros.eventosSeleccionados.includes(e.evento)) return false;

    const haystack = [
      e.cliente,
      e.evento,
      e.ubicacion,
      e.grupo,
      e.observacion,
      e.resolucion,
      e["resolusion-evento"],
      e["razones-pma"],
      e.razonesPma,
      e["respuesta-residente"],
      e.edificio,
      e.unidad,
      e.proveedor,
      e["proveedor-personal"],
      e.proveedor_personal,
      e.proveedorPersonal,
    ]
      .filter(Boolean)
      .join(" · ");

    if (!includesAllTerms(haystack, filtros.q)) return false;

    return true;
  });
}, [eventos, filtros]);

  // ------------ UI ------------
  return (
    <div className="dashboard-layout">
       <NotificationBubbles
       onOpenInfo={abrirInfo}
       onOpenAlert={abrirAlertas}
       infoCount={unreadCount}
       alertCount={alertCount}
     />

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

  // 🔴 FALTABAN ESTOS:
  filtros={filtros}
  setFiltros={setFiltros}
  onChangeFechaInicio={(v) => setFiltros({ ...filtros, fechaInicio: v })}
  onChangeFechaFin={(v) => setFiltros({ ...filtros, fechaFin: v })}

  onSelectCliente={(cliente) =>
    setFiltros({
      ...filtros,
      cliente: cliente === "Todos" ? "" : cliente,
      ubicacion: "",
      grupo: "",
      eventosSeleccionados: [],
    })
  }
  onSelectUbicacion={(cliente, ubicacion) =>
    setFiltros({ ...filtros, cliente, ubicacion, grupo: "", eventosSeleccionados: [] })
  }
  onSelectGrupo={(cliente, grupo) =>
    setFiltros({ ...filtros, cliente, grupo, ubicacion: "", eventosSeleccionados: [] })
  }
/>


      <main className="dashboard-main">
 
      <Header
  notificaciones={notificaciones}
  alertas={alertas}
  showNotifModal={showNotifModal}
  showAlertModal={showAlertModal}
  onCloseNotif={() => setShowNotifModal(false)}
  onCloseAlert={() => setShowAlertModal(false)}
  onOpenSearch={() => {/* abrir tu command palette o input global */}}
  onOpenNotifications={() => setShowNotifModal(true)}
  rightActions={
    <button className="ghost-btn" onClick={() => {/* export / ayuda */}}>
      {/* cualquier icono */}
      <span className="ghost-btn__label">Exportar</span>
    </button>
  }
/>

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
                {/* Indicador de modo */}
                <small style={{ opacity: 0.7, marginLeft: 8 }}>
                  {fullLoadedRef.current ? "" : isLimitedRef.current ? "Modo: 100 por colección" : ""}
                </small>
              </div>

        

              {/* Barra exportación */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, margin: "8px 0 12px" }}>
                <ExportPDF eventos={eventosFiltrados} />
              </div>

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
