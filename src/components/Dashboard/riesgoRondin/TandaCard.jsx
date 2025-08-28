import {
  Card, CardHeader, CardContent, Stack, Tooltip, IconButton, Button,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import CameraTable from "./CameraTable";
import ChecklistPanel from "./ChecklistPanel";
import NovedadesCard from "./NovedadesCard";
import useCamarasHistoricas from "./useCamarasHistoricas";
import { norm } from "./helpers";

import { db } from "../../../services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function TandaCard({
  tanda,
  historicos: historicosProp,
  onSetCliente,
  onAddCam,
  onRemoveTanda,
  onCamField,
  onCamRemove,
  onCamState,
  setChecklistVal,
  resetFallan,
  toggleFallan,
  setResumen,
  clientesCat = [],
  rondaId, // 👈 NUEVO: lo pasás desde el padre (FormRiesgoRondin)
}) {
  if (!tanda) return null;

  const clienteKey = norm(tanda.cliente || "");
  const historicosHook = useCamarasHistoricas(clienteKey);
  const historicos = historicosProp ?? historicosHook;

  // 👇 callback que usa el NovedadesCard para cambios rápidos de estado
  const handleEstadoChanged = async (canal, next) => {
    // 1) Si la cámara existe en la tanda, actualizamos via onCamState (UI inmediata + persistencia live que ya hacés ahí)
    const row = tanda.camaras.find((c) => Number(c.canal) === Number(canal));
    if (row) {
      onCamState?.(tanda.id, row.id, next);
      return;
    }

    // 2) Si NO existe en la tanda, persistimos directo en el índice para no perder el cambio
    if (clienteKey && canal) {
      try {
        await setDoc(
          doc(db, "rondin-index", clienteKey, "camaras", String(canal)),
          { estado: next, updatedAt: serverTimestamp(), rondaId: rondaId || "desde-novedades" },
          { merge: true }
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("fallback quick set failed:", e);
      }
    }
  };

  return (
    <Card id={tanda.id} sx={{ overflow: "hidden" }}>
      <CardHeader
        titleTypographyProps={{ variant: "h6" }}
        subheaderTypographyProps={{ sx: { mt: .5, color: "text.secondary" } }}
        title={tanda.cliente || "Seleccioná cliente"}
        subheader={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={tanda.cliente}
                label="Cliente"
                onChange={(e) => onSetCliente(tanda.id, e.target.value)}
              >
                {clientesCat.map((c) => (
                  <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Chip size="small" label={`${tanda.camaras.length} cámaras`} variant="outlined" />
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Add />} onClick={() => onAddCam(tanda.id)}>
              Agregar cámara
            </Button>
            <Tooltip title="Eliminar tanda">
              <span>
                <IconButton onClick={() => onRemoveTanda?.(tanda.id)} disabled={!onRemoveTanda}>
                  <Delete />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        }
        sx={{ pb: 0.5 }}
      />

      <CardContent sx={{ pt: 1.5 }}>
        <Grid container spacing={2.25}>
          {/* Izquierda: tabla de cámaras */}
          <Grid item xs={12} md={7}>
            <CameraTable
              tanda={tanda}
              historicos={historicos}
              onCamField={onCamField}
              onCamRemove={onCamRemove}
              onCamState={onCamState}
            />
          </Grid>

          {/* Derecha: novedades + checklist */}
          <Grid item xs={12} md={5}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
              <NovedadesCard
  clienteKey={clienteKey}
  camaras={tanda.camaras}          // ⬅️ clave para ver la nota en vivo
  historicos={historicos}
  limit={8}
  rondaId={rondaId}
  onEstadoChanged={(canal, next) => {
    const cam = (tanda.camaras || []).find(c => Number(c.canal) === Number(canal));
    if (cam && onCamState) onCamState(tanda.id, cam.id, next);
  }}
/>



              </Grid>
              <Grid item xs={12}>
                <ChecklistPanel
                  t={tanda}
                  setChecklistVal={setChecklistVal}
                  resetFallan={resetFallan}
                  toggleFallan={toggleFallan}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <TextField
          label="Resumen (opcional)"
          fullWidth multiline minRows={2}
          value={tanda.resumen}
          onChange={(e) => setResumen(tanda.id, e.target.value)}
          sx={{ mt: 2 }}
        />
      </CardContent>
    </Card>
  );
}
