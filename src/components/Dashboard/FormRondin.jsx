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

import {
  PlayArrow,
  Pause,
  Stop,
  RestartAlt,
  CheckCircle,
  ReportProblem,
  RemoveCircleOutline,
  AccessTime,
  DoneAll,
  Add,
} from "@mui/icons-material";

import "../../styles/formRondin.css";

const OPERARIOS_DEFAULT = ["Brisa","Luis","Bruno","Benjamín","Denise","Pedro","Romina"];

const DEFAULT_ITEMS = [
  { id: "chk-camaras", label: "Cámaras operativas / sin fallas" },
  { id: "chk-pma",     label: "Eventos PMA controlados y cerrados" },
  { id: "chk-alarma",  label: "Paneles de alarma conectados" },
  { id: "chk-access",  label: "Control de accesos sin anomalías" },
  { id: "chk-comunic", label: "Comunicaciones OK (IP/4G/)" },
  
];

export default function FormRondin({
  operarios = OPERARIOS_DEFAULT,
  canalDefault = "",
}) {
  // -------- Estado principal
  const [turno, setTurno] = useState("Noche");
  const [operario, setOperario] = useState("");
  const [cliente, setCliente] = useState("");
  const [clientes, setClientes] = useState([]);
  const [canal, setCanal] = useState(canalDefault);
  const [novedades, setNovedades] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // -------- Ítems (checklist)
  const [items, setItems] = useState(
    DEFAULT_ITEMS.map((i) => ({ ...i, status: "pendiente", note: "", ts: null }))
  );

  // -------- Control de ronda
  const [rondaId, setRondaId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0); // ms
  const tickRef = useRef(null);
  const pausasRef = useRef([]); // [{from,to}]

  const displayElapsed = useMemo(() => {
    const sec = Math.floor(elapsed / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [elapsed]);

  const completedCount = useMemo(
    () => items.filter((i) => i.status !== "pendiente").length,
    [items]
  );
  const progress = useMemo(
    () => Math.round((completedCount / items.length) * 100),
    [completedCount, items.length]
  );

  // -------- Cargar Clientes
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "clientes"));
        const lista = snapshot.docs.map((d) => ({
          id: d.id,
          nombre: d.data().nombre || "Sin nombre",
        }));
        setClientes(lista);
      } catch (e) {
        console.error("Error cargando clientes:", e);
      }
    })();
  }, []);

  // -------- Asegurar plantilla fija
  const ensureTemplate = async () => {
    const templateRef = doc(db, "formularios-tareas", "rondin-fijo");
    const snap = await getDoc(templateRef);
    if (!snap.exists()) {
      await setDoc(templateRef, {
        nombre: "Rondín de Monitoreo",
        tipo: "fijo",
        descripcion: "Rondín con checklist y control de tiempos.",
        fechaCreacion: serverTimestamp(),
      });
    }
    return templateRef.id;
  };

  // -------- Timer helpers
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

  // -------- Acciones principales
  const handleIniciar = async () => {
    if (!operario) return alert("Seleccioná un operario.");
    if (!cliente) return alert("Seleccioná un cliente.");

    const formId = await ensureTemplate();
    const ahora = new Date();

    // crear doc si no existe
    let docId = rondaId;
    if (!docId) {
      const ref = await addDoc(collection(db, "respuestas-tareas"), {
        formId,
        nombreFormulario: "Rondín de Monitoreo",
        cliente,
        operador: operario,
        estado: "En Proceso",
        fechaEnvio: null,
        observacion: observaciones || "",
        respuestas: {
          turno,
          canal,
          novedades,
          observaciones,
          items, // guardo snapshot inicial
        },
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
      await updateDoc(doc(db, "respuestas-tareas", docId), {
        estado: "En Proceso",
      });
    }

    setStartTime(ahora);
    setPaused(false);
    setEndTime(null);
    pausasRef.current = [];
    startTicker(ahora);
  };

  const handlePausar = () => {
    if (paused) return;
    setPaused(true);
    pausasRef.current.push({ from: Date.now(), to: null });
  };

  const handleReanudar = () => {
    if (!paused) return;
    setPaused(false);
    const last = pausasRef.current[pausasRef.current.length - 1];
    if (last && last.to === null) last.to = Date.now();
  };

  const handleFinalizar = async () => {
    if (!rondaId || !startTime) return alert("Primero iniciá la ronda.");
    if (paused) handleReanudar();

    const fin = new Date();
    setEndTime(fin);
    if (tickRef.current) clearInterval(tickRef.current);

    const totalPausedMs = pausasRef.current.reduce(
      (acc, p) => acc + (p.to ? p.to - p.from : 0),
      0
    );
    const durationMs = fin.getTime() - startTime.getTime() - totalPausedMs;

    // guardo estado final (incluye items completos)
    await updateDoc(doc(db, "respuestas-tareas", rondaId), {
      estado: "Completada",
      fechaEnvio: serverTimestamp(),
      observacion: observaciones || "",
      respuestas: {
        turno,
        canal,
        novedades,
        observaciones,
        cliente,
        operario,
        items,
      },
      controlRonda: {
        startTime,
        endTime: fin,
        pausas: pausasRef.current,
        totalPausedMs,
        durationMs,
      },
    });

    setElapsed(durationMs);
  };

  // -------- Helpers de UI
  const setItemStatus = (id, status) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, status, ts: new Date(), note: status === "ok" ? "" : it.note }
          : it
      )
    );
  };

  const setItemNote = (id, note) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, note } : it))
    );
  };

  const addQuickItem = () => {
    const newId = `custom-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      { id: newId, label: "Punto personalizado", status: "pendiente", note: "", ts: null },
    ]);
  };

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  return (
    <Box className="rondin-wrapper">
      {/* HEADER */}
      <Box className="rondin-header">
        <div className="rondin-header__left">
          <Typography variant="h5" className="rondin-title">
            RONDÍN DE MONITOREO
          </Typography>
          <Chip
            icon={<AccessTime />}
            label={`Tiempo: ${displayElapsed}`}
            className="chip-tiempo"
            variant="filled"
          />
        </div>

        <div className="rondin-header__right">
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Iniciar">
              <span>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow />}
                  onClick={handleIniciar}
                >
                  Iniciar
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Pausar">
              <span>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Pause />}
                  onClick={handlePausar}
                  disabled={!startTime || paused}
                >
                  Pausar
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Reanudar">
              <span>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleReanudar}
                  disabled={!startTime || !paused}
                >
                  Reanudar
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Finalizar">
              <span>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Stop />}
                  onClick={handleFinalizar}
                  disabled={!startTime}
                >
                  Finalizar
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </div>
      </Box>

      {/* CONTENEDOR */}
      <Paper className="rondin-container">
        {/* Barra de progreso */}
        <Box className="rondin-progress">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" className="muted">
              Avance del checklist
            </Typography>
            <Typography variant="subtitle2" className="muted">
              {completedCount}/{items.length} ({progress}%)
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} className="progress-bar"/>
        </Box>

        {/* Datos superiores */}
        <Grid container spacing={2} className="rondin-top-form">
          <Grid item xs={12} md={3}>
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
              <Select value={operario} label="Operador" onChange={(e) => setOperario(e.target.value)}>
                {operarios.map((op) => (
                  <MenuItem key={op} value={op}>{op}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Cliente</InputLabel>
              <Select value={cliente} label="Cliente" onChange={(e) => setCliente(e.target.value)}>
                {clientes.map((c) => (
                  <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField label="Canal" fullWidth value={canal} onChange={(e) => setCanal(e.target.value)} />
          </Grid>
        </Grid>

        <Divider className="rondin-divider" />

        {/* CHECKLIST en tarjetas */}
        <Box className="items-grid">
          {items.map((it) => (
            <Card key={it.id} className={`item-card status-${it.status}`}>
              <CardContent className="item-card__content">
                <div className="item-card__header">
                  <Typography className="item-label">{it.label}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="OK">
                      <IconButton
                        className={`btn-status ${it.status === "ok" ? "active" : ""}`}
                        onClick={() => setItemStatus(it.id, "ok")}
                        size="small"
                      >
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Alerta">
                      <IconButton
                        className={`btn-status warn ${it.status === "alerta" ? "active" : ""}`}
                        onClick={() => setItemStatus(it.id, "alerta")}
                        size="small"
                      >
                        <ReportProblem />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="No aplica">
                      <IconButton
                        className={`btn-status na ${it.status === "na" ? "active" : ""}`}
                        onClick={() => setItemStatus(it.id, "na")}
                        size="small"
                      >
                        <RemoveCircleOutline />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </div>

                {it.status !== "ok" && (
                  <TextField
                    placeholder="Agregar detalle / novedad para este ítem"
                    fullWidth
                    value={it.note}
                    onChange={(e) => setItemNote(it.id, e.target.value)}
                    multiline
                    minRows={2}
                    className="item-note"
                  />
                )}

                {it.ts && (
                  <Typography className="item-ts">
                    Marcado: {new Date(it.ts).toLocaleString("es-AR")}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
          <Button
            onClick={addQuickItem}
            startIcon={<Add />}
            className="btn-add-item"
            variant="outlined"
          >
            Agregar ítem
          </Button>
        </Box>

        <Divider className="rondin-divider" />

        {/* Novedades generales / Observaciones */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Novedades Generales"
              fullWidth
              multiline
              minRows={3}
              value={novedades}
              onChange={(e) => setNovedades(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Observaciones"
              fullWidth
              multiline
              minRows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Footer fijo con acciones y resumen */}
        <Box className="rondin-footer">
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip icon={<DoneAll />} label={`${completedCount}/${items.length} ítems`} />
            <Chip icon={<AccessTime />} label={displayElapsed} />
            <div className="spacer" />
            <Button variant="contained" color="success" startIcon={<PlayArrow />} onClick={handleIniciar}>
              Iniciar
            </Button>
            <Button variant="outlined" color="warning" startIcon={<Pause />} onClick={handlePausar} disabled={!startTime || paused}>
              Pausar
            </Button>
            <Button variant="outlined" onClick={handleReanudar} disabled={!startTime || !paused}>
              Reanudar
            </Button>
            <Button variant="contained" color="error" startIcon={<Stop />} onClick={handleFinalizar} disabled={!startTime}>
              Finalizar
            </Button>
            <Tooltip title="Reiniciar checklist (no borra datos guardados)">
              <span>
                <IconButton
                  onClick={() =>
                    setItems(DEFAULT_ITEMS.map((i) => ({ ...i, status: "pendiente", note: "", ts: null })))
                  }
                  className="btn-reset"
                >
                  <RestartAlt />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <div className="footer-blur" />
        </Box>
      </Paper>
    </Box>
  );
}
