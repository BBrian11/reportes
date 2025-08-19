// theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563eb" },      // azul
    secondary: { main: "#0ea5e9" },    // celeste
    success: { main: "#16a34a" },      // ok
    warning: { main: "#f59e0b" },      // medio
    error:   { main: "#dc2626" },      // grave
    grey:    { 100:"#f8fafc", 200:"#f1f5f9", 300:"#e2e8f0", 400:"#cbd5e1" }
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
    h5: { fontWeight: 700, letterSpacing: .2 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(2,6,23,.06)",
          boxShadow: "0 6px 18px rgba(15,23,42,.06)",
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(2,6,23,.06)",
          boxShadow: "0 8px 22px rgba(15,23,42,.08)",
        }
      }
    },
    MuiButton: {
      defaultProps: { size: "medium" },
      styleOverrides: {
        root: { borderRadius: 12, paddingInline: 14 }
      }
    },
    MuiTextField: {
      defaultProps: { size: "small" }
    },
    MuiSelect: {
      defaultProps: { size: "small" }
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600 }
      }
    }
  }
});

export default theme;
