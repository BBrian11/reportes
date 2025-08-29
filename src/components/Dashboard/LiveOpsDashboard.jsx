// src/components/MonitoringWallboardTV.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
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

import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaVideo,
  FaPause,
  FaPlay,
  FaEdit,
  FaHistory,
  FaBell,
  FaBellSlash,
  FaDownload,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
} from "react-icons/fa";

import "../../styles/wallboard-soc.css";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import "sweetalert2/dist/sweetalert2.min.css";

const MySwal = withReactContent(Swal);

/* ========================= Palette ========================= */
export const PALETTE = {
  bg: "#0A0F1C",
  panel: "#0D1628",
  header: "#0B1324",
  border: "#1E2A44",
  track: "#1A263A",
  text: "#E8EEF7",
  subtext: "#A9BEDF",
  brand: "#2A9DF4",
  critical: "#FF3B30",
  criticalBg: "#2A1113",
  criticalFg: "#FFE5E7",
  warning: "#FFC300",
  warningBg: "#2A2208",
  warningFg: "#FFF4D5",
  ok: "#00D97E",
  okBg: "#0E2318",
  okFg: "#D4FFE9",
  info: "#3B82F6",
  infoBg: "#0D1A2E",
  infoFg: "#DCEBFF",
  offline: "#FF3B30",
  offlineBg: "#2A1113",
  offlineFg: "#FFE5E7",
  tamper: "#A855F7",
  tamperBg: "#1A0F28",
  tamperFg: "#F3E8FF",
  marqueeBg: "#2A1113",
  marqueeText: "#FFE5E7",
};

export const SEVERITY = {
  critical: { fill: PALETTE.critical, bg: PALETTE.criticalBg, fg: PALETTE.criticalFg },
  warning: { fill: PALETTE.warning, bg: PALETTE.warningBg, fg: PALETTE.warningFg },
  ok: { fill: PALETTE.ok, bg: PALETTE.okBg, fg: PALETTE.okFg },
  info: { fill: PALETTE.info, bg: PALETTE.infoBg, fg: PALETTE.infoFg },
  offline: { fill: PALETTE.offline, bg: PALETTE.offlineBg, fg: PALETTE.offlineFg },
  tamper: { fill: PALETTE.tamper, bg: PALETTE.tamperBg, fg: PALETTE.tamperFg },
};
const sevColor = (sev) => SEVERITY[sev]?.fill || PALETTE.ok;

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

/* Cam summary */
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
  return { total: cams.length, ...counts };
};

const deriveIssuesFromChecklist = (t) => {
  const issues = [];
  const c = t?.checklist || {};
  if (t?.checklist?.alarmaMonitoreada === true) {
    if (c.alarmaComunicacionOK === false) issues.push({ sev: "critical", label: "SIN COMMS" });
    if (c.alarmaTamper === true) issues.push({ sev: "critical", label: "Tamper" });
    if (c.alarmaPanelArmado === false) issues.push({ sev: "warning", label: "DESARMADO" });
    if (c.alarmaZonasAbiertas === true) issues.push({ sev: "warning", label: "Zonas abiertas" });
    if (c.alarmaBateriaBaja === true) issues.push({ sev: "warning", label: "Batería baja" });
  }
  if (c.equipoOffline === true) issues.push({ sev: "offline", label: "OFFLINE" });
  if (c.grabacionesOK === false) issues.push({ sev: "warning", label: "Falla grabaciones" });
  if (c.cortes220v === true) issues.push({ sev: "critical", label: "Cortes 220V" });
  if (c.equipoHora === true) issues.push({ sev: "warning", label: "Hora desfasada" });
  return issues;
};

const deriveIssuesFromCams = (sum) => {
  const out = [];
  if (sum.grave > 0) out.push({ sev: "critical", label: `Cáms GRAVE: ${sum.grave}` });
  if (sum.medio > 0) out.push({ sev: "warning", label: `Cáms MEDIO: ${sum.medio}` });
  return out;
};

const rankSev = { critical: 0, offline: 0, warning: 1, info: 2, ok: 3 };
const worstSev = (issues) => issues.reduce((w, i) => (rankSev[i.sev] < rankSev[w] ? i.sev : w), "ok");

/* ========================= Pills (con blink) ========================= */
const PILL_COLORS = {
  ok: { bg: PALETTE.okBg, fg: PALETTE.okFg, bd: PALETTE.ok },
  warning: { bg: PALETTE.warningBg, fg: PALETTE.warningFg, bd: PALETTE.warning },
  critical: { bg: PALETTE.criticalBg, fg: PALETTE.criticalFg, bd: PALETTE.critical },
  offline: { bg: PALETTE.offlineBg, fg: PALETTE.offlineFg, bd: PALETTE.offline },
  info: { bg: PALETTE.infoBg, fg: PALETTE.infoFg, bd: PALETTE.info },
};

const GLOW = {
  offline: "rgba(220, 38, 38, 0.65)",
  critical: "rgba(220, 38, 38, 0.65)",
  warning: "rgba(138, 43, 226, 0.60)",
  ok: "rgba(16, 185, 129, 0.55)",
  info: "rgba(37, 99, 235, 0.55)",
};

function Pill({ label, sev = "info", blink = false, sx }) {
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
          "0%": { boxShadow: `0 0 0 0 ${glow}` },
          "70%": { boxShadow: `0 0 0 8px rgba(0,0,0,0)` },
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
const ClientRow = React.memo(function ClientRow({ row, onOpen, onToggleAck, onHistory }) {
  const color = sevColor(row.worst);
  const c = row.checklist || {};
  const now = Date.now();
  const ackActive = row.ackUntil && row.ackUntil.getTime() > now;
  const mFrom = row.maintenanceFrom?.getTime?.();
  const mTo = row.maintenanceTo?.getTime?.();
  const mantActive = (mFrom ? now >= mFrom : false) && (mTo ? now <= mTo : false);

  const statusPills = [];
  statusPills.push(
    c.equipoOffline ? (
      <Pill key="offline" label="OFFLINE" sev="offline" blink={!ackActive && !mantActive} />
    ) : (
      <Pill key="online" label="ONLINE" sev="ok" />
    )
  );

  if (c.alarmaMonitoreada === true) {
    statusPills.push(
      c.alarmaComunicacionOK ? (
        <Pill key="comm-ok" label="COMM OK" sev="ok" />
      ) : (
        <Pill key="comm-no" label="SIN COMMS" sev="critical" blink={!ackActive && !mantActive} />
      )
    );
    statusPills.push(c.alarmaPanelArmado ? <Pill key="arm" label="ARMADO" sev="ok" /> : <Pill key="disarm" label="DESARMADO" sev="warning" />);
    if (c.alarmaZonasAbiertas) statusPills.push(<Pill key="zonas" label="Zonas abiertas" sev="warning" />);
    if (c.alarmaBateriaBaja) statusPills.push(<Pill key="bat" label="Batería baja" sev="warning" />);
  }
  if (c.grabacionesOK === false) statusPills.push(<Pill key="grab-ko" label="Falla grabaciones" sev="warning" />);
  if (c.cortes220v === true) statusPills.push(<Pill key="220v" label="Cortes 220V" sev="critical" blink={!ackActive && !mantActive} />);
  if (c.equipoHora === true) statusPills.push(<Pill key="hora" label="Hora desfasada" sev="warning" />);
  if (ackActive) statusPills.push(<Pill key="ack" label={`ACK hasta ${row.ackUntil.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`} sev="info" />);
  if (mantActive) statusPills.push(<Pill key="mant" label="MANTENIMIENTO" sev="info" />);

  if (row.escalation?.to) statusPills.push(<Pill key="esc" label={`ESC → ${row.escalation.to}`} sev="warning" />);

  const rowBg =
    row.worst === "critical" ? PALETTE.criticalBg : row.worst === "offline" ? PALETTE.offlineBg : row.worst === "warning" ? PALETTE.warningBg : PALETTE.panel;

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") onOpen?.(row);
  };

  return (
    <TableRow
      hover
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(row)}
      onKeyDown={handleKey}
      sx={{
        cursor: "pointer",
        height: 64,
        background: rowBg,
        opacity: ackActive || mantActive ? 0.7 : 1,
        borderLeft: `6px solid ${color}`,
        outline: `1px solid ${PALETTE.border}`,
        boxShadow:
          row.worst === "critical"
            ? `0 0 0 1px ${PALETTE.border}, 0 0 18px 2px rgba(255,59,48,.18)`
            : row.worst === "offline"
            ? `0 0 0 1px ${PALETTE.border}, 0 0 18px 2px rgba(168,85,247,.18)`
            : "none",
      }}
    >
      {/* Cliente */}
      <TableCell sx={{ fontWeight: 900, whiteSpace: "nowrap", color: PALETTE.text }}>{row.cliente}</TableCell>

      {/* Resumen cámaras */}
      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
          <FaVideo style={{ opacity: 0.9 }} />
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

      {/* Operador + ACK + Historial */}
      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1" sx={{ fontWeight: 800 }}>
            {row.operador || "—"}
          </Typography>
          <IconButton
            size="small"
            title={ackActive ? "Quitar ACK" : "Reconocer (ACK) por 1 hora"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleAck?.(row, ackActive ? null : new Date(Date.now() + 60 * 60 * 1000));
            }}
            sx={{ color: PALETTE.subtext }}
          >
            {ackActive ? <FaBellSlash /> : <FaBell />}
          </IconButton>
          <IconButton
            size="small"
            title="Ver historial del cliente"
            onClick={(e) => {
              e.stopPropagation();
              onHistory?.(row);
            }}
            sx={{ color: PALETTE.subtext }}
          >
            <FaHistory />
          </IconButton>
        </Stack>
      </TableCell>

      {/* Tiempo */}
      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {row.time ? fmtAgo(row.time) : "—"}
        </Typography>
        <Typography variant="caption" sx={{ color: PALETTE.subtext }}>
          {row.time?.toLocaleString?.("es-AR") || ""}
        </Typography>
      </TableCell>
    </TableRow>
  );
});

/* ========================= Main ========================= */
export default function MonitoringWallboardTV() {
  const ROW_HEIGHT = 64,
    HEADER_H = 80,
    FOOTER_H = 44,
    PAGE_MS = 12000;

  const [paused, setPaused] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef(null);

  const [docs, setDocs] = useState([]);

  // ====== Firestore listener ======
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "respuestas-tareas"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setDocs(list);
    });
    return () => unsub();
  }, []);

  // ====== Ticker manual ======
  const [tickerItems, setTickerItems] = useState([]); // { text, time }
  const [tickerInput, setTickerInput] = useState("");
  const addTickerItem = () => {
    const t = tickerInput?.trim();
    if (!t) return;
    setTickerItems((prev) => [{ text: t, time: new Date() }, ...prev].slice(0, 50));
    setTickerInput("");
  };
  const clearTickerItems = () => setTickerItems([]);

  // ====== Datos agregados por cliente (sin filtros) ======
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
        const ackUntil = tsToDate(t?.ackUntil);
        const maintenanceFrom = tsToDate(t?.maintenanceFrom);
        const maintenanceTo = tsToDate(t?.maintenanceTo);
        const escalation = t?.escalation || null;
        const payload = {
          docId: id,
          cliente,
          operador,
          turno,
          time: baseTime,
          sum,
          checklist: t?.checklist || {},
          issues,
          notas: t?.notas || "",
          ackUntil,
          maintenanceFrom,
          maintenanceTo,
          escalation,
          worst: "ok",
        };
        payload.worst = worstSev(payload.issues);
        const prev = map.get(cliente);
        if (!prev || (baseTime && prev.time && baseTime > prev.time) || (!prev?.time && baseTime)) map.set(cliente, payload);
      }
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const ord = (s) => (s === "critical" || s === "offline" ? 0 : s === "warning" ? 1 : 2);
      const o = ord(a.worst) - ord(b.worst);
      if (o !== 0) return o;
      return (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0);
    });
    return arr;
  }, [docs]);

  // ====== Detección de NUEVOS críticos/offline (beep + toast) ======
  const prevSevSet = useRef(new Set());
  useEffect(() => {
    const now = Date.now();
    const cur = new Set();
    for (const r of byClient) {
      const ackActive = r.ackUntil && r.ackUntil.getTime() > now;
      const mFrom = r.maintenanceFrom?.getTime?.();
      const mTo = r.maintenanceTo?.getTime?.();
      const mantActive = (mFrom ? now >= mFrom : false) && (mTo ? now <= mTo : false);
      if (ackActive || mantActive) continue;
      for (const it of r.issues) {
        if (it.sev === "critical" || it.sev === "offline") {
          cur.add(`${r.cliente}|${it.label}`);
        }
      }
    }
    let newCount = 0;
    for (const k of cur) if (!prevSevSet.current.has(k)) newCount++;
    prevSevSet.current = cur;
    if (newCount > 0) {
      if (soundOn) beep();
      MySwal.fire({
        toast: true,
        icon: "warning",
        position: "top-end",
        title: `${newCount} nuevo(s) evento(s) crítico/offline`,
        showConfirmButton: false,
        timer: 2000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byClient]);

  // ====== KPIs (de todo) ======
  const kpis = useMemo(() => {
    const total = byClient.length;
    const critOrOff = byClient.filter((x) => x.worst === "critical" || x.worst === "offline").length;
    const warn = byClient.filter((x) => x.worst === "warning").length;
    const ok = total - critOrOff - warn;
    return { total, critOrOff, warn, ok };
  }, [byClient]);

  // ====== Layout / paginación automática ======
  const containerRef = useRef(null);
  const [containerH, setContainerH] = useState(0);
  useEffect(() => {
    const measure = () => {
      const h = containerRef.current?.offsetHeight || window.innerHeight - HEADER_H;
      setContainerH(h);
    };
    measure();
    let r = null;
    if (typeof ResizeObserver !== "undefined") {
      r = new ResizeObserver(measure);
      if (containerRef.current) r.observe(containerRef.current);
    }
    window.addEventListener("resize", measure);
    return () => {
      try {
        r?.disconnect();
      } catch {}
      window.removeEventListener("resize", measure);
    };
  }, []);

  const rowsPerPage = Math.max(6, Math.floor((containerH - FOOTER_H) / ROW_HEIGHT));
  const totalPages = Math.max(1, Math.ceil((byClient.length || 1) / rowsPerPage));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setPage((p) => (p + 1) % totalPages), PAGE_MS);
    return () => clearInterval(id);
  }, [totalPages, paused]);

  const pageRows = useMemo(() => byClient.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [byClient, page, rowsPerPage]);

  // ====== Marquee (manual + auto, omite ACK y Mantenimiento) ======
  const marquee = useMemo(() => {
    const auto = [];
    const now = Date.now();
    for (const x of byClient) {
      const ackActive = x.ackUntil && x.ackUntil.getTime() > now;
      const mFrom = x.maintenanceFrom?.getTime?.();
      const mTo = x.maintenanceTo?.getTime?.();
      const mantActive = (mFrom ? now >= mFrom : false) && (mTo ? now <= mTo : false);
      if (ackActive || mantActive) continue;
      for (const it of x.issues) {
        if (it.sev === "critical" || it.sev === "offline") {
          auto.push({ text: `${x.cliente}: ${it.label}`, time: x.time });
        }
      }
    }
    auto.sort((a, b) => (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0));
    const autoStr = auto
      .slice(0, 40)
      .map((ev) => `${ev.text} (${ev.time ? fmtAgo(ev.time) : "—"})`)
      .join("   •   ");

    const manualStr = tickerItems.map((ev) => `${ev.text}`).join("   •   ");
    const both = [manualStr, autoStr].filter(Boolean).join("   •   ");
    return both || "";
  }, [byClient, tickerItems]);

  /* ====== Fullscreen helpers ====== */
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFs = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ====== Sonido (beep) ======
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current || new Ctx();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 720;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      o.start();
      o.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  // ====== Helpers/Acciones ======
  function buildAutoTickerItems() {
    const auto = [];
    const now = Date.now();
    for (const x of byClient) {
      const ackActive = x.ackUntil && x.ackUntil.getTime() > now;
      const mFrom = x.maintenanceFrom?.getTime?.();
      const mTo = x.maintenanceTo?.getTime?.();
      const mantActive = (mFrom ? now >= mFrom : false) && (mTo ? now <= mTo : false);
      if (ackActive || mantActive) continue;
      for (const it of x.issues) {
        if (it.sev === "critical" || it.sev === "offline") {
          auto.push({ text: `${x.cliente}: ${it.label} (${x.time ? fmtAgo(x.time) : "—"})`, time: x.time });
        }
      }
    }
    auto.sort((a, b) => (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0));
    return auto.slice(0, 40);
  }

  async function openTickerManager() {
    try {
      setPaused(true);
      const autoItems = buildAutoTickerItems();
      const manualText = tickerItems.map((it) => it.text).join("\n");
      const autoText = autoItems.map((it) => it.text).join("\n") || "— (no hay eventos automáticos)";

      const result = await MySwal.fire({
        title: "Editar ticker (marquee)",
        html: `
          <div style="text-align:left">
            <div style="font-weight:800;margin-bottom:6px">Mensajes manuales (editables)</div>
            <textarea id="swal-ticker-manual" class="swal2-textarea" style="width:100%;height:140px;white-space:pre-wrap;">${manualText}</textarea>

            <div style="font-weight:800;margin:12px 0 6px">Mensajes automáticos (solo lectura)</div>
            <textarea class="swal2-textarea" style="width:100%;height:140px;opacity:.85" readonly>${autoText}</textarea>
          </div>
        `,
        width: 700,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
        showDenyButton: true,
        denyButtonText: "Vaciar manuales",
        preConfirm: () => {
          const val = document.getElementById("swal-ticker-manual")?.value || "";
          const nextManual = val
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((text) => ({ text, time: new Date() }));
          return nextManual;
        },
      });

      if (result.isDenied) {
        setTickerItems([]);
        await MySwal.fire({ icon: "success", title: "Manual limpiado", timer: 900, showConfirmButton: false });
      } else if (result.isConfirmed && Array.isArray(result.value)) {
        setTickerItems(result.value.slice(0, 50));
        await MySwal.fire({ icon: "success", title: "Ticker actualizado", timer: 900, showConfirmButton: false });
      }
    } catch (e) {
      console.error(e);
      MySwal.fire({ icon: "error", title: "Error", text: String(e?.message || e) });
    } finally {
      setPaused(false);
    }
  }

  async function updateClienteInDoc(docId, cliente, patch) {
    const ref = doc(db, "respuestas-tareas", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Documento no existe");
    const data = snap.data() || {};
    const respuestas = data.respuestas || {};
    const tandas = Array.isArray(respuestas.tandas) ? [...respuestas.tandas] : [];
    const idx = tandas.findIndex((t) => (t?.cliente || "Sin cliente") === cliente);
    if (idx === -1) throw new Error("No se encontró la tanda del cliente en el documento");

    const t = { ...(tandas[idx] || {}) };

    if (typeof patch.operador === "string") {
      data.operador = patch.operador;
    }
    t.checklist = { ...(t.checklist || {}), ...(patch.checklist || {}) };
    if (typeof patch.notas === "string") {
      t.notas = patch.notas;
    }
    if (patch.hasOwnProperty("ackUntil")) {
      t.ackUntil = patch.ackUntil ? patch.ackUntil : null;
    }
    if (patch.hasOwnProperty("maintenanceFrom")) {
      t.maintenanceFrom = patch.maintenanceFrom ? patch.maintenanceFrom : null;
    }
    if (patch.hasOwnProperty("maintenanceTo")) {
      t.maintenanceTo = patch.maintenanceTo ? patch.maintenanceTo : null;
    }
    if (patch.hasOwnProperty("escalation")) {
      if (patch.escalation === null) {
        t.escalation = null;
      } else if (patch.escalation) {
        t.escalation = {
          to: patch.escalation.to || "",
          reason: patch.escalation.reason || "",
          at: new Date(),
        };
      }
    }

    // log simple
    const entry = { at: new Date(), operador: data.operador || "", action: "update", patch: { ...patch } };
    t.log = Array.isArray(t.log) ? [...t.log, entry] : [entry];

    tandas[idx] = t;

    await updateDoc(ref, {
      operador: data.operador || null,
      "respuestas.tandas": tandas,
      "respuestas.turno": respuestas.turno || null,
    });
  }

  async function setAck(row, until) {
    await updateClienteInDoc(row.docId, row.cliente, { ackUntil: until });
  }

  // Editor SIN ACK/Mantenimiento/Escalación
  async function openEditor(row) {
    try {
      setPaused(true);
      const c = row.checklist || {};
      const html = `
        <div style="text-align:left">
          <div style="font-weight:800;margin-bottom:8px">Cliente</div>
          <input class="swal2-input" style="width:100%" value="${row.cliente || ""}" disabled />

          <div style="font-weight:800;margin:6px 0 2px">Operador</div>
          <input id="swal-operador" class="swal2-input" style="width:100%" value="${row.operador || ""}" />

          <div style="font-weight:800;margin:6px 0 8px">Checklist</div>
          <label style="display:block;margin:2px 0"><input type="checkbox" id="swal-offline" ${c.equipoOffline ? "checked" : ""}/> OFFLINE</label>
          <label style="display:block;margin:2px 0"><input type="checkbox" id="swal-comm" ${c.alarmaComunicacionOK === false ? "checked" : ""}/> SIN COMMS</label>
          <label style="display:block;margin:2px 0"><input type="checkbox" id="swal-tamper" ${c.alarmaTamper ? "checked" : ""}/> Tamper</label>
          <label style="display:block;margin:2px 0"><input type="checkbox" id="swal-armado" ${c.alarmaPanelArmado ? "checked" : ""}/> Panel ARMADO</label>
          <label style="display:block;margin:2px 0"><input type="checkbox" id="swal-zonas" ${c.alarmaZonasAbiertas ? "checked" : ""}/> Zonas abiertas</label>
          <label style="display:block;margin:2px 0"><input type="checkbox" id="swal-bat" ${c.alarmaBateriaBaja ? "checked" : ""}/> Batería baja</label>
          <label style="display:block;margin:2px 0"><input type="checkbox" id="swal-220" ${c.cortes220v ? "checked" : ""}/> Cortes 220V</label>
          <label style="display:block;margin:2px 0"><input type="checkbox" id="swal-hora" ${c.equipoHora ? "checked" : ""}/> Hora desfasada</label>

          <div style="font-weight:800;margin:10px 0 2px">Notas</div>
          <textarea id="swal-notas" class="swal2-textarea" style="width:100%;height:90px">${row?.notas || ""}</textarea>
        </div>
      `;

      const result = await MySwal.fire({
        title: "Editar cliente",
        html,
        width: 720,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
        preConfirm: () => {
          const Q = (id) => document.getElementById(id);
          const operador = Q("swal-operador")?.value || "";
          const patch = {
            operador,
            checklist: {
              equipoOffline: Q("swal-offline")?.checked || false,
              alarmaComunicacionOK: !(Q("swal-comm")?.checked || false), // "SIN COMMS" marcado => false
              alarmaTamper: Q("swal-tamper")?.checked || false,
              alarmaPanelArmado: Q("swal-armado")?.checked || false,
              alarmaZonasAbiertas: Q("swal-zonas")?.checked || false,
              alarmaBateriaBaja: Q("swal-bat")?.checked || false,
              cortes220v: Q("swal-220")?.checked || false,
              equipoHora: Q("swal-hora")?.checked || false,
              alarmaMonitoreada: true,
            },
            notas: Q("swal-notas")?.value || "",
          };
          return patch;
        },
      });

      if (result.isConfirmed) {
        const patch = result.value;
        await updateClienteInDoc(row.docId, row.cliente, patch);
        MySwal.fire({ icon: "success", title: "Actualizado", timer: 1200, showConfirmButton: false });
      }
    } catch (err) {
      console.error(err);
      MySwal.fire({ icon: "error", title: "Error", text: String(err?.message || err) });
    } finally {
      setPaused(false);
    }
  }

  // Historial
  async function openHistory(row) {
    try {
      setPaused(true);
      const ref = doc(db, "respuestas-tareas", row.docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Documento no existe");

      const data = snap.data() || {};
      const tandas = Array.isArray(data?.respuestas?.tandas) ? data.respuestas.tandas : [];
      const t = tandas.find((tt) => (tt?.cliente || "Sin cliente") === row.cliente) || {};
      const log = Array.isArray(t.log) ? t.log : [];

      const items =
        log
          .slice()
          .reverse()
          .map((en) => {
            const at = tsToDate(en.at);
            const when = at ? at.toLocaleString("es-AR") : "—";
            const who = en.operador || "—";
            const action = en.action || "update";
            const patch = en.patch ? JSON.stringify(en.patch, null, 2) : "";
            return `
              <div style="padding:8px 0;border-bottom:1px solid ${PALETTE.border}">
                <div style="font-weight:800">${when}</div>
                <div>Operador: <b>${who}</b> · Acción: ${action}</div>
                <pre style="white-space:pre-wrap;font-size:12px;opacity:.9;margin:6px 0 0">${patch}</pre>
              </div>
            `;
          })
          .join("") || "<i>Sin actividad registrada</i>";

      await MySwal.fire({
        title: `Historial · ${row.cliente}`,
        html: `<div style="text-align:left;max-height:60vh;overflow:auto">${items}</div>`,
        width: 720,
        confirmButtonText: "Cerrar",
      });
    } catch (e) {
      console.error(e);
      MySwal.fire({ icon: "error", title: "Error", text: String(e?.message || e) });
    } finally {
      setPaused(false);
    }
  }

  // ====== Export CSV (todo) ======
  function exportCSV() {
    const headers = [
      "Cliente",
      "Severidad",
      "Operador",
      "Turno",
      "UltimoRondin",
      "CamsMedio",
      "CamsGrave",
      "Issues",
      "ACKHasta",
      "MantDesde",
      "MantHasta",
      "Notas",
    ];
    const lines = [headers.join(",")];
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    for (const r of byClient) {
      const issues = r.issues.map((i) => i.label).join(" | ");
      lines.push(
        [
          esc(r.cliente),
          esc(r.worst),
          esc(r.operador || ""),
          esc(r.turno || ""),
          esc(r.time?.toLocaleString?.("es-AR") || ""),
          r.sum.medio ?? 0,
          r.sum.grave ?? 0,
          esc(issues),
          esc(r.ackUntil ? r.ackUntil.toLocaleString("es-AR") : ""),
          esc(r.maintenanceFrom ? r.maintenanceFrom.toLocaleString("es-AR") : ""),
          esc(r.maintenanceTo ? r.maintenanceTo.toLocaleString("es-AR") : ""),
          esc(r.notas || ""),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallboard_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ====== Render ======
  return (
    <Box sx={{ height: "100vh", display: "grid", gridTemplateRows: "auto auto 1fr auto", bgcolor: PALETTE.bg, color: PALETTE.text, fontSize: 16 }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: PALETTE.header, borderBottom: `1px solid ${PALETTE.border}` }}>
        <Toolbar sx={{ minHeight: 80, gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0.6 }}>
            Wallboard · Monitoreo
          </Typography>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Total ${kpis.total}`} sx={{ bgcolor: "#1E293B", color: PALETTE.text, fontWeight: 800, border: `1px solid ${PALETTE.border}` }} />
            <Chip label={`Crít/Off ${kpis.critOrOff}`} sx={{ bgcolor: "#5A0E3A", color: "#FFD6F6", fontWeight: 800, border: `1px solid ${PALETTE.border}` }} />
            <Chip label={`Avisos ${kpis.warn}`} sx={{ bgcolor: "#5A420E", color: "#FFF2CC", fontWeight: 800, border: `1px solid ${PALETTE.border}` }} />
            <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: PALETTE.border }} />

            <IconButton onClick={exportCSV} sx={{ color: PALETTE.subtext }} title="Exportar CSV">
              <FaDownload />
            </IconButton>

            <IconButton onClick={() => setSoundOn((v) => !v)} sx={{ color: PALETTE.subtext }} title={soundOn ? "Silenciar alertas" : "Habilitar alertas"}>
              {soundOn ? <FaVolumeUp /> : <FaVolumeMute />}
            </IconButton>

            <IconButton onClick={() => setPaused((p) => !p)} sx={{ color: PALETTE.subtext }} title={paused ? "Reanudar rotación" : "Pausar rotación"}>
              {paused ? <FaPlay /> : <FaPause />}
            </IconButton>
            <IconButton onClick={openTickerManager} sx={{ color: PALETTE.subtext }} title="Editar ticker">
              <FaEdit />
            </IconButton>
            <IconButton onClick={toggleFs} sx={{ color: PALETTE.subtext }} title={isFs ? "Salir de pantalla completa" : "Pantalla completa"}>
              {isFs ? <FaCompress /> : <FaExpand />}
            </IconButton>
          </Stack>

          {/* Controles del ticker manual */}
          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: PALETTE.border }} />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ maxWidth: 520 }}>
            <Box
              component="input"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              placeholder="Agregar al ticker…"
              title="Escribe un mensaje para que circule en el marquee"
              style={{
                background: PALETTE.panel,
                color: PALETTE.text,
                border: `1px solid ${PALETTE.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                width: 280,
                outline: "none",
                fontWeight: 700,
              }}
            />
            <IconButton onClick={addTickerItem} sx={{ color: PALETTE.subtext }} title="Agregar al ticker">
              <FaPlay />
            </IconButton>
            <IconButton onClick={clearTickerItems} sx={{ color: PALETTE.subtext }} title="Limpiar mensajes manuales">
              <FaPause />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Marquee críticos */}
      <Box
        sx={{
          height: 38,
          display: "flex",
          alignItems: "center",
          color: PALETTE.marqueeText,
          bgcolor: PALETTE.marqueeBg,
          px: 2,
          borderBottom: `1px solid ${PALETTE.border}`,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <FaExclamationTriangle style={{ marginRight: 8 }} />
        <Typography
          sx={{
            display: "inline-block",
            animation: marquee ? "scroll 40s linear infinite" : "none",
            "@keyframes scroll": { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(-100%)" } },
            fontWeight: 800,
            letterSpacing: 0.4,
            textShadow: `0 1px 0 ${PALETTE.border}`,
          }}
        >
          {marquee || "Sin críticos u OFFLINE pendientes"}
        </Typography>
      </Box>

      {/* Tabla */}
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
              "& td": { color: PALETTE.text, borderBottom: `1px solid ${PALETTE.border}`, fontSize: 15, height: 64 },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Cámaras</TableCell>
                <TableCell>Estados / Alarma</TableCell>
                <TableCell>Operador</TableCell>
                <TableCell>Último rondín</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((row) => (
                <ClientRow
                  key={row.cliente}
                  row={row}
                  onOpen={openEditor}
                  onToggleAck={async (r, until) => {
                    try {
                      await setAck(r, until);
                    } catch (e) {
                      MySwal.fire({ icon: "error", title: "Error", text: String(e?.message || e) });
                    }
                  }}
                  onHistory={openHistory}
                />
              ))}
              {Array.from({ length: Math.max(0, rowsPerPage - pageRows.length) }).map((_, i) => (
                <TableRow key={`empty-${i}`} sx={{ height: 64 }}>
                  <TableCell colSpan={5} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Footer / página */}
      <Box sx={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: PALETTE.subtext, borderTop: `1px solid ${PALETTE.border}`, background: PALETTE.header }}>
        <Typography variant="caption" sx={{ letterSpacing: 0.5 }}>
          Página {totalPages ? page + 1 : 1}/{Math.max(1, totalPages)} · {new Date().toLocaleString("es-AR")}
        </Typography>
      </Box>
    </Box>
  );
}
