import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

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
import { FaBars, FaTasks, FaWpforms } from "react-icons/fa";

import { collection, onSnapshot, query, limit, orderBy, getDocs, startAfter } from "firebase/firestore";

import { db } from "../../services/firebase";
import "../../styles/dashboard.css";
import NotificationsBridge from "../common/NotificationsBridge.jsx"; 


import AIAgentChat from "../AIAgentChat.jsx";

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
   // IMPORTANTE: sin orderBy, Firestore NO garantiza "los más recientes"
const qRef = limitCount
? query(base, orderBy("fechaHoraEnvio", "desc"), limit(limitCount))
: query(base, orderBy("fechaHoraEnvio", "desc"));

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
    loadEventos({ limitCount: 1500 });
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


// ✅ “motor” de consultas: alimenta a la IA con datos de tu dashboard (sin re-consultar Firestore)
// ✅ Motor IA: consulta Firestore por rango (NO depende de lo cargado en memoria)
const resolveExtraContext = useCallback(async (userText, ctxFromAgent) => {
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

  const parseSafeDate = (val, endOfDay = false) => {
    if (!val) return null;
    // val viene tipo "YYYY-MM-DD" en tu UI
    const s = endOfDay ? "T23:59:59" : "T00:00:00";
    const d = new Date(`${val}${s}`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    if (typeof v === "object" && (v.seconds || v._seconds)) {
      const s = v.seconds ?? v._seconds;
      return new Date(s * 1000);
    }
    if (v?.toDate) {
      const d = v.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (typeof v === "string") {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const fmtYMD = (d) => d.toISOString().slice(0, 10);
  const inc = (obj, key) => {
    const k = key || "Sin dato";
    obj[k] = (obj[k] || 0) + 1;
  };

  const topN = (obj, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([item, cantidad]) => ({ item, cantidad }));

  // ===== RANGO REAL: preferimos filtros del dashboard; si no hay, usamos windowDays
  // ===== RANGO REAL: si el usuario pide ventana (ej: "6 meses"), eso tiene prioridad sobre filtros de fecha del dashboard
  const windowDays = ctxFromAgent?.request?.windowDays; // puede ser null
  const userAskedWindow = Number.isFinite(windowDays) && windowDays > 0;

  let inicio = userAskedWindow ? null : parseSafeDate(filtros.fechaInicio);
  let fin = userAskedWindow ? null : parseSafeDate(filtros.fechaFin, true);
  if (inicio && fin && inicio > fin) [inicio, fin] = [fin, inicio];

  const maxDate = fin || new Date();
  const minDate =
    inicio ||
    new Date(maxDate.getTime() - (userAskedWindow ? windowDays : 92) * 24 * 60 * 60 * 1000);

  // ===== Selección de colecciones según cliente (si eligió uno)
  const COLS = [
    { cliente: "TGS", path: "novedades/tgs/eventos", eventoKey: "evento-tgs", ubicacionKey: "locaciones-tgs" },
    { cliente: "Edificios", path: "novedades/edificios/eventos", eventoKey: "evento-edificio", ubicacionKey: null },
    { cliente: "VTV", path: "novedades/vtv/eventos", eventoKey: "evento-vtv", ubicacionKey: "planta-vtv" },
    { cliente: "Barrios", path: "novedades/barrios/eventos", eventoKey: "evento-barrios", ubicacionKey: "barrio" },
    { cliente: "Otros", path: "novedades/otros/eventos", eventoKey: "evento-otros", ubicacionKey: "otro" },
  ];

  const colsToRead =
    filtros.cliente && filtros.cliente !== "Todos"
      ? COLS.filter((c) => c.cliente === filtros.cliente)
      : COLS;

  // ===== Agregados
  const byEvento = {};
  const byUbicacion = {};
  const byGrupo = {};
  const byCliente = {};
  const byProveedor = {};
  const tendenciaDiaria = {};
  const byDiaSemana = {};
  const byHora = {};
  const byFranja = {};
  let eventosSinClasificar = 0;

  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const franjaDeHora = (h) => {
    if (h < 6) return "00-05";
    if (h < 12) return "06-11";
    if (h < 18) return "12-17";
    return "18-23";
  };

  const ejemplosRecientes = [];
  const qText = (filtros.q || "").trim();

  const pageSize = 1500;
  const hardCap = 25000;
  let total = 0;

  // Nota: para que WHERE por fecha funcione, tus docs deben tener fechaHoraEnvio como Timestamp.
  // Si no, hay que ajustar el campo real.
  const TS_FIELD = "fechaHoraEnvio";

  const startTs = { seconds: Math.floor(minDate.getTime() / 1000) }; // compatible con tu toDate()
  const endTs = { seconds: Math.floor(maxDate.getTime() / 1000) };

  for (const colDef of colsToRead) {
    let last = null;
    let done = false;

    while (!done) {
      // Query por rango (fechaHoraEnvio) + orderBy para paginar consistente.
      // Si Firestore te pide índice compuesto, te va a tirar el link para crearlo.
      const baseRef = collection(db, colDef.path);

      const clauses = [
        // where por rango: requiere Timestamp real en campo TS_FIELD
        // Si tu campo es Timestamp nativo, esto funciona perfecto.
        // Si algunos docs no lo tienen, quedarán afuera del rango.
        // (Si te pasa, decime el campo real y lo ajusto.)
      ];

      // ⚠️ No usamos where() acá para no romperte por tipos mixtos.
      // Filtramos por fecha en memoria luego de leer páginas.
      // (Así te funciona ya, incluso si hay docs con fecha como string.)
      // Si querés full-performance, migramos a where(TS_FIELD, ">=", Timestamp.fromDate(minDate)).

      const qRef = last
        ? query(baseRef, orderBy(TS_FIELD, "desc"), startAfter(last), limit(pageSize))
        : query(baseRef, orderBy(TS_FIELD, "desc"), limit(pageSize));

      const snap = await getDocs(qRef);
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        const d = docSnap.data();

        // Fecha (prioridad: fechaHoraEnvio)
        const fechaObj = toDate(d.fechaHoraEnvio) || toDate(d.fecha) || null;

        // Si no hay fecha, no lo usamos para análisis temporal
        if (!fechaObj) continue;

        // recorte por rango solicitado
        if (fechaObj < minDate || fechaObj > maxDate) continue;

        // Normalizamos campos para filtros y conteos
        const edificio = d["edificio"] || "";
        const unidad = d["unidad"] || "";

        const proveedor =
          d["proveedor-personal"] ??
          d.proveedor_personal ??
          d.proveedorPersonal ??
          d.proveedor ??
          d.personal ??
          "";

          const rawEvento = d[colDef.eventoKey];
          const evento = rawEvento == null || String(rawEvento).trim() === "" ? null : String(rawEvento).trim();
  
        const ubicacion =
          colDef.cliente === "Edificios"
            ? (edificio ? edificio + (unidad ? ` - ${unidad}` : "") : "Sin Ubicación")
            : (colDef.ubicacionKey ? (d[colDef.ubicacionKey] || "Sin Ubicación") : "Sin Ubicación");

        const grupo =
          colDef.cliente === "Edificios"
            ? (edificio || "General")
            : (String(d?.[colDef.ubicacionKey] || "").split(" ")[0] || "General");

        // Aplica filtros como en tu dashboard
        if (filtros.grupo && String(grupo).trim() !== String(filtros.grupo).trim()) continue;
        if (filtros.ubicacion && String(ubicacion).trim() !== String(filtros.ubicacion).trim()) continue;

        if (Array.isArray(filtros.eventosSeleccionados) && filtros.eventosSeleccionados.length > 0) {
          if (!filtros.eventosSeleccionados.includes(evento)) continue;
        }

        const haystack = [
          colDef.cliente,
          evento,
          ubicacion,
          grupo,
          d[`observaciones-${colDef.cliente.toLowerCase()}`],
          d["observaciones-edificios"],
          d.observacion,
          d.resolucion,
          d["resolusion-evento"],
          d["razones-pma"],
          d.razonesPma,
          d["respuesta-residente"],
          edificio,
          unidad,
          proveedor,
        ]
          .filter(Boolean)
          .join(" · ");

        if (!includesAllTerms(haystack, qText)) continue;

        // Conteos
         // Conteos
         total += 1;

         if (!evento) eventosSinClasificar += 1;
         else inc(byEvento, evento);
 
         inc(byUbicacion, ubicacion);
         inc(byGrupo, grupo);
         inc(byCliente, colDef.cliente);
         if (proveedor) inc(byProveedor, proveedor);
 
         inc(tendenciaDiaria, fmtYMD(fechaObj));
 
         // Distribución temporal
         const dow = DIAS[fechaObj.getDay()] || "Sin dato";
         const hh = String(fechaObj.getHours()).padStart(2, "0") + ":00";
         inc(byDiaSemana, dow);
         inc(byHora, hh);
         inc(byFranja, franjaDeHora(fechaObj.getHours()));
 
        // Ejemplos recientes (cap)
        if (ejemplosRecientes.length < 40) {
          ejemplosRecientes.push({
            id: docSnap.id,
            cliente: colDef.cliente,
            evento,
            ubicacion,
            grupo,
            fecha: fechaObj.toLocaleString("es-AR", { hour12: false }),
            proveedor: proveedor || "",
            razones: d["razones-pma"] || d.razones || d.razonesPma || "",
            resolucion: d.resolucion || d["resolusion-evento"] || "",
          });
        }

        if (total >= hardCap) break;
      }

      if (total >= hardCap) {
        done = true;
      } else {
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < pageSize) done = true;
      }
    }

    if (total >= hardCap) break;
  }

  const coverage = {
    fuente: "Centro de Monitoreo",
    clienteFiltro: filtros.cliente || "Todos",
    rangoSolicitado: { desde: minDate.toISOString(), hasta: maxDate.toISOString() },
    totalEventos: total,
    truncated: total >= hardCap,
    hardCap,
    filtrosAplicados: {
      ubicacion: filtros.ubicacion || null,
      grupo: filtros.grupo || null,
      eventosSeleccionados: filtros.eventosSeleccionados?.length ? filtros.eventosSeleccionados : null,
      q: qText || null,
    },
  };

  return {
    coverage: {
      ...coverage,
      calidadDato: {
        eventosSinClasificar,
      },
    },
    top: {
      eventos: topN(byEvento, 10),
      ubicaciones: topN(byUbicacion, 10),
      grupos: topN(byGrupo, 10),
      clientes: topN(byCliente, 10),
      proveedores: topN(byProveedor, 10),
    },
    distribucion: {
      diasSemana: topN(byDiaSemana, 7),
      horas: topN(byHora, 10),
      franjas: topN(byFranja, 4),
    },
    tendenciaDiaria,
    ejemplosRecientes,
  };

}, [filtros]);

const inferWindowDays = (text) => {
  const t = String(text || "").toLowerCase();

  // patrones comunes
  if (t.includes("6 meses") || t.includes("seis meses")) return 183;
  if (t.includes("3 meses") || t.includes("tres meses")) return 92;
  if (t.includes("1 mes") || t.includes("un mes")) return 31;

  // “últimos X días”
  const mDias = t.match(/(\d+)\s*(d[ií]as|dia|día)\b/);
  if (mDias?.[1]) return Math.min(3650, Math.max(1, parseInt(mDias[1], 10)));

  // “últimos X meses”
  const mMeses = t.match(/(\d+)\s*mes(es)?\b/);
  if (mMeses?.[1]) return Math.min(3650, Math.max(1, parseInt(mMeses[1], 10) * 30));

  return null;
};


useEffect(() => {
  const onInfo = () => {
    setShowNotifModal(true);
    markAllRead();
  };
  const onAlert = () => setShowAlertModal(true);

  window.addEventListener("g3t:openInfo", onInfo);
  window.addEventListener("g3t:openAlert", onAlert);
  return () => {
    window.removeEventListener("g3t:openInfo", onInfo);
    window.removeEventListener("g3t:openAlert", onAlert);
  };
}, [markAllRead]);

  // ------------ UI ------------
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
 
    <NotificationsBridge
  notificaciones={notificaciones}
  alertas={alertas}
  onAfterOpenInfo={markAllRead}   // opcional
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

        
              <AIAgentChat
  title="Reportes de incidencias"
  categoria="Dashboard"
  form={{
    lugar: filtros?.ubicacion || filtros?.grupo || "",
    operador: "Dashboard",
    evento: (filtros?.eventosSeleccionados || []).join(", "),
    fechaHoraEvento: `${filtros?.fechaInicio || ""} → ${filtros?.fechaFin || ""}`,
    unidad: "",
    zona: "",
    requiereGrabacion: "",
   

    extras: {
      cliente: filtros?.cliente || "",
      ubicacion: filtros?.ubicacion || "",
      grupo: filtros?.grupo || "",
      fechaInicio: filtros?.fechaInicio || "",
      fechaFin: filtros?.fechaFin || "",
      q: filtros?.q || "",
      eventosSeleccionados: filtros?.eventosSeleccionados || [],
    },
    
    observaciones: "",
  }}
  // en dashboard no vamos a “pegar observaciones”, así que no lo pasamos
  resolveExtraContext={resolveExtraContext}
  storageKey="g3t_ai_agent_chat_dashboard_v1"
/>

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
