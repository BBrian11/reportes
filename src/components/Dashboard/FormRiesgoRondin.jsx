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
  
/** Helpers */
const OPERARIOS_DEFAULT = ["Brisa","Luis","Bruno","Benjamín","Denise","Pedro","Romina"];
const MAX_TANDAS = 20;
const CANALES_OPCIONES = Array.from({ length: 64 }, (_, i) => i + 1); // 1..16
const ESTADOS = [
  { key: "ok", label: "OK", color: "var(--ok)" },
  { key: "medio", label: "Medio", color: "var(--medio)" },
  { key: "grave", label: "Grave", color: "var(--grave)" },
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
  // -------- Estado superior
  const [turno, setTurno] = useState("Noche");
  const [operario, setOperario] = useState("");
  const [clientesCat, setClientesCat] = useState([]); // catálogo de clientes (Firestore)
  const [novedades, setNovedades] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // -------- Tandas (cada tanda = un cliente alto riesgo)
  const [tandas, setTandas] = useState([nuevaTanda()]); // arranca con 1

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

  // -------- Cargar catálogo clientes
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "clientes"));
        const lista = snap.docs.map((d) => ({
          id: d.id,
          nombre: d.data().nombre || "Sin nombre",
        }));
        setClientesCat(lista);
      } catch (e) {
        console.error("Error cargando clientes:", e);
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
    if (tandas.some((t) => !t.cliente)) {
      return Swal.fire("Clientes incompletos", "Completá el cliente en todas las tandas.", "warning");
    }
  
    const { isConfirmed } = await confirm("¿Iniciar ronda?", "Se comenzará a medir el tiempo.", "Iniciar");
    if (!isConfirmed) return;
  
    try {
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
          respuestas: { turno, novedades, observaciones, tandas },
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
    if (!paused) return;
    const { isConfirmed } = await confirm("¿Reanudar ronda?", "Se reanudará el cronómetro.", "Reanudar");
    if (!isConfirmed) return;
  
    setPaused(false);
    const last = pausasRef.current[pausasRef.current.length - 1];
    if (last && last.to === null) last.to = Date.now();
    toast.fire({ icon: "success", title: "Ronda reanudada" });
  };
  
  const handleFinalizar = async () => {
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
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo finalizar la ronda.", "error");
    }
  };
  
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
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
        <Box className="riesgo-progress">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" className="muted">Avance total</Typography>
            <Typography variant="subtitle2" className="muted">
              {totalCamaras} cámaras • {progress}%
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} className="progress-bar"/>
        </Box>

        {/* Datos superiores */}
        <Grid container spacing={2} className="riesgo-top-form">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Turno</InputLabel>
              <Select value={turno} label="Turno" onChange={(e) => setTurno(e.target.value)}>
                <MenuItem value="Noche">Noche</MenuItem>
                <MenuItem value="Día">Día</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Operario</InputLabel>
              <Select value={operario} label="Operario" onChange={(e) => setOperario(e.target.value)}>
                {OPERARIOS_DEFAULT.map((op) => (
                  <MenuItem key={op} value={op}>{op}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Novedades Generales (opcional)"
              fullWidth
              multiline
              minRows={2}
              value={novedades}
              onChange={(e) => setNovedades(e.target.value)}
            />
          </Grid>
        </Grid>

        <Divider className="riesgo-divider" />

        {/* TANDAS (clientes) */}
        <Box className="tandas-grid">
          {tandas.map((t) => (
            <Card key={t.id} className="tanda-card">
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
                      Agregar Equipo
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

        {/* Observaciones globales */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Observaciones Generales"
              fullWidth
              multiline
              minRows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Footer fijo */}
        <Box className="riesgo-footer">
  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
    <Chip icon={<DoneAll />} label={`${totalCamaras} cámaras`} />
    <Chip icon={<AccessTime />} label={displayElapsed} />
    <div className="spacer" />

    {/* Controles unificados */}
    {estadoRonda === "lista" && (
      <Button variant="contained" color="primary" startIcon={<PlayArrow />} onClick={handleIniciar}>
        Iniciar
      </Button>
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
        <IconButton onClick={() => setTandas([nuevaTanda()])} className="btn-reset">
          <RestartAlt />
        </IconButton>
      </span>
    </Tooltip>
  </Stack>
</Box>

      </Paper>
    </Box>
  );
}
