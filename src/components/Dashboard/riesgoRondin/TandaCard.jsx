import {
  Card, CardHeader, CardContent, Stack, Tooltip, IconButton, Button,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import CameraTable from "./CameraTable";
import ChecklistPanel from "./ChecklistPanel";
import useCamarasHistoricas from "./useCamarasHistoricas";
import { norm } from "./helpers";

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
}) {
  if (!tanda) return null;

  const clienteKey = norm(tanda.cliente || "");
  const historicosHook = useCamarasHistoricas(clienteKey);
  const historicos = historicosProp ?? historicosHook;

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
          <Grid item xs={12} md={7}>
            <CameraTable
              tanda={tanda}
              historicos={historicos}
              onCamField={onCamField}
              onCamRemove={onCamRemove}
              onCamState={onCamState}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <ChecklistPanel
              t={tanda}
              setChecklistVal={setChecklistVal}
              resetFallan={resetFallan}
              toggleFallan={toggleFallan}
            />
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
