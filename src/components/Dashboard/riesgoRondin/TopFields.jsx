import { Grid, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

export default function TopFields({ turno, setTurno, operario, setOperario, operarios }) {
  return (
    <Grid container spacing={2} alignItems="center" className="riesgo-top-form">
      <Grid item xs={12} md={4} className="top-field">
        <FormControl fullWidth size="medium" className="big-control">
          <InputLabel>Turno</InputLabel>
          <Select value={turno} label="Turno" onChange={(e) => setTurno(e.target.value)}>
            <MenuItem value="Noche">Nocturno</MenuItem>
            <MenuItem value="Día">Día</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={4} className="top-field">
        <FormControl fullWidth size="medium" className="big-control">
          <InputLabel>Operador</InputLabel>
          <Select value={operario} label="Operario" onChange={(e) => setOperario(e.target.value)}>
            {operarios.map(op => (<MenuItem key={op} value={op}>{op}</MenuItem>))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
}
