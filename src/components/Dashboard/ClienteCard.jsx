import React, { useMemo } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { FaTimes, FaCopy, FaTrash, FaEdit } from "react-icons/fa";

/* Paleta y colores coherentes con NovedadesWall */
const PALETTE = {
  bg: "#0A0F1C", panel: "#0D1628", header: "#0B1324", border: "#1E2A44",
  text: "#E8EEF7", subtext: "#A9BEDF", brand: "#2A9DF4",
  critical: "#FF3B30", criticalBg: "#2A1113", criticalFg: "#FFE5E7",
  warning: "#FFC300", warningBg: "#2A2208", warningFg: "#FFF4D5",
  ok: "#00D97E", okBg: "#0E2318", okFg: "#D4FFE9",
  info: "#3B82F6", infoBg: "#0D1A2E", infoFg: "#DCEBFF",
  offline: "#FF3B30", offlineBg: "#2A1113", offlineFg: "#FFE5E7",
};

const PILL_COLORS = {
  ok:       { bg: PALETTE.okBg, fg: PALETTE.okFg, bd: PALETTE.ok,       name: "OK" },
  info:     { bg: PALETTE.infoBg, fg: PALETTE.infoFg, bd: PALETTE.info, name: "INFO" },
  warning:  { bg: PALETTE.warningBg, fg: PALETTE.warningFg, bd: PALETTE.warning, name: "WARNING" },
  critical: { bg: PALETTE.criticalBg, fg: PALETTE.criticalFg, bd: PALETTE.critical, name: "CRITICAL" },
  offline:  { bg: PALETTE.offlineBg, fg: PALETTE.offlineFg, bd: PALETTE.offline,   name: "OFFLINE" },
};

/* Estilo global del pulso (sólo se inyecta una vez) */
let injectedPulseCSS = false;
function ensurePulseCSS() {
  if (injectedPulseCSS) return;
  const style = document.createElement("style");
  style.innerHTML = `
  @keyframes pulseBorder {
    0%   { box-shadow: 0 0 0 0 rgba(255, 59, 48, .50); }
    70%  { box-shadow: 0 0 0 12px rgba(255, 59, 48, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
  }`;
  document.head.appendChild(style);
  injectedPulseCSS = true;
}

/**
 * ClienteCard
 * Props:
 * - id, sev ("critical" | "offline" | "warning" | "info" | "ok")
 * - text, at (Date | string)
 * - onClick, onClose(id), onDuplicate(id), onDelete(id)
 * - scale: 1 (comfy) | 0.85 (cozy) | 0.75 (compact) | 0.65 (ultra)
 */
export default function ClienteCard({
  id,
  sev = "info",
  text = "",
  at = null,
  onClick,
  onClose,
  onDuplicate,
  onDelete,
  scale = 1,
}) {
  ensurePulseCSS();

  const meta = PILL_COLORS[sev] || PILL_COLORS.info;

  const atDate = useMemo(() => {
    if (!at) return null;
    try {
      return at instanceof Date ? at : new Date(at);
    } catch {
      return null;
    }
  }, [at]);

  const ageMin = useMemo(() => {
    if (!atDate) return 0;
    const diff = Date.now() - atDate.getTime();
    return Math.max(0, Math.floor(diff / 60000));
  }, [atDate]);

  const isAging = (sev === "critical" || sev === "offline") && ageMin >= 15;

  const timeLabel = atDate ? atDate.toLocaleString("es-AR") : "";

  return (
    <Box
      onClick={(e) => {
        const t = e.target;
        if (t && typeof t.closest === "function" && t.closest('[data-role="close"]')) return;
        onClick && onClick(e);
      }}
      sx={{
        p: 1.25 * scale,
        pr: 5 * scale,
        borderRadius: 2,
        cursor: "pointer",
        border: `1px solid ${meta.bd}`,
        bgcolor: meta.bg,
        color: meta.fg,
        boxShadow: isAging
          ? "0 4px 14px rgba(0,0,0,.35), 0 0 0 0 rgba(255,59,48,.5)"
          : "0 4px 14px rgba(0,0,0,.35)",
        position: "relative",
        minHeight: 96 * scale,
        transition: "transform .06s ease",
        "&:active": { transform: "scale(.995)" },
        animation: isAging ? "pulseBorder 2.5s ease-out infinite" : "none",
      }}
      title="Ver / editar"
    >
      <Typography
        sx={{
          fontWeight: 900,
          mb: 0.5,
          fontSize: 12 * scale,
          opacity: 0.9,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        {String(sev).toUpperCase()} · {timeLabel}
        {ageMin >= 1 && (
          <span style={{ marginLeft: 6, opacity: 0.9 }}>{ageMin}m</span>
        )}
        <FaEdit style={{ opacity: 0.9 }} />
      </Typography>

      <Typography
        sx={{
          fontWeight: 800,
          lineHeight: 1.25,
          fontSize: 18 * scale,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text || "—"}
      </Typography>

      {/* Cerrar (ocultar local) */}
      <IconButton
        data-role="close"
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onClose && onClose(id);
        }}
        sx={{
          position: "absolute",
          right: 6,
          top: 6,
          color: meta.fg,
          opacity: 0.9,
          transform: `scale(${scale})`,
        }}
        title="Ocultar en esta pantalla"
      >
        <FaTimes />
      </IconButton>

      {/* Acciones rápidas */}
      <Box
        sx={{
          position: "absolute",
          right: 6,
          bottom: 6,
          display: "flex",
          gap: 0.5,
          opacity: 0.85,
          transform: `scale(${scale})`,
          transformOrigin: "right bottom",
        }}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate && onDuplicate(id);
          }}
          title="Duplicar"
          sx={{ color: meta.fg }}
        >
          <FaCopy />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete && onDelete(id);
          }}
          title="Eliminar"
          sx={{ color: meta.fg }}
        >
          <FaTrash />
        </IconButton>
      </Box>
    </Box>
  );
}
