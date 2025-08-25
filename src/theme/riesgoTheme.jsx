import { createTheme } from "@mui/material/styles";
import { GlobalStyles } from "@mui/material";

export const riesgoTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    success: { main: "#2e7d32" },
    warning: { main: "#ed6c02" },
    error:   { main: "#d32f2f" },
    info:    { main: "#0288d1" },
    background: { default: "#f7f9fc", paper: "#fff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: `"Inter","Roboto","Helvetica","Arial",sans-serif`,
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton:  { styleOverrides: { root: { minHeight: 40, paddingInline: 16 } } },
    MuiPaper:   { styleOverrides: { root: { borderRadius: 12 } } },
    MuiCard:    { styleOverrides: { root: { borderRadius: 14 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiCssBaseline: {
      styleOverrides: {
        "*:focus-visible": {
          outline: "3px solid rgba(25,118,210,.35)",
          outlineOffset: 2,
          borderRadius: 6,
        },
      },
    },
  },
});

// Exportá como función para evitar “doesn't provide an export…”
export function RiesgoGlobalStyles() {
  return (
    <GlobalStyles styles={{
      "html, body, #root": { height: "100%" },
      "::-webkit-scrollbar": { width: 10, height: 10 },
      "::-webkit-scrollbar-thumb": { background: "rgba(0,0,0,.2)", borderRadius: 8 },
      "::selection": { background: "rgba(25,118,210,.2)" },
    }} />
  );
}
