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
  Tooltip,
} from "@mui/material";

import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaVideo,
  FaPause,
  FaPlay,
  FaEdit,
  FaBell,
  FaBellSlash,
  FaDownload,
  FaExpand,
  FaCompress,
  FaBook,
  FaPlus,
  FaTimes,
  FaTools,
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

// === Normalizador de severidad ===
function normalizeSev(val) {
  // ✅ booleanos: true = OK, false = GRAVE
  if (typeof val === "boolean") return val ? "ok" : "grave";
  if (typeof val === "number") {
    if (val >= 2) return "grave";
    if (val >= 1) return "medio";
    return "ok";
  }
  let s = String(val ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
  if (["grave", "critico", "critica", "critical", "alto", "alta", "high", "severo", "severa", "offline"].includes(s)) return "grave";
  if (["medio", "media", "moderado", "moderada", "warn", "warning", "medium", "degradado", "degradada"].includes(s)) return "medio";
  if (["ok", "bien", "normal", "healthy", "verde", "green", "online"].includes(s)) return "ok";
  return "nd";
}

const STALE_MINUTES = 45; // si la última imagen/heartbeat supera este umbral => grave

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function getStatusTextFromCam(c) {
  const parts = [
    c?.estado, // ✅ incluir campo estado como texto libre
    c?.status,
    c?.estadoTexto,
    c?.detalle,
    c?.mensaje,
    c?.comentario,
    c?.comentarios,
    c?.observacion,
    c?.observación,
    c?.nota,
    c?.descripcion,
    c?.descripcionEstado,
    c?.novedad,
    c?.ultimaNovedad,
    c?.ultimasNovedades,
  ].filter(Boolean);
  return normalizeText(parts.join(" · "));
}

function interpretCamStatus(c) {
  // ✅ corto-circuito: si estado es booleano, lo respetamos
  if (typeof c?.estado === "boolean") {
    return c.estado ? "ok" : "grave";
  }

  const asBool = (v) =>
    v === true || v === false
      ? v
      : ["true", "false"].includes(String(v).toLowerCase())
      ? String(v).toLowerCase() === "true"
      : null;

  const okBool = asBool(c?.ok);
  const onlineBool = asBool(c?.online);
  const operativaBool = asBool(c?.operativa ?? c?.funcionando ?? c?.activa);

  if (c?.offline === true || onlineBool === false || okBool === false || operativaBool === false) return "grave";
  if (okBool === true || onlineBool === true || operativaBool === true) return "ok";

  // texto libre
  const s = getStatusTextFromCam(c);

  if (/\bno\s*.{0,6}func/i.test(s) || /\bno\s+anda\b/.test(s) || /\bno\s+marcha\b/.test(s) || /\bno\s+opera\b/.test(s)) return "grave";

  if (
    s.includes("sin senal") ||
    s.includes("sin señal") ||
    s.includes("sin video") ||
    s.includes("no video") ||
    s.includes("offline") ||
    s.includes("fuera de servicio") ||
    s.includes("desconectad") ||
    s.includes("caida") ||
    s.includes("fallo") ||
    s.includes("falla") ||
    s.includes("error") ||
    s.includes("roto") ||
    s.includes("rota") ||
    s.includes("quemad") ||
    s.includes("pantalla negra") ||
    s.includes("imagen negra")
  )
    return "grave";

  if (
    s.includes("intermit") ||
    s.includes("degrad") ||
    s.includes("warning") ||
    s.includes("media") ||
    s.includes("packet") ||
    s.includes("paquete") ||
    s.includes("jitter") ||
    s.includes("borros") ||
    s.includes("desenfoc") ||
    s.includes("pixel") ||
    s.includes("congel") ||
    s.includes("lag") ||
    s.includes("lento") ||
    s.includes("latencia")
  )
    return "medio";

  // timestamps
  const last =
    tsToDate(c?.lastFrame) ||
    tsToDate(c?.ultimaCaptura) ||
    tsToDate(c?.lastSeen) ||
    tsToDate(c?.timestamp) ||
    tsToDate(c?.ultimaImagen) ||
    tsToDate(c?.updatedAt);
  if (last) {
    const mins = (Date.now() - last.getTime()) / 60000;
    if (mins > STALE_MINUTES) return "grave";
  }

  // campo de severidad clásico (ok/medio/grave/nd, números, etc.)
  const raw = c?.estado ?? c?.criticidad ?? c?.severity ?? c?.nivel;
  const norm = normalizeSev(raw);
  if (norm !== "nd") return norm;

  return "nd";
}

/* ===== util: obtener cámaras como array (soporta objeto/mapa o array) ===== */
function camsToArray(t) {
  const cc = t?.camaras;
  if (Array.isArray(cc)) {
    return cc.map((cam, i) => ({
      __id: String(cam?.id ?? i + 1),
      ...cam,
    }));
  }
  if (cc && typeof cc === "object") {
    return Object.entries(cc).map(([k, v]) => ({
      __id: String(k),
      ...v,
    }));
  }
  return [];
}

/* Cam summary robusto (por tanda) */
const camSummaryFromTanda = (t) => {
  const cams = camsToArray(t);
  const counts = { ok: 0, medio: 0, grave: 0, nd: 0 };

  for (const cam of cams) {
    const sev = interpretCamStatus(cam);
    if (counts[sev] !== undefined) counts[sev] += 1;
    else counts.nd += 1;
  }

  // Solo usar camarasOffline si no hay lista y no había graves
  if (Array.isArray(t?.camarasOffline) && t.camarasOffline.length > 0 && cams.length === 0 && counts.grave === 0) {
    counts.grave += t.camarasOffline.length;
  }

  return { total: cams.length || (Array.isArray(t?.camarasOffline) ? t.camarasOffline.length : 0), ...counts };
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

const deriveIssuesFromCams = (t) => {
  const sum = camSummaryFromTanda(t);
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

/* ========================= Playbooks (guías rápidas) ========================= */
const PLAYBOOKS = {
  "SIN COMMS": ["Verificar WAN/4G/ISP del sitio", "Probar ping al equipo", "Reiniciar equipo remoto si es posible", "Escalar a redes si persiste"],
  OFFLINE: ["Chequear energía/UPS", "Verificar estado del NVR/DVR", "Confirmar última conexión"],
  "Cortes 220V": ["Confirmar suministro y UPS", "Contactar al responsable del sitio"],
  Tamper: ["Validar integridad de caja/sensor", "Revisar cámaras cercanas a gabinete"],
};

/* ===== Ver fallas (detalle) ===== */
function renderFailListHTML(fails) {
  if (!fails.length) return "<i>No hay cámaras en falla</i>";
  const rows = fails
    .map(
      (f) => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid #1E2A44;border-radius:8px;margin:6px 0;background:#0D1628">
        <span style="font-weight:900;min-width:52px">${f.id}</span>
        <span style="font-weight:800;color:${f.sev === "grave" ? "#FFB4B8" : "#FFE08F"}">${f.sev.toUpperCase()}</span>
        <span style="flex:1;opacity:.9">${f.nota || f.texto || "—"}</span>
        <span style="opacity:.7;font-size:12px">${f.time ? new Date(f.time).toLocaleString("es-AR") : ""}</span>
      </div>`
    )
    .join("");
  return `<div style="text-align:left;max-height:60vh;overflow:auto">${rows}</div>`;
}

/* ========================= Row ========================= */
const ClientRow = React.memo(function ClientRow({ row, onOpen, onToggleAck, onPlaybook, onShowFails, onManageCams }) {
  const color = sevColor(row.worst);
  const c = row.checklist || {};
  const now = Date.now();
  const ackActive = row.ackUntil && row.ackUntil.getTime() > now;
  const mFrom = row.maintenanceFrom?.getTime?.();
  const mTo = row.maintenanceTo?.getTime?.();
  const mantActive = (mFrom ? now >= mFrom : false) && (mTo ? now <= mTo : false);

  const ageMin = row.time ? Math.floor((Date.now() - row.time.getTime()) / 60000) : 0;
  const agingFilter = ageMin >= 180 ? "saturate(85%) brightness(0.9)" : ageMin >= 60 ? "saturate(90%) brightness(0.95)" : undefined;

  const statusPills = [];
  statusPills.push(c.equipoOffline ? <Pill key="offline" label="OFFLINE" sev="offline" blink={!ackActive && !mantActive} /> : <Pill key="online" label="ONLINE" sev="ok" />);

  if (c.alarmaMonitoreada === true) {
    statusPills.push(c.alarmaComunicacionOK ? <Pill key="comm-ok" label="COMM OK" sev="ok" /> : <Pill key="comm-no" label="SIN COMMS" sev="critical" blink={!ackActive && !mantActive} />);
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

  const rowBg = row.worst === "critical" ? PALETTE.criticalBg : row.worst === "offline" ? PALETTE.offlineBg : row.worst === "warning" ? PALETTE.warningBg : PALETTE.panel;

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
        filter: agingFilter,
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
          <Pill label={`MEDIO ${row.camSum.medio || 0}`} sev="warning" />
          <Pill label={`GRAVE ${row.camSum.grave || 0}`} sev="critical" />
          {(row.camSum.grave > 0 || row.camSum.medio > 0) && (
            <>
              <Tooltip title="Ver cámaras con falla">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowFails?.(row);
                  }}
                  sx={{ color: PALETTE.subtext }}
                >
                  <FaVideo />
                </IconButton>
              </Tooltip>
              <Tooltip title="Gestionar cámaras (editar estado/nota)">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageCams?.(row);
                  }}
                  sx={{ color: PALETTE.subtext }}
                >
                  <FaTools />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      </TableCell>

      {/* Estados / Alarma */}
      <TableCell sx={{ color: PALETTE.text }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap" }}>
          <FaShieldAlt style={{ opacity: 0.9 }} />
          {statusPills.length ? statusPills : <Pill label="Sin alarma / OK" sev="ok" />}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onPlaybook?.(row);
            }}
            sx={{ color: PALETTE.subtext, ml: 0.5 }}
            title="Guía rápida (playbook)"
          >
            <FaBook />
          </IconButton>
        </Stack>
      </TableCell>

      {/* Operador + ACK */}
      <TableCell sx={{ whiteSpace: "nowrap", color: PALETTE.text }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1" sx={{ fontWeight: 800 }}>
            {row.operador || "—"}
          </Typography>
          <IconButton
            size="small"
            title={ackActive ? "Quitar ACK" : "ACK 1h (Shift: 4h · Alt: 15m)"}
            onClick={(e) => {
              e.stopPropagation();
              if (ackActive) {
                onToggleAck?.(row, null);
                return;
              }
              const base = Date.now();
              const ms = e.shiftKey ? 4 * 60 * 60 * 1000 : e.altKey ? 15 * 60 * 1000 : 60 * 60 * 1000;
              onToggleAck?.(row, new Date(base + ms));
            }}
            sx={{ color: PALETTE.subtext }}
          >
            {ackActive ? <FaBellSlash /> : <FaBell />}
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

  const [docs, setDocs] = useState([]);

  // Tick cada 1s para refrescar labels "hace Xm"
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, []);

  // ====== Firestore listener ======
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "respuestas-tareas"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setDocs(list);
    });
    return () => unsub();
  }, []);

  // ====== Ticker manual (persistente) ======
  const [tickerItems, setTickerItems] = useState([]); // { text, time }
  const [tickerInput, setTickerInput] = useState("");
  const addTickerItem = () => {
    const t = tickerInput?.trim();
    if (!t) return;
    setTickerItems((prev) => [{ text: t, time: new Date() }, ...prev].slice(0, 50));
    setTickerInput("");
  };
  const clearTickerItems = () => setTickerItems([]);

  // ====== Mini cards de novedades (zócalo inferior) ======
  const [miniCards, setMiniCards] = useState(() => {
    try {
      const raw = localStorage.getItem("wallboard_mini_cards");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map((c) => ({ ...c, at: c.at ? new Date(c.at) : new Date() })) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("wallboard_mini_cards", JSON.stringify(miniCards));
    } catch {}
  }, [miniCards]);

  function addMiniCard() {
    MySwal.fire({
      title: "Agregar novedad",
      html: `
        <div style="text-align:left">
          <label style="font-weight:800;display:block;margin:4px 0">Texto</label>
          <textarea id="swal-card-text" class="swal2-textarea" style="width:100%;height:110px"></textarea>
          <label style="font-weight:800;display:block;margin:8px 0 4px">Severidad</label>
          <select id="swal-card-sev" class="swal2-select" style="width:100%">
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="offline">Offline</option>
            <option value="ok">OK</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const text = document.getElementById("swal-card-text")?.value?.trim();
        const sev = document.getElementById("swal-card-sev")?.value || "info";
        if (!text) {
          MySwal.showValidationMessage("Escribe un texto");
          return false;
        }
        return { text, sev };
      },
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const id = Math.random().toString(36).slice(2, 9);
        setMiniCards((prev) => [{ id, text: res.value.text, sev: res.value.sev, at: new Date() }, ...prev].slice(0, 40));
      }
    });
  }
  const removeMiniCard = (id) => setMiniCards((prev) => prev.filter((c) => c.id !== id));

  // Cargar/guardar preferencias (pausa + ticker)
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("wallboard_prefs") || "{}");
      if (typeof s.paused === "boolean") setPaused(s.paused);
      if (Array.isArray(s.tickerItems)) setTickerItems(s.tickerItems.map((t) => ({ ...t, time: t.time ? new Date(t.time) : new Date() })));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const data = { paused, tickerItems };
      localStorage.setItem("wallboard_prefs", JSON.stringify(data));
    } catch {}
  }, [paused, tickerItems]);

  // ====== Datos por cliente (SOLO último rondín) ======
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
        const checklistIssues = deriveIssuesFromChecklist(t);
        const ackUntil = tsToDate(t?.ackUntil);
        const maintenanceFrom = tsToDate(t?.maintenanceFrom);
        const maintenanceTo = tsToDate(t?.maintenanceTo);
        const escalation = t?.escalation || null;
        const prev = map.get(cliente);

        const cams = camsToArray(t);
        const camFails = cams
          .map((cam) => ({ ...cam, __sev: interpretCamStatus(cam) }))
          .filter((cam) => cam.__sev === "grave" || cam.__sev === "medio")
          .map((cam) => ({
            id: cam?.nombre || cam?.name || cam?.cam || cam?.camera || cam.__id,
            sev: cam.__sev,
            nota: cam?.nota || cam?.novedad || cam?.detalle || "",
            time: tsToDate(cam?.updatedAt)?.getTime?.() || tsToDate(cam?.lastSeen)?.getTime?.() || tsToDate(cam?.ultimaCaptura)?.getTime?.() || null,
            raw: cam,
          }));

        // SOLO quedarse con la tanda más reciente por cliente (último rondín)
        const shouldSet = !prev || (baseTime && prev.time && baseTime > prev.time) || (!prev?.time && baseTime);
        if (shouldSet) {
          map.set(cliente, {
            docId: id,
            cliente,
            operador,
            turno,
            time: baseTime || prev?.time || null,
            camSum: { ok: sum.ok, medio: sum.medio, grave: sum.grave, nd: sum.nd, total: sum.total },
            checklist: t?.checklist || {},
            checklistIssues: [...checklistIssues],
            notas: t?.notas || "",
            ackUntil,
            maintenanceFrom,
            maintenanceTo,
            escalation,
            lastTanda: t,
            camFails, // detalle listo para usar
          });
        }
      }
    }

    // Derivar issues y worst
    const arr = Array.from(map.values()).map((v) => {
      const camIssues = deriveIssuesFromCams(v.lastTanda);
      const allIssues = [...v.checklistIssues, ...camIssues];
      const worst = worstSev(allIssues);
      return { ...v, issues: allIssues, worst };
    });

    // Orden
    arr.sort((a, b) => {
      const ord = (s) => (s === "critical" || s === "offline" ? 0 : s === "warning" ? 1 : 2);
      const o = ord(a.worst) - ord(b.worst);
      if (o !== 0) return o;
      return (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0);
    });

    return arr;
  }, [docs]);

  // ====== Detección de NUEVOS críticos/offline ======
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

  // ====== KPIs ======
  const kpis = useMemo(() => {
    const total = byClient.length;
    const critOrOff = byClient.filter((x) => x.worst === "critical" || x.worst === "offline").length;
    const warn = byClient.filter((x) => x.worst === "warning").length;
    const ok = total - critOrOff - warn;
    return { total, critOrOff, warn, ok };
  }, [byClient]);

  // ====== Top críticos ======
  const topCrits = useMemo(() => {
    const now = Date.now();
    const isActive = (r) => {
      const ack = r.ackUntil && r.ackUntil.getTime() > now;
      const mFrom = r.maintenanceFrom?.getTime?.();
      const mTo = r.maintenanceTo?.getTime?.();
      const mant = (mFrom ? now >= mFrom : false) && (mTo ? now <= mTo : false);
      return !ack && !mant && (r.worst === "critical" || r.worst === "offline");
    };
    return byClient
      .filter(isActive)
      .sort((a, b) => (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0))
      .slice(0, 3);
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

  // ====== Helpers/Acciones Firestore ======
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
    if (patch.checklist) {
      t.checklist = { ...(t.checklist || {}), ...(patch.checklist || {}) };
    }
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

    // === Actualización de cámaras (robusta: array u objeto) ===
    if (patch.camaras && typeof patch.camaras === "object") {
      const cur = t.camaras;
      const isArray = Array.isArray(cur);
      if (isArray) {
        t.camaras = [...cur];
      } else if (cur && typeof cur === "object") {
        t.camaras = { ...cur };
      } else {
        // si no existe, creamos como objeto
        t.camaras = {};
      }

      for (const [camId, upd] of Object.entries(patch.camaras)) {
        const now = new Date();
        if (Array.isArray(t.camaras)) {
          // Buscar por id/canal primero
          let idxCam = t.camaras.findIndex(
            (x) =>
              String(x?.id ?? x?.__id ?? x?.cam ?? x?.camera ?? x?.canal) === String(camId) ||
              String(x?.canal) === String(camId)
          );
          // Fallback por número (1-based o 0-based)
          if (idxCam === -1 && !Number.isNaN(Number(camId))) {
            const n = Number(camId);
            idxCam = n > 0 && t.camaras[n - 1] ? n - 1 : n;
          }
          if (Number.isFinite(idxCam) && idxCam >= 0) {
            const prev = t.camaras[idxCam] || {};
            t.camaras[idxCam] = { ...prev, ...upd, updatedAt: now };
          } else {
            // Si no se encuentra, agregamos entrada nueva
            t.camaras.push({ id: String(camId), ...upd, updatedAt: now });
          }
        } else {
          const prev = t.camaras[camId] || {};
          t.camaras[camId] = { ...prev, ...upd, updatedAt: now };
        }
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

  // ====== Editores / Vistas ======
  // Editor de checklist + notas (como tenías)
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

          <div style="margin-top:10px;opacity:.8"><i>Para editar cámaras, usa el botón “Gestionar cámaras” en la columna Cámaras.</i></div>
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

  // Detalle de fallas (solo ver)
  function openFails(row) {
    const grave = row.camFails.filter((c) => c.sev === "grave");
    const medio = row.camFails.filter((c) => c.sev === "medio");
    const html = `
      <div style="text-align:left">
        <div style="font-weight:900;margin:4px 0">GRAVE (${grave.length})</div>
        ${renderFailListHTML(grave)}
        <div style="font-weight:900;margin:10px 0 4px">MEDIO (${medio.length})</div>
        ${renderFailListHTML(medio)}
      </div>
    `;
    MySwal.fire({ title: `Cámaras con falla · ${row.cliente}`, html, width: 700 });
  }

  // Gestor de cámaras (editar y guardar)
  async function openCamsManager(row) {
    try {
      setPaused(true);
      // armamos un pequeño grid para todas las cámaras (solo falla por defecto)
      const cams = camsToArray(row.lastTanda);
      // ordenamos por sev (grave/medio primero), luego por id
      const enriched = cams
        .map((c) => ({ ...c, __sev: interpretCamStatus(c) }))
        .sort((a, b) => {
          const rank = { grave: 0, medio: 1, ok: 2, nd: 3 };
          const ra = rank[a.__sev] ?? 3;
          const rb = rank[b.__sev] ?? 3;
          if (ra !== rb) return ra - rb;
          return String(a.__id).localeCompare(String(b.__id), "es");
        });

      const rowsHTML = enriched
        .map((c, i) => {
          const id = c?.nombre || c?.name || c?.cam || c?.camera || c.__id;
          const nota = c?.nota || c?.novedad || c?.detalle || "";
          const last = tsToDate(c?.updatedAt) || tsToDate(c?.lastSeen) || tsToDate(c?.ultimaCaptura) || null;
          const sev = c.__sev;
          return `
            <tr>
              <td style="padding:4px 6px;font-weight:800">${id}</td>
              <td style="padding:4px 6px">
                <select data-k="sev" data-id="${c.__id}" class="swal2-select">
                  <option value="ok" ${sev === "ok" ? "selected" : ""}>OK</option>
                  <option value="medio" ${sev === "medio" ? "selected" : ""}>MEDIO</option>
                  <option value="grave" ${sev === "grave" ? "selected" : ""}>GRAVE</option>
                </select>
              </td>
              <td style="padding:4px 6px;width:55%">
                <input data-k="nota" data-id="${c.__id}" class="swal2-input" style="width:100%" value="${String(nota).replace(/"/g, "&quot;")}" />
              </td>
              <td style="padding:4px 6px;opacity:.75;font-size:12px">${last ? last.toLocaleString("es-AR") : "—"}</td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <div style="text-align:left;max-height:60vh;overflow:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left">Cam</th>
                <th style="text-align:left">Estado</th>
                <th style="text-align:left">Nota</th>
                <th style="text-align:left">Últ. act.</th>
              </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      `;

      const res = await MySwal.fire({
        title: `Gestionar cámaras · ${row.cliente}`,
        html,
        width: 900,
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
        focusConfirm: false,
        preConfirm: () => {
          const selects = Array.from(document.querySelectorAll('select[data-k="sev"]'));
          const inputs = Array.from(document.querySelectorAll('input[data-k="nota"]'));
          const sevById = {};
          const notaById = {};
          selects.forEach((el) => (sevById[el.getAttribute("data-id")] = el.value));
          inputs.forEach((el) => (notaById[el.getAttribute("data-id")] = el.value || ""));
          const camaras = {};
          Object.keys(sevById).forEach((id) => {
            camaras[id] = { estado: sevById[id], nota: notaById[id] ?? "" };
          });
          return { camaras };
        },
      });

      if (res.isConfirmed && res.value) {
        await updateClienteInDoc(row.docId, row.cliente, res.value);
        MySwal.fire({ icon: "success", title: "Cámaras actualizadas", timer: 1100, showConfirmButton: false });
      }
    } catch (e) {
      console.error(e);
      MySwal.fire({ icon: "error", title: "Error", text: String(e?.message || e) });
    } finally {
      setPaused(false);
    }
  }

  // Guía rápida por issues críticos
  function openRowPlaybook(row) {
    const crits = row.issues.filter((i) => PLAYBOOKS[i.label]);
    if (!crits.length) {
      MySwal.fire({ toast: true, icon: "info", title: "Sin guía disponible", timer: 900, showConfirmButton: false });
      return;
    }
    const blocks = crits
      .map((i) => {
        const steps = PLAYBOOKS[i.label].map((s) => `• ${s}`).join("\n");
        return `<div style="margin:8px 0"><b>${i.label}</b><pre style="white-space:pre-wrap;margin:6px 0 0">${steps}</pre></div>`;
      })
      .join("");
    MySwal.fire({ title: `Guía · ${row.cliente}`, html: `<div style="text-align:left">${blocks}</div>`, width: 600 });
  }

  // ====== Export CSV (todo) ======
  function exportCSV() {
    const headers = ["Cliente", "Severidad", "Operador", "Turno", "UltimoRondin", "CamsMedio", "CamsGrave", "Issues", "ACKHasta", "MantDesde", "MantHasta", "Notas"];
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
          r.camSum.medio ?? 0,
          r.camSum.grave ?? 0,
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

  // ====== Atajos de teclado ======
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key?.toLowerCase() === "f") {
        toggleFs();
      } else if (e.key === "ArrowRight") {
        setPage((p) => (p + 1) % Math.max(1, totalPages));
      } else if (e.key === "ArrowLeft") {
        setPage((p) => (p - 1 + Math.max(1, totalPages)) % Math.max(1, totalPages));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalPages]);

  /* ====== Render ====== */
  return (
    <Box
      sx={{
        height: "100vh",
        display: "grid",
        gridTemplateRows: "auto auto auto 1fr auto auto", // + zócalo de mini-cards
        bgcolor: PALETTE.bg,
        color: PALETTE.text,
        fontSize: 16,
      }}
    >
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

            <IconButton onClick={() => setPaused((p) => !p)} sx={{ color: PALETTE.subtext }} title={paused ? "Reanudar rotación [Space]" : "Pausar rotación [Space]"}>
              {paused ? <FaPlay /> : <FaPause />}
            </IconButton>
            <IconButton onClick={() => addMiniCard()} sx={{ color: PALETTE.subtext }} title="Agregar mini-card de novedad">
              <FaPlus />
            </IconButton>
            <IconButton onClick={toggleFs} sx={{ color: PALETTE.subtext }} title={isFs ? "Salir de pantalla completa [F]" : "Pantalla completa [F]"}>
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

      {/* Top críticos (acción rápida) */}
      {topCrits.length > 0 && (
        <Box sx={{ p: 1.5, pt: 1, display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {topCrits.map((r) => (
            <Box
              key={`top-${r.cliente}`}
              sx={{
                p: 1.2,
                border: `1px solid ${PALETTE.border}`,
                bgcolor: PALETTE.panel,
                borderLeft: `6px solid ${sevColor(r.worst)}`,
                borderRadius: 1.2,
              }}
            >
              <Typography sx={{ fontWeight: 900 }}>{r.cliente}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {r.time ? `hace ${fmtAgo(r.time)}` : "—"}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {r.issues
                  .filter((i) => i.sev === "critical" || i.sev === "offline")
                  .map((i, idx) => (
                    <Pill key={idx} label={i.label} sev={i.sev} blink />
                  ))}
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <IconButton size="small" onClick={() => openEditor(r)} title="Editar checklist/notas" sx={{ color: PALETTE.subtext }}>
                  <FaEdit />
                </IconButton>
                <IconButton size="small" onClick={() => setAck(r, new Date(Date.now() + 60 * 60 * 1000))} title="ACK 1h" sx={{ color: PALETTE.subtext }}>
                  <FaBell />
                </IconButton>
                <IconButton size="small" onClick={() => openRowPlaybook(r)} title="Guía rápida" sx={{ color: PALETTE.subtext }}>
                  <FaBook />
                </IconButton>
                {(r.camSum.grave > 0 || r.camSum.medio > 0) && (
                  <>
                    <IconButton size="small" onClick={() => openFails(r)} title="Ver cámaras en falla" sx={{ color: PALETTE.subtext }}>
                      <FaVideo />
                    </IconButton>
                    <IconButton size="small" onClick={() => openCamsManager(r)} title="Gestionar cámaras" sx={{ color: PALETTE.subtext }}>
                      <FaTools />
                    </IconButton>
                  </>
                )}
              </Stack>
            </Box>
          ))}
        </Box>
      )}

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
                  onPlaybook={openRowPlaybook}
                  onShowFails={openFails}
                  onManageCams={openCamsManager}
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

      {/* Zócalo de mini-cards de novedades */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderTop: `1px solid ${PALETTE.border}`,
          background: PALETTE.panel,
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
        }}
      >
        {miniCards.length === 0 ? (
          <Typography sx={{ color: PALETTE.subtext, fontStyle: "italic" }}>Sin novedades. Usa el botón “+” para agregar una mini-card.</Typography>
        ) : (
          <Stack direction="row" spacing={1.2} sx={{ alignItems: "stretch" }}>
            {miniCards.map((c) => {
              const col = PILL_COLORS[c.sev] || PILL_COLORS.info;
              return (
                <Box
                  key={c.id}
                  sx={{
                    minWidth: 220,
                    maxWidth: 320,
                    p: 1,
                    border: `1px solid ${PALETTE.border}`,
                    bgcolor: col.bg,
                    color: col.fg,
                    borderLeft: `6px solid ${col.bd}`,
                    borderRadius: 1.5,
                    display: "grid",
                    gridTemplateRows: "auto auto",
                    gap: 0.5,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{c.text}</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                      {fmtAgo(c.at)} · {c.at?.toLocaleString?.("es-AR")}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => removeMiniCard(c.id)} sx={{ color: col.fg, opacity: 0.85 }}>
                      <FaTimes />
                    </IconButton>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Footer / página */}
      <Box
        sx={{
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: PALETTE.subtext,
          borderTop: `1px solid ${PALETTE.border}`,
          background: PALETTE.header,
        }}
      >
        <Typography variant="caption" sx={{ letterSpacing: 0.5 }}>
          Página {totalPages ? page + 1 : 1}/{Math.max(1, totalPages)} · {new Date().toLocaleString("es-AR")}
        </Typography>
      </Box>
    </Box>
  );
}
