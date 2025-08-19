// utils/StatChip.jsx
import React from "react";
import { Chip, useTheme } from "@mui/material";

export default function StatChip({
  label,
  tone = "neutral", // 'success' | 'warning' | 'info' | 'neutral'
  filled = false,
  sx,
  ...rest
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const map = {
    success: {
      bg: isDark ? theme.palette.success.dark : theme.palette.success.light,
      fg: theme.palette.success.contrastText,
      bd: theme.palette.success.main,
    },
    warning: {
      bg: isDark ? theme.palette.warning.dark : theme.palette.warning.light,
      fg: theme.palette.warning.contrastText,
      bd: theme.palette.warning.main,
    },
    info: {
      bg: isDark ? theme.palette.info.dark : theme.palette.info.light,
      fg: theme.palette.info.contrastText,
      bd: theme.palette.info.main,
    },
    neutral: {
      bg: isDark ? theme.palette.grey[800] : theme.palette.grey[200],
      fg: isDark ? theme.palette.grey[100] : theme.palette.grey[900],
      bd: isDark ? theme.palette.grey[600] : theme.palette.grey[400],
    },
  };

  const c = map[tone] || map.neutral;

  return (
    <Chip
      label={label}
      variant={filled ? "filled" : "outlined"}
      sx={{
        ...(filled
          ? { bgcolor: c.bg, color: c.fg, borderColor: c.bg }
          : { color: c.fg, borderColor: c.bd, bgcolor: "transparent" }),
        fontWeight: 600,
        "& .MuiChip-label": { px: 1.25 },
        ...sx,
      }}
      {...rest}
    />
  );
}
