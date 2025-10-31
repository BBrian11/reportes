// src/pages/admin/LoginAdmin.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { normRol } from "../../utils/roles";

export default function LoginAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, hydrated, login } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [loading, setLoading] = useState(false);

  const normEmail = (v) => (v || "").trim().toLowerCase();
  const normPass  = (v) => (v || "").trim();
  const routeForRole = (rol) => (rol === "operador" ? "/monitoreo" : "/admin");

  useEffect(() => {
    if (!hydrated) return;
    if (admin) {
      const rol = normRol(admin.rol);
      const to = location.state?.from || routeForRole(rol);
      navigate(to, { replace: true });
    }
  }, [admin, hydrated, navigate, location.state]);

  async function buscarOperador(userOrEmail, pass) {
    const userLower = normEmail(userOrEmail);
    const passNorm  = normPass(pass);

    // 1) por "usuario"
    let qRef = query(collection(db, "operadores"), where("usuario", "==", userLower), limit(1));
    let snap = await getDocs(qRef);

    // 2) por "email"
    if (snap.empty) {
      qRef = query(collection(db, "operadores"), where("email", "==", userLower), limit(1));
      snap = await getDocs(qRef);
      if (snap.empty) return null;
    }

    const d = snap.docs[0];
    const data = d.data() || {};
    const passDb = data.contraseña ?? data.contrasena ?? "";
    if (normPass(passDb) !== passNorm) return null;

    const rol = normRol(data.rol) || "operador";
    return {
      id: d.id,
      email: data.email || data.usuario || userLower,
      nombre: data.nombre || "Operador",
      rol,
    };
  }

  async function buscarAdmin(email, pass) {
    const qRef = query(
      collection(db, "administracion"),
      where("email", "==", normEmail(email)),
      where("contraseña", "==", normPass(pass)),
      limit(1)
    );
    const snap = await getDocs(qRef);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const data = d.data() || {};
    const rol = normRol(data.rol) || "admin";
    return {
      id: d.id,
      email: data.email || normEmail(email),
      nombre: data.nombre || "Administrador",
      rol,
    };
  }

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!email || !contrasena) return;
    setLoading(true);

    try {
      // 1) Operador primero
      const op = await buscarOperador(email, contrasena);
      if (op) {
        const rol = normRol(op.rol);
        login({ ...op, rol });
        navigate(location.state?.from || routeForRole(rol), { replace: true });
        return;
      }

      // 2) Admin después
      const adm = await buscarAdmin(email, contrasena);
      if (adm) {
        const rol = normRol(adm.rol);
        login({ ...adm, rol });
        navigate(location.state?.from || routeForRole(rol), { replace: true });
        return;
      }

      alert("Email/usuario o contraseña incorrectos.");
    } catch (err) {
      console.error(err);
      alert("No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  if (hydrated && admin) return null;

  return (
    <div className="login-shell">
      <Container maxWidth="xs" sx={{ py: { xs: 4, md: 6 } }}>
        <Paper elevation={0} className="login-card" role="form" aria-labelledby="login-admin-title" sx={{ p: 3 }}>
          <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>G3T</div>
            <div>
              <Typography id="login-admin-title" variant="h6">Ingreso</Typography>
              <Typography variant="body2" color="text.secondary">Administración u Operador</Typography>
            </div>
          </header>

          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2.2}>
              <TextField
                label="Email o Usuario"
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
