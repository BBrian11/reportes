import React, { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function LoginAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, hydrated, login } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [loading, setLoading] = useState(false);

  // Si ya estoy logueado cuando cargo la vista, voy directo a /admin
  useEffect(() => {
    if (!hydrated) return; // esperamos hidratación
    if (admin) {
      const to = location.state?.from || "/admin";
      navigate(to, { replace: true });
    }
  }, [admin, hydrated, navigate, location.state]);

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!email || !contrasena) return;

    setLoading(true);
    try {
      const qRef = query(
        collection(db, "administracion"),
        where("email", "==", email.trim().toLowerCase()),
        where("contraseña", "==", contrasena.trim()),
        limit(1)
      );
      const snap = await getDocs(qRef);
      if (snap.empty) {
        alert("Email o contraseña incorrectos.");
        return;
      }
      const doc = snap.docs[0];
      const data = doc.data() || {};
      const sesion = {
        id: doc.id,
        email: data.email || email.trim().toLowerCase(),
        nombre: data.nombre || "Administrador",
        rol: "admin",
      };
      login(sesion);

      const to = location.state?.from || "/admin";
      navigate(to, { replace: true });
    } catch (err) {
      console.error(err);
      alert("No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  // Si ya hay admin (y estamos hidratados), no mostramos el form (el useEffect navega)
  if (hydrated && admin) return null;

  return (
    <div className="login-shell">
      <Container maxWidth="xs" sx={{ py: { xs: 4, md: 6 } }}>
        <Paper elevation={0} className="login-card" role="form" aria-labelledby="login-admin-title" sx={{ p: 3 }}>
          <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>G3T</div>
            <div>
              <Typography id="login-admin-title" variant="h6">Ingreso Administración</Typography>
              <Typography variant="body2" color="text.secondary">Panel administrativo</Typography>
            </div>
          </header>

          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2.2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                autoFocus
                autoComplete="username"
                inputProps={{ inputMode: "email", autoCapitalize: "none", spellCheck: "false" }}
              />
              <TextField
                label="Contraseña"
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                fullWidth
                autoComplete="current-password"
                inputProps={{ autoCapitalize: "none", spellCheck: "false" }}
              />
              <Button type="submit" variant="contained" fullWidth disabled={loading} disableElevation size="large">
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </div>
  );
}
