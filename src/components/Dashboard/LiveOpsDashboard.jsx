import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";

import {
  AppBar,
  Toolbar,
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  IconButton,
} from "@mui/material";
import { FaExclamationTriangle, FaShieldAlt, FaVideo, FaPause, FaPlay } from "react-icons/fa";
import "../../styles/wallboard-soc.css";
/* ========================= SOC/NOC Palette ========================= */
// colors-soc.js  —  Paleta PRO de Monitoreo (solo colores)
export const PALETTE = {
    /* Base UI */
    bg:        "#0A0F1C",   // fondo principal
    panel:     "#0D1628",   // paneles / tablas
    header:    "#0B1324",   // barras superiores
    border:    "#1E2A44",   // líneas y divisores
    track:     "#1A263A",   // pistas / barras vacías
  
    /* Texto */
    text:      "#E8EEF7",   // texto principal
    subtext:   "#A9BEDF",   // texto secundario
    brand:     "#2A9DF4",   // acento (links/info)
  
    /* Severidades (colores SOC reales) */
    critical:  "#FF3B30",   // rojo alarma
    criticalBg:"#2A1113",   // fondo fila/Chip crítico (oscuro)
    criticalFg:"#FFE5E7",   // texto sobre crítico
  
    warning:   "#FFC300",   // ámbar aviso
    warningBg: "#2A2208",
    warningFg: "#FFF4D5",
  
    ok:        "#00D97E",   // verde OK
    okBg:      "#0E2318",
    okFg:      "#D4FFE9",
  
    info:      "#3B82F6",   // azul informativo
    infoBg:    "#0D1A2E",
    infoFg:    "#DCEBFF",
  
    /* Estados frecuentes en monitoreo */
    offline:   "#A855F7",   // violeta “offline”
    offlineBg: "#1A0F28",
    offlineFg: "#F3E8FF",
  
    tamper:    "#FF4D6D",   // tamper / tapa
    tamperBg:  "#2A1120",
    tamperFg:  "#FFE5E7",
  
    /* Marquee / alert ticker */
    marqueeBg:   "#2A1113",
    marqueeText: "#FFE5E7",
  };
  
  /* Mapa de severidades listo para usar en filas, chips y barras */
  export const SEVERITY = {
    critical: { fill: PALETTE.critical,  bg: PALETTE.criticalBg,  fg: PALETTE.criticalFg },
    warning:  { fill: PALETTE.warning,   bg: PALETTE.warningBg,   fg: PALETTE.warningFg },
    ok:       { fill: PALETTE.ok,        bg: PALETTE.okBg,        fg: PALETTE.okFg },
    info:     { fill: PALETTE.info,      bg: PALETTE.infoBg,      fg: PALETTE.infoFg },
    offline:  { fill: PALETTE.offline,   bg: PALETTE.offlineBg,   fg: PALETTE.offlineFg },
    tamper:   { fill: PALETTE.tamper,    bg: PALETTE.tamperBg,    fg: PALETTE.tamperFg },
  };
  
  /* Helpers ultra simples para aplicar colores en componentes */

  

/* ========================= Helpers ========================= */
const tsToDate = (ts) => ts?.toDate?.() || (ts instanceof Date ? ts : ts ? new Date(ts) : null);

const preferDate = (d) =>
  tsToDate(d?.controlRonda?.endTime) ||
  tsToDate(d?.fechaEnvio) ||
  tsToDate(d?.controlRonda?.startTime) ||
  null;

const fmtAgo = (dt) => {
  if (!dt) return "—";
  const s = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const camSummaryFromTanda = (t) => {
  const cams = Array.isArray(t?.camaras) ? t.camaras : [];
  const counts = cams.reduce(
    (acc, c) => {
      const e = String(c?.estado ?? "").toLowerCase();
      if (e === "grave") acc.grave += 1;
      else if (e === "medio") acc.medio += 1;
      else if (e === "ok") acc.ok += 1;
      else acc.nd += 1;
      return acc;
    },
    { ok: 0, medio: 0, grave: 0, nd: 0 }
  );
  const total = cams.length;
  return { total, ...counts };
};

const deriveIssuesFromChecklist = (t) => {
  const issues = [];
  const c = t?.checklist || {};
  if (t?.checklist?.alarmaMonitoreada === true) {
    if (c.alarmaComunicacionOK === false) issues.push({ sev: "critical", label: "Alarma sin comunicación" });
    if (c.alarmaTamper === true)         issues.push({ sev: "critical", label: "Tamper" });
    if (c.alarmaPanelArmado === false)   issues.push({ sev: "warning",  label: "Panel desarmado" });
    if (c.alarmaZonasAbiertas === true)  issues.push({ sev: "warning",  label: "Zonas abiertas" });
    if (c.alarmaBateriaBaja === true)    issues.push({ sev: "warning",  label: "Batería baja" });
  }
  if (c.grabacionesOK === false) issues.push({ sev: "warning", label: "Falla grabaciones" });
  if (c.equipoOffline === true)  issues.push({ sev: "critical", label: "Equipo offline" });
  if (c.cortes220v === true)     issues.push({ sev: "warning", label: "Cortes 220V" });
  return issues;
};

const deriveIssuesFromCams = (sum) => {
  const out = [];
  if (sum.grave > 0) out.push({ sev: "critical", label: `Cáms GRAVE: ${sum.grave}` });
  if (sum.medio > 0) out.push({ sev: "warning", label: `Cáms MEDIO: ${sum.medio}` });
  return out;
};

const worstSev = (issues) =>
  issues.some((i) => i.sev === "critical") ? "critical"
  : issues.some((i) => i.sev === "warning") ? "warning"
  : "ok";

  export const sevColor = (sev) => SEVERITY[sev]?.fill || PALETTE.ok;
  export const sevBg    = (sev) => SEVERITY[sev]?.bg   || PALETTE.panel;
  export const sevFg    = (sev) => SEVERITY[sev]?.fg   || PALETTE.text;
/* ========================= Row (puro, sin hooks) ========================= */
const ClientRow = React.memo(function ClientRow({ row }) {
  const color = sevColor(row.worst);
  const bar = (value) => (
    <LinearProgress
      variant="determinate"
      value={value}
      sx={{
        height: 10,
        borderRadius: 6,
        bgcolor: PALETTE.track,
        "& .MuiLinearProgress-bar": { bgcolor: color },
      }}
    />
  );

  // Alarm chips
  const alarmChips = [];
  if (row.checklist?.alarmaMonitoreada === true) {
    alarmChips.push(
      <Chip
        key="comm"
        size="small"
        label={`Comm ${row.checklist.alarmaComunicacionOK ? "OK" : "NO"}`}
        sx={{
          bgcolor: row.checklist.alarmaComunicacionOK ? PALETTE.okBg : PALETTE.criticalBg,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.border}`,
        }}
      />
    );
    alarmChips.push(
      <Chip
        key="arm"
        size="small"
        label={row.checklist.alarmaPanelArmado ? "ON" : "OFF"}
        sx={{
          bgcolor: row.checklist.alarmaPanelArmado ? PALETTE.okBg : PALETTE.warningBg,
          color: PALETTE.text,
          border: `1px solid ${PALETTE.border}`,
        }}
      />
    );
    if (row.checklist.alarmaZonasAbiertas === true)
      alarmChips.push(<Chip key="zonas" size="small" label="Zonas abiertas" sx={{ bgcolor: PALETTE.warningBg, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }} />);
    if (row.checklist.alarmaBateriaBaja === true)
      alarmChips.push(<Chip key="bat" size="small" label="Batería baja" sx={{ bgcolor: PALETTE.warningBg, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }} />);
    if (row.checklist.alarmaTamper === true)
      alarmChips.push(<Chip key="tamper" size="small" label="Tamper" sx={{ bgcolor: PALETTE.criticalBg, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }} />);
  }

  const issuesShort = row.issues.slice(0, 3).map((i, idx) => (
    <Chip
      key={idx}
      size="small"
      label={i.label}
      sx={{
        bgcolor: i.sev === "critical" ? PALETTE.criticalBg : PALETTE.warningBg,
        color: PALETTE.text,
        border: `1px solid ${PALETTE.border}`,
        mr: 0.5,
      }}
    />
  ));

  const total = row.sum.total || 0;
  const okPct    = total ? Math.round((row.sum.ok   / total) * 100) : 0;
  const medioPct = total ? Math.round((row.sum.medio/ total) * 100) : 0;
  const gravePct = total ? Math.round((row.sum.grave/ total) * 100) : 0;

  return (
    <TableRow
      hover
      sx={{
        height: 64,
        background:
          row.worst === "critical" ? PALETTE.criticalBg
        : row.worst === "warning"  ? PALETTE.warningBg
        : PALETTE.panel,
        borderLeft: `6px solid ${color}`,
        outline: `1px solid ${PALETTE.border}`,
        // glow leve en críticos
        boxShadow: row.worst === "critical" ? `0 0 0 1px ${PALETTE.border}, 0 0 18px 2px rgba(255,59,48,.18)` : "none",
      }}
    >
      <TableCell sx={{ fontWeight: 900, whiteSpace: "nowrap", color: PALETTE.text }}>
        {row.cliente}
      </TableCell>

      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FaVideo style={{ opacity: 0.9 }} />
          <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric:"tabular-nums" }}>Tot: {total}</Typography>
          <Chip size="small" label={`OK ${row.sum.ok}`}    sx={{ bgcolor: PALETTE.okBg,       color: PALETTE.text, border: `1px solid ${PALETTE.border}` }} />
          <Chip size="small" label={`Med ${row.sum.medio}`} sx={{ bgcolor: PALETTE.warningBg,  color: PALETTE.text, border: `1px solid ${PALETTE.border}` }} />
          <Chip size="small" label={`Grv ${row.sum.grave}`} sx={{ bgcolor: PALETTE.criticalBg, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }} />
        </Stack>
      </TableCell>

      <TableCell sx={{ color: PALETTE.text }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 160 }}>{bar(Math.min(100, okPct + (50 - gravePct)))}</Box>
          <Typography variant="body2" sx={{ color: PALETTE.subtext, fontWeight: 600, fontVariantNumeric:"tabular-nums" }}>
            OK {okPct}% · M {medioPct}% · G {gravePct}%
          </Typography>
        </Stack>
      </TableCell>

      <TableCell sx={{ color: PALETTE.text }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap" }}>
          <FaShieldAlt style={{ opacity: 0.9 }} />
          {alarmChips.length ? (
            alarmChips
          ) : (
            <Chip size="small" label="Sin alarma / OK" sx={{ bgcolor: PALETTE.okBg, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }} />
          )}
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Typography variant="body1" sx={{ fontWeight: 800 }}>{row.turno || "—"}</Typography>
        <Typography variant="caption" sx={{ color: PALETTE.subtext }}>{row.operador || "—"}</Typography>
      </TableCell>

      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric:"tabular-nums" }}>{row.time ? fmtAgo(row.time) : "—"}</Typography>
        <Typography variant="caption" sx={{ color: PALETTE.subtext }}>{row.time?.toLocaleString?.("es-AR") || ""}</Typography>
      </TableCell>

     
    </TableRow>
  );
});

/* ========================= Main ========================= */
export default function MonitoringWallboardTV() {
  // ---- UI/board config
  const ROW_HEIGHT = 64;    // px por fila
  const HEADER_H   = 80;    // altura header
  const FOOTER_H   = 44;    // altura footer
  const PAGE_MS    = 12000; // rotación auto (12s)
  const [paused, setPaused] = useState(false);

  // ---- Data (read-only)
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "respuestas-tareas"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setDocs(list);
    });
    return () => unsub();
  }, []);

  // ---- Derivar “último rondín por cliente” y criticidad
  const byClient = useMemo(() => {
    const map = new Map();
    for (const { id, data } of docs) {
      const baseTime = preferDate(data);
      const turno = data?.respuestas?.turno || data?.turno || "";
      const operador = data?.operador || "—";
      const tandas = Array.isArray(data?.respuestas?.tandas) ? data.respuestas.tandas : [];
      for (const t of tandas) {
        const cliente = t?.cliente || "Sin cliente";
        const sum = camSummaryFromTanda(t);
        const issues = [...deriveIssuesFromCams(sum), ...deriveIssuesFromChecklist(t)];
        const payload = { docId: id, cliente, operador, turno, time: baseTime, sum, checklist: t?.checklist || {}, issues };
        const prev = map.get(cliente);
        if (!prev || (baseTime && prev.time && baseTime > prev.time) || (!prev?.time && baseTime)) {
          map.set(cliente, payload);
        }
      }
    }
    const arr = Array.from(map.values()).map((x) => ({ ...x, worst: worstSev(x.issues) }));
    // Orden: críticos, avisos, OK; dentro, por recencia
    arr.sort((a, b) => {
      const ord = (s) => (s === "critical" ? 0 : s === "warning" ? 1 : 2);
      const o = ord(a.worst) - ord(b.worst);
      if (o !== 0) return o;
      return (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0);
    });
    return arr;
  }, [docs]);

  // ---- KPI superiores
  const kpis = useMemo(() => {
    const total = byClient.length;
    const crit  = byClient.filter((x) => x.worst === "critical").length;
    const warn  = byClient.filter((x) => x.worst === "warning").length;
    const ok    = total - crit - warn;
    return { total, crit, warn, ok };
  }, [byClient]);

  // ---- Layout + paginación auto
  const containerRef = useRef(null);
  const [containerH, setContainerH] = useState(0);

  useEffect(() => {
    const measure = () => {
      const h = containerRef.current?.offsetHeight || window.innerHeight - HEADER_H;
      setContainerH(h);
    };
    measure();
    const r = new ResizeObserver(measure);
    if (containerRef.current) r.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      try { r.disconnect(); } catch {}
      window.removeEventListener("resize", measure);
    };
  }, []);

  const rowsPerPage = Math.max(6, Math.floor((containerH - FOOTER_H) / ROW_HEIGHT));
  const totalPages  = Math.max(1, Math.ceil((byClient.length || 1) / rowsPerPage));
  const [page, setPage] = useState(0);

  useEffect(() => { if (page > totalPages - 1) setPage(0); }, [totalPages, page]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setPage((p) => (p + 1) % totalPages), PAGE_MS);
    return () => clearInterval(id);
  }, [totalPages, paused]);

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage;
    return byClient.slice(start, start + rowsPerPage);
  }, [byClient, page, rowsPerPage]);

  // ---- Marquee de críticos
  const marquee = useMemo(() => {
    const items = [];
    for (const x of byClient) {
      for (const it of x.issues) {
        if (it.sev === "critical") items.push({ cliente: x.cliente, label: it.label, time: x.time });
      }
    }
    items.sort((a, b) => (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0));
    const take = items.slice(0, 40);
    return take.map((ev) => `${ev.cliente}: ${ev.label} (${ev.time ? fmtAgo(ev.time) : "—"})`).join("   •   ");
  }, [byClient]);

  return (
    <Box sx={{ height: "100vh", display: "grid", gridTemplateRows: "auto auto 1fr auto", bgcolor: PALETTE.bg, color: PALETTE.text, fontSize: 16 }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: PALETTE.header, borderBottom: `1px solid ${PALETTE.border}` }}>
        <Toolbar sx={{ minHeight: 80 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0.6 }}>Wallboard · Monitoreo</Typography>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Total ${kpis.total}`}  sx={{ bgcolor: "#1E293B", color: PALETTE.text, fontWeight: 800, border: `1px solid ${PALETTE.border}` }} />
            <Chip label={`Críticos ${kpis.crit}`} sx={{ bgcolor: "#5A0E12", color: "#FFDAD6", fontWeight: 800, border: `1px solid ${PALETTE.border}` }} />
            <Chip label={`Avisos ${kpis.warn}`}   sx={{ bgcolor: "#5A420E", color: "#FFF2CC", fontWeight: 800, border: `1px solid ${PALETTE.border}` }} />
          
            <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: PALETTE.border }} />
            <IconButton onClick={() => setPaused((p) => !p)} sx={{ color: PALETTE.subtext }} title={paused ? "Reanudar rotación" : "Pausar rotación"}>
              {paused ? <FaPlay /> : <FaPause />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Marquee críticos */}
      <Box sx={{ height: 38, display: "flex", alignItems: "center", color: PALETTE.marqueeText, bgcolor: PALETTE.marqueeBg, px: 2, borderBottom: `1px solid ${PALETTE.border}`, overflow: "hidden", whiteSpace: "nowrap" }}>
        <FaExclamationTriangle style={{ marginRight: 8 }} />
        <Typography
          sx={{
            display: "inline-block",
            animation: marquee ? "scroll 40s linear infinite" : "none",
            "@keyframes scroll": {
              "0%": { transform: "translateX(100%)" },
              "100%": { transform: "translateX(-100%)" },
            },
            fontWeight: 800,
            letterSpacing: 0.4,
            textShadow: `0 1px 0 ${PALETTE.border}`,
          }}
        >
          {marquee || "Sin críticos pendientes"}
        </Typography>
      </Box>

      {/* Tabla paginada automáticamente */}
      <Box ref={containerRef} sx={{ overflow: "hidden", p: 1.5 }}>
        <Paper elevation={0} sx={{ border: `1px solid ${PALETTE.border}`, bgcolor: PALETTE.panel }}>
          <Table
            stickyHeader
            size="small"
            sx={{
              "& th": {
                background: PALETTE.header,
                color: PALETTE.text,
                fontWeight: 900,
                borderBottom: `1px solid ${PALETTE.border}`,
                fontSize: 16,
                textTransform: "uppercase",
                letterSpacing: 0.06,
              },
              "& td": {
                color: PALETTE.text,
                borderBottom: `1px solid ${PALETTE.border}`,
                fontSize: 15,
                height: 64,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Resumen cámaras</TableCell>
                <TableCell>Salud</TableCell>
                <TableCell>Alarma</TableCell>
                <TableCell>Turno / Operador</TableCell>
                <TableCell>Último rondín</TableCell>
               
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((row) => <ClientRow key={row.cliente} row={row} />)}
              {Array.from({ length: Math.max(0, rowsPerPage - pageRows.length) }).map((_, i) => (
                <TableRow key={`empty-${i}`} sx={{ height: 64 }}>
                  <TableCell colSpan={7} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Footer / página */}
      <Box sx={{ height: 44, display:"flex", alignItems:"center", justifyContent:"center", color: PALETTE.subtext, borderTop:`1px solid ${PALETTE.border}`, background: PALETTE.header }}>
        <Typography variant="caption" sx={{ letterSpacing:.5 }}>
          Página {totalPages ? page + 1 : 1}/{Math.max(1, totalPages)} · {new Date().toLocaleString("es-AR")}
        </Typography>
      </Box>
    </Box>
  );
}
