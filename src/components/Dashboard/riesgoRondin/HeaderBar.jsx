import { Box, Typography } from "@mui/material";
import StatChip from "./StatChip";
import { AccessTime } from "@mui/icons-material";

export default function HeaderBar({ camarasCompletadas, totalCamaras, minReq, elapsed }) {
  const ok = camarasCompletadas >= minReq;
  return (
    <Box className="riesgo-header">
      <div className="riesgo-header__left">
        <Typography variant="h5" className="riesgo-title">RONDÍN ALTO RIESGO (por tandas)</Typography>
        <StatChip
          label={`Misión: ${camarasCompletadas}/${Math.max(totalCamaras, minReq)} cámaras (mín. ${minReq})`}
          tone={ok ? "success" : "info"}
          filled={ok}
        />
        <StatChip icon={<AccessTime />} label={`Tiempo: ${elapsed}`} className="chip-tiempo" />
      </div>
      <div className="riesgo-header__right">
        <StatChip icon={<AccessTime />} label={elapsed} />
      </div>
    </Box>
  );
}
