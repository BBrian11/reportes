// src/components/Rondin/NovedadesCard.jsx
import React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Stack,
  Tooltip,
  Typography,
  Divider,
  Box,
  Skeleton,
  Alert,
} from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DoneOutlinedIcon from "@mui/icons-material/DoneOutlined";
import useNovedadesCliente from "./useNovedadesCliente";

// === Helpers ===
const estadoColor = (e) =>
  e === "grave" ? "error" : e === "medio" ? "warning" : e === "ok" ? "success" : "default";

const normalizarEstado = (raw) => {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (/(grave|crit|down|rota|no\s*graba|sin\s*video|apagada|no\s*funciona)/i.test(s)) return "grave";
  if (/(medio|interm|intermit|degrad|ruido|descalib|bajo)/i.test(s)) return "medio";
  if (/(ok|bien|normal)/i.test(s)) return "ok";
  return null;
};

const safeDate = (d) => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "number") return new Date(d);
  if (typeof d === "string") {
    const nd = new Date(d);
    return isNaN(nd) ? null : nd;
  }
  if (typeof d === "object" && d.seconds) return new Date(d.seconds * 1000);
  return null;
};

const camNum = (o) => Number(o?.canal ?? o?.cam ?? o?.channel ?? o?.chan ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" }) : "";

// === Componente ===
export default function NovedadesCard({
  clienteKey,
  clienteName, // no se usa, pero lo dejamos para compatibilidad
  docId,       // no se usa, pero lo dejamos para compatibilidad
  camaras = [],
  historicos = {},
  limit = 8,
  onEstadoChanged, // no se usa (modo solo lectura)
  rondaId,         // no se usa
}) {
  // Fuente principal: hook de novedades
  const { items, loading, error, partialError } = useNovedadesCliente(clienteKey, limit);

  // Mapas de TANDA (props.camaras)
  const notaMap = React.useMemo(() => {
    const m = {};
    (camaras || []).forEach((c) => {
      const n = Number(c?.canal) || 0;
      if (n) m[n] = (c?.nota ?? "").toString().trim();
    });
    return m;
  }, [camaras]);

  const estadoMap = React.useMemo(() => {
    const m = {};
    (camaras || []).forEach((c) => {
      const n = Number(c?.canal) || 0;
      if (n && c?.estado) m[n] = c.estado;
    });
    return m;
  }, [camaras]);

  // 1) Items desde TANDA (si tienen nota o estado problemático)
  const fromTanda = React.useMemo(() => {
    return (camaras || [])
      .map((c) => ({
        id: `t-${c.id || c.canal}`,
        cam: Number(c?.canal) || 0,
        evento: c?.estado || null,
        nota: (c?.nota ?? "").toString().trim(),
        createdAt: null,
        source: "tanda",
      }))
      .filter((x) => x.cam && (x.nota !== "" || (x.evento && x.evento !== "ok")));
  }, [camaras]);

  // 2) Items del hook (novedades + index + respuestas)
  const fromHook = React.useMemo(() => {
    return (items || [])
      .map((n) => ({
        ...n,
        cam: camNum(n),
        evento: n?.evento ?? null,
        nota: (n?.observacion ?? n?.nota ?? n?.equipoEstadoNota ?? "").toString().trim(),
        createdAt: n?.createdAt ?? n?.updatedAt ?? null,
        source: n?.source || "hook",
      }))
      .filter((x) => x.cam);
  }, [items]);

  // Merge por canal: TANDA > RESPUESTAS > NOVEDADES > INDEX
  const merged = React.useMemo(() => {
    const byCam = new Map();
    // 1) tanda
    fromTanda.forEach((it) => byCam.set(it.cam, it));
    // 2) resto (si llega "respuestas" y no es tanda, priorizar)
    for (const it of fromHook) {
      if (!byCam.has(it.cam)) byCam.set(it.cam, it);
      else if (it.source === "respuestas" && byCam.get(it.cam)?.source !== "tanda") byCam.set(it.cam, it);
    }

    const arr = Array.from(byCam.values());
    const prio = (e) => (e === "grave" ? 0 : e === "medio" ? 1 : e === "ok" ? 2 : 3);
    arr.sort((a, b) => {
      const ea = normalizarEstado(a.evento) || a.evento || "zz";
      const eb = normalizarEstado(b.evento) || b.evento || "zz";
      const r = prio(ea) - prio(eb);
      return r !== 0 ? r : a.cam - b.cam;
    });
    return arr;
  }, [fromTanda, fromHook]);

  // Resumen de estados (solo lectura)
  const resumen = React.useMemo(() => {
    const r = { ok: 0, medio: 0, grave: 0 };
    merged.forEach((it) => {
      const canal = camNum(it);
      const estadoActual =
        estadoMap[canal] ||
        historicos?.[canal] ||
        normalizarEstado(it?.evento) ||
        null;
      if (estadoActual && r[estadoActual] !== undefined) r[estadoActual]++;
    });
    return r;
  }, [merged, estadoMap, historicos]);

  // UI
  const skeletons = Array.from({ length: 3 }).map((_, i) => (
    <Box key={`sk-${i}`}>
      {i > 0 && <Divider component="li" sx={{ my: 0.5 }} />}
      <ListItem alignItems="flex-start" disableGutters sx={{ py: 0.5 }}>
        <ListItemIcon sx={{ minWidth: 34, mt: 0.25 }}>
          <Skeleton variant="circular" width={20} height={20} />
        </ListItemIcon>
        <ListItemText primary={<Skeleton width="60%" />} secondary={<Skeleton width="40%" />} />
      </ListItem>
    </Box>
  ));

  const showHardError = !!error && !loading && fromTanda.length === 0 && merged.length === 0;
  const showPartialFlag = !!partialError && (fromTanda.length > 0 || merged.length > 0);

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <CardHeader
        titleTypographyProps={{ variant: "subtitle1", fontWeight: 700 }}
        subheaderTypographyProps={{ variant: "caption" }}
        title={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <span>Últimas novedades: </span>
           

            <Chip size="small" variant="outlined" label={`MEDIO ${resumen.medio}`} color="warning" />
            <Chip size="small" variant="outlined" label={`GRAVE ${resumen.grave}`} color="error" />
            {showPartialFlag && (
              <Tooltip title="Se mostraron datos parciales: uno de los orígenes falló.">
                <Chip size="small" color="warning" label="carga parcial" />
              </Tooltip>
            )}
          </Stack>
        }
        subheader={clienteKey ? clienteKey.toUpperCase() : "—"}
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0, flex: 1 }}>
        {loading && fromTanda.length === 0 && <List dense disablePadding sx={{ mt: 0.5 }}>{skeletons}</List>}

        {showHardError && (
          <Alert severity="error" icon={<InfoOutlinedIcon />}>
            No se pudieron cargar las novedades.
          </Alert>
        )}

        {!loading && !showHardError && merged.length === 0 && (
          <Typography variant="body2" color="text.secondary">Sin novedades recientes.</Typography>
        )}

        {!!merged.length && (
          <List dense disablePadding sx={{ mt: 0.5 }}>
            {merged.map((n, idx) => {
              const canal = camNum(n);

              const estadoActual =
                estadoMap[canal] ||
                historicos?.[canal] ||
                normalizarEstado(n?.evento) ||
                null;

              const notaFinal =
                (notaMap[canal] ?? "") ||
                (n.nota ?? "");

              const created = safeDate(n?.createdAt) || null;
              const colorChip = estadoColor(estadoActual);
              const chipVariant = estadoActual ? "filled" : "outlined";
              const chipLabel = (estadoActual || n?.evento || "EVENTO").toString().toUpperCase();

              const tooltipTitle = (
                <Box sx={{ maxWidth: 360 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Cam {canal || "—"} — {chipLabel}
                  </Typography>
                  {created && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      {fmtDate(created)}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {notaFinal ? notaFinal : "Sin observación"}
                  </Typography>
                </Box>
              );

              const borderColor =
                estadoActual === "grave"
                  ? "error.main"
                  : estadoActual === "medio"
                  ? "warning.main"
                  : estadoActual === "ok"
                  ? "success.main"
                  : "divider";

              return (
                <Box key={`${n.id || idx}-${canal}`}>
                  {idx > 0 && <Divider component="li" sx={{ my: 0.5 }} />}
                  <Tooltip title={tooltipTitle} placement="left" arrow>
                    <ListItem
                      alignItems="flex-start"
                      disableGutters
                      sx={{
                        py: 0.9,
                        px: 0.75,
                        borderRadius: 1,
                        position: "relative",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          top: 6,
                          bottom: 6,
                          width: 3,
                          borderRadius: 3,
                          bgcolor: borderColor,
                        },
                        pl: 1.25,
                        transition: "background .15s ease",
                        "&:hover": {
                          backgroundColor: (theme) =>
                            theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34, mt: 0.25 }}>
                        <VideocamOutlinedIcon
                          fontSize="small"
                          color={
                            estadoActual === "grave" ? "error" : estadoActual === "medio" ? "warning" : "action"
                          }
                        />
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Stack spacing={0.25}>
                            {/* Fila 1: cámara + estado (solo lectura) */}
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography variant="body2" fontWeight={700}>
                                Cam {canal || "—"}
                              </Typography>
                              <Chip
                                size="small"
                                icon={
                                  estadoActual === "grave" ? (
                                    <ReportProblemOutlinedIcon />
                                  ) : estadoActual === "ok" ? (
                                    <DoneOutlinedIcon />
                                  ) : (
                                    <InfoOutlinedIcon />
                                  )
                                }
                                label={chipLabel}
                                color={colorChip}
                                variant={chipVariant}
                                sx={{ height: 22, cursor: "default" }}
                              />
                            </Stack>

                            {/* Fila 2: fecha */}
                            {created && (
                              <Typography variant="caption" color="text.secondary">
                                {fmtDate(created)}
                              </Typography>
                            )}
                          </Stack>
                        }
                        secondary={
                          !!notaFinal && (
                            <Tooltip title={notaFinal} placement="left" arrow>
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: 0.5,
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {notaFinal}
                              </Typography>
                            </Tooltip>
                          )
                        }
                        secondaryTypographyProps={{ component: "div" }}
                      />
                    </ListItem>
                  </Tooltip>
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
