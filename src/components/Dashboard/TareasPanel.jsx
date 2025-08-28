import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { Gantt, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Paper,
  Button,
  InputLabel,
  FormControl,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Divider,
  Grid
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { FaFilter, FaFilePdf, FaPlus, FaMinus } from "react-icons/fa";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

/* =========================
   Vista de respuestas (detalle)
   ========================= */
const RespuestasView = ({ respuestas }) => {
  if (!respuestas) return null;

  const { turno, novedades, observaciones, tandas = [] } = respuestas;

  const color = { ok: "#16a34a", medio: "#f59e0b", grave: "#ef4444" };

  // Chip booleano con semántica configurable
  const BoolChip = ({ label, value, okWhen = true, yes = "Sí", no = "No" }) => {
    // Normalización por si llegan strings variados
    const normalize = (val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        const s = val.trim().toLowerCase();
        if (["true", "1", "sí", "si", "ok", "on"].includes(s)) return true;
        if (["false", "0", "no", "off"].includes(s)) return false;
      }
      return null; // valor desconocido
    };

    const v = normalize(value);
    const isOk = v === null ? null : v === okWhen;
    const text = v === null ? "—" : v ? yes : no;

    let bg = "action.hover";
    let fg = "text.primary";
    if (isOk === true) {
      bg = "success.light";
      fg = "success.contrastText";
    } else if (isOk === false) {
      bg = "error.light";
      fg = "error.contrastText";
    }

    return (
      <Chip
        size="small"
        label={`${label}: ${text}`}
        sx={{ bgcolor: bg, color: fg, fontWeight: 600 }}
      />
    );
  };

  // --- helper: cuenta estados de cámaras en una tanda
  const resumenCamaras = (t) => {
    const cams = Array.isArray(t?.camaras) ? t.camaras : [];
    const counts = cams.reduce(
      (acc, c) => {
        const e = (c?.estado || "").toLowerCase();
        if (e === "grave") acc.grave += 1;
        else if (e === "medio") acc.medio += 1;
        else if (e === "ok") acc.ok += 1;
        else acc.nd += 1;
        return acc;
      },
      { ok: 0, medio: 0, grave: 0, nd: 0 }
    );
    const total = cams.length;
    const operativas = counts.ok;
    // 📌 “Sin funcionar” lo tomamos como GRAVE. Si querés grave+medio, descomentá:
    // const sinFuncionar = counts.grave + counts.medio;
    const sinFuncionar = counts.grave;
    const operativasPct = total ? Math.round((operativas / total) * 100) : 0;
    return { total, ...counts, operativas, sinFuncionar, operativasPct };
  };

  return (
    <Box sx={{ mt: 1.5, display: "grid", gap: 1.5 }}>
      <Typography><strong>Turno:</strong> {turno || "—"}</Typography>
      {novedades ? <Typography><strong>Novedades:</strong> {novedades}</Typography> : null}
      {observaciones ? <Typography><strong>Observaciones:</strong> {observaciones}</Typography> : null}

      {Array.isArray(tandas) && tandas.length > 0 && (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {tandas.map((t, i) => {
            const rc = resumenCamaras(t);
            return (
              <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>
                  {t?.cliente || "Cliente sin nombre"}
                </Typography>

                {/* === Resumen por cliente (cámaras) === */}
                <Stack spacing={1.5} sx={{ mb: 2 }}>
  <Stack direction="row" spacing={2}>
    <Chip size="small" label={`Total cams: ${rc.total}`} sx={{ fontWeight: 700 }} />
    <Chip size="small" label={`Sin funcionar: ${rc.sinFuncionar}`} sx={{ bgcolor: "error.light", color: "error.contrastText", fontWeight: 700 }} />
    <Chip size="small" label={`Medio: ${rc.medio}`} sx={{ bgcolor: `${color.medio}22`, border: `1px solid ${color.medio}55`, fontWeight: 700 }} />
  </Stack>

</Stack>



              {/* === Estado de la alarma (si monitoreada) === */}
{t?.checklist?.alarmaMonitoreada === true && (
  <Paper
    variant="outlined"
    sx={{ p: 1.5, borderRadius: 2, mb: 1, bgcolor: "action.hover" }}
  >
    <Typography variant="subtitle2" gutterBottom>
      🚨 ESTADO DE LA ALARMA
    </Typography>

    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={2}>
        <BoolChip
          label="¿COMUNICACIÓN OK?"
          value={t.checklist.alarmaComunicacionOK}
          okWhen={true}
        />
        <BoolChip
          label="¿PANEL ARMADO?"
          value={t.checklist.alarmaPanelArmado}
          okWhen={true}
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <BoolChip
          label="¿ZONAS ABIERTAS?"
          value={t.checklist.alarmaZonasAbiertas}
          okWhen={false}
        />
        <BoolChip
          label="¿BATERÍA BAJA?"
          value={t.checklist.alarmaBateriaBaja}
          okWhen={false}
        />
        <BoolChip
          label="¿TAMPER / TAPA ABIERTA?"
          value={t.checklist.alarmaTamper}
          okWhen={false}
        />
      </Stack>
    </Stack>

    <Grid container spacing={1}>
      <Grid item xs={12} sm={6}>
        <Typography variant="body2">
          <strong>Último evento (min.):</strong>{" "}
          {t.checklist.alarmaUltimoEventoMin !== undefined &&
          t.checklist.alarmaUltimoEventoMin !== ""
            ? t.checklist.alarmaUltimoEventoMin
            : "—"}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2">
          <strong>Observaciones alarma:</strong>{" "}
          {t.checklist.alarmaObs ? t.checklist.alarmaObs : "—"}
        </Typography>
      </Grid>
    </Grid>
  </Paper>
)}


                {/* === Checklist general (chips rápidos) === */}
                {t?.checklist && (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1 }}>
                    {"grabacionesOK" in t.checklist && (
                      <Chip
                        size="small"
                        label={`Grabaciones ${t.checklist.grabacionesOK ? "OK" : "Falla"}`}
                        color={t.checklist.grabacionesOK ? "success" : "error"}
                        variant="filled"
                      />
                    )}
                    {"cortes220v" in t.checklist && (
                      <BoolChip label="Cortes 220V" value={t.checklist.cortes220v} okWhen={false} />
                    )}
                     {"equipoHora" in t.checklist && (
                      <BoolChip label="Cortes 220V" value={t.checklist.equipoHora} okWhen={false} />
                    )}
                    {"equipoOffline" in t.checklist && (
                      <BoolChip label="Equipo offline" value={t.checklist.equipoOffline} okWhen={false} />
                    )}
                  </Stack>
                )}

                {/* === Cámaras (detalle) === */}
                {Array.isArray(t?.camaras) && t.camaras.length > 0 && (
                  <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:"left", padding:"6px 8px" }}>Canal</th>
                        <th style={{ textAlign:"left", padding:"6px 8px" }}>Estado</th>
                        <th style={{ textAlign:"left", padding:"6px 8px" }}>Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.camaras.map((c, j) => {
                        const est = c?.estado ?? null; // ok | medio | grave | null
                        const label = est ? est.toUpperCase() : "—";
                        const clr = est ? color[est] : "#9ca3af";
                        return (
                          <tr key={j}>
                            <td style={{ padding:"6px 8px" }}>{c?.canal ?? "—"}</td>
                            <td style={{ padding:"6px 8px" }}>
                              <Chip
                                size="small"
                                label={label}
                                sx={{
                                  bgcolor: `${clr}22`,
                                  border: `1px solid ${clr}55`,
                                  fontWeight: 600
                                }}
                              />
                            </td>
                            <td style={{ padding:"6px 8px" }}>{c?.nota || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Box>
                )}

                {t?.resumen && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography><strong>Resumen:</strong> {t.resumen}</Typography>
                  </>
                )}
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

/* =========================
   Panel principal
   ========================= */
export default function TareasPanel() {
  const [tareas, setTareas] = useState([]);
  const [tasksGantt, setTasksGantt] = useState([]);
  const [viewMode, setViewMode] = useState(ViewMode.Day);
  const [filtroOperador, setFiltroOperador] = useState("Todos");
  const [tabView, setTabView] = useState("tabla");
  const [zoom, setZoom] = useState(100);
  const [selectedTask, setSelectedTask] = useState(null);
  const [observacion, setObservacion] = useState("");

  // ✅ Cargar tareas desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "respuestas-tareas"), async (snapshot) => {
      const tsToDate = (ts) => ts?.toDate?.() || (ts ? new Date(ts) : null);

      const msToHMS = (ms) => {
        if (ms == null) return "—";
        const s = Math.max(0, Math.floor(ms / 1000));
        const hh = String(Math.floor(s / 3600)).padStart(2, "0");
        const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
        const ss = String(s % 60).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
      };

      const sumPausedMs = (pausas = [], end) =>
        pausas.reduce((acc, p) => {
          const from = tsToDate(p?.from);
          const to   = tsToDate(p?.to) || end;
          if (from && to) acc += Math.max(0, to - from);
          return acc;
        }, 0);

      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const d = docSnap.data();

          // Control de ronda
          const start = tsToDate(d?.controlRonda?.startTime);
          const end   = tsToDate(d?.controlRonda?.endTime);
          const pausasArr = Array.isArray(d?.controlRonda?.pausas) ? d.controlRonda.pausas : [];
          const totalPausedMsRaw = d?.controlRonda?.totalPausedMs;
          const totalPausedMs = (typeof totalPausedMsRaw === "number")
            ? totalPausedMsRaw
            : sumPausedMs(pausasArr, end || new Date());
          const durationMsRaw = d?.controlRonda?.durationMs;
          const durationMs = (typeof durationMsRaw === "number")
            ? durationMsRaw
            : (start ? ((end || new Date()) - start - totalPausedMs) : null);

          // Fechas para listado/Gantt
          const fechaAsignacion = start;
          const fechaRespuesta  = end || tsToDate(d?.fechaEnvio);

          // Clientes desde respuestas.tandas
          const clientesFromTandas = Array.isArray(d?.respuestas?.tandas)
            ? [...new Set(d.respuestas.tandas.map(t => t?.cliente).filter(Boolean))]
            : [];
          const clienteLabel =
            clientesFromTandas.length === 0 ? "Sin cliente" :
            clientesFromTandas.length === 1 ? clientesFromTandas[0] :
            `${clientesFromTandas[0]} + ${clientesFromTandas.length - 1} más`;

          // Métricas de cámaras verificadas
          const totalCamaras = (d?.respuestas?.tandas || []).reduce(
            (acc, t) => acc + (Array.isArray(t?.camaras) ? t.camaras.length : 0), 0
          );
          const camVerificadas = (d?.respuestas?.tandas || []).reduce((acc, t) => {
            const cams = Array.isArray(t?.camaras) ? t.camaras : [];
            return acc + cams.filter(c => c?.touched && c?.estado != null).length;
          }, 0);
          const progreso = totalCamaras ? Math.round((camVerificadas / totalCamaras) * 100) : 0;

          return {
            id: docSnap.id,
            formName: d.nombreFormulario || "Formulario",
            clienteLabel,
            clientes: clientesFromTandas,
            operador: d.operador || "Sin operador",
            fechaAsignacion,
            fechaRespuesta,
            estado: d.estado || (fechaRespuesta ? "Completada" : (fechaAsignacion ? "En Proceso" : "Pendiente")),
            respuestas: d.respuestas || {},
            observacion: d.observacion || "",
            control: {
              start, end, pausas: pausasArr, totalPausedMs, durationMs,
              pausasCount: Array.isArray(pausasArr) ? pausasArr.length : 0,
              pretty: {
                totalPaused: msToHMS(totalPausedMs),
                duration: msToHMS(durationMs),
                bruto: (start && end) ? msToHMS(end - start) : "—",
              }
            },
            metrics: { totalCamaras, camVerificadas, progreso }
          };
        })
      );

      // Filtro por operador (opcional)
      const filtered = (filtroOperador === "Todos")
        ? data
        : data.filter(t => t.operador === filtroOperador);

      setTareas(filtered);

      // Datos del Gantt
      const ganttData = filtered.map((t) => {
        const color =
          t.estado === "Completada" ? "#4caf50" :
          t.estado === "En Proceso" ? "#ff9800" : "#f44336";

        return {
          id: t.id,
          name: `${t.operador} - ${t.formName}`,
          start: t.fechaAsignacion || new Date(),
          end: t.fechaRespuesta || new Date(),
          type: "task",
          progress: t.estado === "Completada" ? 100 : t.estado === "En Proceso" ? 50 : 10,
          styles: { progressColor: color, backgroundColor: `${color}33` },
          onClick: () => handleSelectTask(t)
        };
      });
      setTasksGantt(ganttData);
    });

    return () => unsub();
  }, [filtroOperador]);

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setObservacion(task.observacion || "");
  };

  const operadores = ["Todos", ...new Set(tareas.map((t) => t.operador))];

  // ✅ Cambiar estado en Firestore
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const movedTaskId = result.draggableId;
    const newEstado = result.destination.droppableId;

    setTareas((prev) =>
      prev.map((t) => (t.id === movedTaskId ? { ...t, estado: newEstado } : t))
    );

    try {
      await updateDoc(doc(db, "respuestas-tareas", movedTaskId), { estado: newEstado });
    } catch (error) {
      console.error("Error actualizando estado:", error);
    }
  };

  // ✅ Guardar observación
  const handleSaveObservacion = async () => {
    if (!selectedTask) return;
    try {
      await updateDoc(doc(db, "respuestas-tareas", selectedTask.id), {
        observacion: observacion
      });
      setSelectedTask(null);
    } catch (error) {
      console.error("Error guardando observación:", error);
    }
  };

  // ✅ Exportar PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Tareas", 14, 10);

    const tableData = tareas.map((t) => [
      t.formName,
      t.clienteLabel || "-",
      t.operador,
      t.estado,
      t.fechaAsignacion ? t.fechaAsignacion.toLocaleString("es-AR") : "-",
      t.observacion || "-",
      Object.entries(t.respuestas)
        .map(([k, v]) => (typeof v === "string" ? v : JSON.stringify(v)))
        .join(", ")
    ]);

    doc.autoTable({
      head: [["Formulario", "Cliente", "Operador", "Estado", "Fecha Asignación", "Observación", "Respuestas"]],
      body: tableData,
      styles: { fontSize: 8 }
    });

    doc.save("reporte-tareas.pdf");
  };

  const estados = ["Pendiente", "En Proceso", "Completada"];
  const tareasPorEstado = estados.reduce((acc, estado) => {
    acc[estado] = tareas.filter((t) => t.estado === estado);
    return acc;
  }, {});

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 2, height: "100vh", p: 2 }}>
      {/* Sidebar */}
      <Paper sx={{ p: 2, borderRadius: 3, height: "fit-content" }} elevation={4}>
        <Typography variant="h6" gutterBottom>
          <FaFilter /> Filtros
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Operador</InputLabel>
          <Select value={filtroOperador} onChange={(e) => setFiltroOperador(e.target.value)} label="Operador">
            {operadores.map((op) => (
              <MenuItem key={op} value={op}>
                {op}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Vista Gantt</InputLabel>
          <Select value={viewMode} onChange={(e) => setViewMode(e.target.value)} label="Vista Gantt">
            <MenuItem value={ViewMode.Hour}>Horas</MenuItem>
            <MenuItem value={ViewMode.Day}>Días</MenuItem>
            <MenuItem value={ViewMode.Week}>Semanas</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Tooltip title="Zoom In">
            <IconButton onClick={() => setZoom((z) => Math.min(z + 20, 200))}>
              <FaPlus />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton onClick={() => setZoom((z) => Math.max(z - 20, 50))}>
              <FaMinus />
            </IconButton>
          </Tooltip>
        </Box>
        <Button fullWidth variant="contained" startIcon={<FaFilePdf />} onClick={exportToPDF}>
          Exportar PDF
        </Button>
      </Paper>

      {/* Main */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Tabs value={tabView} onChange={(e, v) => setTabView(v)} centered>
          <Tab value="tabla" label="Tabla" />
          <Tab value="gantt" label="Gantt" />
          <Tab value="kanban" label="Kanban" />
        </Tabs>

        {/* Tabla */}
        {tabView === "tabla" && (
          <Paper sx={{ flex: 1, p: 2, overflow: "auto" }}>
            <DataGrid
              rows={tareas}
              columns={[
                { field: "formName", headerName: "Formulario", flex: 1 },
                { field: "clienteLabel", headerName: "Cliente", flex: 1 },
                { field: "operador", headerName: "Operador", flex: 1 },
                { field: "estado", headerName: "Estado", flex: 1 },
                {
                  field: "fechaAsignacion",
                  headerName: "Fecha Asignación",
                  flex: 1,
                  valueFormatter: (p) => (p && p.value ? p.value.toLocaleString("es-AR") : "")
                },
              ]}
              pageSizeOptions={[5, 10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
              onRowClick={(params) => handleSelectTask(params.row)}
              getRowId={(row) => row.id}
              autoHeight
            />
          </Paper>
        )}

        {/* Gantt */}
        {tabView === "gantt" && (
          <Paper sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column" }}>
            {tasksGantt.length ? (
              <Box sx={{ flex: 1, overflowX: "auto" }}>
                <div style={{ width: `${Math.min(tasksGantt.length * 250, 2000)}px`, minWidth: "100%" }}>
                  <Gantt tasks={tasksGantt} viewMode={viewMode} locale="es" columnWidth={zoom} listCellWidth="200px" />
                </div>
              </Box>
            ) : (
              <Typography>No hay tareas</Typography>
            )}
          </Paper>
        )}

        {/* Kanban */}
        {tabView === "kanban" && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Box sx={{ display: "flex", gap: 2, overflowX: "auto", height: "calc(100vh - 200px)", p: 1 }}>
              {estados.map((estado) => (
                <Droppable key={estado} droppableId={estado}>
                  {(provided, snapshot) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        flex: "0 0 300px",
                        minHeight: "500px",
                        background: snapshot.isDraggingOver ? "#e3f2fd" : "#f8f9fa",
                        borderRadius: 2,
                        p: 2,
                        display: "flex",
                        flexDirection: "column"
                      }}
                    >
                      <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
                        {estado}
                      </Typography>

                      <Box sx={{ flex: 1 }}>
                        {tareasPorEstado[estado].map((t, index) => (
                          <Draggable key={String(t.id)} draggableId={String(t.id)} index={index}>
                            {(provided, snapshot) => (
                              <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                  background: snapshot.isDragging ? "#bbdefb" : "#fff",
                                  borderRadius: 2,
                                  p: 2,
                                  mb: 2,
                                  boxShadow: snapshot.isDragging
                                    ? "0 4px 12px rgba(0,0,0,0.3)"
                                    : "0 2px 4px rgba(0,0,0,0.1)",
                                  transition: "all 0.2s ease",
                                  cursor: "grab"
                                }}
                                onClick={() => handleSelectTask(t)}
                              >
                                <Typography fontWeight="bold">{t.formName}</Typography>
                                <Typography fontSize={12} color="text.secondary">
                                  {t.operador}
                                </Typography>
                              </Box>
                            )}
                          </Draggable>
                        ))}
                      </Box>

                      {provided.placeholder}
                    </Paper>
                  )}
                </Droppable>
              ))}
            </Box>
          </DragDropContext>
        )}
      </Box>

      {/* Modal Detalle */}
      <Dialog open={!!selectedTask} onClose={() => setSelectedTask(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Detalles de la Tarea</DialogTitle>
        <DialogContent dividers>
          {selectedTask && (
            <>
              <Typography variant="h6">{selectedTask.formName}</Typography>
              <Typography><strong>Cliente:</strong> {selectedTask.clienteLabel}</Typography>
              <Typography><strong>Estado:</strong> {selectedTask.estado}</Typography>
              <Typography>
                <strong>Fecha Asignación:</strong>{" "}
                {selectedTask.fechaAsignacion ? selectedTask.fechaAsignacion.toLocaleString("es-AR") : "Sin asignación"}
              </Typography>
              <Typography><strong>Operador:</strong> {selectedTask.operador}</Typography>

              <RespuestasView respuestas={selectedTask.respuestas} />

              {/* Tiempos */}
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="subtitle1">Tiempos</Typography>
                <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", sm:"1fr 1fr" }, gap: 1 }}>
                  <Typography><strong>Inicio:</strong> {selectedTask.control?.start ? selectedTask.control.start.toLocaleString("es-AR") : "—"}</Typography>
                  <Typography><strong>Fin:</strong> {selectedTask.control?.end ? selectedTask.control.end.toLocaleString("es-AR") : "—"}</Typography>
                  <Typography><strong>Duración efectiva:</strong> {selectedTask.control?.pretty?.duration || "—"}</Typography>
                  <Typography><strong>Tiempo en pausa:</strong> {selectedTask.control?.pretty?.totalPaused || "—"}</Typography>
                  <Typography><strong>Pausas:</strong> {selectedTask.control?.pausasCount ?? 0}</Typography>
                  <Typography><strong>Duración bruta (fin-inicio):</strong> {selectedTask.control?.pretty?.bruto || "—"}</Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Progreso cámaras:</strong>{" "}
                  {selectedTask.metrics?.camVerificadas ?? 0}/{selectedTask.metrics?.totalCamaras ?? 0} ({selectedTask.metrics?.progreso ?? 0}%)
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <TextField
                  label="Observación"
                  fullWidth
                  multiline
                  rows={3}
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTask(null)}>Cancelar</Button>
          <Button onClick={handleSaveObservacion} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
