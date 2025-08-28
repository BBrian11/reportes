// src/components/MonitoringWallboardTV.jsx
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

/* ========================= Palette ========================= */
export const PALETTE = {
  bg: "#0A0F1C", panel: "#0D1628", header: "#0B1324", border: "#1E2A44", track: "#1A263A",
  text: "#E8EEF7", subtext: "#A9BEDF", brand: "#2A9DF4",
  critical: "#FF3B30", criticalBg:"#2A1113", criticalFg:"#FFE5E7",
  warning:  "#FFC300", warningBg: "#2A2208", warningFg: "#FFF4D5",
  ok: "#00D97E", okBg: "#0E2318", okFg: "#D4FFE9",
  info: "#3B82F6", infoBg: "#0D1A2E", infoFg: "#DCEBFF",
  offline:"#A855F7", offlineBg:"#1A0F28", offlineFg:"#F3E8FF",
  tamper:"#FF4D6D", tamperBg:"#2A1120", tamperFg:"#FFE5E7",
  marqueeBg:"#2A1113", marqueeText:"#FFE5E7",
};

export const SEVERITY = {
  critical: { fill: PALETTE.critical,  bg: PALETTE.criticalBg,  fg: PALETTE.criticalFg },
  warning:  { fill: PALETTE.warning,   bg: PALETTE.warningBg,   fg: PALETTE.warningFg },
  ok:       { fill: PALETTE.ok,        bg: PALETTE.okBg,        fg: PALETTE.okFg },
  info:     { fill: PALETTE.info,      bg: PALETTE.infoBg,      fg: PALETTE.infoFg },
  offline:  { fill: PALETTE.offline,   bg: PALETTE.offlineBg,   fg: PALETTE.offlineFg },
  tamper:   { fill: PALETTE.tamper,    bg: PALETTE.tamperBg,    fg: PALETTE.tamperFg },
};
const sevColor = (sev) => SEVERITY[sev]?.fill || PALETTE.ok;

/* ========================= Helpers ========================= */
const tsToDate = (ts) => ts?.toDate?.() || (ts instanceof Date ? ts : ts ? new Date(ts) : null);
const preferDate = (d) => tsToDate(d?.controlRonda?.endTime) || tsToDate(d?.fechaEnvio) || tsToDate(d?.controlRonda?.startTime) || null;
const fmtAgo = (dt) => { if (!dt) return "—"; const s = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000)); if (s < 60) return `${s}s`; const m = Math.floor(s/60); if (m<60) return `${m}m`; const h = Math.floor(m/60); return `${h}h ${m%60}m`; };

const camSummaryFromTanda = (t) => {
  const cams = Array.isArray(t?.camaras) ? t.camaras : [];
  const counts = cams.reduce((acc, c) => {
    const e = String(c?.estado ?? "").toLowerCase();
    if (e === "grave") acc.grave += 1;
    else if (e === "medio") acc.medio += 1;
    else if (e === "ok") acc.ok += 1;
    else acc.nd += 1;
    return acc;
  }, { ok:0, medio:0, grave:0, nd:0 });
  return { total: cams.length, ...counts };
};

const deriveIssuesFromChecklist = (t) => {
  const issues = []; const c = t?.checklist || {};
  if (t?.checklist?.alarmaMonitoreada === true) {
    if (c.alarmaComunicacionOK === false) issues.push({ sev:"critical", label:"SIN COMMS" });
    if (c.alarmaTamper === true)          issues.push({ sev:"critical", label:"Tamper" });
    if (c.alarmaPanelArmado === false)    issues.push({ sev:"warning",  label:"DESARMADO" });
    if (c.alarmaZonasAbiertas === true)   issues.push({ sev:"warning",  label:"Zonas abiertas" });
    if (c.alarmaBateriaBaja === true)     issues.push({ sev:"warning",  label:"Batería baja" });
  }
  if (c.equipoOffline === true)  issues.push({ sev:"offline", label:"OFFLINE" });
  if (c.grabacionesOK === false) issues.push({ sev:"warning", label:"Falla grabaciones" });
  if (c.cortes220v === true)     issues.push({ sev:"critical", label:"Cortes 220V" });
  if (c.equipoHora === true)     issues.push({ sev:"warning", label:"Hora desfasada" });
  return issues;
};

const deriveIssuesFromCams = (sum) => {
  const out=[];
  if (sum.grave>0) out.push({ sev:"critical", label:`Cáms GRAVE: ${sum.grave}`});
  if (sum.medio>0) out.push({ sev:"warning", label:`Cáms MEDIO: ${sum.medio}`});
  return out;
};

const rankSev = { critical:0, offline:0, warning:1, info:2, ok:3 };
const worstSev = (issues) => issues.reduce((w,i)=> (rankSev[i.sev]<rankSev[w]?i.sev:w), "ok");

/* ========================= Pills (con blink) ========================= */
const PILL_COLORS = {
  ok:       { bg: PALETTE.okBg,       fg: PALETTE.okFg,       bd: PALETTE.ok },
  warning:  { bg: PALETTE.warningBg,  fg: PALETTE.warningFg,  bd: PALETTE.warning },
  critical: { bg: PALETTE.criticalBg, fg: PALETTE.criticalFg, bd: PALETTE.critical },
  offline:  { bg: PALETTE.offlineBg,  fg: PALETTE.offlineFg,  bd: PALETTE.offline },
  info:     { bg: PALETTE.infoBg,     fg: PALETTE.infoFg,     bd: PALETTE.info },
};
// colores de glow para el pulso
const GLOW = {
  offline: "rgba(168,85,247,.55)",
  critical:"rgba(255,59,48,.55)",
  warning: "rgba(255,195,0,.50)",
  ok:      "rgba(0,217,126,.45)",
  info:    "rgba(59,130,246,.45)",
};

function Pill({ label, sev="info", blink=false, sx }) {
  const c = PILL_COLORS[sev] || PILL_COLORS.info;
  const glow = GLOW[sev] || GLOW.info;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        padding: "2px 8px",
        mr: 0.5,
        mb: 0.5,
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 800,
        border: "1px solid",
        borderColor: c.bd,
        bgcolor: c.bg,
        color: c.fg,
        lineHeight: "18px",
        whiteSpace: "nowrap",
        ...(blink
          ? {
              position: "relative",
              animation: "pulseGlow 1.2s ease-out infinite",
              filter: "saturate(125%)",
            }
          : {}),
        "@keyframes pulseGlow": {
          "0%":   { boxShadow: `0 0 0 0 ${glow}` },
          "70%":  { boxShadow: `0 0 0 8px rgba(0,0,0,0)` },
          "100%": { boxShadow: `0 0 0 0 rgba(0,0,0,0)` },
        },
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}

/* ========================= Row ========================= */
const ClientRow = React.memo(function ClientRow({ row }) {
  const color = sevColor(row.worst);
  const c = row.checklist || {};

  // Estado / Alarma → pills (con blink en OFFLINE / SIN COMMS / Cortes 220V)
  const statusPills = [];
  statusPills.push(
    c.equipoOffline
      ? <Pill key="offline" label="OFFLINE" sev="offline" blink />
      : <Pill key="online"  label="ONLINE"  sev="ok" />
  );

  if (c.alarmaMonitoreada === true) {
    statusPills.push(
      c.alarmaComunicacionOK
        ? <Pill key="comm-ok" label="COMM OK" sev="ok" />
        : <Pill key="comm-no" label="SIN COMMS" sev="critical" blink />
    );
    statusPills.push(c.alarmaPanelArmado ? <Pill key="arm" label="ARMADO" sev="ok" /> : <Pill key="disarm" label="DESARMADO" sev="warning" />);
    if (c.alarmaZonasAbiertas) statusPills.push(<Pill key="zonas" label="Zonas abiertas" sev="warning" />);
    if (c.alarmaBateriaBaja)  statusPills.push(<Pill key="bat" label="Batería baja" sev="warning" />);
    if (c.alarmaTamper)       statusPills.push(<Pill key="tamper" label="Tamper" sev="warning" />);
  }

  if (c.grabacionesOK === false) statusPills.push(<Pill key="grab-ko" label="Falla grabaciones" sev="warning" />);
  if (c.grabacionesOK === true)  statusPills.push(<Pill key="grab-ok" label="Grab OK" sev="ok" />);
  if (c.cortes220v === true)     statusPills.push(<Pill key="220v" label="Cortes 220V" sev="critical" blink />);
  if (c.equipoHora === true)     statusPills.push(<Pill key="hora" label="Hora desfasada" sev="warning" />);

  // Resumen cámaras (solo mostrar MEDIO/GRAVE si querés compacto)
  const total = row.sum.total || 0;

  const rowBg =
    row.worst === "critical" ? SEVERITY.critical.bg :
    row.worst === "offline"  ? SEVERITY.offline.bg  :
    row.worst === "warning"  ? SEVERITY.warning.bg  :
    PALETTE.panel;

  return (
    <TableRow
      hover
      sx={{
        height: 64, background: rowBg,
        borderLeft: `6px solid ${color}`, outline: `1px solid ${PALETTE.border}`,
        boxShadow:
          row.worst === "critical"
            ? `0 0 0 1px ${PALETTE.border}, 0 0 18px 2px rgba(255,59,48,.18)`
            : row.worst === "offline"
            ? `0 0 0 1px ${PALETTE.border}, 0 0 18px 2px rgba(168,85,247,.18)`
            : "none",
      }}
    >
      {/* Cliente */}
      <TableCell sx={{ fontWeight: 900, whiteSpace: "nowrap", color: PALETTE.text }}>
        {row.cliente}
      </TableCell>

      {/* Resumen cámaras */}
      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
          <FaVideo style={{ opacity: 0.9 }} />
          <Typography variant="body1" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            Tot: {total}
          </Typography>
          <Pill label={`MEDIO ${row.sum.medio}`} sev="warning" />
          <Pill label={`GRAVE ${row.sum.grave}`} sev="critical" />
        </Stack>
      </TableCell>

      {/* Estados / Alarma */}
      <TableCell sx={{ color: PALETTE.text }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap" }}>
          <FaShieldAlt style={{ opacity: 0.9 }} />
          {statusPills.length ? statusPills : <Pill label="Sin alarma / OK" sev="ok" />}
        </Stack>
      </TableCell>

      {/* Turno / Operador */}
      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Typography variant="body1" sx={{ fontWeight: 800 }}>{row.turno || "—"}</Typography>
        <Typography variant="caption" sx={{ color: PALETTE.subtext }}>{row.operador || "—"}</Typography>
      </TableCell>

      {/* Tiempo */}
      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric:"tabular-nums" }}>{row.time ? fmtAgo(row.time) : "—"}</Typography>
        <Typography variant="caption" sx={{ color: PALETTE.subtext }}>{row.time?.toLocaleString?.("es-AR") || ""}</Typography>
      </TableCell>
    </TableRow>
  );
});

/* ========================= Main ========================= */
export default function MonitoringWallboardTV() {
  const ROW_HEIGHT = 64, HEADER_H = 80, FOOTER_H = 44, PAGE_MS = 12000;
  const [paused, setPaused] = useState(false);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "respuestas-tareas"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setDocs(list);
    });
    return () => unsub();
  }, []);

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
        const payload = { docId:id, cliente, operador, turno, time:baseTime, sum, checklist:t?.checklist || {}, issues };
        const prev = map.get(cliente);
        if (!prev || (baseTime && prev.time && baseTime > prev.time) || (!prev?.time && baseTime)) map.set(cliente, payload);
      }
    }
    const arr = Array.from(map.values()).map((x) => ({ ...x, worst: worstSev(x.issues) }));
    arr.sort((a,b) => {
      const ord = (s) => (s==="critical" || s==="offline" ? 0 : s==="warning" ? 1 : 2);
      const o = ord(a.worst) - ord(b.worst); if (o!==0) return o;
      return (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0);
    });
    return arr;
  }, [docs]);

  const kpis = useMemo(() => {
    const total = byClient.length;
    const critOrOff = byClient.filter((x) => x.worst === "critical" || x.worst === "offline").length;
    const warn = byClient.filter((x) => x.worst === "warning").length;
    const ok = total - critOrOff - warn;
    return { total, critOrOff, warn, ok };
  }, [byClient]);

  const containerRef = useRef(null);
  const [containerH, setContainerH] = useState(0);
  useEffect(() => {
    const measure = () => { const h = containerRef.current?.offsetHeight || window.innerHeight - HEADER_H; setContainerH(h); };
    measure(); const r = new ResizeObserver(measure);
    if (containerRef.current) r.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => { try { r.disconnect(); } catch {} window.removeEventListener("resize", measure); };
  }, []);

  const rowsPerPage = Math.max(6, Math.floor((containerH - FOOTER_H) / ROW_HEIGHT));
  const totalPages  = Math.max(1, Math.ceil((byClient.length || 1) / rowsPerPage));
  const [page, setPage] = useState(0);
  useEffect(() => { if (page > totalPages - 1) setPage(0); }, [totalPages, page]);
  useEffect(() => { if (paused) return; const id = setInterval(() => setPage((p) => (p + 1) % totalPages), PAGE_MS); return () => clearInterval(id); }, [totalPages, paused]);

  const pageRows = useMemo(() => byClient.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [byClient, page, rowsPerPage]);

  const marquee = useMemo(() => {
    const items = [];
    for (const x of byClient) for (const it of x.issues) if (it.sev === "critical" || it.sev === "offline") items.push({ cliente:x.cliente, label:it.label, time:x.time });
    items.sort((a,b)=> (b.time?.getTime?.()||0) - (a.time?.getTime?.()||0));
    return items.slice(0,40).map(ev => `${ev.cliente}: ${ev.label} (${ev.time ? fmtAgo(ev.time) : "—"})`).join("   •   ");
  }, [byClient]);

  return (
    <Box sx={{ height:"100vh", display:"grid", gridTemplateRows:"auto auto 1fr auto", bgcolor:PALETTE.bg, color:PALETTE.text, fontSize:16 }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor:PALETTE.header, borderBottom:`1px solid ${PALETTE.border}` }}>
        <Toolbar sx={{ minHeight:80 }}>
          <Typography variant="h5" sx={{ fontWeight:900, letterSpacing:.6 }}>Wallboard · Monitoreo</Typography>
          <Box sx={{ flex:1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Total ${kpis.total}`}        sx={{ bgcolor:"#1E293B", color:PALETTE.text, fontWeight:800, border:`1px solid ${PALETTE.border}` }} />
            <Chip label={`Crít/Off ${kpis.critOrOff}`} sx={{ bgcolor:"#5A0E3A", color:"#FFD6F6",   fontWeight:800, border:`1px solid ${PALETTE.border}` }} />
            <Chip label={`Avisos ${kpis.warn}`}        sx={{ bgcolor:"#5A420E", color:"#FFF2CC",   fontWeight:800, border:`1px solid ${PALETTE.border}` }} />
            <Divider orientation="vertical" flexItem sx={{ mx:1, borderColor:PALETTE.border }} />
            <IconButton onClick={() => setPaused(p=>!p)} sx={{ color:PALETTE.subtext }} title={paused ? "Reanudar rotación" : "Pausar rotación"}>
              {paused ? <FaPlay /> : <FaPause />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Marquee críticos */}
      <Box sx={{ height:38, display:"flex", alignItems:"center", color:PALETTE.marqueeText, bgcolor:PALETTE.marqueeBg, px:2, borderBottom:`1px solid ${PALETTE.border}`, overflow:"hidden", whiteSpace:"nowrap" }}>
        <FaExclamationTriangle style={{ marginRight:8 }} />
        <Typography sx={{ display:"inline-block", animation: marquee ? "scroll 40s linear infinite" : "none",
          "@keyframes scroll": { "0%":{ transform:"translateX(100%)" }, "100%":{ transform:"translateX(-100%)" } },
          fontWeight:800, letterSpacing:.4, textShadow:`0 1px 0 ${PALETTE.border}` }}>
          {marquee || "Sin críticos u OFFLINE pendientes"}
        </Typography>
      </Box>

      {/* Tabla */}
      <Box ref={containerRef} sx={{ overflow:"hidden", p:1.5 }}>
        <Paper elevation={0} sx={{ border:`1px solid ${PALETTE.border}`, bgcolor:PALETTE.panel }}>
          <Table stickyHeader size="small" sx={{
            "& th": { background:PALETTE.header, color:PALETTE.text, fontWeight:900, borderBottom:`1px solid ${PALETTE.border}`, fontSize:16, textTransform:"uppercase", letterSpacing:.06 },
            "& td": { color:PALETTE.text, borderBottom:`1px solid ${PALETTE.border}`, fontSize:15, height:64 },
          }}>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Resumen cámaras</TableCell>
                <TableCell>Estados / Alarma</TableCell>
                <TableCell>Turno / Operador</TableCell>
                <TableCell>Último rondín</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((row) => <ClientRow key={row.cliente} row={row} />)}
              {Array.from({ length: Math.max(0, rowsPerPage - pageRows.length) }).map((_, i) => (
                <TableRow key={`empty-${i}`} sx={{ height:64 }}>
                  <TableCell colSpan={5} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Footer / página */}
      <Box sx={{ height:44, display:"flex", alignItems:"center", justifyContent:"center", color:PALETTE.subtext, borderTop:`1px solid ${PALETTE.border}`, background:PALETTE.header }}>
        <Typography variant="caption" sx={{ letterSpacing:.5 }}>
          Página {totalPages ? page + 1 : 1}/{Math.max(1, totalPages)} · {new Date().toLocaleString("es-AR")}
        </Typography>
      </Box>
    </Box>
  );
}
