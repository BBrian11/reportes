// src/components/Dashboard/riesgoRondin/CameraTable.jsx
import React, { useMemo } from "react";
import {
  Box, IconButton, Select, MenuItem, TextField, Tooltip, Chip, Stack,
  ListItemIcon, ListItemText, OutlinedInput
} from "@mui/material";
import { Delete, RadioButtonUnchecked } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { CANALES_OPCIONES, ESTADOS, estadoMeta, toChannelNumber } from "./helpers";

export default function CameraTable({ tanda, historicos = {}, onCamField, onCamRemove, onCamState }) {
  if (!tanda || !Array.isArray(tanda.camaras)) return null;

  // canales repetidos en la misma tanda (ignora vacíos)
  const usadosPorOtro = useMemo(() => {
    const count = {};
    for (const c of tanda.camaras) {
      const n = Number.isFinite(Number(c.canal)) ? Number(c.canal) : null;
      if (n != null) count[n] = (count[n] || 0) + 1;
    }
    return count;
  }, [tanda.camaras]);

  // si no hay filas, no renderizar la tabla
  if (tanda.camaras.length === 0) return null;

  return (
    <Box sx={{ border: "1px solid rgba(2,6,23,.06)", borderRadius: 2, overflow: "hidden" }}>
      {/* Head */}
      <Box sx={{
        display:"grid", gridTemplateColumns:"minmax(120px,1fr) 1fr 1.3fr auto",
        gap:1, px:1.5, py:1, bgcolor:"grey.100",
        borderBottom:"1px solid rgba(2,6,23,.06)", fontSize:13, fontWeight:600, color:"text.secondary"
      }}>
        <span>Equipo</span><span>Estado</span><span>Nota</span><span />
      </Box>

      {/* Rows */}
      <Box>
        {tanda.camaras.map((cam, idx) => {
          const canalNum = Number.isFinite(Number(cam.canal)) ? Number(cam.canal) : null;
          const estadoNow = canalNum != null
            ? (cam.estado ?? historicos[canalNum] ?? null)
            : null;
          const metaNow = estadoMeta(estadoNow);

          return (
            <Box
              key={cam.id}
              sx={{
                display:"grid",
                gridTemplateColumns:"minmax(120px,1fr) 1fr 1.3fr auto",
                gap:1, px:1.5, py:1, alignItems:"center",
                ...(idx % 2 === 1 && { bgcolor:"grey.50" }),
                borderTop:"1px solid rgba(2,6,23,.04)"
              }}
            >
              {/* Select equipo (sin auto-selección) */}
              <Select
                value={canalNum ?? ""}
                displayEmpty
                renderValue={(value) =>
                  value === "" ? "Seleccionar cámara…" : `Cámara ${value}`
                }
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v === "" ? null : toChannelNumber(v);
                  onCamField(tanda.id, cam.id, "canal", n);
                  // al cambiar canal, si había estado preseleccionado inválido, lo podés limpiar en el parent si querés
                }}
                input={
                  <OutlinedInput
                    sx={{
                      bgcolor: alpha((metaNow.color || "#9ca3af"), canalNum != null ? 0.16 : 0.06),
                      borderLeft: `4px solid ${metaNow.color || "#9ca3af"}`,
                      borderRadius: 1,
                      "& .MuiOutlinedInput-notchedOutline": { border: 0 },
                      "& .MuiSelect-select": { py: 0.75, color: canalNum == null ? "text.secondary" : "inherit" },
                    }}
                  />
                }
                MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
              >
                <MenuItem value="">
                  <ListItemText primary="Seleccionar cámara…" />
                </MenuItem>

                {CANALES_OPCIONES.map((opt) => {
                  const n = toChannelNumber(opt);
                  const eff =
                    tanda.camaras.find((x) => Number(x.canal) === n)?.estado ??
                    historicos[n] ?? null;
                  const m = estadoMeta(eff);
                  const repetido = (usadosPorOtro[n] || 0) > 1 && n !== canalNum;

                  return (
                    <MenuItem
                      key={n}
                      value={n}
                      sx={{
                        borderLeft:`4px solid ${m.color}`,
                        backgroundColor: alpha(m.color, 0.06),
                        "&.Mui-selected": { backgroundColor: alpha(m.color, 0.18) },
                        "&:hover": { backgroundColor: alpha(m.color, 0.12) },
                        opacity: repetido ? 0.6 : 1
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 26 }}>
                        <RadioButtonUnchecked fontSize="small" sx={{ color: m.color }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Cámara ${n}`}
                        secondary={m.label}
                        primaryTypographyProps={{ fontWeight: 600 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                    </MenuItem>
                  );
                })}
              </Select>

              {/* Estado chips (deshabilitados hasta elegir canal) */}
              <Stack direction="row" spacing={1} sx={{ flexWrap:"wrap" }}>
                {ESTADOS.map((opt) => (
                  <Chip
                    key={opt.key}
                    size="small"
                    label={opt.label}
                    onClick={() => canalNum != null && onCamState(tanda.id, cam.id, opt.key)}
                    variant={cam.estado === opt.key ? "filled" : "outlined"}
                    disabled={canalNum == null}
                    sx={{
                      borderColor: opt.color,
                      bgcolor: cam.estado === opt.key ? alpha(opt.color, .18) : "transparent",
                      color: cam.estado === opt.key ? "inherit" : opt.color,
                      opacity: canalNum == null ? 0.5 : 1,
                      fontWeight: 600
                    }}
                  />
                ))}
              </Stack>

              {/* Nota (bloqueada hasta elegir canal) */}
              <TextField
                placeholder="Detalle (opcional)"
                value={cam.nota || ""}
                onChange={(e) => onCamField(tanda.id, cam.id, "nota", e.target.value)}
                fullWidth size="small"
                disabled={canalNum == null}
              />

              {/* Acciones */}
              <Tooltip title="Quitar">
                <IconButton onClick={() => onCamRemove(tanda.id, cam.id)} size="small">
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
