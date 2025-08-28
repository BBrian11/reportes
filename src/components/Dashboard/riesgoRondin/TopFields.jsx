// src/components/Rondin/TopFields.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  TextField,
  Typography,
  Stack,
  Box,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";

/**
 * TopFields
 * - UI limpia y consistente (solo sx, sin !important)
 * - Operador con Autocomplete para búsqueda rápida
 * - Estados vacíos / requeridos / helper text
 * - Accesibilidad (labels, aria-*)
 * - Memoización de datos derivados
 * - Validaciones básicas
 */

// Map de layout (fracciones en md+)
const LAYOUT_COLS = {
  wide:   { mdTurno: 3, mdOper: 9 }, // 25% / 75%
  half:   { mdTurno: 6, mdOper: 6 }, // 50% / 50%
  single: { mdTurno: 12, mdOper: 12 }, // 100% / 100%
};

function TopFields({
  className,
  turno, setTurno,
  operario, setOperario,
  operarios = [],
  layout = "wide",
  size = "medium",
  required = { turno: true, operario: true },
  helperText = { turno: "", operario: "" },
  disabled = false,
}) {
  const { mdTurno, mdOper } = LAYOUT_COLS[layout] || LAYOUT_COLS.wide;

  // Lista limpia de operarios (string) única y ordenada A→Z
  const options = useMemo(() => {
    const list = (operarios || [])
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }, [operarios]);

  const turnoError = required?.turno && !turno;
  const operarioError = required?.operario && !operario;

  return (
    <Box
      className={className ? `rondin-topfields ${className}` : "rondin-topfields"}
      sx={{ width: "100%" }}
    >
      <Grid container spacing={2} alignItems="flex-start">
        {/* Turno */}
        <Grid item xs={12} sm={6} md={mdTurno}>
          <FormControl
            fullWidth
            size={size}
            disabled={disabled}
            error={Boolean(turnoError)}
            variant="outlined"
          >
            <InputLabel id="turno-label">Turno</InputLabel>
            <Select
              labelId="turno-label"
              id="turno-select"
              label="Turno"
              value={turno || ""}
              onChange={(e) => setTurno?.(e.target.value)}
              inputProps={{ "aria-required": required?.turno || undefined }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
              sx={{
                borderRadius: 2,
                minHeight: size === "small" ? 40 : 56,
                "& .MuiSelect-select": {
                  display: "block",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  py: 1.25,
                },
              }}
            >
              <MenuItem value="">
                <Typography color="text.secondary">Seleccionar turno…</Typography>
              </MenuItem>
              <MenuItem value="Día">Día</MenuItem>
              <MenuItem value="Noche">Noche</MenuItem>
            </Select>
            <FormHelperText>
              {turnoError ? "Este campo es obligatorio." : helperText?.turno}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* Operador (Autocomplete con búsqueda y vacíos manejados) */}
        <Grid item xs={12} sm={6} md={mdOper}>
          <Stack spacing={1}>
            <Autocomplete
              id="operador-autocomplete"
              disabled={disabled}
              options={options}
              value={operario || null}
              onChange={(_, newValue) => setOperario?.(newValue || "")}
              isOptionEqualToValue={(opt, val) => opt === val}
              noOptionsText={options.length ? "Sin coincidencias" : "No hay operarios cargados"}
              loadingText="Cargando…"
              clearOnEscape
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Operador"
                  placeholder={options.length ? "Buscar o seleccionar…" : "No hay operarios"}
                  size={size}
                  error={Boolean(operarioError)}
                  helperText={
                    operarioError
                      ? "Este campo es obligatorio."
                      : helperText?.operario || ""
                  }
                  inputProps={{
                    ...params.inputProps,
                    "aria-required": required?.operario || undefined,
                    autoComplete: "off",
                  }}
                />
              )}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  minHeight: size === "small" ? 40 : 56,
                },
                // El popup se adapta al ancho del input y muestra lista cómoda
                "& .MuiAutocomplete-popper": {
                  "& .MuiAutocomplete-paper": { maxHeight: 400 },
                },
              }}
            />

            {/* Estado vacío (hint) */}
            {!options.length && (
              <Typography variant="body2" color="text.secondary">
                Cargá la lista de operarios para habilitar la selección.
              </Typography>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

TopFields.propTypes = {
  className: PropTypes.string,
  turno: PropTypes.string,
  setTurno: PropTypes.func,
  operario: PropTypes.string,
  setOperario: PropTypes.func,
  operarios: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  layout: PropTypes.oneOf(["wide", "half", "single"]),
  size: PropTypes.oneOf(["small", "medium"]),
  required: PropTypes.shape({
    turno: PropTypes.bool,
    operario: PropTypes.bool,
  }),
  helperText: PropTypes.shape({
    turno: PropTypes.string,
    operario: PropTypes.string,
  }),
  disabled: PropTypes.bool,
};

TopFields.defaultProps = {
  operarios: [],
  layout: "wide",
  size: "medium",
  required: { turno: true, operario: true },
  helperText: { turno: "", operario: "" },
  disabled: false,
};

export default React.memo(TopFields);
