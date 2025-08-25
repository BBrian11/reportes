import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Typography, Container, Box, Button, Stack } from "@mui/material";

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <AppBar position="sticky" elevation={0}
        sx={{ bgcolor: "background.paper", color: "text.primary", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" fontWeight={800}>Rondín</Typography>
          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            <Button component={Link} to="/"        variant={pathname==="/" ? "contained":"text"}>Dashboard</Button>
            <Button component={Link} to="/rondin"  variant={pathname==="/rondin" ? "contained":"text"}>Rondín</Button>
            <Button component={Link} to="/rondin2" variant={pathname==="/rondin2" ? "contained":"text"}>Alto Riesgo</Button>
            <Button component={Link} to="/form-builder" variant={pathname==="/form-builder" ? "contained":"text"}>Form Builder</Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Outlet />
      </Container>

      <Box sx={{ py: 2, textAlign: "center", color: "text.secondary", fontSize: 12 }}>
        © {new Date().getFullYear()} G3T — Operación de rondines
      </Box>
    </Box>
  );
}
