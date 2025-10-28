// src/components/Dashboard/riesgoRondin/TandaCard.jsx
import React, { useMemo } from "react";
import {
  Card, CardHeader, CardContent, Stack, Tooltip, IconButton, Button,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip, Paper, Typography
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import CameraTable from "./CameraTable";
import NovedadesCard from "./NovedadesCard";
import useCamarasHistoricas from "./useCamarasHistoricas";
import { norm } from "./helpers";

import { db } from "../../../services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

function num(val, fallback = 1) {
  if (val == null) return Number(fallback);
  if (typeof val === "object") {
    const v = val.value ?? val.id ?? val.canal ?? fallback;
    return Number(v);
  }
  return Number(val);
}

export default function TandaCard({
  tanda,
  historicos: historicosProp,
  onSetCliente,
  onAddCam,
  onRemoveTanda,
  onCamField,
  onCamRemove,
  onCamState,
  setResumen,
  clientesCat = [],
  rondaId,
  onAccionConfirm,
}) {
  if (!tanda) return null;

  const clienteKey = useMemo(() => norm(tanda.cliente || ""), [tanda.cliente]);
  const historicosHook = useCamarasHistoricas(clienteKey);
  const historicos = historicosProp ?? historicosHook;

  const handleEstadoChanged = async (canal, next) => {
    const row = (tanda.camaras || []).find((c) => num(c.canal) === num(canal));
    if (row && onCamState) {
      onCamState(tanda.id, row.id, next);
      return;
    }

    if (clienteKey && canal) {
      try {
        await setDoc(
          doc(db, "rondin-index", clienteKey, "camaras", String(num(canal))),
          { estado: next, updatedAt: serverTimestamp(), rondaId: rondaId || "desde-novedades" },
          { merge: true }
        );
      } catch (e) {
        console.error("fallback quick set failed:", e);
      }
    }
  };

  const cams = Array.isArray(tanda.camaras) ? tanda.camaras : [];
  const hasCams = cams.length > 0;
  const camsCount = cams.length;

  return (
    <Card id={tanda.id} sx={{ overflow: "hidden" }}>
      <CardHeader
        titleTypographyProps={{ variant: "h6" }}
        subheaderTypographyProps={{ sx: { mt: 0.5, color: "text.secondary" } }}
        title={tanda.cliente || "Seleccioná cliente"}
        subheader={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={tanda.cliente || ""}
                label="Cliente"
                onChange={(e) => onSetCliente?.(tanda.id, e.target.value)}
              >
                {clientesCat.map((c) => (
                  <MenuItem key={c.id} value={c.nombre}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Chip size="small" label={`${camsCount} cámaras`} variant="outlined" />
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => onAddCam?.(tanda.id)}
            >
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
          {/* Izquierda: tabla de cámaras (solo si hay) */}
          <Grid item xs={12} md={7}>
            {hasCams ? (
              <CameraTable
                tanda={tanda}
                historicos={historicos}
                onCamField={(tId, camId, key, value) => {
                  const val = key === "canal" ? num(value) : value;
                  onCamField?.(tId, camId, key, val);
                }}
                onCamRemove={onCamRemove}
                onCamState={onCamState}
              />
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Sin cámaras cargadas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    El operador debe seleccionar manualmente si hay alguna cámara para reportar.
                  </Typography>
                </Stack>
               
              </Paper>
            )}
          </Grid>

          {/* Derecha: novedades (funciona igual, aunque no haya cámaras) */}
          <Grid item xs={12} md={5}>
            <NovedadesCard
              clienteKey={clienteKey}
              camaras={cams}
              historicos={historicos}
              limit={8}
              rondaId={rondaId}
              onEstadoChanged={handleEstadoChanged}
            />
          </Grid>
        </Grid>

        <TextField
          label="Resumen (opcional)"
          fullWidth
          multiline
          minRows={2}
          value={tanda.resumen || ""}
          onChange={(e) => setResumen?.(tanda.id, e.target.value)}
          sx={{ mt: 2 }}
        />
      </CardContent>
    </Card>
  );
}
