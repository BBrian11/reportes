// src/components/Rondin/HeaderBar.jsx
import React from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  LinearProgress,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  CameraAltOutlined as CameraIcon,
  CheckCircleOutline as CheckIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";

export default function HeaderBar({ camarasCompletadas, totalCamaras, minReq, elapsed }) {
  const objetivo = Math.max(totalCamaras ?? 0, minReq ?? 0);
  const done = Number(camarasCompletadas ?? 0);
  const pct = objetivo > 0 ? Math.min(100, Math.round((done / objetivo) * 100)) : 0;
  const ok = done >= (minReq ?? 0);

  return (
    <Box
      sx={{
        borderRadius: 2,
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.25, sm: 1.5 },
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#fff"),
        backgroundImage:
          (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))"
              : "linear-gradient(180deg, #ffffff, #fafafa)",
        border: (theme) =>
          theme.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f0f0f0",
      }}
    >
      {/* Fila principal */}
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} spacing={1.25}>

        {/* Izquierda: título + objetivo */}
        <Stack direction="row" alignItems="center" spacing={1.25} flex={1} minWidth={0}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: ".2px",
              lineHeight: 1.2,
              mr: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            RONDÍN ALTO RIESGO
          </Typography>

          <Chip
            size="small"
            icon={<CameraIcon sx={{ fontSize: 18 }} />}
            label={`Misión ${done}/${objetivo}`}
            sx={{
              fontWeight: 600,
              "& .MuiChip-label": { px: 0.5 },
            }}
            color={ok ? "success" : "info"}
            variant={ok ? "filled" : "outlined"}
          />

          <Tooltip title="Mínimo requerido para poder finalizar">
            <Chip
              size="small"
              icon={ok ? <CheckIcon sx={{ fontSize: 18 }} /> : <InfoIcon sx={{ fontSize: 18 }} />}
              label={`Mín. ${minReq}`}
              variant="outlined"
              sx={{
                fontWeight: 600,
                "& .MuiChip-label": { px: 0.5 },
              }}
              color={ok ? "success" : "warning"}
            />
          </Tooltip>
        </Stack>

        {/* Derecha: tiempo */}
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

      {/* Separador */}
      <Divider sx={{ my: 1.25 }} />

      {/* Progreso */}
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.25}>
        <Typography
          variant="body2"
          sx={{
            minWidth: 112,
            color: "text.secondary",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Progreso: {pct}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 999,
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{ minWidth: 96, textAlign: { xs: "left", sm: "right" }, color: "text.secondary", fontWeight: 600 }}
        >
          {done}/{objetivo} Clietes
        </Typography>
      </Stack>
    </Box>
  );
}
