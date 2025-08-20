import React, { useMemo } from "react";
import {
  Box, IconButton, Select, MenuItem, TextField, Tooltip, Chip, Stack,
  ListItemIcon, ListItemText, OutlinedInput
} from "@mui/material";
import { Delete, RadioButtonUnchecked } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { CANALES_OPCIONES, ESTADOS, estadoMeta } from "./helpers";

export default function CameraTable({ tanda, historicos = {}, onCamField, onCamRemove, onCamState }) {
  if (!tanda || !Array.isArray(tanda.camaras)) return null;

  // para marcar canales repetidos
  const usadosPorOtro = useMemo(() => {
    const count = {};
    for (const c of tanda.camaras) {
      const key = Number(c.canal);
      count[key] = (count[key] || 0) + 1;
    }
    return count;
  }, [tanda.camaras]);

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
          const canalNum = Number(cam.canal);
          // estado efectivo: local si existe; si no, lo último de Firestore (historicos)
          const estadoNow = cam.estado ?? historicos[canalNum] ?? null;
          const metaNow   = estadoMeta(estadoNow);

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
              {/* Select equipo — coloreado por estado efectivo */}
              <Select
              key={`${cam.id}-${estadoNow || 'null'}`}
                value={canalNum}
                onChange={(e) => onCamField(tanda.id, cam.id, "canal", Number(e.target.value))}
                input={
                  <OutlinedInput
                    sx={{
                      bgcolor: alpha(metaNow.color || "#9ca3af", 0.16),
                      borderLeft: `4px solid ${metaNow.color || "#9ca3af"}`,
                      borderRadius: 1,
                      "& .MuiOutlinedInput-notchedOutline": { border: 0 },
                      "& .MuiSelect-select": { py: 0.75 },
                    }}
                  />
                }
                renderValue={(v) => {
                  const vNum = Number(v);
                  const local = tanda.camaras.find(x => Number(x.canal) === vNum)?.estado ?? null;
                  const estEff = local ?? historicos[vNum] ?? null;
                  const m = estadoMeta(estEff);
                  return (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                      <span style={{ display:"inline-block", width:8, height:8, borderRadius:999, background:m.color }} />
                      <span>{`Cámara ${vNum}`}</span>
                      <Chip
                        size="small"
                        label={m.label}
                        sx={{
                          ml:.5, height:22, borderRadius:999,
                          bgcolor: alpha(m.color, .15),
                          border:`1px solid ${alpha(m.color, .4)}`,
                          color:"inherit", fontWeight:600
                        }}
                      />
                    </Stack>
                  );
                }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
              >
                {CANALES_OPCIONES.map((n) => {
                  const eff = (tanda.camaras.find(x => Number(x.canal) === n)?.estado) ?? historicos[n] ?? null;
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

              {/* Estado chips */}
              <Stack direction="row" spacing={1} sx={{ flexWrap:"wrap" }}>
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
                value={cam.nota || ""}
                onChange={(e) => onCamField(tanda.id, cam.id, "nota", e.target.value)}
                fullWidth size="small"
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
