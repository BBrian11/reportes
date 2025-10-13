// src/components/Dashboard/riesgoRondin/LoginOperador.jsx
import React, { useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../../services/firebase";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import Swal from "./swal";
import { useOperadorAuth } from "../../../context/OperadorAuthContext";
import "../../../styles/login.css";

export default function LoginOperador({ onLogged }) {
  const { login } = useOperadorAuth();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!usuario || !contrasena) {
      return Swal.fire("Faltan datos", "Completá usuario y contraseña.", "info");
    }
    setLoading(true);
    try {
      const qRef = query(
        collection(db, "operadores"),
        where("usuario", "==", usuario.trim().toLowerCase()),
        where("contraseña", "==", contrasena.trim()),
        limit(1)
      );
      const snap = await getDocs(qRef);
      if (snap.empty) {
        setLoading(false);
        return Swal.fire("Datos inválidos", "Usuario o contraseña incorrectos.", "error");
      }
      const doc = snap.docs[0];
      const data = doc.data() || {};
      const sesion = {
        id: doc.id,
        nombre: data.nombre || "",
        usuario: data.usuario || usuario,
        turno: data.turno || "",
      };
      login(sesion);
      Swal.fire("Bienvenido", sesion.nombre || sesion.usuario, "success");
      onLogged?.(sesion);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo iniciar sesión.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <Container maxWidth="xs" sx={{ py: { xs: 4, md: 6 } }}>
        <Paper elevation={0} className="login-card" role="form" aria-labelledby="login-title">
          <header className="login-head">
            <div className="brand-badge" aria-hidden>G3T</div>
            <div className="brand-copy">
              <Typography id="login-title" variant="h6" className="title">
                Ingreso de Operadores
              </Typography>
              <Typography variant="body2" className="subtitle">
                Panel de rondines y monitoreo
              </Typography>
            </div>
          </header>

          <Box component="form" onSubmit={handleSubmit} className="login-form" noValidate>
            <Stack spacing={2.2}>
              <TextField
                label="Usuario (email)"
                type="email"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
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

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                aria-busy={loading ? "true" : "false"}
                disableElevation
                size="large"
                className="cta"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </div>
  );
}
