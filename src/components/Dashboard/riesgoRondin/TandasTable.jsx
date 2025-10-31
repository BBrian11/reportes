// src/components/Dashboard/riesgoRondin/TandasTable.jsx
import React, { useState, Fragment } from "react";
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, TextField, Select, MenuItem, Collapse, Chip, Tooltip, Stack
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ExpandLess, ExpandMore, Delete, Add } from "@mui/icons-material";
import { norm } from "./helpers";

/* =============== UI helpers =============== */
function StatusPill({ value, size = "sm" }) {
  const map = {
    OK: { key: "success", label: "OK" },
    FALLA: { key: "error", label: "FALLA" },
    "N/A": { key: "info", label: "N/A" },
    "": { key: "default", label: "—" },
    null: { key: "default", label: "—" },
    undefined: { key: "default", label: "—" },
  };
  const m = map[value] ?? map[""];
  const px = size === "sm" ? 0.9 : 1.2;
  const py = size === "sm" ? 0.35 : 0.55;
  const fs = size === "sm" ? 12 : 13;

  return (
    <Box
      sx={(th) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px, py,
        borderRadius: 999,
        fontWeight: 700,
        fontSize: fs,
        letterSpacing: 0.2,
        ...(m.key === "default"
          ? {
              bgcolor: alpha(th.palette.text.primary, 0.06),
              color: alpha(th.palette.text.primary, 0.8),
              border: `1px solid ${alpha(th.palette.text.primary, 0.12)}`
            }
          : {
              bgcolor: alpha(th.palette[m.key].main, 0.14),
              color: th.palette[m.key].dark,
              border: `1px solid ${alpha(th.palette[m.key].main, 0.35)}`
            }),
      })}
    >
      <Box
        sx={(th) => ({
          width: 8, height: 8, borderRadius: 999,
          bgcolor:
            m.key === "default"
              ? alpha(th.palette.text.primary, 0.35)
              : th.palette[m.key].main,
          boxShadow:
            m.key === "default"
              ? "none"
              : `0 0 0 2px ${alpha(th.palette[m.key].main, 0.18)} inset`,
        })}
      />
      {m.label}
    </Box>
  );
}

/* ======= Semántica correcta de colores para checklist ======= */
function checklistColorByField(field, v) {
  if (v === null || v === undefined) return "default";
  const positive = ["grabacionesOK", "equipoHora"];      // true = OK (verde)
  const negative = ["cortes220v", "equipoOffline"];      // true = Falla (rojo)
  if (positive.includes(field)) return v ? "success" : "error";
  if (negative.includes(field)) return v ? "error" : "success";
  return "default";
}
function checklistVariant(v) {
  return v === null || v === undefined ? "outlined" : "filled";
}
function fmtBool(v) {
  if (v === true) return "Sí";
  if (v === false) return "No";
  return "—";
}

/* ======= Select de estado por cámara (arreglado) ======= */
function CamEstadoSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const stop = (e) => { e.stopPropagation(); };

  // Dejamos que el Select dispare onChange con el evento nativo
  // y cerramos explícitamente después.
  const handleChange = (e) => {
    onChange?.(e);
    setOpen(false);
  };

  return (
    <Box onMouseDown={stop} onClick={stop} onKeyDown={stop}>
      <Select
        size="small"
        fullWidth
        displayEmpty
        value={value ?? ""}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={(_, reason) => {
          // evitamos cerrar por click-away/escape para que no colapse nada por burbujeo
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          setOpen(false);
        }}
        onClick={stop}
        onMouseDown={stop}
        onKeyDown={stop}
        renderValue={(val) => <StatusPill value={val ?? ""} />}
        MenuProps={{
          keepMounted: true,
          disablePortal: true,       // anclar en el mismo stacking/contexto
          disableScrollLock: true,   // no bloquear scroll ni forzar focus
          PaperProps: {
            onMouseDown: stop,
            onClick: stop,
            sx: (th) => ({
              mt: 0.5,
              borderRadius: 2,
              boxShadow: th.shadows[8],
              border: `1px solid ${alpha(th.palette.common.black, 0.08)}`,
              zIndex: 1600,
            }),
          },
          MenuListProps: {
            onWheel: stop,   // no cerrar por scroll
            onMouseDown: stop,
            sx: { py: 0.5 },
          },
          onClose: (e, reason) => {
            if (reason === "backdropClick" || reason === "escapeKeyDown") return;
            setOpen(false);
          },
        }}
        sx={(th) => ({
          borderRadius: 2,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(th.palette.text.primary, 0.18),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(th.palette.text.primary, 0.32),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(th.palette.primary.main, 0.45),
            borderWidth: 1,
          },
          "& .MuiSelect-select": {
            py: 0.6, px: 1, display: "flex", alignItems: "center", gap: 1
          },
        })}
        onChange={handleChange}
      >
        {["", "OK", "FALLA", "N/A"].map((opt) => (
          <MenuItem
            key={opt || "empty"}
            value={opt}
            sx={(th) => ({
              borderRadius: 1.2,
              my: 0.25,
              px: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              "& .dot": {
                width: 8, height: 8, borderRadius: 999,
                backgroundColor:
                  opt === "OK"    ? th.palette.success.main :
                  opt === "FALLA" ? th.palette.error.main   :
                  opt === "N/A"   ? th.palette.info.main    :
                                    alpha(th.palette.text.primary, 0.35),
              },
              "&:hover": {
                backgroundColor:
                  opt === "OK"    ? alpha(th.palette.success.main, 0.10) :
                  opt === "FALLA" ? alpha(th.palette.error.main, 0.10)   :
                  opt === "N/A"   ? alpha(th.palette.info.main, 0.10)    :
                                    alpha(th.palette.text.primary, 0.04),
              },
              fontWeight: opt ? 700 : 500,
            })}
          >
            <Box className="dot" />
            {opt || "—"}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

export default function TandasTable({
  tandas,
  clientesCat,
  isTandaCompleta,
  activeTandaIdx,
  setActiveTandaIdx,
  onRemoveTanda,
  onSetCliente,
  onSetResumen,
  onAddCam,
  onRemoveCam,
  onCamField,
  onCamState,
  setChecklistVal,
  historicosPorCliente,
}) {
  const [openRow, setOpenRow] = useState({}); // { [tandaId]: bool }
  const toggleRow = (id, idx) => {
    setOpenRow((p) => ({ ...p, [id]: !p[id] }));
    setActiveTandaIdx?.(idx);
  };

  // —— Banda lateral por estado de la tanda
  const stripeKey = (t) => {
    const cams = Array.isArray(t.camaras) ? t.camaras : [];
    const hasFalla = cams.some((c) => c.estado === "FALLA");
    if (hasFalla) return "error";
    if (isTandaCompleta(t)) return "success";
    return "warning";
  };

  // —— Chip “Estado” (Completa/Pendiente)
  const EstadoChip = ({ t }) =>
    isTandaCompleta(t) ? (
      <Chip
        size="small"
        label="Completa"
        sx={(th) => ({
          bgcolor: alpha(th.palette.success.main, 0.12),
          color: th.palette.success.dark,
          border: `1px solid ${alpha(th.palette.success.main, 0.35)}`,
          fontWeight: 700,
        })}
        variant="outlined"
      />
    ) : (
      <Chip
        size="small"
        label="Pendiente"
        sx={(th) => ({
          bgcolor: alpha(th.palette.error.main, 0.10),
          color: th.palette.error.dark,
          border: `1px solid ${alpha(th.palette.error.main, 0.35)}`,
          fontWeight: 700,
        })}
        variant="outlined"
      />
    );

  return (
    <Box sx={{ overflow: "auto" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width={48}></TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Resumen</TableCell>
            <TableCell align="center">Cáms</TableCell>
            <TableCell align="center">Estado</TableCell>
            <TableCell align="right" width={160}>Acciones</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {tandas.map((t, idx) => {
            const k = stripeKey(t);
            return (
              <Fragment key={t.id}>
                <TableRow
                  id={t.id}
                  hover
                  sx={(th) => ({
                    position: "relative",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 0, top: 0, bottom: 0, width: 3,
                      bgcolor:
                        k === "error"
                          ? th.palette.error.main
                          : k === "success"
                          ? th.palette.success.main
                          : th.palette.warning.main,
                      opacity: 0.9,
                      borderTopLeftRadius: 4,
                      borderBottomLeftRadius: 4,
                    },
                  })}
                >
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(t.id, idx)}>
                      {openRow[t.id] ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </TableCell>

                  {/* Cliente */}
                  <TableCell sx={{ minWidth: 260 }}>
                    <Select
                      size="small"
                      fullWidth
                      displayEmpty
                      value={t.cliente || ""}
                      onChange={(e) => onSetCliente(t.id, e.target.value)}
                      sx={(th) => ({
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: alpha(th.palette.text.primary, 0.18),
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: alpha(th.palette.text.primary, 0.32),
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: alpha(th.palette.primary.main, 0.45),
                        },
                      })}
                    >
                      <MenuItem value=""><em>Seleccione cliente</em></MenuItem>
                      {clientesCat.map((c) => (
                        <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  {/* Resumen */}
                  <TableCell sx={{ minWidth: 280 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Observación breve…"
                      value={t.resumen || ""}
                      onChange={(e) => onSetResumen(t.id, e.target.value)}
                    />
                  </TableCell>

                  {/* Conteo de cámaras */}
                  <TableCell align="center">
                    {Array.isArray(t.camaras) ? t.camaras.length : 0}
                  </TableCell>

                  {/* Estado general */}
                  <TableCell align="center">
                    <EstadoChip t={t} />
                  </TableCell>

                  {/* Acciones */}
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Agregar cámara">
                        <IconButton size="small" onClick={() => onAddCam(t.id)}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar cliente">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onRemoveTanda(t.id)}
                            disabled={tandas.length === 1}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>

                {/* Detalle colapsable */}
                <TableRow>
                  <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                    <Collapse in={!!openRow[t.id]} timeout="auto" unmountOnExit>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: (th) => alpha(th.palette.text.primary, 0.02),
                          borderTop: (th) => `1px solid ${alpha(th.palette.text.primary, 0.06)}`
                        }}
                      >
                        {/* Subtabla cámaras */}
                        <Table size="small" sx={{ mb: 1 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell width={90}>Canal</TableCell>
                              <TableCell width={170}>Estado</TableCell>
                              <TableCell>Nota</TableCell>
                              <TableCell align="right" width={90}>Acción</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(t.camaras || []).map((c) => (
                              <TableRow key={c.id} hover>
                                <TableCell>
                                  <TextField
                                    size="small"
                                    type="number"
                                    fullWidth
                                    placeholder="N°"
                                    value={c.canal ?? ""}
                                    onChange={(e) => onCamField(t.id, c.id, "canal", e.target.value)}
                                  />
                                </TableCell>

                                <TableCell>
                                  <CamEstadoSelect
                                    value={c.estado ?? ""}
                                    onChange={(e) => onCamState(t.id, c.id, e.target.value)}
                                  />
                                </TableCell>

                                <TableCell>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Observaciones…"
                                    value={c.nota || ""}
                                    onChange={(e) => onCamField(t.id, c.id, "nota", e.target.value)}
                                  />
                                </TableCell>

                                <TableCell align="right">
                                  <IconButton size="small" onClick={() => onRemoveCam(t.id, c.id)}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* Checklist resumido con semántica correcta */}
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip
                            label={`Grabaciones OK: ${fmtBool(t?.checklist?.grabacionesOK)}`}
                            onClick={() => setChecklistVal(t.id, "grabacionesOK", !(t?.checklist?.grabacionesOK === true))}
                            color={checklistColorByField("grabacionesOK", t?.checklist?.grabacionesOK)}
                            variant={checklistVariant(t?.checklist?.grabacionesOK)}
                            clickable
                          />
                          <Chip
                            label={`Cortes 220V: ${fmtBool(t?.checklist?.cortes220v)}`}
                            onClick={() => setChecklistVal(t.id, "cortes220v", !(t?.checklist?.cortes220v === true))}
                            color={checklistColorByField("cortes220v", t?.checklist?.cortes220v)}
                            variant={checklistVariant(t?.checklist?.cortes220v)}
                            clickable
                          />
                          <Chip
                            label={`Equipo en hora: ${fmtBool(t?.checklist?.equipoHora)}`}
                            onClick={() => setChecklistVal(t.id, "equipoHora", !(t?.checklist?.equipoHora === true))}
                            color={checklistColorByField("equipoHora", t?.checklist?.equipoHora)}
                            variant={checklistVariant(t?.checklist?.equipoHora)}
                            clickable
                          />
                          <Chip
                            label={`Offline: ${fmtBool(t?.checklist?.equipoOffline)}`}
                            onClick={() => setChecklistVal(t.id, "equipoOffline", !(t?.checklist?.equipoOffline === true))}
                            color={checklistColorByField("equipoOffline", t?.checklist?.equipoOffline)}
                            variant={checklistVariant(t?.checklist?.equipoOffline)}
                            clickable
                          />
                        </Stack>

                        {/* Histórico (si hay) */}
                        {t?.cliente && historicosPorCliente?.[norm(t.cliente || "")] && (
                          <Box sx={{ mt: 1, fontSize: 12, opacity: 0.7 }}>
                            Histórico cargado para <b>{t.cliente}</b>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
