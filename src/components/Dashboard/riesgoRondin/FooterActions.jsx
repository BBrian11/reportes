// src/components/Rondin/FooterActions.jsx
import { Stack, Chip, Button, Tooltip, IconButton } from "@mui/material";
import { PlayArrow, Pause, Stop, RestartAlt, AccessTime, DoneAll } from "@mui/icons-material";
import { motion } from "framer-motion";

/**
 * FooterActions
 * - No valida mínimos de cámaras (ni lee nada relacionado).
 * - Habilita/deshabilita solo por estado de la ronda.
 *   Estados esperados: "lista" | "enCurso" | "pausada" | "finalizada"
 */
export default function FooterActions({
  totalCamaras = 0,
  elapsed = "00:00:00",
  estadoRonda = "lista",
  onIniciar,
  onPausar,
  onReanudar,
  onFinalizar,
  onReset,
}) {
  const isLista = estadoRonda === "lista";
  const isEnCurso = estadoRonda === "enCurso";
  const isPausada = estadoRonda === "pausada";
  const isFinalizada = estadoRonda === "finalizada";

  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      <Chip icon={<DoneAll />} label={`${totalCamaras} cámaras`} />
      <Chip icon={<AccessTime />} label={elapsed} />
      <div style={{ flex: 1 }} />

      {/* Iniciar */}
      {isLista && (
        <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrow />}
            onClick={onIniciar}
          >
            Iniciar
          </Button>
        </motion.div>
      )}

      {/* Pausar */}
      {isEnCurso && (
        <Button
          variant="contained"
          color="warning"
          startIcon={<Pause />}
          onClick={onPausar}
        >
          Pausar
        </Button>
      )}

      {/* Reanudar */}
      {isPausada && (
        <Button
          variant="contained"
          color="success"
          startIcon={<PlayArrow />}
          onClick={onReanudar}
        >
          Reanudar
        </Button>
      )}

      {/* Finalizar (sin mínimos de cámaras) */}
      {(isEnCurso || isPausada) && (
        <motion.div whileTap={{ scale: 0.96 }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={onFinalizar}
          >
            Finalizar
          </Button>
        </motion.div>
      )}

      {/* 👉 Si preferís que "Finalizar" esté SIEMPRE visible y habilitado, reemplazá el bloque de arriba por este:
      <motion.div whileTap={{ scale: 0.96 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<Stop />}
          onClick={onFinalizar}
        >
          Finalizar
        </Button>
      </motion.div>
      */}

      {/* Reset visual */}
      <Tooltip title="Reset visual (no borra en Firestore)">
        <span>
          <IconButton onClick={onReset}>
            <RestartAlt />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
