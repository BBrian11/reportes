import { Paper, Typography, FormLabel, RadioGroup, FormControlLabel, Radio, Grid, Checkbox } from "@mui/material";
import { toast } from "./swal";

export default function ChecklistPanel({ t, setChecklistVal, resetFallan, toggleFallan }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" gutterBottom>GRABACIONES</Typography>
      <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
        ¿FUNCIONAN TODAS LAS CÁMARAS?
      </FormLabel>
      <RadioGroup
        row
        value={t.checklist.grabacionesOK === null ? "" : String(t.checklist.grabacionesOK)}
        onChange={(e) => {
          const val = e.target.value === "true";
          setChecklistVal(t.id, "grabacionesOK", val);
          if (val) resetFallan(t.id);
          else toast.fire({ icon: "info", title: "Indicá cuáles fallan (1–4)" });
        }}
      >
        <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="false" control={<Radio size="small" />} label="No (indicar cuáles)" />
      </RadioGroup>

      {t.checklist.grabacionesOK === false && (
        <Grid container spacing={1} sx={{ mt: 1 }}>
          {(["cam1","cam2","cam3","cam4"]).map((k, idx) => (
            <Grid item xs={6} key={k}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={t.checklist.grabacionesFallan[k]}
                    onChange={() => toggleFallan(t.id, k)}
                  />
                }
                label={`Cámara ${idx + 1}`}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Typography variant="subtitle2" gutterBottom sx={{ mt: 1.5 }}>ENERGÍA</Typography>
      <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
        ¿TIENE CORTES 220V?
      </FormLabel>
      <RadioGroup
        row
        value={t.checklist.cortes220v === null ? "" : String(t.checklist.cortes220v)}
        onChange={(e) => setChecklistVal(t.id, "cortes220v", e.target.value === "true")}
      >
        <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
      </RadioGroup>

      <Typography variant="subtitle2" gutterBottom sx={{ mt: 1.5 }}>CONEXIÓN</Typography>
      <FormLabel component="legend" sx={{ fontSize: 13, mb: .5 }}>
        ¿EQUIPO OFFLINE?
      </FormLabel>
      <RadioGroup
        row
        value={t.checklist.equipoOffline === null ? "" : String(t.checklist.equipoOffline)}
        onChange={(e) => setChecklistVal(t.id, "equipoOffline", e.target.value === "true")}
      >
        <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
        <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
      </RadioGroup>
    </Paper>
  );
}
