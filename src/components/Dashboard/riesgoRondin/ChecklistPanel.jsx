// src/components/Rondin/ChecklistPanel.jsx
import React from "react";
import {
  Grid, Paper, Typography, FormLabel, RadioGroup, FormControlLabel, Radio,
  TextField, Stack, Divider, Chip
} from "@mui/material";
import { toast } from "./swal";

/* ============ Helpers de estilo (alineados a NovedadesCard) ============ */
const Section = ({ title, children, right }) => (
  <Paper
    variant="outlined"
    sx={{ p: 2, borderRadius: 2, height: "100%", display: "flex", flexDirection: "column" }}
  >
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      {right || null}
    </Stack>
    {children}
  </Paper>
);

const SubCard = ({ title, children, color = "divider" }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      mt: 1.5,
      position: "relative",
      bgcolor: "action.hover",
      "&::before": {
        content: '""',
        position: "absolute",
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        borderRadius: 3,
        bgcolor: color,
      },
      pl: 1.75,
    }}
  >
    {title && <Typography variant="subtitle2" gutterBottom>{title}</Typography>}
    {children}
  </Paper>
);

const FieldLabel = ({ children, sx }) => (
  <FormLabel component="legend" sx={{ fontSize: 13, mb: .5, ...sx }}>
    {children}
  </FormLabel>
);

// severidad para pintar sub-card de ALARMA
const getAlarmSeverityColor = (cl) => {
  const grave = cl?.alarmaTamper === true;
  const medio = cl?.alarmaBateriaBaja === true || cl?.alarmaComunicacionOK === false || cl?.alarmaZonasAbiertas === true;
  return grave ? "error.main" : medio ? "warning.main" : "success.main";
};

export default function ChecklistPanel({ t, setChecklistVal, resetFallan }) {
  const cl = t.checklist || {};
  const alarmaEnabled = cl.alarmaMonitoreada === true;
  const alarmColor = alarmaEnabled ? getAlarmSeverityColor(cl) : "divider";

  // chips resumen a la derecha del header de ALARMA
  const rightAlarm = (
    <Stack direction="row" spacing={1}>
      {alarmaEnabled ? (
        <>
          <Chip
            size="small"
            variant="outlined"
            label={cl.alarmaComunicacionOK === false ? "SIN COM." : "COM. OK"}
            color={cl.alarmaComunicacionOK === false ? "warning" : "success"}
          />
          {cl.alarmaBateriaBaja && <Chip size="small" color="warning" label="BATERÍA" />}
          {cl.alarmaZonasAbiertas && <Chip size="small" color="warning" label="ZONAS" />}
          {cl.alarmaTamper && <Chip size="small" color="error" label="TAMPER" />}
        </>
      ) : (
        <Chip size="small" variant="outlined" label="SIN ALARMA" />
      )}
    </Stack>
  );

  return (
    <Grid container spacing={2}>
      {/* ===== CARD 1: ALARMA ===== */}
      <Grid item xs={12} md={6}>
        <Section title="ALARMA" right={rightAlarm}>
          <FieldLabel>¿TIENE ALARMA MONITOREADA?</FieldLabel>
          <RadioGroup
            row
            value={cl.alarmaMonitoreada == null ? "" : String(cl.alarmaMonitoreada)}
            onChange={(e) => {
              const val = e.target.value === "true";
              setChecklistVal(t.id, "alarmaMonitoreada", val);
              if (val) {
                toast.fire({ icon: "info", title: "Completá el checklist de alarma" });
              } else {
                setChecklistVal(t.id, "alarmaComunicacionOK", null);
                setChecklistVal(t.id, "alarmaPanelArmado", null);
                setChecklistVal(t.id, "alarmaZonasAbiertas", null);
                setChecklistVal(t.id, "alarmaBateriaBaja", null);
                setChecklistVal(t.id, "alarmaTamper", null);
                setChecklistVal(t.id, "alarmaUltimoEventoMin", "");
                setChecklistVal(t.id, "alarmaObs", "");
              }
            }}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
          </RadioGroup>

          {alarmaEnabled && (
            <SubCard title="ESTADO DE LA ALARMA" color={alarmColor}>
              <FieldLabel>¿COMUNICACIÓN OK?</FieldLabel>
              <RadioGroup
                row
                value={cl.alarmaComunicacionOK == null ? "" : String(cl.alarmaComunicacionOK)}
                onChange={(e) => setChecklistVal(t.id, "alarmaComunicacionOK", e.target.value === "true")}
              >
                <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
              </RadioGroup>

              <FieldLabel sx={{ mt: 1 }}>¿PANEL ARMADO?</FieldLabel>
              <RadioGroup
                row
                value={cl.alarmaPanelArmado == null ? "" : String(cl.alarmaPanelArmado)}
                onChange={(e) => setChecklistVal(t.id, "alarmaPanelArmado", e.target.value === "true")}
              >
                <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
              </RadioGroup>

              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <FieldLabel>¿ZONAS ABIERTAS?</FieldLabel>
                  <RadioGroup
                    row
                    value={cl.alarmaZonasAbiertas == null ? "" : String(cl.alarmaZonasAbiertas)}
                    onChange={(e) => setChecklistVal(t.id, "alarmaZonasAbiertas", e.target.value === "true")}
                  >
                    <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                    <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
                  </RadioGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FieldLabel>¿BATERÍA BAJA?</FieldLabel>
                  <RadioGroup
                    row
                    value={cl.alarmaBateriaBaja == null ? "" : String(cl.alarmaBateriaBaja)}
                    onChange={(e) => setChecklistVal(t.id, "alarmaBateriaBaja", e.target.value === "true")}
                  >
                    <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                    <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
                  </RadioGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FieldLabel>¿TAMPER / TAPA ABIERTA?</FieldLabel>
                  <RadioGroup
                    row
                    value={cl.alarmaTamper == null ? "" : String(cl.alarmaTamper)}
                    onChange={(e) => setChecklistVal(t.id, "alarmaTamper", e.target.value === "true")}
                  >
                    <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                    <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
                  </RadioGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Último evento (min.)"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={cl.alarmaUltimoEventoMin ?? ""}
                    onChange={(e) => setChecklistVal(t.id, "alarmaUltimoEventoMin", e.target.value)}
                  />
                </Grid>
              </Grid>

              <TextField
                size="small"
                fullWidth
                label="Observaciones alarma"
                multiline
                rows={2}
                sx={{ mt: 1 }}
                value={cl.alarmaObs ?? ""}
                onChange={(e) => setChecklistVal(t.id, "alarmaObs", e.target.value)}
              />
            </SubCard>
          )}
        </Section>
      </Grid>

      {/* ===== CARD 2: SISTEMA (Grabaciones / Energía / Conexión) ===== */}
     {/* ===== CARD 2: SISTEMA (Grabaciones / Energía / Conexión) ===== */}
<Grid item xs={12} md={6}>
  <Section
    title="SISTEMA"
    right={
      <Stack direction="row" spacing={1}>
        {cl.grabacionesOK === true && (
          <Chip size="small" variant="outlined" color="success" label="Grabando" />
        )}
        {cl.grabacionesOK === false && (
          <Chip size="small" color="error" label="No graba" />
        )}
        {cl.equipoOffline === true && <Chip size="small" color="error" label="Offline" />}
        {cl.cortes220v === true && <Chip size="small" color="warning" label="Cortes 220V" />}
      </Stack>
    }
  >
    {/* GRABACIONES */}
    <Typography variant="subtitle2" gutterBottom>GRABACIONES</Typography>
    <FieldLabel>¿El equipo se encuentra grabando?</FieldLabel>
    <RadioGroup
      row
      value={cl.grabacionesOK == null ? "" : String(cl.grabacionesOK)}
      onChange={(e) => {
        const val = e.target.value === "true";
        setChecklistVal(t.id, "grabacionesOK", val);
        if (val) {
          // Limpia campos relacionados si vuelven a OK
          resetFallan && resetFallan(t.id);
          setChecklistVal(t.id, "hddDetectado", null);
        }
      }}
    >
      <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
      <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
    </RadioGroup>

    {/* Si NO graba, pedir estado del disco */}
    {cl.grabacionesOK === false && (
      <SubCard color="warning.main" title="VERIFICACIÓN DE DISCO">
        <FieldLabel>¿APARECE EL DISCO (HDD)?</FieldLabel>
        <RadioGroup
          row
          value={cl.hddDetectado == null ? "" : String(cl.hddDetectado)}
          onChange={(e) => setChecklistVal(t.id, "hddDetectado", e.target.value === "true")}
        >
          <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
          <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
        </RadioGroup>
      </SubCard>
    )}

    <Divider sx={{ my: 1.5 }} />

    {/* ENERGÍA */}
    <Typography variant="subtitle2" gutterBottom>ENERGÍA</Typography>
    <FieldLabel>¿TIENE CORTES 220V?</FieldLabel>
    <RadioGroup
      row
      value={cl.cortes220v == null ? "" : String(cl.cortes220v)}
      onChange={(e) => setChecklistVal(t.id, "cortes220v", e.target.value === "true")}
    >
      <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
      <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
    </RadioGroup>

    <FieldLabel>¿EQUIPO EN HORA?</FieldLabel>
    <RadioGroup
      row
      value={cl.equipoHora == null ? "" : String(cl.equipoHora)}
      onChange={(e) => setChecklistVal(t.id, "equipoHora", e.target.value === "true")}
    >
      <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
      <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
    </RadioGroup>

    <Divider sx={{ my: 1.5 }} />

    {/* CONEXIÓN */}
    <Typography variant="subtitle2" gutterBottom>CONEXIÓN</Typography>
    <FieldLabel>¿EQUIPO OFFLINE?</FieldLabel>
    <RadioGroup
      row
      value={cl.equipoOffline == null ? "" : String(cl.equipoOffline)}
      onChange={(e) => setChecklistVal(t.id, "equipoOffline", e.target.value === "true")}
    >
      <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
      <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
    </RadioGroup>
  </Section>
</Grid>
    </Grid>
  );
}
