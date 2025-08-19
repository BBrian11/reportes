import React, { useMemo } from "react";
import {
  Box, IconButton, Select, MenuItem, TextField, Tooltip, Chip, Stack, ListItemIcon, ListItemText
} from "@mui/material";
import { Delete, RadioButtonUnchecked } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { CANALES_OPCIONES, ESTADOS, estadoMeta } from "./helpers";

export default function CameraTable({ tanda, onCamField, onCamRemove, onCamState }) {
  // Mapa: canal -> estado actual (ok/medio/grave/null)
  const canalEstado = useMemo(() => {
    const m = {};
    tanda.camaras.forEach(c => { m[c.canal] = c.estado ?? null; });
    return m;
  }, [tanda.camaras]);

  // Canales usados por otras filas (para aviso visual)
  const usadosPorOtro = useMemo(() => {
    const count = tanda.camaras.reduce((acc, c) => {
      acc[c.canal] = (acc[c.canal] || 0) + 1;
      return acc;
    }, {});
    return count; // si >1, está repetido
  }, [tanda.camaras]);

  return (
    <Box sx={{
      border: "1px solid rgba(2,6,23,.06)",
      borderRadius: 2,
      overflow: "hidden"
    }}>
      {/* Head */}
      <Box sx={{
        display:"grid",
        gridTemplateColumns: "minmax(120px,1fr) 1fr 1.3fr auto",
        gap: 1,
        px: 1.5, py: 1,
        bgcolor: "grey.100",
        borderBottom: "1px solid rgba(2,6,23,.06)",
        fontSize: 13, fontWeight: 600, color: "text.secondary"
      }}>
        <span>Equipo</span>
        <span>Estado</span>
        <span>Nota</span>
        <span></span>
      </Box>

      {/* Rows */}
      <Box>
        {tanda.camaras.map((cam, idx) => {
          const metaNow = estadoMeta(cam.estado); // color/label del estado ACTUAL

          return (
            <Box
              key={cam.id}
              sx={{
                display:"grid",
                gridTemplateColumns: "minmax(120px,1fr) 1fr 1.3fr auto",
                gap: 1,
                px: 1.5, py: 1,
                alignItems: "center",
                ...(idx % 2 === 1 && { bgcolor: "grey.50" }),
                borderTop: "1px solid rgba(2,6,23,.04)"
              }}
            >
              {/* Select equipo — coloreado por estado ACTUAL */}
              <Select
                value={cam.canal}
                onChange={(e) => onCamField(tanda.id, cam.id, "canal", e.target.value)}
                renderValue={(v) => {
                  const m = estadoMeta(canalEstado[v]);
                  return (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8, height: 8, borderRadius: 999,
                          background: m.color
                        }}
                      />
                      <span>{`Cámara ${v}`}</span>
                      <Chip
                        size="small"
                        label={m.label}
                        sx={{
                          ml: .5,
                          height: 22,
                          borderRadius: 999,
                          bgcolor: alpha(m.color, .15),
                          border: `1px solid ${alpha(m.color, .4)}`,
                          color: "inherit",
                          fontWeight: 600
                        }}
                      />
                    </Stack>
                  );
                }}
                sx={{
                  "& .MuiSelect-select": {
                    backgroundColor: alpha(metaNow.color, 0.14),
                    borderLeft: `4px solid ${metaNow.color}`,
                    borderRadius: 1,
                    py: 0.75
                  }
                }}
                MenuProps={{
                  PaperProps: { sx: { maxHeight: 400 } }
                }}
              >
                {CANALES_OPCIONES.map((n) => {
                  const est = canalEstado[n] ?? null;
                  const m = estadoMeta(est);
                  const repetido = (usadosPorOtro[n] || 0) > 0 && n !== cam.canal;
                  return (
                    <MenuItem
                      key={n}
                      value={n}
                      sx={{
                        borderLeft: `4px solid ${m.color}`,
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

              {/* Estado como chips/pills clicables */}
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {ESTADOS.map((opt) => (
                  <Chip
                    key={opt.key}
                    size="small"
                    label={opt.label}
                    onClick={() => onCamState(tanda.id, cam.id, opt.key)}
                    variant={cam.estado === opt.key ? "filled" : "outlined"}
                    sx={{
                      borderColor: opt.color,
                      bgcolor: cam.estado === opt.key ? alpha(opt.color, .18) : "transparent",
                      color: cam.estado === opt.key ? "inherit" : opt.color,
                      fontWeight: 600
                    }}
                  />
                ))}
              </Stack>

              {/* Nota */}
              <TextField
                placeholder="Detalle (opcional)"
                value={cam.nota}
                onChange={(e) => onCamField(tanda.id, cam.id, "nota", e.target.value)}
                fullWidth
                size="small"
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
