import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp, onSnapshot, query, orderBy, runTransaction, where, limit 
  
} from "firebase/firestore";
import { db } from "../../services/firebase";

import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
  Chip,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

import {
  PlayArrow,
  Pause,
  Stop,
  RestartAlt,
  AccessTime,
  DoneAll,
  Add,
  Delete,CheckCircle,
  ReportProblem,
   RemoveCircleOutline,
} from "@mui/icons-material";

import "../../styles/formRiesgoRondin.css";
// ===== Gamification =====
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import useSound from "use-sound";


const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });
  
  const confirm = (title, text, confirmButtonText = "Sí") =>
    Swal.fire({
      title,
      text,
      icon: "question",
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });
  // --- Filtro de clientes de alto riesgo (whitelist) ---

/** Helpers */
const OPERARIOS_DEFAULT = ["Brisa","Luis","Bruno","Benjamín","Denise","Pedro","Romina"];
const MAX_TANDAS = 20;
const CANALES_OPCIONES = Array.from({ length: 64 }, (_, i) => i + 1); // 1..16
const ESTADOS = [
  { key: "ok", label: "OK", color: "var(--ok)" },
  { key: "medio", label: "Medio", color: "var(--medio)" },
  { key: "grave", label: "Grave", color: "var(--grave)" },
];
const DEFAULT_ITEMS = [
    { id: "chk-camaras", label: "Cámaras operativas / sin fallas" },
    { id: "chk-pma",     label: "Eventos PMA controlados y cerrados" },
   { id: "chk-alarma",  label: "Paneles de alarma conectados" },
   { id: "chk-access",  label: "Control de accesos sin anomalías" },
    { id: "chk-comunic", label: "Comunicaciones OK (IP/4G/)" },
  ];

const nuevaTanda = (id = Date.now()) => ({
  id: `tanda-${id}`,
  cliente: "",
  resumen: "",
  camaras: [
    // fila ejemplo
    { id: `cam-${id}-1`, canal: 1, estado: "ok", nota: "" },
    
  ],
});

export default function FormRiesgoRondin({
  operarios = OPERARIOS_DEFAULT,
  canalDefault = "",
}) {
  // ===== Plan de rondín =====
const TOTAL_CLIENTES_PLAN =2;
const TANDAS_SALTOS = 6;           // 12 hs / 6 = 2 hs por tanda
const SHIFT_DURATION_MS = 12 * 60 * 60 * 1000;
const SLOT_INTERVAL_MS = Math.floor(SHIFT_DURATION_MS / TANDAS_SALTOS);

const timeoutsRef = useRef([]);    // para cancelar timers en reset
const planRef = useRef(null);      // para guardar el plan generado
const makeShiftKey = (date = new Date(), turno = "Noche") => {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}_${turno}`;
};
const shuffle = (arr) =>
  arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(([,v])=>v);
// arma plan: 20 clientes (con repetición si el catálogo es menor) y 6 slots
const buildPlan = (clientesCat, totalClientes = TOTAL_CLIENTES_PLAN, slots = TANDAS_SALTOS) => {
  const pool = clientesCat.map(c => c.nombre);
  if (pool.length === 0) return { tandas: [], slotsMap: [] };

  // selecciona con repetición si no alcanza
  const picked = [];
  while (picked.length < totalClientes) {
    const faltan = totalClientes - picked.length;
    const lote = shuffle(pool).slice(0, Math.min(pool.length, faltan));
    picked.push(...lote);
  }

  // crea las 20 tandas (1 tanda = 1 cliente)
  const allTandas = picked.map((name, i) => ({
    ...nuevaTanda(Date.now() + i),
    cliente: name,
  }));

  // slotsMap: array de 6 arrays con IDs de tandas que “tocan” en ese salto
  const slotsMap = Array.from({ length: slots }, () => []);
  allTandas.forEach((t, idx) => {
    slotsMap[idx % slots].push(t.id);
  });

  return { tandas: allTandas, slotsMap };
};

// dispara avisos/“saltos” cada 2hs aprox
const scheduleSlots = (slotsMap, getTandaById) => {
  // limpia timers viejos
  timeoutsRef.current.forEach(t => clearTimeout(t));
  timeoutsRef.current = [];

  slotsMap.forEach((ids, slotIdx) => {
    const t = setTimeout(() => {
      const clientes = ids
        .map(id => getTandaById(id)?.cliente)
        .filter(Boolean)
        .join(" • ");

      Swal.fire({
        title: `Tanda ${slotIdx + 1} lista`,
        html: `<div style="text-align:left"><b>Clientes:</b><br/>${clientes || "—"}</div>`,
        icon: "info",
        confirmButtonText: "OK",
      });

      // (opcional) scrollea al primer card de la tanda
      const firstId = ids[0];
      const el = document.getElementById(firstId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, slotIdx * SLOT_INTERVAL_MS);
    timeoutsRef.current.push(t);
  });
};

  // -------- Estado superior
  const [turno, setTurno] = useState("Noche");
  const [operario, setOperario] = useState("");
  const [clientesCat, setClientesCat] = useState([]); // catálogo de clientes (Firestore)
  const [novedades, setNovedades] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // -------- Tandas (cada tanda = un cliente alto riesgo)
  const [tandas, setTandas] = useState([nuevaTanda()]); // arranca con 1
  const [items, setItems] = useState(
      DEFAULT_ITEMS.map(i => ({ ...i, status: "pendiente", note: "", ts: null }))
   );
  // -------- Control de ronda
  const [rondaId, setRondaId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(null);
  const pausasRef = useRef([]);

  const displayElapsed = useMemo(() => {
    const sec = Math.floor(elapsed / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [elapsed]);

  // % avance: cámaras con estado marcado (siempre tienen estado) + notas opcionales
  const totalCamaras = useMemo(
    () => tandas.reduce((acc, t) => acc + t.camaras.length, 0),
    [tandas]
  );
  const progress = useMemo(() => {
    // si querés que compute por color (p.e. cualquier estado cuenta como completado)
    const completadas = tandas.reduce((acc, t) => acc + t.camaras.filter(c => !!c.estado).length, 0);
    return totalCamaras ? Math.round((completadas / totalCamaras) * 100) : 0;
  }, [tandas, totalCamaras]);
// ✅ progreso del checklist
const completedCount = useMemo(() => items.filter(i => i.status !== "pendiente").length, [items]);
const checklistProgress = useMemo(
  () => (items.length ? Math.round((completedCount / items.length) * 100) : 0),
  [completedCount, items.length]
);
const LEVELS = [0, 100, 250, 500, 800, 1200]; // XP thresholds
const badgeFor = (xp) => {
  if (xp >= 800) return { key: "maestro", label: "Maestr@ del rondín" };
  if (xp >= 500) return { key: "pro", label: "Pro del rondín" };
  if (xp >= 250) return { key: "avanzado", label: "Avanzado" };
  if (xp >= 100) return { key: "starter", label: "Starter" };
  return null;
};

const [xp, setXp] = useState(0);
const [level, setLevel] = useState(1);
const [streak, setStreak] = useState(0);
const [showConfetti, setShowConfetti] = useState(false);

// sonidos (no hace falta archivo externo, usa un “bleep” embebido)
const [playOk] = useSound("data:audio/mp3;base64,//uQZAAAAAAAA...", { volume: 0.2 });
const [playWarn] = useSound("data:audio/mp3;base64,//uQZAAAAAAAA...", { volume: 0.2 });

const recalcLevel = (newXp) => {
  const lvl = LEVELS.filter(th => newXp >= th).length;
  setLevel(lvl);
};

const awardXP = (amount) => {
  setXp(prev => {
    const nx = prev + amount;
    recalcLevel(nx);
    return nx;
  });
};

const onMilestone = (type="small") => {
  if (type === "big") {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3200);
  }
};

// Resumen de progreso “gamificado”
const totalChecks = items.length;
const checksDone = items.filter(i=>i.status!=="pendiente").length;
const tandaDone = Math.round((progress/100) * totalCamaras) > 0; // ya usás `progress`
// ✅ acciones de checklist
const setItemStatus = (id, nextStatus) => {
  setItems(prev => {
    return prev.map(it => {
      if (it.id !== id) return it;

      const prevStatus = it.status;
      let { hasScored } = it;

      // 👉 Otorgar XP sólo cuando pasamos de 'pendiente' a un estado (ok/na/alerta)
      if (prevStatus === "pendiente" && nextStatus !== "pendiente" && !hasScored) {
        if (nextStatus === "ok") { awardXP(10); playOk(); }
        else if (nextStatus === "alerta") { awardXP(8); playWarn(); }
        else if (nextStatus === "na") { awardXP(5); }
        hasScored = true;
      }

      // Si vuelve a 'pendiente', permitimos volver a puntuar si luego lo completa de nuevo
      if (nextStatus === "pendiente") {
        hasScored = false;
      }

      return {
        ...it,
        status: nextStatus,
        ts: new Date(),
        note: nextStatus === "ok" ? "" : it.note,
        hasScored,
      };
    });
  });
};

const setItemNote = (id, note) => {
  setItems(prev =>
    prev.map(it => it.id === id ? { ...it, note } : it)
  );
};

const addQuickItem = () => {
  const newId = `custom-${Date.now()}`;
  setItems(prev => [...prev, { id: newId, label: "Punto personalizado", status: "pendiente", note: "", ts: null }]);
};
  // -------- Cargar catálogo clientes
// --- Filtro de clientes de alto riesgo (whitelist) ---
const RISK_WHITELIST = [
  "LOMAS DE PETION",
  "CHACRA PETION",
  "DROGUERIA BETAPHARMA",
  "LA CASCADA",
];
const norm = (s = "") => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toUpperCase();
const RISK_SET = new Set(RISK_WHITELIST.map(norm));

useEffect(() => {
  (async () => {
    try {
      // Trae TODOS los clientes
      const snap = await getDocs(collection(db, "clientes"));

      // Filtra por los nombres del whitelist (case/acentos-insensitive)
      const lista = snap.docs
        .map(d => {
          const data = d.data() || {};
          const nombre = (data.nombre || "").toString();
          return { id: d.id, nombre };
        })
        .filter(c => RISK_SET.has(norm(c.nombre)));

      setClientesCat(lista);
    } catch (e) {
      console.error("Error cargando clientes riesgo:", e);
      setClientesCat([]);
    }
  })();
}, []);

  // -------- Asegurar plantilla fija
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

  // -------- Timer
  const startTicker = (startedAt) => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      if (paused) return;
      const now = Date.now();
      const pausedMs = pausasRef.current.reduce(
        (acc, p) => acc + (p.to ? p.to - p.from : 0),
        0
      );
      setElapsed(now - startedAt.getTime() - pausedMs);
    }, 500);
  };

  const handleIniciar = async () => {
    if (!operario) {
      return Swal.fire("Falta operario", "Seleccioná un operario.", "warning");
    }
    if (!clientesCat.length) {
      return Swal.fire("Sin catálogo", "No hay clientes cargados en Firestore.", "warning");
    }
  
    const { isConfirmed } = await confirm(
      "¿Iniciar ronda?",
      `Se generarán ${TOTAL_CLIENTES_PLAN} clientes en ${TANDAS_SALTOS} tandas para las próximas 12 horas.`,
      "Iniciar"
    );
    if (!isConfirmed) return;
  
    try {
      // 1) Generar plan
      const { tandas: planTandas, slotsMap } = buildPlan(clientesCat);
      if (!planTandas.length) {
        return Swal.fire("Error", "No se pudo generar el plan.", "error");
      }
  
      // 2) Persistencia base (igual que antes)
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
          respuestas: { turno, novedades, observaciones, tandas: planTandas, items },
          controlRonda: {
            startTime: ahora,
            endTime: null,
            pausas: [],
            totalPausedMs: 0,
            durationMs: 0,
          },
        });
        docId = ref.id;
        setRondaId(docId);
      } else {
        await updateDoc(doc(db, "respuestas-tareas", docId), { estado: "En Proceso" });
      }
  
      // 3) Poner plan en UI + scheduler
      setTandas(planTandas);
      planRef.current = { slotsMap, startedAt: ahora };
  
      const getTandaById = (id) => planTandas.find(t => t.id === id);
      scheduleSlots(slotsMap, getTandaById);
  
      // 4) Timer visual
      setStartTime(ahora);
      setPaused(false);
      setEndTime(null);
      pausasRef.current = [];
      startTicker(ahora);
  
      toast.fire({ icon: "success", title: "Ronda iniciada y plan generado" });
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
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    pausasRef.current = [];
  
    // ⛔ estado ronda
    setRondaId(null);
    setStartTime(null);
    setEndTime(null);
    setPaused(false);
    setElapsed(0);
  
    // 🧾 formulario
    setTurno("Noche");
    setOperario("");
    setNovedades("");
    setObservaciones("");
  
    // 👥 tandas (1 vacía)
    setTandas([nuevaTanda()]);
  
    // ✅ checklist
    setItems(
      DEFAULT_ITEMS.map(i => ({ ...i, status: "pendiente", note: "", ts: null, hasScored:false }))
    );
  
    // 🕹️ gamificación
    setXp(0);
    setLevel(1);
    setStreak(0);
    setShowConfetti(false);
  
    toast.fire({ icon: "info", title: "Reset visual realizado" });
  };
  const softReset = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
  timeoutsRef.current = [];
  planRef.current = null;

  if (tickRef.current) clearInterval(tickRef.current);
  tickRef.current = null;
  pausasRef.current = [];
  
    // ⛔ estado ronda
    setRondaId(null);
    setStartTime(null);
    setEndTime(null);
    setPaused(false);
    setElapsed(0);
  
    // 🧾 formulario
    setTurno("Noche");
    setOperario("");
    setNovedades("");
    setObservaciones("");
  
    // 👥 tandas (1 vacía)
    setTandas([nuevaTanda()]);
  
    // ✅ checklist (incluye flag para XP)
    setItems(
      DEFAULT_ITEMS.map(i => ({ ...i, status: "pendiente", note: "", ts: null, hasScored: false }))
    );
  
    // 🕹️ gamificación
    setXp(0);
    setLevel(1);
    setStreak(0);
    setShowConfetti(false);
    
  };
  
  const handleFinalizar = async () => {
    // bonus por performance
const bonus = Math.round(progress/5) + Math.round(checklistProgress/5); // 0..40 aprox.
awardXP(bonus);
setStreak(s => s + 1);
onMilestone("big");

    if (!rondaId || !startTime) {
      return Swal.fire("Sin ronda activa", "Primero iniciá la ronda.", "info");
    }
  
    // Mostrar resumen previo
    const totalPausedMsPreview = pausasRef.current.reduce(
      (acc, p) => acc + (p.to ? p.to - p.from : 0),
      0
    );
    const nowPreview = Date.now();
    const durationPreview = nowPreview - startTime.getTime() - totalPausedMsPreview;
    const hh = (ms) => String(Math.floor(ms / 3600000)).padStart(2, "0");
    const mm = (ms) => String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
    const ss = (ms) => String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  
    const { isConfirmed } = await Swal.fire({
      title: "¿Finalizar ronda?",
      html: `
        <div style="text-align:left">
          <p><b>Duración parcial:</b> ${hh(durationPreview)}:${mm(durationPreview)}:${ss(durationPreview)}</p>
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
    softReset();
    try {
      if (tickRef.current) clearInterval(tickRef.current);
      if (paused) {
        // cerrar la última pausa si estaba pausado
        const last = pausasRef.current[pausasRef.current.length - 1];
        if (last && last.to === null) last.to = Date.now();
        setPaused(false);
      }
  
      const fin = new Date();
      const totalPausedMs = pausasRef.current.reduce(
        (acc, p) => acc + (p.to ? p.to - p.from : 0),
        0
      );
      const durationMs = fin.getTime() - startTime.getTime() - totalPausedMs;
  
      await updateDoc(doc(db, "respuestas-tareas", rondaId), {
        estado: "Completada",
        fechaEnvio: serverTimestamp(),
        observacion: observaciones || "",
        respuestas: { turno, novedades, observaciones, tandas, items },
        controlRonda: { startTime, endTime: fin, pausas: pausasRef.current, totalPausedMs, durationMs },
      });
  
      setEndTime(fin);
      setElapsed(durationMs);
  
      await Swal.fire({
        title: "Ronda finalizada",
        html: `<p><b>Duración:</b> ${hh(durationMs)}:${mm(durationMs)}:${ss(durationMs)}</p>`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo finalizar la ronda.", "error");
    }
  };
  
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      timeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);
  

  // -------- Mutadores de TANDAS
  const addTanda = () => {
    if (tandas.length >= MAX_TANDAS) return;
    setTandas((prev) => [...prev, nuevaTanda()]);
  };

  const removeTanda = (tandaId) => {
    setTandas((prev) => prev.filter((t) => t.id !== tandaId));
  };

  const setTandaCliente = (tandaId, value) => {
    setTandas((prev) =>
      prev.map((t) => (t.id === tandaId ? { ...t, cliente: value } : t))
    );
  };

  const setTandaResumen = (tandaId, value) => {
    setTandas((prev) =>
      prev.map((t) => (t.id === tandaId ? { ...t, resumen: value } : t))
    );
  };
 
  const estadoRonda = useMemo(() => {
    if (endTime) return "finalizada";
    if (startTime && paused) return "pausada";
    if (startTime) return "enCurso";
    return "lista";
  }, [endTime, startTime, paused]);
  
  
  // ---- CAMARAS por tanda
  const addCamRow = (tandaId) => {
    setTandas((prev) =>
      prev.map((t) =>
        t.id === tandaId
          ? {
              ...t,
              camaras: [
                ...t.camaras,
                {
                  id: `cam-${tandaId}-${Date.now()}`,
                  canal: 1,
                  estado: "ok",
                  nota: "",
                },
              ],
            }
          : t
      )
    );
  };

  const removeCamRow = (tandaId, camId) => {
    setTandas((prev) =>
      prev.map((t) =>
        t.id === tandaId
          ? { ...t, camaras: t.camaras.filter((c) => c.id !== camId) }
          : t
      )
    );
  };

  const setCamField = (tandaId, camId, key, value) => {
    setTandas((prev) =>
      prev.map((t) =>
        t.id === tandaId
          ? {
              ...t,
              camaras: t.camaras.map((c) =>
                c.id === camId ? { ...c, [key]: value } : c
              ),
            }
          : t
      )
    );
  };

  return (
    <Box className="riesgo-wrapper">
      {/* HEADER */}
      <Box className="riesgo-header">
        <div className="riesgo-header__left">
          <Typography variant="h5" className="riesgo-title">
            RONDÍN ALTO RIESGO (por tandas)
          </Typography>
          <Chip
            icon={<AccessTime />}
            label={`Tiempo: ${displayElapsed}`}
            className="chip-tiempo"
          />
        </div>

        <div className="riesgo-header__right">
  <Chip icon={<AccessTime />} label={displayElapsed} />
</div>

      </Box>

      {/* CONTENEDOR */}
      <Paper className="riesgo-container">
        {/* Progreso global */}
     

        {/* Datos superiores */}
        <Grid container spacing={2} alignItems="center" className="riesgo-top-form">
  <Grid item xs={12} md={4} className="top-field">
    <FormControl fullWidth size="medium" className="big-control">
      <InputLabel>Turno</InputLabel>
      <Select
        value={turno}
        label="Turno"
        onChange={(e) => setTurno(e.target.value)}
      >
        <MenuItem value="Noche">Nocturno</MenuItem>
        <MenuItem value="Día">Día</MenuItem>
      </Select>
    </FormControl>
  </Grid>

  <Grid item xs={12} md={4} className="top-field">
    <FormControl fullWidth size="medium" className="big-control">
      <InputLabel>Operador</InputLabel>
      <Select
        value={operario}
        label="Operario"
        onChange={(e) => setOperario(e.target.value)}
      >
        {OPERARIOS_DEFAULT.map(op => (
          <MenuItem key={op} value={op}>{op}</MenuItem>
        ))}
      </Select>
    </FormControl>
  </Grid>

  </Grid>
<Box className="obs-section">
  <TextField
    className="obs-full"
    label="Novedades Generales"
    fullWidth
    multiline
    rows={4}                // alto cómodo (podés subirlo a 6 si querés)
    value={novedades}
    onChange={(e) => setNovedades(e.target.value)}
   
    sx={{
      "& .MuiOutlinedInput-root": {
        fontSize: "1rem",
        borderRadius: "12px",
      },
      "& .MuiInputLabel-root": {
        fontSize: "1rem",
      },
      "& textarea": {
        padding: "14px",
      }
    }}
  />
</Box>


        <Divider className="riesgo-divider" />

        {/* TANDAS (clientes) */}
        <Box className="tandas-grid">
          {tandas.map((t) => (
         <Card key={t.id} id={t.id} className="tanda-card">
              <CardContent>
                <div className="tanda-header-row">
                  <FormControl className="tanda-cliente">
                    <InputLabel>Cliente</InputLabel>
                    <Select
                      value={t.cliente}
                      label="Cliente"
                      onChange={(e) => setTandaCliente(t.id, e.target.value)}
                    >
                      {clientesCat.map((c) => (
                        <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" startIcon={<Add />} onClick={() => addCamRow(t.id)}>
                      Agregar 
                    </Button>
                    <Tooltip title="Eliminar tanda">
                      <span>
                        <IconButton onClick={() => removeTanda(t.id)} disabled={tandas.length === 1}>
                          <Delete />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </div>

                {/* Tabla simple de cámaras */}
                <Box className="tabla-camaras">
                  <div className="tabla-head">
                    <span>Equipo</span>
                    <span>Estado</span>
                    <span>Nota</span>
                    <span></span>
                  </div>

                  {t.camaras.map((cam) => (
                    <div className={`tabla-row estado-${cam.estado}`} key={cam.id}>
                      <div className="cell canal">
                        <Select
                          size="small"
                          value={cam.canal}
                          onChange={(e) => setCamField(t.id, cam.id, "canal", e.target.value)}
                        >
                          {CANALES_OPCIONES.map((n) => (
                            <MenuItem key={n} value={n}>Cámara {n}</MenuItem>
                          ))}
                        </Select>
                      </div>

                      <div className="cell estado">
                        <div className="estado-switch">
                          {ESTADOS.map((opt) => (
                            <label key={opt.key} className={`estado-pill ${cam.estado === opt.key ? "active" : ""}`} style={{ "--pill": opt.color }}>
                              <input
                                type="radio"
                                name={`estado-${t.id}-${cam.id}`}
                                checked={cam.estado === opt.key}
                                onChange={() => setCamField(t.id, cam.id, "estado", opt.key)}
                              />
                              <span className="dot" />
                              <span className="txt">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="cell nota">
                        <TextField
                          size="small"
                          placeholder="Detalle (opcional)"
                          value={cam.nota}
                          onChange={(e) => setCamField(t.id, cam.id, "nota", e.target.value)}
                          fullWidth
                        />
                      </div>

                      <div className="cell acciones">
                        <Tooltip title="Quitar">
                          <IconButton onClick={() => removeCamRow(t.id, cam.id)} size="small">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </Box>

                <TextField
                  label="Resumen de la tanda (opcional)"
                  fullWidth
                  multiline
                  minRows={2}
                  value={t.resumen}
                  onChange={(e) => setTandaResumen(t.id, e.target.value)}
                  className="tanda-resumen"
                />
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={addTanda}
            startIcon={<Add />}
            className="btn-add-tanda"
            variant="outlined"
            disabled={tandas.length >= MAX_TANDAS}
          >
            Agregar cliente  {tandas.length}/{MAX_TANDAS}
          </Button>
        </Box>

        <Divider className="riesgo-divider" />
        {/* ✅ CHECKLIST EN CARDS (como el otro rondín) */}
        <Box className="items-section">
  <Stack direction="row" justifyContent="space-between" alignItems="center" className="items-header">
  <Box sx={{ mb: 1.5, display:"flex", gap:1, flexWrap:"wrap" }}>
  <Chip
    label={`Misión: Completar ${Math.ceil(totalChecks*0.8)} ítems`}
    variant={checksDone/totalChecks >= 0.8 ? "filled" : "outlined"}
    color={checksDone/totalChecks >= 0.8 ? "success" : "default"}
    onClick={()=>{}}
  />

</Box>

    <Typography variant="subtitle2" className="muted">Checklist de estado</Typography>
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="subtitle2" className="muted">
        {completedCount}/{items.length} ({checklistProgress}%)
      </Typography>
      <LinearProgress variant="determinate" value={checklistProgress} className="progress-bar-sm" />
    </Stack>
  </Stack>

  {/* CONTENEDOR HORIZONTAL */}
  <div className="items-hscroll" aria-label="Checklist horizontal">
    {items.map((it) => (
      <Card key={it.id} className={`item-card status-${it.status}`} role="group" aria-label={it.label} tabIndex={0}>
        <CardContent className="item-card__content">
          <div className="item-card__row">
            <Typography className="item-label" title={it.label}>{it.label}</Typography>
            <div className="item-actions" role="toolbar" aria-label="Acciones del ítem">
              <Tooltip title="OK">
                <span>
                  <IconButton className={`btn-status ok ${it.status === "ok" ? "active" : ""}`} onClick={() => setItemStatus(it.id, "ok")} size="small">
                    <CheckCircle />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Alerta">
                <span>
                  <IconButton className={`btn-status warn ${it.status === "alerta" ? "active" : ""}`} onClick={() => setItemStatus(it.id, "alerta")} size="small">
                    <ReportProblem />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="No aplica">
                <span>
                  <IconButton className={`btn-status na ${it.status === "na" ? "active" : ""}`} onClick={() => setItemStatus(it.id, "na")} size="small">
                    <RemoveCircleOutline />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          </div>

          {it.status !== "ok" && (
            <TextField
              placeholder="Agregar detalle / novedad"
              fullWidth
              value={it.note}
              onChange={(e) => setItemNote(it.id, e.target.value)}
              multiline
              minRows={2}
              className="item-note"
              aria-label={`Detalle para ${it.label}`}
            />
          )}

          {it.ts && <Typography className="item-ts">Marcado: {new Date(it.ts).toLocaleString("es-AR")}</Typography>}
        </CardContent>
      </Card>
    ))}

   
  </div>
</Box>

        
        <Box className="obs-section">
  <TextField
    className="obs-full"
    label="Observaciones Generales"
    fullWidth
    multiline
    rows={4}                // alto cómodo (podés subirlo a 6 si querés)
    value={observaciones}
    onChange={(e) => setObservaciones(e.target.value)}
    sx={{
      "& .MuiOutlinedInput-root": {
        fontSize: "1rem",
        borderRadius: "12px",
      },
      "& .MuiInputLabel-root": {
        fontSize: "1rem",
      },
      "& textarea": {
        padding: "14px",
      }
    }}
  />
</Box>


       

        {/* Footer fijo */}
        <Box className="riesgo-footer">
  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
    <Chip icon={<DoneAll />} label={`${totalCamaras} cámaras`} />
    <Chip icon={<AccessTime />} label={displayElapsed} />
    <div className="spacer" />

    {/* Controles unificados */}
    {estadoRonda === "lista" && (
     <motion.div whileTap={{ scale: .96 }} whileHover={{ scale: 1.02 }}>
     <Button variant="contained" color="primary" startIcon={<PlayArrow />} onClick={handleIniciar}>
       Iniciar
     </Button>
   </motion.div>
    )}

    {estadoRonda === "enCurso" && (
      <Button variant="contained" color="warning" startIcon={<Pause />} onClick={handlePausar}>
        Pausar
      </Button>
    )}

    {estadoRonda === "pausada" && (
      <Button variant="contained" color="success" startIcon={<PlayArrow />} onClick={handleReanudar}>
        Reanudar
      </Button>
    )}

    {(estadoRonda === "enCurso" || estadoRonda === "pausada") && (
      <Button variant="contained" color="error" startIcon={<Stop />} onClick={handleFinalizar}>
        Finalizar
      </Button>
    )}

<Tooltip title="Reset visual (no borra en Firestore)">
  <span>
    <IconButton onClick={softReset} className="btn-reset">
      <RestartAlt />
    </IconButton>
  </span>
</Tooltip>

  </Stack>
</Box>{/* ===== GAME HUD ===== */}
<Box sx={{ position:"sticky", top: 8, zIndex: 3, mb: 2 }}>
  <Paper sx={{ p:1.5, borderRadius: 3, display:"flex", alignItems:"center", gap:2 }}>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ flex:1 }}>
      <Chip label={`Nivel ${level}`} color="primary" variant="filled" />
      <Stack sx={{ flex:1 }}>
        <Typography variant="caption" color="text.secondary">
          XP: {xp} / {LEVELS[level] ?? `${LEVELS[LEVELS.length-1]}+`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(() => {
            const curr = LEVELS[level-1] ?? 0;
            const next = LEVELS[level] ?? (LEVELS[LEVELS.length-1] + 300);
            return Math.min(100, ((xp - curr) / (next - curr)) * 100);
          })()}
          sx={{ height: 8, borderRadius: 999 }}
        />
      </Stack>
      <Chip icon={<DoneAll />} label={`Racha: ${streak}`} variant="outlined" />
      <Chip icon={<AccessTime />} label={displayElapsed} variant="outlined" />
    </Stack>

    {/* mini-retos */}
    <AnimatePresence>
      {checksDone === totalChecks && (
        <motion.div
          initial={{ scale: .9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: .9, opacity: 0 }}
          transition={{ type:"spring", stiffness: 300, damping: 18 }}
        >
          <Chip color="success" label="Checklist completo +20XP" />
        </motion.div>
      )}
    </AnimatePresence>
  </Paper>
</Box>

{/* confetti al lograr hitos */}
{showConfetti && (
  <Confetti
    numberOfPieces={260}
    recycle={false}
    gravity={0.25}
    tweenDuration={5400}
  />
)}


      </Paper>
    </Box>
  );
}
