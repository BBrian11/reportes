// src/components/Rondin/HeaderBar.jsx
import React from "react";
import { Box, Stack, Typography, Chip, LinearProgress, Divider } from "@mui/material";
import { AccessTime as AccessTimeIcon, CameraAltOutlined as CameraIcon } from "@mui/icons-material";

export default function HeaderBar({
  camarasCompletadas = 0,
  totalCamaras = 0,
  elapsed = "00:00:00",
}) {
  const done = Number(camarasCompletadas) || 0;
  const objetivo = Number(totalCamaras) || 0;
  const pct = objetivo > 0 ? Math.min(100, Math.round((done / objetivo) * 100)) : 0;

  return (
    <Box
      sx={{
        borderRadius: 2,
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.25, sm: 1.5 },
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#fff"),
        border: (t) => (t.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f0f0f0"),
      }}
    >
      {/* fila principal */}
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} spacing={1.25}>
        <Stack direction="row" alignItems="center" spacing={1.25} flex={1} minWidth={0}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            RONDÍN ALTO RIESGO
          </Typography>

          <Chip
            size="small"
            icon={<CameraIcon sx={{ fontSize: 18 }} />}
            label={`Cáms ${done}/${objetivo}`}
            sx={{ fontWeight: 600, "& .MuiChip-label": { px: 0.5 } }}
            variant="outlined"
          />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            size="small"
            icon={<AccessTimeIcon sx={{ fontSize: 18 }} />}
            label={elapsed || "00:00:00"}
            sx={{ fontWeight: 700, "& .MuiChip-label": { px: 0.5 } }}
            variant="outlined"
          />
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.25 }} />

      {/* progreso visual (informativo) */}
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.25}>
        <Typography variant="body2" sx={{ minWidth: 112, color: "text.secondary", fontWeight: 600 }}>
          Progreso: {pct}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 999,
            "& .MuiLinearProgress-bar": { borderRadius: 999 },
          }}
        />
        <Typography variant="caption" sx={{ minWidth: 120, textAlign: { xs: "left", sm: "right" }, color: "text.secondary", fontWeight: 600 }}>
          {done}/{objetivo} Objetivos
        </Typography>
      </Stack>
    </Box>
  );
}
