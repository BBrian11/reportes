// src/components/Dashboard/ClientesCriticosList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, AppBar, Toolbar, Typography, IconButton, Tooltip, Stack, TextField,
  MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, CircularProgress, Divider, Badge, Button, Snackbar, Select, FormControl
} from "@mui/material";
import { FaDownload, FaSync, FaPlus, FaBolt, FaEye, FaExclamationTriangle } from "react-icons/fa";
import {
  collection, onSnapshot, query, where, limit, doc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../../services/firebase";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

/* ===== Paleta ===== */
const PALETTE = {
  bg: "#0A0F1C", panel: "#0D1628", header: "#0B1324", border: "#1E2A44",
  text: "#E8EEF7", subtext: "#A9BEDF",
  critical: "#FF3B30", criticalBg: "#2A1113", criticalFg: "#FFE5E7",
  high: "#7C3AED", highBg: "#2A1846", highFg: "#F3E8FF",
  warning: "#FFC300", warningBg: "#2A2208", warningFg: "#FFF4D5",
  info: "#3B82F6", infoBg: "#0D1A2E", infoFg: "#DCEBFF",
  ok: "#00D97E", okBg: "#0E2318", okFg: "#D4FFE9",
};

/* ===== Niveles de atención ===== */
const AT_ORDER = ["critico", "alto", "medio", "regular"];
const AT_VARIANTS = {
  critico: ["critico", "crítico", "CRITICO", "CRÍTICO"],
  alto: ["alto", "ALTO"],
  medio: ["medio", "MEDIO"],
  regular: ["regular", "REGULAR"],
};
const AT_STYLE = {
  critico: { fg: PALETTE.criticalFg, bg: PALETTE.criticalBg, bd: PALETTE.critical },
  alto:    { fg: PALETTE.highFg,     bg: PALETTE.highBg,     bd: PALETTE.high     },
  medio:   { fg: PALETTE.warningFg,  bg: PALETTE.warningBg,  bd: PALETTE.warning  },
  regular: { fg: PALETTE.infoFg,     bg: PALETTE.infoBg,     bd: PALETTE.info     },
};
// prioridad para ordenar (menor número = más arriba)
const AT_PRIORITY = { critico: 0, alto: 1, medio: 2, regular: 3 };

/* ===== Config consulta: SIN índice (orden en cliente) ===== */
const USE_SERVER_ORDER = false;

export default function ClientesCriticosList() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [indexUrl, setIndexUrl] = useState(null);

  // respuestas-tareas (alertas por cliente)
  const [tareasRaw, setTareasRaw] = useState([]); // para debug/uso general
  const [alertsByNombre, setAlertsByNombre] = useState({}); // { normNombre: [items...] }

  // Filtros
  const [qText, setQText] = useState("");
  const [fCategoria, setFCategoria] = useState("todos");
  const [fRondin, setFRondin] = useState("todos");
  const [rowLimit, setRowLimit] = useState(500);
  const [snack, setSnack] = useState("");

  // Filtro por atención (chips)
  const [atSel, setAtSel] = useState({ critico: true, alto: true, medio: true, regular: true });

  const unsubRef = useRef(null);
  const unsubTareasRef = useRef(null);

  const selectedInArray = useMemo(() => {
    const keys = AT_ORDER.filter(k => atSel[k]);
    const safe = keys.length ? keys : ["alto"]; // Firestore no acepta 'in' vacío
    return safe.flatMap(k => AT_VARIANTS[k]);
  }, [atSel]);

  /* ===== Subscripción a clientes ===== */
  const buildQuery = () => {
    const parts = [where("atencion", "in", selectedInArray), limit(rowLimit)];
    return query(collection(db, "clientes"), ...parts);
  };

  const resubscribe = () => {
    try { unsubRef.current && unsubRef.current(); } catch {}
    setLoading(true); setErr(null); setIndexUrl(null);
    const q = buildQuery();
    unsubRef.current = onSnapshot(
      q,
      (snap) => {
        const rows = [];
        snap.forEach((d) => {
          const data = d.data() || {};
          const ts = data.timestamp;
          const dt = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : null);
          rows.push({
            id: d.id,
            nombre: data.nombre || "",
            categoria: data.categoria || "",
            atencion: normAtt(data.atencion) || "",
            rondin: !!data.rondin,
            timestamp: dt,
            _raw: data,
          });
        });
        // ORDEN: por criticidad (critico → regular) y dentro de cada grupo por fecha desc
        rows.sort((a, b) => {
          const pa = AT_PRIORITY[a.atencion] ?? 99;
          const pb = AT_PRIORITY[b.atencion] ?? 99;
          if (pa !== pb) return pa - pb; // critico primero
          const ta = a.timestamp?.getTime?.() || 0;
          const tb = b.timestamp?.getTime?.() || 0;
          return tb - ta; // más reciente primero
        });
        setDocs(rows);
        setLoading(false);
      },
      (e) => {
        const msg = String(e?.message || "");
        const m = msg.match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/g);
        if (m?.[0]) setIndexUrl(m[0]);
        setErr(e);
        setLoading(false);
      }
    );
  };

  /* ===== Subscripción a respuestas-tareas =====
     Escucha todos los documentos y agrupa por nombre de cliente.
     Coincidencia por NOMBRE (case-insensitive, sin acentos). */
  useEffect(() => {
    try { unsubTareasRef.current && unsubTareasRef.current(); } catch {}
    // Evitamos filtros que pidan índices — traemos un lote razonable
    const q = query(collection(db, "respuestas-tareas"), limit(1500));
    unsubTareasRef.current = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => {
          const data = d.data() || {};
          const ts = data.createdAt || data.updatedAt || data.timestamp;
          const dt = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : null);

          arr.push({
            id: d.id,
            // tolerante con distintos nombres de campo
            clienteNombre: pickFirstNonEmpty(
              data.clienteNombre, data.cliente, data.nombreCliente, data.cliente_name, data.nombre
            ),
            texto: pickFirstNonEmpty(
              data.texto, data.novedad, data.resumen, data.detalle, data.description, data.obs, ""
            ),
            estado: data.estado || "",
            prioridad: normAtt(data.prioridad || data.atencion || "regular"),
            createdAt: dt,
            _raw: data,
          });
        });
        setTareasRaw(arr);

        // Agrupamos por nombre normalizado
        const map = {};
        for (const it of arr) {
          const key = normName(it.clienteNombre);
          if (!key) continue;
          if (!map[key]) map[key] = [];
          map[key].push(it);
        }
        // ordenamos cada lista interna por (prioridad) y luego fecha desc
        Object.keys(map).forEach((k) => {
          map[k].sort((a, b) => {
            const pa = AT_PRIORITY[a.prioridad] ?? 99;
            const pb = AT_PRIORITY[b.prioridad] ?? 99;
            if (pa !== pb) return pa - pb;
            const ta = a.createdAt?.getTime?.() || 0;
            const tb = b.createdAt?.getTime?.() || 0;
            return tb - ta;
          });
        });
        setAlertsByNombre(map);
      },
      () => {} // silencioso
    );

    return () => { try { unsubTareasRef.current && unsubTareasRef.current(); } catch {} };
  }, []);

  useEffect(() => {
    resubscribe();
    return () => { try { unsubRef.current && unsubRef.current(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowLimit, selectedInArray.join("|")]);

  const categorias = useMemo(() => {
    const s = new Set();
    docs.forEach((d) => { if (d.categoria) s.add(d.categoria); });
    return ["todos", ...Array.from(s)];
  }, [docs]);

  const filtered = useMemo(() => {
    const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const qn = norm(qText);
    return docs.filter((d) => {
      if (fCategoria !== "todos" && d.categoria !== fCategoria) return false;
      if (fRondin !== "todos") {
        const expected = fRondin === "true";
        if (d.rondin !== expected) return false;
      }
      if (!qn) return true;
      return norm(d.nombre).includes(qn) || norm(d.categoria).includes(qn) || norm(d.id).includes(qn);
    });
  }, [docs, qText, fCategoria, fRondin]);

  const shownCount = filtered.length;

  /* ===== Acciones ===== */

  // 1) Nueva Novedad → escribe en `novedades` y empuja al ticker local del Wall
  async function handleNuevaNovedad(row) {
    const texto = prompt(`Nueva novedad para ${row.nombre}:\n(esto aparecerá en el Wall)`);
    if (!texto || !texto.trim()) return;
    const payload = {
      clienteId: row.id,
      clienteNombre: row.nombre,
      texto: texto.trim(),
      atencion: row.atencion,
      rondin: row.rondin,
      categoria: row.categoria || "",
      createdAt: serverTimestamp(),
      fuente: "clientes-criticos",
    };
    try {
      await addDoc(collection(db, "novedades"), payload);
      try {
        const now = new Date();
        const raw = JSON.parse(localStorage.getItem("wallboard_ticker_items") || "[]");
        const arr = Array.isArray(raw) ? raw : [];
        const next = [{ text: `${row.nombre}: ${texto.trim()}`, time: now }, ...arr].slice(0, 50);
        localStorage.setItem("wallboard_ticker_items", JSON.stringify(next));
      } catch {}
      setSnack("Novedad creada");
    } catch (e) {
      setSnack("Error creando novedad: " + String(e?.message || e));
    }
  }

  // 2) Toggle Rondín
  async function handleToggleRondin(row) {
    try {
      await updateDoc(doc(db, "clientes", row.id), {
        rondin: !row.rondin,
        timestamp: serverTimestamp(),
      });
      setSnack(`Rondín ${!row.rondin ? "activado" : "desactivado"}`);
    } catch (e) {
      setSnack("Error actualizando rondín: " + String(e?.message || e));
    }
  }

  // 3) Cambiar atención
  async function handleChangeAtencion(row, next) {
    try {
      await updateDoc(doc(db, "clientes", row.id), {
        atencion: next,
        timestamp: serverTimestamp(),
      });
      setSnack(`Atención → ${next.toUpperCase()}`);
    } catch (e) {
      setSnack("Error cambiando atención: " + String(e?.message || e));
    }
  }

  // 4) Ver alertas/“respuestas” de ese cliente en Swal
  function handleVerAlertas(row) {
    const key = normName(row.nombre);
    const items = alertsByNombre[key] || [];
    if (!items.length) {
      Swal.fire({
        icon: "info",
        title: row.nombre,
        text: "Sin respuestas asociadas en ‘respuestas-tareas’.",
        confirmButtonText: "OK",
        background: "#0D1628",
        color: "#E8EEF7",
      });
      return;
    }

    const html = `
      <div style="text-align:left; max-height:60vh; overflow:auto;">
        ${items.map((it, idx) => `
          <div style="padding:10px; margin-bottom:8px; border:1px solid ${PALETTE.border}; border-radius:10px; background:#0B1324;">
            <div style="font-weight:900; margin-bottom:6px;">
              #${idx + 1} • ${it.prioridad?.toUpperCase?.() || "—"} 
              ${it.createdAt ? `• ${formatDate(it.createdAt)}` : ""}
            </div>
            <div style="white-space:pre-wrap; line-height:1.35">${escapeHtml(String(it.texto || "—"))}</div>
          </div>
        `).join("")}
      </div>
    `;

    Swal.fire({
      width: 720,
      background: "#0D1628",
      color: "#E8EEF7",
      title: `Respuestas de ${row.nombre}`,
      html,
      showCloseButton: true,
      confirmButtonText: "Cerrar",
      focusConfirm: false,
    });
  }

  /* ===== UI helpers ===== */
  const attChipStyle = (k) => AT_STYLE[k] || AT_STYLE.regular;
  const rowAccent = (k) =>
    k === "critico" ? AT_STYLE.critico.bd :
    k === "alto"    ? AT_STYLE.alto.bd    :
    k === "medio"   ? AT_STYLE.medio.bd   :
                      AT_STYLE.regular.bd;

  const exportCSV = () => {
    const header = ["id", "nombre", "categoria", "atencion", "rondin", "timestamp"];
    const rows = filtered.map((r) => [
      r.id,
      csvSafe(r.nombre),
      csvSafe(r.categoria),
      csvSafe(r.atencion),
      r.rondin ? "TRUE" : "FALSE",
      r.timestamp ? r.timestamp.toISOString() : "",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clientes_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const toggleAtt = (key) => {
    setAtSel(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!Object.values(next).some(Boolean)) next[key] = true; // no permitir 0 seleccionados
      return next;
    });
  };

  return (
    <Box sx={{ height: "100vh", display: "grid", gridTemplateRows: "auto auto 1fr", bgcolor: PALETTE.bg, color: PALETTE.text }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: PALETTE.header, borderBottom: `1px solid ${PALETTE.border}` }}>
        <Toolbar sx={{ gap: 2, py: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: .6 }}>
            Clientes (crítico / alto / medio / regular)
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="Buscar por nombre / categoría / ID…"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              sx={{ minWidth: 280 }}
              InputProps={{ sx: { color: PALETTE.text } }}
            />
            <TextField size="small" select label="Categoría" value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} sx={{ minWidth: 150 }}>
              {categorias.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField size="small" select label="Rondín" value={fRondin} onChange={(e) => setFRondin(e.target.value)} sx={{ minWidth: 120 }}>
              <MenuItem value="todos">todos</MenuItem>
              <MenuItem value="true">true</MenuItem>
              <MenuItem value="false">false</MenuItem>
            </TextField>
            <TextField size="small" select label="Límite" value={rowLimit} onChange={(e) => setRowLimit(Number(e.target.value))} sx={{ minWidth: 100 }}>
              {[100, 300, 500, 1000].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </TextField>

            <Tooltip title="Re-suscribir">
              <span>
                <IconButton onClick={resubscribe} disabled={loading} sx={{ color: PALETTE.subtext }}>
                  <FaSync />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Exportar CSV filtrado">
              <IconButton onClick={exportCSV} sx={{ color: PALETTE.subtext }}>
                <FaDownload />
              </IconButton>
            </Tooltip>

            <Badge color="info" badgeContent={shownCount} sx={{ "& .MuiBadge-badge": { fontWeight: 900 } }}>
              <Box sx={{ px: 1, py: .25, border: `1px solid ${PALETTE.border}`, borderRadius: 1, color: PALETTE.subtext }}>
                mostrados
              </Box>
            </Badge>

            <Tooltip title="Ver Wall de Novedades">
              <IconButton onClick={() => window.open("/novedades", "_blank", "noopener,noreferrer")} sx={{ color: PALETTE.subtext }}>
                <FaEye />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Filtro por ATENCIÓN (chips clickeables) */}
          <Stack direction="row" spacing={1} sx={{ width: "100%", mt: 1 }}>
            {AT_ORDER.map((k) => {
              const s = atSel[k]; const st = AT_STYLE[k];
              const label = (k === "critico" ? "CRÍTICO" : k.toUpperCase());
              return (
                <Chip
                  key={k}
                  label={label}
                  onClick={() => toggleAtt(k)}
                  variant={s ? "filled" : "outlined"}
                  sx={{
                    fontWeight: 900,
                    color: s ? st.fg : PALETTE.subtext,
                    bgcolor: s ? st.bg : "transparent",
                    border: `1px solid ${s ? st.bd : PALETTE.border}`,
                    height: 28
                  }}
                />
              );
            })}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Aviso índice si aplica */}
      {indexUrl && (
        <Box sx={{ px: 2, pt: 1 }}>
          <Paper sx={{ p: 1.5, bgcolor: "#16213e", border: `1px solid ${PALETTE.border}` }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: PALETTE.warningFg }}>
              Esta consulta puede usar orden del servidor con un índice compuesto.
            </Typography>
            <a href={indexUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 900, textDecoration: "underline", color: PALETTE.warningFg }}>
              Crear índice ahora
            </a>
          </Paper>
        </Box>
      )}

      {/* Tabla */}
      <Box sx={{ p: 2 }}>
        <Paper sx={{ bgcolor: PALETTE.panel, border: `1px solid ${PALETTE.border}` }}>
          {loading && (
            <Box sx={{ p: 4, display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={22} />
              <Typography>Cargando clientes…</Typography>
            </Box>
          )}

          {err && !indexUrl && (
            <Box sx={{ p: 2 }}>
              <Typography color="error" sx={{ fontWeight: 800 }}>Error:</Typography>
              <Typography sx={{ color: PALETTE.subtext }}>{String(err?.message || err)}</Typography>
            </Box>
          )}

          {!loading && !err && (
            <>
              <Box sx={{ p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 900 }}>
                  Resultados: {filtered.length} / {docs.length}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: PALETTE.border }} />

              <TableContainer sx={{ maxHeight: "calc(100vh - 280px)" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <Th>Nombre</Th>
                      <Th>Atención</Th>
                      <Th>Categoría</Th>
                      <Th>Rondín</Th>
                      <Th>Alertas</Th>
                      <Th>Fecha/Hora</Th>
                      <Th>Acciones</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((r) => {
                      const key = normName(r.nombre);
                      const alerts = alertsByNombre[key] || [];
                      const hasAlerts = alerts.length > 0;
                      const firstText = hasAlerts ? (String(alerts[0].texto || "").trim()) : "";
                      const mini = firstText ? truncate(firstText, 60) : "";
                      const alertColor = hasAlerts ? PALETTE.critical : PALETTE.subtext;

                      return (
                        <TableRow
                          key={r.id}
                          hover
                          sx={{
                            borderLeft: `6px solid ${rowAccent(r.atencion)}`,
                            "&:hover": { background: "rgba(255,255,255,0.02)" }
                          }}
                        >
                          <Td sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
                            {hasAlerts && (
                              <Tooltip title="Tiene respuestas en ‘respuestas-tareas’">
                                <span style={{ display: "inline-flex", alignItems: "center" }}>
                                  <FaExclamationTriangle style={{ color: alertColor }} />
                                </span>
                              </Tooltip>
                            )}
                            {r.nombre || "—"}
                          </Td>

                          {/* Atención (chip + selector inline) */}
                          <Td>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                label={String(r.atencion || "").toUpperCase()}
                                sx={{ fontWeight: 900, height: 24, ...attChipStyle(r.atencion) }}
                              />
                              <FormControl size="small">
                                <Select
                                  value={r.atencion}
                                  onChange={(e) => handleChangeAtencion(r, e.target.value)}
                                  sx={{
                                    height: 28,
                                    color: PALETTE.text,
                                    ".MuiOutlinedInput-notchedOutline": { borderColor: PALETTE.border },
                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: PALETTE.border },
                                  }}
                                >
                                  {AT_ORDER.map((k) => (
                                    <MenuItem key={k} value={k}>{k === "critico" ? "crítico" : k}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Stack>
                          </Td>

                          <Td sx={{ opacity: .95 }}>{r.categoria || "—"}</Td>

                          {/* Rondín */}
                          <Td>
                            <Button
                              size="small"
                              variant={r.rondin ? "contained" : "outlined"}
                              onClick={() => handleToggleRondin(r)}
                              startIcon={<FaBolt />}
                              sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                height: 28,
                                bgcolor: r.rondin ? PALETTE.okBg : "transparent",
                                color: r.rondin ? PALETTE.okFg : PALETTE.warningFg,
                                border: `1px solid ${r.rondin ? PALETTE.ok : PALETTE.warning}`,
                                "&:hover": { bgcolor: r.rondin ? PALETTE.okBg : "transparent" }
                              }}
                            >
                              {r.rondin ? "ON" : "OFF"}
                            </Button>
                          </Td>

                          {/* Alertas (mini preview + botón ver) */}
                          <Td sx={{ whiteSpace: "nowrap" }}>
                            {hasAlerts ? (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  size="small"
                                  label={mini}
                                  sx={{
                                    maxWidth: 260,
                                    textOverflow: "ellipsis",
                                    overflow: "hidden",
                                    bgcolor: "#2A1113",
                                    color: "#FFE5E7",
                                    border: `1px solid ${PALETTE.critical}`
                                  }}
                                />
                                <Badge
                                  badgeContent={alerts.length}
                                  color="error"
                                  sx={{ "& .MuiBadge-badge": { fontWeight: 900 } }}
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleVerAlertas(r)}
                                    sx={{
                                      borderColor: PALETTE.border,
                                      color: PALETTE.text,
                                      textTransform: "none",
                                      fontWeight: 900,
                                      height: 28
                                    }}
                                  >
                                    Ver
                                  </Button>
                                </Badge>
                              </Stack>
                            ) : (
                              <span style={{ color: PALETTE.subtext }}>—</span>
                            )}
                          </Td>

                          {/* Timestamp */}
                          <Td sx={{ whiteSpace: "nowrap" }}>
                            {r.timestamp
                              ? (
                                <span title={r.timestamp.toLocaleString("es-AR")}>
                                  {timeAgo(r.timestamp)} · {r.timestamp.toLocaleTimeString("es-AR", { hour12: false })}
                                </span>
                              )
                              : "—"}
                          </Td>

                          {/* Acciones: Nueva Novedad */}
                          <Td sx={{ whiteSpace: "nowrap" }}>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="Nueva novedad de este cliente (se ve en el Wall)">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleNuevaNovedad(r)}
                                  startIcon={<FaPlus />}
                                  sx={{ borderColor: PALETTE.border, color: PALETTE.text, textTransform: "none", fontWeight: 900, height: 28 }}
                                >
                                  Novedad
                                </Button>
                              </Tooltip>
                            </Stack>
                          </Td>
                        </TableRow>
                      );
                    })}

                    {filtered.length === 0 && (
                      <TableRow>
                        <Td colSpan={7} sx={{ textAlign: "center", py: 4, color: PALETTE.subtext }}>
                          No hay clientes que coincidan con los filtros.
                        </Td>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={1600}
        onClose={() => setSnack("")}
        message={snack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

/* ===== Helpers UI ===== */
function Th({ children }) {
  return (
    <TableCell
      sx={{
        top: 0,
        position: "sticky",
        background: "#0F1830",
        color: "#E8EEF7",
        fontWeight: 900,
        borderBottom: `1px solid ${PALETTE.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </TableCell>
  );
}
function Td(props) {
  return (
    <TableCell
      {...props}
      sx={{
        ...props.sx,
        color: PALETTE.text,
        borderBottom: `1px solid ${PALETTE.border}`,
      }}
    />
  );
}

function timeAgo(d) {
  try {
    const ms = Date.now() - d.getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}d`;
  } catch { return ""; }
}

function csvSafe(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normAtt(v) {
  const s = String(v ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (["critico","critica"].includes(s)) return "critico";
  if (s === "alto") return "alto";
  if (s === "medio") return "medio";
  if (s === "regular") return "regular";
  if (s === "high") return "alto";
  if (s === "warning") return "medio";
  return s || "regular";
}

function normName(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function pickFirstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function truncate(s, n) {
  const t = String(s || "");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(d) {
  try {
    return d.toLocaleString("es-AR", { hour12: false });
  } catch {
    return "";
  }
}
