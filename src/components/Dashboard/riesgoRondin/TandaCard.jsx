// TandaCard.jsx
import {
  Card, CardHeader, CardContent, Stack, Tooltip, IconButton, Button,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip, Divider
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import CameraTable from "./CameraTable";
import ChecklistPanel from "./ChecklistPanel";

export default function TandaCard({
  t, clientesCat,
  onSetCliente, onAddCam, onRemoveTanda,
  onCamField, onCamRemove, onCamState,
  setChecklistVal, resetFallan, toggleFallan,
  setResumen
}) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <CardHeader
        titleTypographyProps={{ variant: "h6" }}
        subheaderTypographyProps={{ sx: { mt: .5, color: "text.secondary" } }}
        title={t.cliente || "Seleccioná cliente"}
        subheader={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={t.cliente}
                label="Cliente"
                onChange={(e) => onSetCliente(t.id, e.target.value)}
              >
                {clientesCat.map((c) => (
                  <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Chip size="small" label={`${t.camaras.length} cámaras`} variant="outlined" />
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Add />} onClick={() => onAddCam(t.id)}>
              Agregar cámara
            </Button>
            <Tooltip title="Eliminar tanda">
              <span>
                <IconButton onClick={() => onRemoveTanda(t.id)}>
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
          {/* Tabla */}
          <Grid item xs={12} md={7}>
            <CameraTable
              tanda={t}
              onCamField={onCamField}
              onCamRemove={onCamRemove}
              onCamState={onCamState}
            />
          </Grid>

          {/* Checklist */}
          <Grid item xs={12} md={5}>
            <ChecklistPanel
              t={t}
              setChecklistVal={setChecklistVal}
              resetFallan={resetFallan}
              toggleFallan={toggleFallan}
            />
          </Grid>
        </Grid>

        <TextField
          label="Resumen (opcional)"
          fullWidth multiline minRows={2}
          value={t.resumen}
          onChange={(e) => setResumen(t.id, e.target.value)}
          sx={{ mt: 2 }}
        />
      </CardContent>
    </Card>
  );
}
