import { Stack, Typography, LinearProgress } from "@mui/material";

export default function ProgressRows({ overall, cameras }) {
  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" className="muted">Progreso global</Typography>
        <LinearProgress variant="determinate" value={overall} className="progress-bar-sm" />
        <Typography variant="caption">{overall}%</Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" className="muted">Cámaras</Typography>
        <LinearProgress variant="determinate" value={cameras} className="progress-bar-xs" />
        <Typography variant="caption">{cameras}%</Typography>
      </Stack>
    </>
  );
}
