import { Grid, Paper, Typography, FormLabel, RadioGroup, FormControlLabel, Radio, Checkbox, TextField } from "@mui/material";
import { toast } from "./swal";

export default function ChecklistPanel({ t, setChecklistVal, resetFallan, toggleFallan }) {
  const cl = t.checklist || {};

  return (
    <Grid container spacing={2}>
      {/* ===== CARD 1: ALARMA ===== */}
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
          <Typography variant="subtitle2" gutterBottom>ALARMA</Typography>

          <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
            ¿TIENE ALARMA MONITOREADA?
          </FormLabel>
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

          {/* Sub-card: ESTADO DE LA ALARMA */}
          {cl.alarmaMonitoreada === true && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 1.5, bgcolor: "action.hover" }}>
              <Typography variant="subtitle2" gutterBottom>ESTADO DE LA ALARMA</Typography>

              <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
                ¿COMUNICACIÓN OK?
              </FormLabel>
              <RadioGroup
                row
                value={cl.alarmaComunicacionOK == null ? "" : String(cl.alarmaComunicacionOK)}
                onChange={(e) => setChecklistVal(t.id, "alarmaComunicacionOK", e.target.value === "true")}
              >
                <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
              </RadioGroup>

              <FormLabel component="legend" sx={{ fontSize: 13, mb: .5, mt: 1 }}>
                ¿PANEL ARMADO?
              </FormLabel>
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
                  <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
                    ¿ZONAS ABIERTAS?
                  </FormLabel>
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
                  <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
                    ¿BATERÍA BAJA?
                  </FormLabel>
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
                  <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
                    ¿TAMPER / TAPA ABIERTA?
                  </FormLabel>
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
            </Paper>
          )}
        </Paper>
      </Grid>

      {/* ===== CARD 2: SISTEMA (Grabaciones / Energía / Conexión) ===== */}
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
          {/* GRABACIONES */}
          <Typography variant="subtitle2" gutterBottom>GRABACIONES</Typography>
          <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
            ¿FUNCIONAN TODAS LAS CÁMARAS?
          </FormLabel>
          <RadioGroup
            row
            value={cl.grabacionesOK == null ? "" : String(cl.grabacionesOK)}
            onChange={(e) => {
              const val = e.target.value === "true";
              setChecklistVal(t.id, "grabacionesOK", val);
              if (val) resetFallan(t.id);
              else toast.fire({ icon: "info", title: "Indicá cuáles fallan (1–16)" });
            }}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No (indicar cuáles)" />
          </RadioGroup>

          {cl.grabacionesOK === false && (
            <Grid container spacing={1} sx={{ mt: 1 }}>
              {Array.from({ length: 16 }, (_, i) => `cam${i + 1}`).map((k, idx) => (
                <Grid item xs={6} sm={4} md={3} key={k}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(cl.grabacionesFallan && cl.grabacionesFallan[k])}
                        onChange={() => toggleFallan(t.id, k)}
                      />
                    }
                    label={`Cámara ${idx + 1}`}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* ENERGÍA */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 1.5 }}>ENERGÍA</Typography>
          <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
            ¿TIENE CORTES 220V?
          </FormLabel>
          <RadioGroup
            row
            value={cl.cortes220v == null ? "" : String(cl.cortes220v)}
            onChange={(e) => setChecklistVal(t.id, "cortes220v", e.target.value === "true")}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
          </RadioGroup>

          {/* CONEXIÓN */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 1.5 }}>CONEXIÓN</Typography>
          <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
            ¿EQUIPO OFFLINE?
          </FormLabel>
          <RadioGroup
            row
            value={cl.equipoOffline == null ? "" : String(cl.equipoOffline)}
            onChange={(e) => setChecklistVal(t.id, "equipoOffline", e.target.value === "true")}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
          </RadioGroup>
        </Paper>
      </Grid>
    </Grid>
  );
}
