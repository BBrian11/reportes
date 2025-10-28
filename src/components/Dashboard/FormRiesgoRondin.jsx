import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import StatChip from "../../utils/StatChip";
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
  Delete,
} from "@mui/icons-material";

import "../../styles/formRiesgoRondin.css";
import { motion } from "framer-motion";

/* ====== SweetAlert helpers ====== */
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

/** ====== Helpers ====== */
const OPERARIOS_DEFAULT = ["Brisa", "Luis", "Bruno", "Benjamín", "Denise", "Pedro", "Romina"];
const MAX_TANDAS = 20;

/* Solo cámaras (64 canales) */
const CANALES_OPCIONES = Array.from({ length: 64 }, (_, i) => i + 1);
const toChannelNumber = (v) => Number(v ?? 1);

/* Estados de cámara (sin alarmas) */
const ESTADOS = [
  { key: "ok", label: "OK", color: "var(--ok)" },
  { key: "medio", label: "Medio", color: "var(--medio)" },
  { key: "grave", label: "Grave", color: "var(--grave)" },
];

const MIN_CAMERAS_REQUIRED = 50;

/* Tanda (solo cámaras, sin checklist ni alarmas) */
const nuevaTanda = (id = Date.now()) => ({
  id: `tanda-${id}`,
  cliente: "",
  resumen: "",
  camaras: [{ id: `cam-${id}-1`, canal: 1, estado: null, nota: "", touched: false }],
});

export default function FormRiesgoRondin({ operarios = OPERARIOS_DEFAULT }) {
  // ===== Plan de rondín =====
  const DEFAULT_TOTAL_CLIENTES_PLAN = 2;
  const TANDAS_SALTOS = 64; // 12 hs / 64 slots
  const SHIFT_DURATION_MS = 12 * 60 * 60 * 1000;
  const SLOT_INTERVAL_MS = Math.floor(SHIFT_DURATION_MS / TANDAS_SALTOS);

  const timeoutsRef = useRef([]);
  const planRef = useRef(null);

  const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(([,v])=>v);

  // === Solo clientes de riesgo existentes (no agregar más) ===
  const RISK_WHITELIST = ["LOMAS DE PETION", "CHACRA PETION", "DROGUERIA BETAPHARMA", "LA CASCADA"];
  const norm = (s = "") => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toUpperCase();
  const RISK_SET = new Set(RISK_WHITELIST.map(norm));

  const buildPlan = (clientesCat, totalClientes = DEFAULT_TOTAL_CLIENTES_PLAN, slots = TANDAS_SALTOS) => {
    const pool = clientesCat.map(c => c.nombre);
    if (pool.length === 0) return { tandas: [], slotsMap: [] };

    const N = Math.min(totalClientes, pool.length);
    const pickedUnique = shuffle(pool).slice(0, N);

    const allTandas = pickedUnique.map((name, i) => ({
      ...nuevaTanda(Date.now() + i),
      cliente: name,
    }));

    const slotsMap = Array.from({ length: slots }, () => []);
    allTandas.forEach((t, idx) => {
      slotsMap[idx % slots].push(t.id);
    });

    return { tandas: allTandas, slotsMap };
  };

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

  // -------- Estado superior
  const [turno, setTurno] = useState("Noche");
  const [operario, setOperario] = useState("");
  const [clientesCat, setClientesCat] = useState([]);
  const [novedades, setNovedades] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // -------- TANDAS (solo cámaras)
  const [tandas, setTandas] = useState([nuevaTanda()]);

  // -------- Control de ronda
  const [rondaId, setRondaId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(null);
  const pausasRef = useRef([]);

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

  // Cargar catálogo (whitelist riesgo) — SOLO los que ya existen
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

  // Timer
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
      `Se generarán ${TOTAL_CLIENTES_PLAN} clientes en ${TANDAS_SALTOS} tandas (12hs).`,
      "Iniciar"
    );
    if (!isConfirmed) return;

    try {
      const { tandas: planTandas, slotsMap } = buildPlan(clientesCat, TOTAL_CLIENTES_PLAN);
      if (!planTandas.length) return Swal.fire("Error", "No se pudo generar el plan.", "error");

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

      setTandas(planTandas);
      planRef.current = { slotsMap, startedAt: ahora };

      const getTandaById = (id) => planTandas.find(t => t.id === id);
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

  // Reset visual (no borra Firestore)
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

  const handleFinalizar = async () => {
    if (!rondaId || !startTime) return Swal.fire("Sin ronda activa", "Primero iniciá la ronda.", "info");

    // Mínimo 50 cámaras verificadas
    if (camarasCompletadas < MIN_CAMERAS_REQUIRED) {
      return Swal.fire(
        "Falta completar",
        `Necesitás al menos ${MIN_CAMERAS_REQUIRED} cámaras verificadas (actual: ${camarasCompletadas}).`,
        "info"
      );
    }

    const totalPausedMsPreview = pausasRef.current.reduce((acc, p) => acc + (p.to ? p.to - p.from : 0), 0);
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

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      timeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Mutadores TANDAS
  const addTanda = () => {
    if (tandas.length >= Math.min(clientesCat.length, MAX_TANDAS)) return;
    setTandas(prev => [...prev, nuevaTanda()]);
  };
  const removeTanda = (tandaId) => setTandas(prev => prev.filter(t => t.id !== tandaId));
  const setTandaCliente = (tandaId, value) =>
    setTandas(prev => prev.map(t => (t.id === tandaId ? { ...t, cliente: value } : t)));
  const setTandaResumen = (tandaId, value) =>
    setTandas(prev => prev.map(t => (t.id === tandaId ? { ...t, resumen: value } : t)));

  // Cámaras
  const addCamRow = (tandaId) => {
    setTandas(prev =>
      prev.map(t =>
        t.id === tandaId
          ? {
              ...t,
              camaras: [
                ...t.camaras,
                { id: `cam-${t.tandaId || tandaId}-${Date.now()}`, canal: 1, estado: null, nota: "", touched: false },
              ],
            }
          : t
      )
    );
  };
  const removeCamRow = (tandaId, camId) => {
    setTandas(prev =>
      prev.map(t => (t.id === tandaId ? { ...t, camaras: t.camaras.filter(c => c.id !== camId) } : t))
    );
  };
  const setCamField = (tandaId, camId, key, value) => {
    const normVal = key === "canal" ? toChannelNumber(value) : value;
    setTandas(prev =>
      prev.map(t =>
        t.id === tandaId
          ? {
              ...t,
              camaras: t.camaras.map(c =>
                c.id === camId
                  ? { ...c, [key]: normVal, touched: key === "estado" ? true : c.touched }
                  : c
              ),
            }
          : t
      )
    );
  };
  useEffect(() => {
    // Forzar números en canal al montar
    setTandas(prev =>
      prev.map(t => ({
        ...t,
        camaras: (t.camaras || []).map(c => ({
          ...c,
          canal: Number(c.canal ?? 1),
        })),
      }))
    );
  }, []);

  const onCameraState = (tandaId, camId, next) => {
    setTandas(prev =>
      prev.map(t =>
        t.id === tandaId
          ? {
              ...t,
              camaras: t.camaras.map(c => (c.id === camId ? { ...c, estado: next, touched: true } : c)),
            }
          : t
      )
    );
  };

  const whatIsMissing = () => {
    const miss = { camerasNotTouched: [], camerasNullState: [] };
    tandas.forEach(t => {
      t.camaras.forEach(c => {
        if (!c.touched) miss.camerasNotTouched.push({ cliente: t.cliente, canal: c.canal });
        if (c.touched && c.estado === null) miss.camerasNullState.push({ cliente: t.cliente, canal: c.canal });
      });
    });
    return miss;
  };

  const showMissingModal = () => {
    const m = whatIsMissing();
    const li = (arr, fmt) => (arr.length ? `<ul style="margin:6px 0 0 18px">${arr.map(fmt).join("")}</ul>` : "<i>—</i>");
    Swal.fire({
      title: "¿Qué falta completar?",
      html: `
        <div style="text-align:left">
          <p><b>Cámaras sin tocar:</b> ${m.camerasNotTouched.length}</p>
          ${li(m.camerasNotTouched, x =>`<li>${x.cliente || "Cliente"} — Cam ${x.canal}</li>`)}
          <p style="margin-top:10px"><b>Cámaras sin estado:</b> ${m.camerasNullState.length}</p>
          ${li(m.camerasNullState, x => `<li>${x.cliente || "Cliente"} — Cam ${x.canal}</li>`)}
        </div>
      `,
      icon: (m.camerasNotTouched.length || m.camerasNullState.length) ? "info" : "success",
      confirmButtonText: "OK",
    });
  };

  // UI
  return (
    <Box className="riesgo-wrapper">
      {/* HEADER */}
      <Box className="riesgo-header">
        <div className="riesgo-header__left">
          <Typography variant="h5" className="riesgo-title">RONDÍN ALTO RIESGO (CCTV / Cámaras)</Typography>

          <StatChip
            label={`Misión: ${camarasCompletadas}/${Math.max(totalCamaras, MIN_CAMERAS_REQUIRED)} cámaras (mín. ${MIN_CAMERAS_REQUIRED})`}
            tone={camarasCompletadas >= MIN_CAMERAS_REQUIRED ? "success" : "info"}
            filled={camarasCompletadas >= MIN_CAMERAS_REQUIRED}
          />
          <StatChip icon={<AccessTime />} label={`Tiempo: ${displayElapsed}`} className="chip-tiempo" />
        </div>

        <div className="riesgo-header__right">
          <StatChip icon={<AccessTime />} label={displayElapsed} />
        </div>
      </Box>

      {/* CONTENEDOR */}
      <Paper className="riesgo-container" sx={{ p: 2, borderRadius: 2 }}>
        {/* Progresos en fila */}
        <Stack direction="row" spacing={4} alignItems="center" sx={{ mb: 2 }}>
          {/* Progreso global */}
          <Stack direction="row" spacing={1} alignItems="center" flex={1}>
            <Typography variant="subtitle2" color="text.secondary">Progreso global</Typography>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{ flex: 1, height: 8, borderRadius: 5 }}
            />
            <Typography variant="caption" sx={{ minWidth: 36, textAlign: "right" }}>
              {overallProgress}%
            </Typography>
          </Stack>

          {/* Cámaras */}
          <Stack direction="row" spacing={1} alignItems="center" flex={1}>
            <Typography variant="subtitle2" color="text.secondary">Cámaras</Typography>
            <LinearProgress
              variant="determinate"
              value={camerasProgress}
              sx={{ flex: 1, height: 6, borderRadius: 5 }}
            />
            <Typography variant="caption" sx={{ minWidth: 36, textAlign: "right" }}>
              {camerasProgress}%
            </Typography>
          </Stack>
        </Stack>

        {/* Datos superiores */}
        <Grid container spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          {/* Turno */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="medium"
              sx={{
                "& .MuiInputBase-root": { height: 56, borderRadius: 2 },
                "& .MuiFormLabel-root": { fontSize: "0.95rem" },
                "& .MuiSelect-select": { display: "flex", alignItems: "center", py: 1.25 }
              }}
            >
              <InputLabel>Turno</InputLabel>
              <Select
                value={turno}
                label="Turno"
                onChange={(e) => setTurno(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 360, minWidth: 220 } } }}
              >
                <MenuItem value="Noche">Nocturno</MenuItem>
                <MenuItem value="Día">Día</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Operador */}
          <Grid item xs={12} md={8}>
            <FormControl fullWidth size="medium"
              sx={{
                "& .MuiInputBase-root": { height: 56, borderRadius: 2 },
                "& .MuiFormLabel-root": { fontSize: "0.95rem" },
                "& .MuiSelect-select": { display: "flex", alignItems: "center", py: 1.25 }
              }}
            >
              <InputLabel>Operador</InputLabel>
              <Select
                value={operario}
                label="Operador"
                onChange={(e) => setOperario(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 420, minWidth: 360 } } }}
              >
                {operarios.map(op => (
                  <MenuItem key={op} value={op}>
                    <Typography sx={{ fontSize: "0.98rem", whiteSpace: "nowrap" }}>{op}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Novedades */}
        <Box sx={{ mb: 1 }}>
          <TextField
            label="Novedades Generales"
            fullWidth
            multiline
            rows={3}
            value={novedades}
            onChange={(e) => setNovedades(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": { fontSize: "0.95rem", borderRadius: "10px" },
              "& .MuiInputLabel-root": { fontSize: "0.95rem" },
              "& textarea": { padding: "10px" }
            }}
          />
        </Box>

        {/* TANDAS */}
        <Box className="tandas-grid">
          {tandas.map((t) => (
            <Card key={t.id} id={t.id} className="tanda-card">
              <CardContent>
                <div className="tanda-header-row">
                  <FormControl className="tanda-cliente">
                    <InputLabel>Cliente</InputLabel>
                    <Select value={t.cliente} label="Cliente" onChange={(e) => setTandaCliente(t.id, e.target.value)}>
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

                {/* CONTENIDO PRINCIPAL: Cámaras */}
                <Grid container spacing={2}>
                  {/* Tabla de cámaras */}
                  <Grid item xs={12}>
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
                              value={toChannelNumber(cam.canal)}
                              onChange={(e) => setCamField(t.id, cam.id, "canal", toChannelNumber(e.target.value))}
                            >
                              {CANALES_OPCIONES.map((n) => (
                                <MenuItem key={n} value={n}>Cámara {n}</MenuItem>
                              ))}
                            </Select>
                          </div>

                          <div className="cell estado">
                            <div className="estado-switch">
                              {ESTADOS.map((opt) => (
                                <label
                                  key={opt.key}
                                  className={`estado-pill ${cam.estado === opt.key ? "active" : ""}`}
                                  style={{ "--pill": opt.color }}
                                >
                                  <input
                                    type="radio"
                                    name={`estado-${t.id}-${cam.id}`}
                                    checked={cam.estado === opt.key}
                                    onChange={() => onCameraState(t.id, cam.id, opt.key)}
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
                  </Grid>
                </Grid>

                <TextField
                  label="Resumen de la tanda (opcional)"
                  fullWidth
                  multiline
                  minRows={2}
                  value={t.resumen}
                  onChange={(e) => setTandaResumen(t.id, e.target.value)}
                  className="tanda-resumen"
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={addTanda}
            startIcon={<Add />}
            className="btn-add-tanda"
            variant="outlined"
            disabled={tandas.length >= Math.min(clientesCat.length, MAX_TANDAS)}
          >
            Agregar cliente {tandas.length}/{Math.min(clientesCat.length || 0, MAX_TANDAS)}
          </Button>
        </Box>

        <Divider className="riesgo-divider" />

        {/* Observaciones */}
        <Box className="obs-section">
          <TextField
            className="obs-full"
            label="Observaciones Generales"
            fullWidth
            multiline
            rows={4}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": { fontSize: "1rem", borderRadius: "12px" },
              "& .MuiInputLabel-root": { fontSize: "1rem" },
              "& textarea": { padding: "14px" }
            }}
          />
        </Box>

        {/* Footer */}
        <Box className="riesgo-footer">
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip icon={<DoneAll />} label={`${totalCamaras} cámaras`} />
            <Chip icon={<AccessTime />} label={displayElapsed} />
            <div className="spacer" />

            {(!startTime && !endTime) && (
              <motion.div whileTap={{ scale: .96 }} whileHover={{ scale: 1.02 }}>
                <Button variant="contained" color="primary" startIcon={<PlayArrow />} onClick={handleIniciar}>
                  Iniciar
                </Button>
              </motion.div>
            )}

            {(startTime && !paused && !endTime) && (
              <Button variant="contained" color="warning" startIcon={<Pause />} onClick={handlePausar}>
                Pausar
              </Button>
            )}

            {(startTime && paused && !endTime) && (
              <Button variant="contained" color="success" startIcon={<PlayArrow />} onClick={handleReanudar}>
                Reanudar
              </Button>
            )}

            {(startTime && !endTime) && (
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
        </Box>

        <Button size="small" variant="outlined" onClick={showMissingModal}>
          ¿Qué falta?
        </Button>
      </Paper>
    </Box>
  );
}
