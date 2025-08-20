import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
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
  Tooltip,Stack, Chip, Divider
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { FaFilter, FaFilePdf, FaPlus, FaMinus } from "react-icons/fa";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";



const RespuestasView = ({ respuestas }) => {
  if (!respuestas) return null;

  const { turno, novedades, observaciones, tandas = [] } = respuestas;
  const color = { ok: "#16a34a", medio: "#f59e0b", grave: "#ef4444" };

  return (
    <Box sx={{ mt: 1.5, display: "grid", gap: 1.25 }}>
      <Typography><strong>Turno:</strong> {turno || "—"}</Typography>
      {novedades ? <Typography><strong>Novedades:</strong> {novedades}</Typography> : null}
      {observaciones ? <Typography><strong>Observaciones:</strong> {observaciones}</Typography> : null}

      {Array.isArray(tandas) && tandas.length > 0 && (
        <Box sx={{ display: "grid", gap: 1.25 }}>
          {tandas.map((t, i) => (
            <Box key={i} sx={{ p: 1.25, borderRadius: 1, bgcolor: "#fafafa" }}>
              <Typography sx={{ fontWeight: 700, mb: .5 }}>
                {t?.cliente || "Cliente sin nombre"}
              </Typography>

              {/* Checklist */}
              {t?.checklist && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1 }}>
                  {"grabacionesOK" in t.checklist && (
                    <Chip size="small" label={`Grabaciones ${t.checklist.grabacionesOK ? "OK" : "Falla"}`} />
                  )}
                  {"cortes220v" in t.checklist && (
                    <Chip size="small" label={`Cortes 220V ${t.checklist.cortes220v ? "Sí" : "No"}`} />
                  )}
                  {"equipoOffline" in t.checklist && (
                    <Chip size="small" label={`Equipo offline ${t.checklist.equipoOffline ? "Sí" : "No"}`} />
                  )}
                </Stack>
              )}

              {/* Cámaras */}
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
                      const est = c?.estado ?? null;
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
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

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
    const to   = tsToDate(p?.to) || end; // si está en curso, usa 'end' o null
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

      // 👇 info de control y métricas derivadas
      control: {
        start, end, pausas: pausasArr, totalPausedMs, durationMs,
        pausasCount: Array.isArray(pausasArr) ? pausasArr.length : 0,
        pretty: {
          totalPaused: msToHMS(totalPausedMs),
          duration: msToHMS(durationMs),
          bruto: (start && end) ? msToHMS(end - start) : "—",
        }
      },
      metrics: {
        totalCamaras,
        camVerificadas,
        progreso, // %
      }
    };
  })
);

setTareas(data);

      // (opcional) si armás datos del Gantt acá, reúsalos con data
      const ganttData = data.map((t) => {
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
      await updateDoc(doc(db, "respuestas-tareas", movedTaskId), {
        estado: newEstado
      });
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
      t.cliente,
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
    <Box sx={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 2, height: "100vh", padding: 2 }}>
      {/* Sidebar */}
      <Paper sx={{ padding: 2, borderRadius: 3, height: "fit-content" }} elevation={4}>
        <Typography variant="h6" gutterBottom>
          <FaFilter /> Filtros
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Operador</InputLabel>
          <Select value={filtroOperador} onChange={(e) => setFiltroOperador(e.target.value)}>
            {operadores.map((op) => (
              <MenuItem key={op} value={op}>
                {op}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Vista Gantt</InputLabel>
          <Select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
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
          <Paper sx={{ flex: 1, padding: 2, overflow: "auto" }}>
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
              pageSize={5}
              onRowClick={(params) => handleSelectTask(params.row)}
              getRowId={(row) => row.id}
              autoHeight
            />
          </Paper>
        )}

        {/* Gantt */}
        {tabView === "gantt" && (
          <Paper sx={{ flex: 1, padding: 2, display: "flex", flexDirection: "column" }}>
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
                          <Draggable key={t.id.toString()} draggableId={t.id.toString()} index={index}>
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
      <Dialog open={!!selectedTask} onClose={() => setSelectedTask(null)} maxWidth="sm" fullWidth>
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
    <strong>Progreso cámaras:</strong> {selectedTask.metrics?.camVerificadas ?? 0}/{selectedTask.metrics?.totalCamaras ?? 0} ({selectedTask.metrics?.progreso ?? 0}%)
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
