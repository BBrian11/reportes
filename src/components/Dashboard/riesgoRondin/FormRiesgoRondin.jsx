import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, serverTimestamp,writeBatch
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
    toast.fire({ icon: "info", title: "Ronda en pausa" });
  };

  const handleReanudar = async () => {
    if (!paused || !startTime) return;
    const last = pausasRef.current[pausasRef.current.length - 1];
    if (last && last.to === null) last.to = Date.now();
    setPaused(false);
    startTicker(startTime);
    toast.fire({ icon: "success", title: "Ronda reanudada" });
  };

  const softReset = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    planRef.current = null;

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    pausasRef.current = [];

    setRondaId(null);
    setStartTime(null);
    setEndTime(null);
    setPaused(false);
    setElapsed(0);

    setTurno("Noche");
    setOperario("");
    setNovedades("");
    setObservaciones("");

    setTandas([nuevaTanda()]);

    toast.fire({ icon: "info", title: "Reset visual realizado" });
  };

  const checklistIssues = () => {
    const issues = [];
    tandas.forEach((t) => {
      const c = t.checklist;
      if (!c) return;
      const incompletas = [];
      if (c.grabacionesOK === null) incompletas.push("GRABACIONES");
      if (c.cortes220v === null) incompletas.push("CORTES 220V");
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

  const handleFinalizar = async () => {
    if (!rondaId || !startTime) return Swal.fire("Sin ronda activa", "Primero iniciá la ronda.", "info");

    if (tandas.reduce((acc,t)=>acc + t.camaras.filter(c=>c.touched && c.estado!==null).length,0) < MIN_CAMERAS_REQUIRED) {
      return Swal.fire("Falta completar",
        `Necesitás al menos ${MIN_CAMERAS_REQUIRED} cámaras verificadas (actual: ${camarasCompletadas}).`,
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

    const totalPausedMs = pausasRef.current.reduce((acc, p) => acc + (p.to ? p.to - p.from : 0), 0);
    const durationMs = Date.now() - startTime.getTime() - totalPausedMs;

    const { isConfirmed } = await Swal.fire({
      title: "¿Finalizar ronda?",
      html: `
        <div style="text-align:left">
          <p><b>Duración parcial:</b> ${hh(durationMs)}:${mm(durationMs)}:${ss(durationMs)}</p>
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
      if (tickRef.current) clearInterval(tickRef.current);
      if (paused) {
        const last = pausasRef.current[pausasRef.current.length - 1];
        if (last && last.to === null) last.to = Date.now();
        setPaused(false);
      }
      const fin = new Date();
    const totalPausedMs = pausasRef.current.reduce((acc, p) => acc + (p.to ? p.to - p.from : 0), 0);
    const durationMs = fin.getTime() - startTime.getTime() - totalPausedMs;

    await updateDoc(doc(db, "respuestas-tareas", rondaId), {
      estado: "Completada",
      fechaEnvio: serverTimestamp(),
      observacion: observaciones || "",
      respuestas: { turno, novedades, observaciones, tandas },
      controlRonda: { startTime, endTime: fin, pausas: pausasRef.current, totalPausedMs, durationMs },
    });

    const batch = writeBatch(db);
    tandas.forEach((t) => {
      if (!t?.cliente) return;
      const clienteKey = norm(t.cliente);
      t.camaras.forEach((c) => {
        if (!c?.canal || !c?.estado) return;
        const ref = doc(db, "rondin-index", clienteKey, "camaras", String(c.canal));
        batch.set(ref, {
          estado: c.estado,           // "ok" | "medio" | "grave"
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

    // FormRiesgoRondin.jsx
// 👇 Esta es la función correcta
// FormRiesgoRondin.jsx
const onCamState = (tandaId, camId, next) => {
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
                estadoPrevio: c.estado ?? c.estadoPrevio ?? null, // guarda anterior
                estado: next,                                     // setea nuevo
                touched: true,
                history: [...(c.history || []), { at: ts, from: c.estado, to: next }],
              };
            }),
          }
        : t
    )
  );
};



    
  const setChecklistVal = (tandaId, field, value) =>
    setTandas(prev => prev.map(t => t.id === tandaId ? { ...t, checklist: { ...t.checklist, [field]: value } } : t));

  const resetFallan = (tandaId) =>
    setTandas(prev => prev.map(t => t.id === tandaId ? { ...t, checklist: { ...t.checklist, grabacionesFallan: { cam1:false,cam2:false,cam3:false,cam4:false } } } : t));

  const toggleGrabacionFalla = (tandaId, key) =>
    setTandas(prev => prev.map(t => t.id === tandaId ? {
      ...t, checklist: { ...t.checklist, grabacionesFallan: { ...t.checklist.grabacionesFallan, [key]: !t.checklist.grabacionesFallan[key] } }
    } : t));

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
  <Container maxWidth="lg" sx={{ py: 3, display:"grid", gap: 16 }}>
  {/* HeaderBar aquí si querés, sino dejas el bloque de progreso+campos */}
  
  <Paper sx={{ p: 2.25, display: "grid", gap: 2 }}>
    <ProgressRows overall={overallProgress} cameras={camerasProgress} />
    <TopFields
      turno={turno} setTurno={setTurno}
      operario={operario} setOperario={setOperario}
      operarios={operarios}
    />
    <TextField
      label="Novedades generales"
      fullWidth multiline rows={3}
      value={novedades} onChange={(e)=>setNovedades(e.target.value)}
    />
  </Paper>

  {/* Tandas */}
  <Stack spacing={2}>
    {tandas.map((t) => (
     <TandaCard
     t={t}
     clientesCat={clientesCat}
     onSetCliente={setTandaCliente}
     onAddCam={addCamRow}
     onRemoveTanda={(id) => tandas.length === 1 ? null : removeTanda(id)}
     onCamField={setCamField}
     onCamRemove={removeCamRow}
     onCamState={onCamState}
     setChecklistVal={setChecklistVal}
     resetFallan={resetFallan}
     toggleFallan={toggleGrabacionFalla}
     setResumen={setTandaResumen}
     // 👇 histórico específico de este cliente
     historicos={historicosPorCliente[norm(t.cliente || "")] || {}}
   />
   
    ))}

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
  <Paper sx={{ p: 2.25 }}>
    <TextField
      label="Observaciones generales"
      fullWidth multiline rows={3}
      value={observaciones}
      onChange={(e) => setObservaciones(e.target.value)}
    />
  </Paper>

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
      <Button size="small" variant="text" sx={{ mt: 1 }} onClick={() => {
        const miss = { camerasNotTouched: [], camerasNullState: [] };
        tandas.forEach(t => t.camaras.forEach(c => {
          if (!c.touched) miss.camerasNotTouched.push({ cliente: t.cliente, canal: c.canal });
          if (c.touched && c.estado === null) miss.camerasNullState.push({ cliente: t.cliente, canal: c.canal });
        }));
        const li = (arr, fmt) => (arr.length ? `<ul style="margin:6px 0 0 18px">${arr.map(fmt).join("")}</ul>` : "<i>—</i>");
        Swal.fire({
          title: "¿Qué falta completar?",
          html: `
            <div style="text-align:left">
              <p><b>Cámaras sin tocar:</b> ${miss.camerasNotTouched.length}</p>
              ${li(miss.camerasNotTouched, x =>`<li>${x.cliente || "Cliente"} — Cam ${x.canal}</li>`)}
              <p style="margin-top:10px"><b>Cámaras sin estado:</b> ${miss.camerasNullState.length}</p>
              ${li(miss.camerasNullState, x => `<li>${x.cliente || "Cliente"} — Cam ${x.canal}</li>`)}
            </div>
          `,
          icon: (miss.camerasNotTouched.length || miss.camerasNullState.length) ? "info" : "success",
          confirmButtonText: "OK",
        });
      }}>
        Ver pendientes
      </Button>
    </Paper>
  </Container>
);

}
