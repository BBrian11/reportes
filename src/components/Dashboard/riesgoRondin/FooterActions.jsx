import { Stack, Chip, Button, Tooltip, IconButton } from "@mui/material";
import { PlayArrow, Pause, Stop, RestartAlt, AccessTime, DoneAll } from "@mui/icons-material";
import { motion } from "framer-motion";

export default function FooterActions({
  totalCamaras, elapsed, estadoRonda,
  onIniciar, onPausar, onReanudar, onFinalizar, onReset
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      <Chip icon={<DoneAll />} label={`${totalCamaras} cámaras`} />
      <Chip icon={<AccessTime />} label={elapsed} />
      <div className="spacer" />

      {estadoRonda === "lista" && (
        <motion.div whileTap={{ scale: .96 }} whileHover={{ scale: 1.02 }}>
          <Button variant="contained" color="primary" startIcon={<PlayArrow />} onClick={onIniciar}>
            Iniciar
          </Button>
        </motion.div>
      )}

      {estadoRonda === "enCurso" && (
        <Button variant="contained" color="warning" startIcon={<Pause />} onClick={onPausar}>
          Pausar
        </Button>
      )}

      {estadoRonda === "pausada" && (
        <Button variant="contained" color="success" startIcon={<PlayArrow />} onClick={onReanudar}>
          Reanudar
        </Button>
      )}

      {(estadoRonda === "enCurso" || estadoRonda === "pausada") && (
        <Button variant="contained" color="error" startIcon={<Stop />} onClick={onFinalizar}>
          Finalizar
        </Button>
      )}

      <Tooltip title="Reset visual (no borra en Firestore)">
        <span>
          <IconButton onClick={onReset} className="btn-reset">
            <RestartAlt />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
