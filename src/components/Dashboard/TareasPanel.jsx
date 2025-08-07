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
  Tooltip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { FaFilter, FaFilePdf, FaPlus, FaMinus } from "react-icons/fa";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

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
        const data = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const d = docSnap.data();
          
              // Fecha de respuesta viene de respuestas-tareas (fechaEnvio)
              const fechaRespuesta = d.fechaEnvio ? d.fechaEnvio.toDate() : null;
          
              // Buscar fecha de creación del formulario desde formularios-tareas
              let fechaAsignacion = null;
              if (d.formId) {
                const formDoc = await getDoc(doc(db, "formularios-tareas", d.formId));
                if (formDoc.exists()) {
                  const formData = formDoc.data();
                  fechaAsignacion = formData.fechaCreacion ? formData.fechaCreacion.toDate() : null;
                }
              }
          
              return {
                id: docSnap.id,
                formName: d.nombreFormulario || "Formulario",
                cliente: d.cliente || "Sin cliente",
                operador: d.operador || "Sin operador",
                fechaAsignacion,
                fechaRespuesta,
                estado: d.estado || "Pendiente",
                respuestas: d.respuestas || {},
                observacion: d.observacion || ""
              };
            })
          );
          

      setTareas(data);

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
      t.fechaRespuesta ? t.fechaRespuesta.toLocaleString("es-AR") : "En espera",
      t.observacion || "-",
      Object.entries(t.respuestas)
        .map(([k, v]) => (typeof v === "string" ? v : JSON.stringify(v)))
        .join(", ")
    ]);

    doc.autoTable({
      head: [["Formulario", "Cliente", "Operador", "Estado", "Fecha Asignación", "Fecha Respuesta", "Observación", "Respuestas"]],
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
                { field: "cliente", headerName: "Cliente", flex: 1 },
                { field: "operador", headerName: "Operador", flex: 1 },
                { field: "estado", headerName: "Estado", flex: 1 },
                {
                  field: "fechaAsignacion",
                  headerName: "Fecha Asignación",
                  flex: 1,
                  valueFormatter: (p) => (p && p.value ? p.value.toLocaleString("es-AR") : "")

                },
                {
                  field: "fechaRespuesta",
                  headerName: "Fecha Respuesta",
                  flex: 1,
                  valueFormatter: (p) => (p && p.value ? p.value.toLocaleString("es-AR") : "En espera")

                }
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
              <Typography><strong>Cliente:</strong> {selectedTask.cliente}</Typography>
              <Typography><strong>Operador:</strong> {selectedTask.operador}</Typography>
              <Typography><strong>Estado:</strong> {selectedTask.estado}</Typography>
              <Typography>
                <strong>Fecha Asignación:</strong>{" "}
                {selectedTask.fechaAsignacion ? selectedTask.fechaAsignacion.toLocaleString("es-AR") : "Sin asignación"}
              </Typography>
              <Typography>
                <strong>Fecha Respuesta:</strong>{" "}
                {selectedTask.fechaRespuesta ? selectedTask.fechaRespuesta.toLocaleString("es-AR") : "En espera"}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Respuestas:</Typography>
                {Object.entries(selectedTask.respuestas).map(([k, v], i) => (
                  <Typography key={i} variant="body2">
                    {k}: {typeof v === "string" ? (v.startsWith("http") ? <a href={v}>Archivo</a> : v) : JSON.stringify(v)}
                  </Typography>
                ))}
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
