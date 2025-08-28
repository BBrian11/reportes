import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, serverTimestamp, writeBatch,  
  onSnapshot
} from "firebase/firestore";
import { db } from "../../../services/firebase";
import { Box, Paper, Divider, Grid, TextField, Button,Container, Stack, Typography, Card } from "@mui/material";
import HeaderBar from "./HeaderBar";
import ProgressRows from "./ProgressRows";
import TopFields from "./TopFields";
import TandaCard from "./TandaCard";
import FooterActions from "./FooterActions";
import Swal, { toast, confirm } from "./swal";
import {
  OPERARIOS_DEFAULT, MAX_TANDAS, MIN_CAMERAS_REQUIRED,
  RISK_SET, norm, nuevaTanda, shuffle, hh, mm, ss
} from "./helpers";

export default function FormRiesgoRondin({ operarios = OPERARIOS_DEFAULT }) {
  // ===== Config plan =====
  const DEFAULT_TOTAL_CLIENTES_PLAN = 2;
  const TANDAS_SALTOS = 64;
  const SHIFT_DURATION_MS = 12 * 60 * 60 * 1000;
  const SLOT_INTERVAL_MS = Math.floor(SHIFT_DURATION_MS / TANDAS_SALTOS);

  const timeoutsRef = useRef([]);
  const planRef = useRef(null);

  // -------- Estado superior
  const [turno, setTurno] = useState("Noche");
  const [operario, setOperario] = useState("");
  const [clientesCat, setClientesCat] = useState([]);
  const [novedades, setNovedades] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const LS_RONDA_KEY = "rondin:activo";
  const LS_OPERARIO_KEY = "rondin:operario";
  // -------- TANDAS
  const [tandas, setTandas] = useState([nuevaTanda()]);

  // -------- Control de ronda
  const [rondaId, setRondaId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(null);
  const pausasRef = useRef([]);
// === Secuencial por cliente (uno a la vez)
const [activeTandaIdx, setActiveTandaIdx] = useState(0);
const completedRef = useRef({}); // { [tandaId]: true } para evitar disparos múltiples

const isTandaCompleta = (t) => {
  if (!t) return false;

  // 1) Todas las cámaras tocadas y con estado no null
  const camsOk = Array.isArray(t.camaras) && t.camaras.length > 0 &&
    t.camaras.every(c => c.touched && c.estado !== null);

  // 2) Checklist completo
  const c = t.checklist || {};
  const chkOk = [c.grabacionesOK, c.cortes220v, c.equipoHora, c.equipoOffline].every(v => v === true || v === false);

  // 3) Si grabacionesOK === false, debe tener al menos una cámara marcada en grabacionesFallan
  const grabReqOk = (c.grabacionesOK !== false) ||
    (c.grabacionesFallan && Object.values(c.grabacionesFallan).some(Boolean));

  return camsOk && chkOk && grabReqOk;
};

const nextIncompleteIdx = (fromIdx = -1) => {
  for (let i = fromIdx + 1; i < tandas.length; i++) {
    if (!isTandaCompleta(tandas[i])) return i;
  }
  return null;
};
useEffect(() => {
  const t = tandas[activeTandaIdx];
  if (!t) return;

  // Si la tanda activa se completó y aún no lo registramos, avisamos y avanzamos
  if (isTandaCompleta(t) && !completedRef.current[t.id]) {
    completedRef.current[t.id] = true;

    const prox = nextIncompleteIdx(activeTandaIdx);

    Swal.fire({
      title: "Cliente completado",
      html: `<div style="text-align:left">
               <p><b>${t.cliente || "Cliente"}</b> finalizado.</p>
               ${prox !== null
                 ? "<p>¿Continuar con el siguiente cliente?</p>"
                 : "<p>¡Completaste todos los clientes de esta tanda!</p>"}
             </div>`,
      icon: "success",
      showCancelButton: prox !== null,
      confirmButtonText: prox !== null ? "Continuar" : "OK",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    }).then(({ isConfirmed }) => {
      if (prox !== null && isConfirmed) {
        setActiveTandaIdx(prox);
        // opcional: hacer scroll al siguiente
        const nextEl = document.getElementById(tandas[prox]?.id);
        if (nextEl) nextEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
}, [tandas, activeTandaIdx]); // se reevalúa cuando cambian tandas o el índice activo
useEffect(() => {
  // Si eliminan una tanda o cambian el orden, ajustamos el índice activo
  if (activeTandaIdx >= tandas.length) {
    setActiveTandaIdx(Math.max(0, tandas.length - 1));
  }
}, [tandas.length]);

  const scheduleSlots = (slotsMap, getTandaById) => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    slotsMap.forEach((ids, slotIdx) => {
      if (!ids.length) return;
      const t = setTimeout(() => {
        const clientes = ids.map(id => getTandaById(id)?.cliente).filter(Boolean).join(" • ");
        Swal.fire({
          title: `Tanda ${slotIdx + 1} lista`,
          html: `<div style="text-align:left"><b>Clientes:</b><br/>${clientes || "—"}</div>`,
          icon: "info",
          confirmButtonText: "OK",
        });
        const firstId = ids[0];
        const el = document.getElementById(firstId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, slotIdx * SLOT_INTERVAL_MS);
      timeoutsRef.current.push(t);
    });
  };
  const [historicosPorCliente, setHistoricosPorCliente] = useState({}); 
  const unsubRef = useRef({}); // para desuscribirte por cliente
  
  // Tiempo visible
  const displayElapsed = useMemo(() => {
    const sec = Math.floor(elapsed / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [elapsed]);

  // Progreso (solo cámaras)
  const totalCamaras = useMemo(() => tandas.reduce((acc, t) => acc + t.camaras.length, 0), [tandas]);
  const camarasCompletadas = useMemo(
    () => tandas.reduce((acc, t) => acc + t.camaras.filter(c => c.touched && c.estado !== null).length, 0),
    [tandas]
  );
  const camerasProgress = useMemo(
    () => (totalCamaras ? Math.round((camarasCompletadas / totalCamaras) * 100) : 0),
    [camarasCompletadas, totalCamaras]
  );
  const overallProgress = camerasProgress;

  // Cargar catálogo (whitelist riesgo)
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "clientes"));
        const lista = snap.docs
          .map(d => ({ id: d.id, nombre: (d.data()?.nombre || "").toString() }))
          .filter(c => RISK_SET.has(norm(c.nombre)));
        setClientesCat(lista);
      } catch (e) {
        console.error("Error cargando clientes riesgo:", e);
        setClientesCat([]);
      }
    })();
  }, []);

  useEffect(() => {
    // escuchar solo los clientes que estén elegidos en las tandas
    const clientesElegidos = Array.from(new Set(tandas.map(t => t.cliente).filter(Boolean)));
    const nextUnsub = {};
  
    clientesElegidos.forEach((nombre) => {
      const key = norm(nombre);
      // si ya hay un listener, mantenerlo
      if (unsubRef.current[key]) {
        nextUnsub[key] = unsubRef.current[key];
        return;
      }
  
      // 👉 suscripción: rondin-index/{clienteKey}/camaras/*
      const colRef = collection(db, "rondin-index", key, "camaras");
      const unsub = onSnapshot(colRef, (snap) => {
        const mapa = {};
        snap.forEach(d => {
          // d.id = canal (string). Forzá a number si tu Select usa números
          const canal = Number(d.id);
          const estado = d.data()?.estado ?? null; // "ok" | "medio" | "grave" | null
          mapa[canal] = estado;
        });
        setHistoricosPorCliente(prev => ({ ...prev, [key]: mapa }));
      });
  
      nextUnsub[key] = unsub;
    });
  
    // limpiar listeners que ya no se usan
    Object.keys(unsubRef.current).forEach((key) => {
      if (!nextUnsub[key]) {
        try { unsubRef.current[key](); } catch {}
      }
    });
  
    unsubRef.current = nextUnsub;
  
    return () => {
      // cleanup al desmontar
      Object.values(unsubRef.current).forEach((u) => { try { u(); } catch {} });
      unsubRef.current = {};
    };
  }, [tandas]);
  // Plantilla fija
  const ensureTemplate = async () => {
    const templateRef = doc(db, "formularios-tareas", "rondin-alto-riesgo");
    const snap = await getDoc(templateRef);
    if (!snap.exists()) {
      await setDoc(templateRef, {
        nombre: "Rondín Alto Riesgo",
        tipo: "fijo",
        descripcion: "Rondín de clientes de alto riesgo por tandas; control de cámaras por canal.",
        fechaCreacion: serverTimestamp(),
      });
    }
    return templateRef.id;
  };

  // Ticker
  const startTicker = (startedAt) => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      if (paused) return;
      const now = Date.now();
      const pausedMs = pausasRef.current.reduce((acc, p) => acc + (p.to ? p.to - p.from : 0), 0);
      setElapsed(now - startedAt.getTime() - pausedMs);
    }, 500);
  };

  // Iniciar
  const handleIniciar = async () => {
    if (!operario) return Swal.fire("Falta operario", "Seleccioná un operario.", "warning");
    if (!clientesCat.length) return Swal.fire("Sin catálogo", "No hay clientes cargados.", "warning");

    const TOTAL_CLIENTES_PLAN = Math.min(DEFAULT_TOTAL_CLIENTES_PLAN, clientesCat.length);

    const { isConfirmed } = await confirm(
      "¿Iniciar ronda?",
      `Se generarán ${TOTAL_CLIENTES_PLAN} clientes en 64 tandas (12hs).`,
      "Iniciar"
    );
    if (!isConfirmed) return;

    try {
      // construir plan (solo clientes existentes)
      const pool = clientesCat.map(c => c.nombre);
      const N = Math.min(TOTAL_CLIENTES_PLAN, pool.length);
      const picked = shuffle(pool).slice(0, N);
      const planTandas = picked.map((name, i) => ({ ...nuevaTanda(Date.now() + i), cliente: name }));

      // slots
      const slotsMap = Array.from({ length: 64 }, () => []);
      planTandas.forEach((t, idx) => { slotsMap[idx % 64].push(t.id); });

      const formId = await ensureTemplate();
      const ahora = new Date();

      let docId = rondaId;
      if (!docId) {
        const ref = await addDoc(collection(db, "respuestas-tareas"), {
          formId,
          nombreFormulario: "Rondín Alto Riesgo",
          operador: operario,
          estado: "En Proceso",
          fechaEnvio: null,
          observacion: observaciones || "",
          respuestas: { turno, novedades, observaciones, tandas: planTandas },
          controlRonda: { startTime: ahora, endTime: null, pausas: [], totalPausedMs: 0, durationMs: 0 },
        });
        docId = ref.id;
        setRondaId(docId);
      } else {
        await updateDoc(doc(db, "respuestas-tareas", docId), { estado: "En Proceso" });
      }

      setTandas(planTandas);
      planRef.current = { slotsMap, startedAt: ahora };
      setRondaId(docId);
      localStorage.setItem(LS_RONDA_KEY, docId);
      localStorage.setItem(LS_OPERARIO_KEY, operario);
      
      const getTandaById = (id) => planTandas.find(t => t.id === id);
      const SHIFT_DURATION_MS = 12 * 60 * 60 * 1000;
      const SLOT_INTERVAL_MS = Math.floor(SHIFT_DURATION_MS / 64);
      scheduleSlots(slotsMap, getTandaById);

      setStartTime(ahora);
      setPaused(false);
      setEndTime(null);
      pausasRef.current = [];
      startTicker(ahora);

      toast.fire({ icon: "success", title: "Ronda iniciada" });
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo iniciar la ronda.", "error");
    }
  };

  const handlePausar = async () => {
    if (paused || !startTime) return;
    const { isConfirmed } = await confirm("¿Pausar ronda?", "El cronómetro se detendrá hasta reanudar.", "Pausar");
    if (!isConfirmed) return;
  
    setPaused(true);
    pausasRef.current.push({ from: Date.now(), to: null });
  
    // persistir ya mismo
    await saveControlRondaNow({ estado: "En Proceso" }); // o "Pausada" si querés un campo visible
    toast.fire({ icon: "info", title: "Ronda en pausa" });
  };
  
  const handleReanudar = async () => {
    if (!paused || !startTime) return;
    const last = pausasRef.current[pausasRef.current.length - 1];
    if (last && last.to === null) last.to = Date.now();
  
    setPaused(false);
    startTicker(startTime);
  
    // persistir ya mismo
    await saveControlRondaNow({ estado: "En Proceso" });
    toast.fire({ icon: "success", title: "Ronda reanudada" });
  };
  
  const softReset = () => {
    // 🔇 cortar listeners de clientes
    Object.values(unsubRef.current || {}).forEach(u => { try { u(); } catch {} });
    unsubRef.current = {};
  
    // 🔇 cortar listener de la ronda
    if (rondaDocUnsubRef.current) { try { rondaDocUnsubRef.current(); } catch {} }
    rondaDocUnsubRef.current = null;
  
    // 🕒 timers y plan
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    planRef.current = null;
  
    // ⏱️ ticker
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  
    // 💾 autosave
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  
    // 🧮 estado mínimo para que NO corra autosave
    setRondaId(null);
  
    // 🧽 UI y refs
    pausasRef.current = [];
    setStartTime(null);
    setEndTime(null);
    setPaused(false);
    setElapsed(0);
    setTurno("Noche");
    setOperario("");
    setNovedades("");
    setObservaciones("");
    setTandas([nuevaTanda()]);
    setHistoricosPorCliente({}); // limpias los colores históricos
  
    // 🗂️ storage
    localStorage.removeItem(LS_RONDA_KEY);
    localStorage.removeItem(LS_OPERARIO_KEY);
  
    toast.fire({ icon: "info", title: "Listo: ronda cerrada y reseteada" });
  };
  
  const checklistIssues = () => {
    const issues = [];
    tandas.forEach((t) => {
      const c = t.checklist;
      if (!c) return;
      const incompletas = [];
      if (c.grabacionesOK === null) incompletas.push("GRABACIONES");
      if (c.cortes220v === null) incompletas.push("CORTES 220V");
      if (c.equipoHora === null) incompletas.push("equipoHora");
      if (c.equipoOffline === null) incompletas.push("EQUIPO OFFLINE");
      if (incompletas.length) {
        issues.push(`${t.cliente || "Cliente"}: completar ${incompletas.join(", ")}`);
      }
      if (c.grabacionesOK === false) {
        const any = Object.values(c.grabacionesFallan || {}).some(Boolean);
        if (!any) issues.push(`${t.cliente || "Cliente"}: indicá qué cámaras fallan en GRABACIONES`);
      }
    });
    return issues;
  };
  const rondaDocUnsubRef = useRef(null);
  const handleFinalizar = async () => {
    if (!rondaId || !startTime) return Swal.fire("Sin ronda activa", "Primero iniciá la ronda.", "info");
  
    const completadas = tandas.reduce((acc,t)=>acc + t.camaras.filter(c=>c.touched && c.estado!==null).length,0);
    if (completadas < MIN_CAMERAS_REQUIRED) {
      return Swal.fire("Falta completar",
        `Necesitás al menos ${MIN_CAMERAS_REQUIRED} cámaras verificadas (actual: ${completadas}).`,
        "info");
    }
  
    const issues = checklistIssues();
    if (issues.length) {
      return Swal.fire({
        title: "Checklist incompleto",
        html: `<div style="text-align:left"><ul style="margin-left:18px">${issues.map(i=>`<li>${i}</li>`).join("")}</ul></div>`,
        icon: "info",
        confirmButtonText: "OK",
      });
    }
  
    // calcular métricas
    const totalPausedMs = pausasRef.current.reduce((acc, p) => acc + (p.to ? p.to - p.from : 0), 0);
    const durationMsPreview = Date.now() - startTime.getTime() - totalPausedMs;
  
    const { isConfirmed } = await Swal.fire({
      title: "¿Finalizar ronda?",
      html: `
        <div style="text-align:left">
          <p><b>Duración parcial:</b> ${hh(durationMsPreview)}:${mm(durationMsPreview)}:${ss(durationMsPreview)}</p>
          <p><b>Pausas:</b> ${pausasRef.current.length}</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Finalizar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });
    if (!isConfirmed) return;
  
    try {
      // cerrar pausa abierta si la hubiera
      if (tickRef.current) clearInterval(tickRef.current);
      if (paused) {
        const last = pausasRef.current[pausasRef.current.length - 1];
        if (last && last.to === null) last.to = Date.now();
        setPaused(false);
      }
  
      const fin = new Date();
      const totalPausedMs2 = pausasRef.current.reduce((acc, p) => acc + (p.to ? p.to - p.from : 0), 0);
      const durationMs = fin.getTime() - startTime.getTime() - totalPausedMs2;
  
      // persistir doc principal
      await updateDoc(doc(db, "respuestas-tareas", rondaId), {
        estado: "Completada",
        fechaEnvio: serverTimestamp(),
        observacion: observaciones || "",
        respuestas: { turno, novedades, observaciones, tandas },
        controlRonda: { startTime, endTime: fin, pausas: pausasRef.current, totalPausedMs: totalPausedMs2, durationMs },
        updatedAt: serverTimestamp(),
      });
  
      // persistir índice por cliente/canal
      const batch = writeBatch(db);
      tandas.forEach((t) => {
        if (!t?.cliente) return;
        const clienteKey = norm(t.cliente);
        t.camaras.forEach((c) => {
          if (!c?.canal || !c?.estado) return;
          const ref = doc(db, "rondin-index", clienteKey, "camaras", String(c.canal));
          batch.set(ref, {
            estado: c.estado,
            updatedAt: serverTimestamp(),
            rondaId,
          }, { merge: true });
        });
      });
      await batch.commit();
  
      setEndTime(fin);
      setElapsed(durationMs);
  
      await Swal.fire({
        title: "Ronda finalizada",
        html: `<p><b>Duración:</b> ${hh(durationMs)}:${mm(durationMs)}:${ss(durationMs)}</p>`,
        icon: "success",
        confirmButtonText: "OK",
      });
      completedRef.current = {};
      setActiveTandaIdx(0);
      
      // 🧹 ahora sí: todo a 0
      softReset();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo finalizar la ronda.", "error");
    }
  };
  

  // Mutadores TANDAS y checklist
  const addTanda = () => {
    if (tandas.length >= MAX_TANDAS) return;
    setTandas(prev => [...prev, nuevaTanda()]);
  };
  const removeTanda = (tandaId) => setTandas(prev => prev.filter(t => t.id !== tandaId));
  const setTandaCliente = (tandaId, value) =>
    setTandas(prev => prev.map(t => (t.id === tandaId ? { ...t, cliente: value } : t)));
  const setTandaResumen = (tandaId, value) =>
    setTandas(prev => prev.map(t => (t.id === tandaId ? { ...t, resumen: value } : t)));

  const addCamRow = (tandaId) =>
    setTandas(prev => prev.map(t => t.id === tandaId
      ? { ...t, camaras: [...t.camaras, { id:`cam-${tandaId}-${Date.now()}`, canal:1, estado:null, nota:"", touched:false }] }
      : t));

  const removeCamRow = (tandaId, camId) =>
    setTandas(prev => prev.map(t => t.id === tandaId ? { ...t, camaras: t.camaras.filter(c => c.id !== camId) } : t));

  const setCamField = (tandaId, camId, key, value) =>
    setTandas(prev => prev.map(t => t.id === tandaId ? {
      ...t, camaras: t.camaras.map(c => c.id === camId ? { ...c, [key]: value, touched: key==="estado" ? true : c.touched } : c)
    } : t));


const onCamState = async (tandaId, camId, next) => {
  // 1) UI inmediata
  setTandas(prev =>
    prev.map(t =>
      t.id === tandaId
        ? {
            ...t,
            camaras: t.camaras.map(c => {
              if (c.id !== camId) return c;
              const ts = Date.now();
              return {
                ...c,
                estadoPrevio: c.estado ?? c.estadoPrevio ?? null,
                estado: next,
                touched: true,
                history: [...(c.history || []), { at: ts, from: c.estado, to: next }],
              };
            }),
          }
        : t
    )
  );

  // 2) Persistencia en índice
  try {
    const tSel = tandas.find(t => t.id === tandaId);
    if (!tSel?.cliente) return;
    const camSel = tSel.camaras.find(c => c.id === camId);
    if (!camSel?.canal) return;

    const clienteKey = norm(tSel.cliente);
    await setDoc(
      doc(db, "rondin-index", clienteKey, "camaras", String(Number(camSel.canal))),
      { estado: next, updatedAt: serverTimestamp(), rondaId: rondaId || "en-curso" },
      { merge: true }
    );
  } catch (err) {
    console.error("live-index update failed:", err);
  }
};
    
  const setChecklistVal = (tandaId, field, value) =>
    setTandas(prev => prev.map(t => t.id === tandaId ? { ...t, checklist: { ...t.checklist, [field]: value } } : t));

  const resetFallan = (tandaId) =>
    setTandas(prev => prev.map(t => t.id === tandaId ? { ...t, checklist: { ...t.checklist, grabacionesFallan: { cam1:false,cam2:false,cam3:false,cam4:false } } } : t));
    const toggleGrabacionFalla = (tandaId, key) =>
    setTandas(prev => prev.map(t => {
      if (t.id !== tandaId) return t;
      const cl = t.checklist || {
        grabacionesOK: null,
        cortes220v: null,
        equipoOffline: null,
        equipoHora:null,
        grabacionesFallan: { cam1:false, cam2:false, cam3:false, cam4:false }
      };
      return {
        ...t,
        checklist: {
          ...cl,
          grabacionesFallan: {
            ...(cl.grabacionesFallan || {}),
            [key]: !((cl.grabacionesFallan || {})[key])
          }
        }
      };
    }));
  
    useEffect(() => {
      const onHide = () => { if (document.visibilityState === "hidden") saveControlRondaNow(); };
      const onBeforeUnload = () => { saveControlRondaNow(); };
    
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("beforeunload", onBeforeUnload);
      return () => {
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("beforeunload", onBeforeUnload);
      };
    }, [rondaId, startTime, endTime]);
    
    useEffect(() => {
      const savedId = localStorage.getItem(LS_RONDA_KEY);
      if (!savedId) return;
    
      const ref = doc(db, "respuestas-tareas", savedId);
      const unsub = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          localStorage.removeItem(LS_RONDA_KEY);
          localStorage.removeItem(LS_OPERARIO_KEY);
          return;
        }
        const d = snap.data();
    
        setRondaId(savedId);
        setOperario(d.operador || "");
        setTurno(d?.respuestas?.turno || "Noche");
        setNovedades(d?.respuestas?.novedades || "");
        setObservaciones(d?.respuestas?.observaciones || "");
        setTandas(Array.isArray(d?.respuestas?.tandas) && d.respuestas.tandas.length ? d.respuestas.tandas : [nuevaTanda()]);
    
        const started = d?.controlRonda?.startTime?.toDate?.() || (d?.controlRonda?.startTime ? new Date(d.controlRonda.startTime) : null);
        const ended   = d?.controlRonda?.endTime?.toDate?.()   || (d?.controlRonda?.endTime ? new Date(d.controlRonda.endTime)   : null);
        const pausas  = Array.isArray(d?.controlRonda?.pausas) ? d.controlRonda.pausas : [];
    
        setStartTime(started);
        setEndTime(ended);
        pausasRef.current = pausas;
    
        const last = pausas[pausas.length - 1];
        setPaused(!!(last && last.to == null));
    
        if (started) startTicker(started);
      });
    
      rondaDocUnsubRef.current = unsub;
      return () => { try { unsub(); } catch {} };
    }, []);
    


const saveControlRondaNow = async (extra = {}) => {
  if (!rondaId) return;
  try {
    const totalPausedMs = pausasRef.current.reduce((acc, p) => acc + (p.to ? p.to - p.from : 0), 0);
    const durationMs = startTime ? (Date.now() - startTime.getTime() - totalPausedMs) : 0;

    await updateDoc(doc(db, "respuestas-tareas", rondaId), {
      ...extra,
      controlRonda: {
        startTime: startTime || null,
        endTime: endTime || null,
        pausas: pausasRef.current,         // [{ from:number, to:number|null }, ...]
        totalPausedMs,
        durationMs,
      },
      updatedAt: serverTimestamp(),        // útil para monitoreo/debug
    });
  } catch (e) {
    console.error("saveControlRondaNow failed", e);
  }
};

const saveTimerRef = useRef(null);

const queueAutosave = () => {
  if (!rondaId) return;
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

  saveTimerRef.current = setTimeout(async () => {
    try {
      const pausedMs = pausasRef.current.reduce((acc, p) => acc + (p.to ? p.to - p.from : 0), 0);
      const dur = startTime ? (Date.now() - startTime.getTime() - pausedMs) : 0;

      // para consultas rápidas por cliente/operario/día
      const clientesKeys = Array.from(new Set(tandas.map(t => norm(t.cliente || "")).filter(Boolean)));

      await updateDoc(doc(db, "respuestas-tareas", rondaId), {
        operador: operario,
        estado: endTime ? "Completada" : "En Proceso",
        observacion: observaciones || "",
        respuestas: {
          turno, novedades, observaciones, tandas,
        },
        controlRonda: {
          startTime: startTime || null,
          endTime: endTime || null,
          pausas: pausasRef.current,
          totalPausedMs: pausedMs,
          durationMs: dur,
        },
        // facilitan la relación ronda-cliente-operador
        clientesKeys,                 // p.ej. ["LA CASCADA","LOMAS DE PETION"]
        operadorKey: (operario || "").toUpperCase(),
        diaKey: new Date().toISOString().slice(0,10), // AAAA-MM-DD local
      });
    } catch (e) {
      console.error("autosave failed", e);
    }
  }, 400); // 400ms de debounce
};


useEffect(() => { queueAutosave(); }, [tandas, novedades, observaciones, turno]);
useEffect(() => { queueAutosave(); }, [startTime, endTime, paused]); // por si querés

  const estadoRonda = useMemo(() => {
    if (endTime) return "finalizada";
    if (startTime && paused) return "pausada";
    if (startTime) return "enCurso";
    return "lista";
  }, [endTime, startTime, paused]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      timeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

// dentro del return de FormRiesgoRondin

return (
  <Container maxWidth="lg" sx={{ py: 3, display: "grid", gap: 16 }}>
    {/* === Header compacto y sticky === */}
    <Box sx={{ position: "sticky", top: 8, zIndex: 12 }}>
      <Paper
        elevation={2}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          backdropFilter: "saturate(1.2) blur(6px)",
        }}
      >
        <HeaderBar
          camarasCompletadas={camarasCompletadas}
          totalCamaras={totalCamaras}
          minReq={MIN_CAMERAS_REQUIRED}
          elapsed={displayElapsed}
        />
      </Paper>
    </Box>

    {/* Bloque de progreso + campos */}
    <Paper sx={{ p: 2.25, display: "grid", gap: 2 }}>
      <ProgressRows overall={overallProgress} cameras={camerasProgress} />
      <TopFields
        turno={turno}
        setTurno={setTurno}
        operario={operario}
        setOperario={setOperario}
        operarios={operarios}
      />
      <TextField
        label="Novedades generales"
        fullWidth
        multiline
        rows={3}
        value={novedades}
        onChange={(e) => setNovedades(e.target.value)}
      />
    </Paper>

    {/* Tandas */}
    <Stack spacing={2}>
      {tandas.map((t, idx) => {
        const isActive = idx === activeTandaIdx;
        return (
          <Box
            key={t.id}
            id={t.id}
            sx={{
              position: "relative",
              opacity: isActive ? 1 : 0.45,
              pointerEvents: isActive ? "auto" : "none",
              transition: "opacity .2s ease",
            }}
          >
            {/* Badge opcional para claridad visual */}
            {!isActive && (
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  px: 1,
                  py: 0.25,
                  bgcolor: "warning.light",
                  color: "warning.contrastText",
                  borderRadius: 1,
                  fontSize: 12,
                }}
              >
                Esperá a completar el anterior
              </Box>
            )}

            <TandaCard
              tanda={t}
              clientesCat={clientesCat}
              onSetCliente={setTandaCliente}
              onAddCam={addCamRow}
              onRemoveTanda={(id) => (tandas.length === 1 ? null : removeTanda(id))}
              onCamField={setCamField}
              onCamRemove={removeCamRow}
              onCamState={onCamState}
              setChecklistVal={setChecklistVal}
              resetFallan={resetFallan}
              toggleFallan={toggleGrabacionFalla}
              setResumen={setTandaResumen}
              historicos={historicosPorCliente[norm(t.cliente || "")]}
            />
          </Box>
        );
      })}

      <Button
        onClick={addTanda}
        variant="outlined"
        disabled={tandas.length >= Math.min(clientesCat.length || 0, MAX_TANDAS)}
        sx={{ alignSelf: "flex-start" }}
      >
        Agregar cliente {tandas.length}/{Math.min(clientesCat.length || 0, MAX_TANDAS)}
      </Button>
    </Stack>

    {/* Observaciones + Footer */}


    <Paper
      sx={{
        p: 2,
        position: { md: "sticky" },
        bottom: { md: 12 },
        zIndex: 10,
        backdropFilter: "saturate(1.2) blur(6px)",
      }}
    >
      <FooterActions
        totalCamaras={totalCamaras}
        elapsed={displayElapsed}
        estadoRonda={estadoRonda}
        onIniciar={handleIniciar}
        onPausar={handlePausar}
        onReanudar={handleReanudar}
        onFinalizar={handleFinalizar}
        onReset={softReset}
      />

      <Box component="span">
        <Box component="br" />
        <Box component="br" />
      </Box>

      <Button
        size="small"
        variant="text"
        sx={{ mt: 1 }}
        onClick={() => {
          const miss = { camerasNotTouched: [], camerasNullState: [] };
          tandas.forEach((t) =>
            t.camaras.forEach((c) => {
              if (!c.touched) miss.camerasNotTouched.push({ cliente: t.cliente, canal: c.canal });
              if (c.touched && c.estado === null)
                miss.camerasNullState.push({ cliente: t.cliente, canal: c.canal });
            })
          );
          const li = (arr, fmt) =>
            arr.length
              ? `<ul style="margin:6px 0 0 18px">${arr.map(fmt).join("")}</ul>`
              : "<i>—</i>";
          Swal.fire({
            title: "¿Qué falta completar?",
            html: `
              <div style="text-align:left">
                <p><b>Cámaras sin tocar:</b> ${miss.camerasNotTouched.length}</p>
                ${li(miss.camerasNotTouched, (x) => `<li>${x.cliente || "Cliente"} — Cam ${x.canal}</li>`)}
                <p style="margin-top:10px"><b>Cámaras sin estado:</b> ${miss.camerasNullState.length}</p>
                ${li(miss.camerasNullState, (x) => `<li>${x.cliente || "Cliente"} — Cam ${x.canal}</li>`)}
              </div>
            `,
            icon: miss.camerasNotTouched.length || miss.camerasNullState.length ? "info" : "success",
            confirmButtonText: "OK",
          });
        }}
      >
        Ver pendientes
      </Button>

      <Button
        size="small"
        variant="contained"
        sx={{
          ml: 1,
          px: 2.5,
          py: 0.75,
          borderRadius: 2,
          fontSize: 13,
          fontWeight: "bold",
          textTransform: "none",
          bgcolor: "#1976d2",
          color: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          "&:hover": {
            bgcolor: "#1565c0",
            boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
          },
          "&:active": {
            transform: "scale(0.97)",
          },
        }}
        onClick={() => {
          const prox = nextIncompleteIdx(activeTandaIdx);
          if (prox === null) {
            Swal.fire("Sin pendientes", "No quedan clientes pendientes en esta tanda.", "info");
          } else {
            setActiveTandaIdx(prox);
            const nextEl = document.getElementById(tandas[prox]?.id);
            if (nextEl) nextEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
      >
        Ir al siguiente cliente
      </Button>
    </Paper>
  </Container>
);


}
