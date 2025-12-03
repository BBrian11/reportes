// src/pages/OperadoresAnalyticsDashboard.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaSyncAlt, FaFilter, FaTimes, FaUserClock } from "react-icons/fa";
import { collection, onSnapshot, query, limit, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * OperadoresAnalyticsDashboard (UX/UI Light + alto contraste)
 * - Fondo claro, cards blancas, textos legibles.
 * - Header sticky limpio (no oscuro) y no tapa contenido.
 * - Filtros colapsables con panel claro y foco visible.
 * - Hover/focus states, accesible, moderno.
 */

const UI = {
  // base (light)
  pageBg: "#F6F7FB",
  ink: "#0B1220",
  sub: "rgba(11,18,32,.72)",
  sub2: "rgba(11,18,32,.56)",

  // contornos y superficies
  line: "rgba(2,6,23,.10)",
  line2: "rgba(2,6,23,.14)",
  cardBg: "rgba(255,255,255,.96)",
  cardBg2: "rgba(255,255,255,.90)",
  chipBg: "rgba(2,6,23,.06)",

  // sombras
  shadow: "0 16px 40px rgba(2,6,23,.10)",
  shadow2: "0 10px 28px rgba(2,6,23,.08)",

  // acentos
  teal: "#11C5A6",
  blue: "#3b82f6",
  indigo: "#6366f1",
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#10b981",
};

const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "object" && (v.seconds || v._seconds)) {
    const s = v.seconds ?? v._seconds;
    return new Date(s * 1000);
  }
  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const parseSafeDate = (val, endOfDay = false) => {
  if (!val) return null;
  const s = endOfDay ? "T23:59:59" : "T00:00:00";
  const d = new Date(`${val}${s}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const includesAllTerms = (haystack, q) => {
  if (!q) return true;
  const text = norm(haystack);
  const terms = norm(q).split(/\s+/).filter(Boolean);
  return terms.every((t) => text.includes(t));
};

const franjaDeHora = (h) => {
  if (h < 6) return "00-05";
  if (h < 12) return "06-11";
  if (h < 18) return "12-17";
  return "18-23";
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return d.toISOString();
  }
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const pickFirst = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return fallback;
};

function Chip({ text, tone = "neutral" }) {
  const styles =
    tone === "good"
      ? { background: "rgba(16,185,129,.12)", color: "rgba(7,62,43,1)", border: "1px solid rgba(16,185,129,.28)" }
      : tone === "warn"
      ? { background: "rgba(245,158,11,.12)", color: "rgba(87,52,0,1)", border: "1px solid rgba(245,158,11,.28)" }
      : tone === "bad"
      ? { background: "rgba(239,68,68,.12)", color: "rgba(92,12,12,1)", border: "1px solid rgba(239,68,68,.28)" }
      : { background: UI.chipBg, color: "rgba(11,18,32,.84)", border: `1px solid ${UI.line}` };

  return (
    <span
      style={{
        ...styles,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 950,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function Card({ title, value, sub, tone = "default", icon }) {
  const border =
    tone === "good" ? "rgba(16,185,129,.30)" : tone === "bad" ? "rgba(239,68,68,.30)" : UI.line;

  const bg =
    tone === "good"
      ? "linear-gradient(180deg, rgba(16,185,129,.12), rgba(255,255,255,.96))"
      : tone === "bad"
      ? "linear-gradient(180deg, rgba(239,68,68,.12), rgba(255,255,255,.96))"
      : "linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,255,255,.92))";

  return (
    <div
      className="oda-kpi-card"
      style={{
        border: `1px solid ${border}`,
        background: bg,
        borderRadius: 18,
        padding: 14,
        boxShadow: UI.shadow2,
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon ? (
            <span
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                border: `1px solid ${UI.line}`,
                background: "rgba(2,6,23,.03)",
                color: UI.ink,
              }}
            >
              {icon}
            </span>
          ) : null}

          <div
            style={{
              fontSize: 12,
              color: UI.sub,
              fontWeight: 950,
              letterSpacing: ".2px",
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={String(title || "")}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            fontSize: "clamp(18px, 2.1vw, 30px)",
            color: UI.ink,
            fontWeight: 980,
            lineHeight: 1.08,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>
      </div>

      {!!sub && (
        <div
          style={{
            fontSize: 12.5,
            color: UI.sub,
            fontWeight: 850,
            lineHeight: 1.35,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function BarList({ title, items, rightLabel = "Eventos" }) {
  const max = Math.max(1, ...(items || []).map((i) => i.value || 0));
  return (
    <div
      style={{
        border: `1px solid ${UI.line}`,
        background: UI.cardBg,
        borderRadius: 18,
        padding: 14,
        boxShadow: UI.shadow2,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 980, color: UI.ink }}>{title}</div>
        <div style={{ fontSize: 12, color: UI.sub, fontWeight: 900 }}>{rightLabel}</div>
      </div>

      {(items || []).length === 0 ? (
        <div style={{ fontSize: 13, color: UI.sub, fontWeight: 800 }}>Sin datos con los filtros actuales.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it) => {
            const pct = clamp(((it.value || 0) / max) * 100, 0, 100);
            return (
              <div key={it.label} style={{ display: "grid", gridTemplateColumns: "1fr 90px", alignItems: "center", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 950, color: UI.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.label}
                    </div>
                    <div style={{ fontSize: 13, color: UI.sub, fontWeight: 950 }}>{it.value}</div>
                  </div>

                  <div style={{ height: 9, borderRadius: 999, background: "rgba(2,6,23,.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${UI.blue}, ${UI.indigo})` }} />
                  </div>
                </div>

                <div style={{ fontSize: 12, color: UI.sub, textAlign: "right", fontWeight: 900 }}>{it.sub || ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpandableText({ title, text, initialLines = 3 }) {
  const [open, setOpen] = useState(false);
  const clean = String(text || "").trim();
  if (!clean) return null;

  const clampStyle = open
    ? {}
    : {
        display: "-webkit-box",
        WebkitLineClamp: initialLines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      };

  return (
    <div style={{ border: `1px solid ${UI.line}`, borderRadius: 14, padding: 12, background: "rgba(2,6,23,.02)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, color: UI.sub, fontWeight: 950 }}>{title}</div>
        <button className="oda-mini-btn" type="button" onClick={() => setOpen((v) => !v)}>
          {open ? "Ver menos" : "Ver más"}
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12.5, color: "rgba(11,18,32,.82)", fontWeight: 850, lineHeight: 1.55, ...clampStyle }}>
        {clean}
      </div>
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: 14,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 100%)",
          borderRadius: 18,
          background: "rgba(255,255,255,.98)",
          border: `1px solid ${UI.line}`,
          boxShadow: "0 24px 80px rgba(0,0,0,.25)",
          overflow: "hidden",
          maxHeight: "86vh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <div style={{ padding: 14, borderBottom: `1px solid ${UI.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 980, color: UI.ink }}>{title}</div>
          <button className="oda-btn ghost" type="button" onClick={onClose}>
            <FaTimes /> Cerrar
          </button>
        </div>

        <div style={{ padding: 14, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

function Table({ rows, onPick }) {
  return (
    <div style={{ border: `1px solid ${UI.line}`, background: UI.cardBg, borderRadius: 18, overflow: "hidden", boxShadow: UI.shadow2 }}>
      <div style={{ padding: 14, borderBottom: `1px solid ${UI.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 980, color: UI.ink }}>Detalle por operador</div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: UI.sub, fontWeight: 850, lineHeight: 1.4 }}>
          Tip: hacé click en un operador para ver <b>muestra de eventos</b>, respuestas y alertas.
        </div>
      </div>

      <div style={{ overflow: "auto", maxHeight: "58vh" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 980 }}>
          <thead>
            <tr style={{ background: "rgba(2,6,23,.03)" }}>
              {["Operador", "Rol", "Turno", "Eventos", "Obs", "Res", "Lag prom.", "P90 lag", "Alertas"].map((h) => (
                <th
                  key={h}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 12,
                    color: UI.sub,
                    fontWeight: 980,
                    borderBottom: `1px solid ${UI.line}`,
                    background: "rgba(255,255,255,.96)",
                    backdropFilter: "blur(10px)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(rows || []).map((r, idx) => {
              const zebra = idx % 2 === 0 ? "rgba(255,255,255,.98)" : "rgba(2,6,23,.015)";
              const hasAlerts = (r.alerts || []).length > 0;

              return (
                <tr
                  key={r.key}
                  onClick={() => onPick?.(r)}
                  className="oda-row-click"
                  style={{
                    background: zebra,
                    borderBottom: `1px solid ${UI.line}`,
                    cursor: "pointer",
                  }}
                >
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 980, color: UI.ink, whiteSpace: "nowrap" }}>{r.name}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, color: UI.sub, fontWeight: 900 }}>{r.rol || "-"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, color: UI.sub, fontWeight: 900 }}>{r.turno || "-"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, color: UI.ink, fontWeight: 980 }}>{r.total}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <Chip text={`${r.obsPct}%`} tone={r.obsPct >= 85 ? "good" : r.obsPct <= 70 ? "bad" : "neutral"} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <Chip text={`${r.resPct}%`} tone={r.resPct >= 70 ? "good" : r.resPct <= 45 ? "bad" : "neutral"} />
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, color: UI.sub, fontWeight: 950 }}>{r.lagAvg ?? "-"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, color: UI.sub, fontWeight: 950 }}>{r.lagP90 ?? "-"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {hasAlerts ? <Chip text={`${r.alerts.length} alerta(s)`} tone="bad" /> : <Chip text="OK" tone="good" />}
                  </td>
                </tr>
              );
            })}

            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={9} style={{ padding: 14, fontSize: 13, color: UI.sub, fontWeight: 900 }}>
                  Sin resultados con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const csvEscape = (v) => {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCSV = (filename, rows) => {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function OperadoresAnalyticsDashboard() {
  const [eventos, setEventos] = useState([]);
  const [ops, setOps] = useState([]);
  const unsubRef = useRef(null);

  const [loadingMode, setLoadingMode] = useState("live"); // live | full
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filtros, setFiltros] = useState({
    cliente: "",
    operador: "",
    turno: "",
    fechaInicio: "",
    fechaFin: "",
    q: "",
  });

  const [pickedOp, setPickedOp] = useState(null);

  const hasPassiveFilters = useMemo(() => {
    return !!(
      filtros.cliente ||
      filtros.operador ||
      filtros.turno ||
      filtros.fechaInicio ||
      filtros.fechaFin ||
      (filtros.q || "").trim().length >= 2
    );
  }, [filtros]);

  // ====== Operadores: lee colección "operadores" ======
  useEffect(() => {
    const ref = collection(db, "operadores");
    const qRef = query(ref, limit(500));
    return onSnapshot(qRef, (snap) => {
      const arr = snap.docs.map((d) => {
        const v = d.data() || {};
        return {
          id: d.id,
          usuario: (v.usuario || v.email || "").toString().trim(),
          nombre: (v.nombre || v.name || "").toString().trim(),
          rol: (v.rol || "").toString().trim(),
          turno: (v.turno || "").toString().trim(),
        };
      });
      setOps(arr);
    });
  }, []);

  const opsMap = useMemo(() => {
    const byEmail = new Map();
    const byName = new Map();
    for (const o of ops) {
      if (o.usuario) byEmail.set(norm(o.usuario), o);
      if (o.nombre) byName.set(norm(o.nombre), o);
    }
    return { byEmail, byName };
  }, [ops]);

  // ====== Eventos: lee 5 colecciones, modo live limitado / modo full ======
  const loadEventos = useCallback(
    (mode = "live") => {
      if (typeof unsubRef.current === "function") {
        unsubRef.current();
        unsubRef.current = null;
      }

      const limitCount = mode === "live" ? 1800 : null;

      const collections = [
        { path: "novedades/tgs/eventos", cliente: "TGS", eventoKey: "evento-tgs", ubicacionKey: "locaciones-tgs" },
        { path: "novedades/edificios/eventos", cliente: "Edificios", eventoKey: "evento-edificio", ubicacionKey: null },
        { path: "novedades/vtv/eventos", cliente: "VTV", eventoKey: "evento-vtv", ubicacionKey: "planta-vtv" },
        { path: "novedades/barrios/eventos", cliente: "Barrios", eventoKey: "evento-barrios", ubicacionKey: "barrio" },
        { path: "novedades/otros/eventos", cliente: "Otros", eventoKey: "evento-otros", ubicacionKey: "otro" },
      ];

      const unsubs = collections.map(({ path, cliente, eventoKey, ubicacionKey }) => {
        const base = collection(db, path);
        const qRef = limitCount ? query(base, orderBy("fechaHoraEnvio", "desc"), limit(limitCount)) : query(base, orderBy("fechaHoraEnvio", "desc"));

        return onSnapshot(qRef, (snapshot) => {
          const nuevos = snapshot.docs.map((docSnap) => {
            const d = docSnap.data() || {};

            const edificio = (d.edificio || "").toString().trim();
            const unidad = (d.unidad || "").toString().trim();

            const ubicacion =
              cliente === "Edificios"
                ? edificio
                  ? edificio + (unidad ? ` - ${unidad}` : "")
                  : "Sin Ubicación"
                : ubicacionKey
                ? d?.[ubicacionKey] || d?.ubicacion || "Sin Ubicación"
                : d?.ubicacion || "Sin Ubicación";

            const fechaEnvio = toDate(d.fechaHoraEnvio) || toDate(d.fecha) || null;

            const fechaEvento =
              cliente === "Edificios"
                ? toDate(d.fechaHoraEvento) || toDate(d.fechaHoraEventoISO) || toDate(d.fechaHoraEventoLocal) || null
                : toDate(d.fechaHoraEvento) || null;

            // operador: soporta variantes
            const keyCliente = cliente.toLowerCase();
            const operador = pickFirst(
              d,
              [
                "operador",
                `operador-${keyCliente}`,
                `operador_${keyCliente}`,
                `${"operador"}-${cliente}`,
                "operador-nombre",
                "operador_nombre",
                "usuario-operador",
                "usuario_operador",
                "usuario",
                "user",
                "email",
              ],
              ""
            );

            const eventoRaw = d[eventoKey];
            const evento = eventoRaw == null || String(eventoRaw).trim() === "" ? "Sin Evento" : String(eventoRaw).trim();

            const observacion = d[`observaciones-${keyCliente}`] ?? d["observaciones-edificios"] ?? d.observacion ?? d.observaciones ?? "";
            const resolucion = d["resolucion-evento"] ?? d["resolusion-evento"] ?? d.resolucion ?? d.resolucionEvento ?? "";
            const razones = d["razones-pma"] ?? d["razones_pma"] ?? d["razonesPma"] ?? d.razones ?? "";

            const respuestaResidente = pickFirst(
              d,
              ["respuesta-residente", "respuesta_residente", "respuestaResidente", "respuesta-residente-edificios", "respuestaResidenteEdificios"],
              ""
            );

            return {
              id: docSnap.id,
              cliente,
              operador: operador || "Sin operador",
              evento,
              ubicacion,
              fechaEnvio,
              fechaEvento,
              observacion: String(observacion || "").trim(),
              resolucion: String(resolucion || "").trim(),
              razones: String(razones || "").trim(),
              respuestaResidente: String(respuestaResidente || "").trim(),
            };
          });

          setEventos((prev) => {
            const otros = prev.filter((e) => e.cliente !== cliente);
            return [...otros, ...nuevos];
          });
        });
      });

      unsubRef.current = () => unsubs.forEach((u) => u && u());
      setLoadingMode(mode);
    },
    [setEventos]
  );

  useEffect(() => {
    loadEventos("live");
    return () => unsubRef.current?.();
  }, [loadEventos]);

  useEffect(() => {
    if (hasPassiveFilters && loadingMode !== "full") loadEventos("full");
  }, [hasPassiveFilters, loadingMode, loadEventos]);

  // ===== filtros + dataset =====
  const eventosFiltrados = useMemo(() => {
    let inicio = parseSafeDate(filtros.fechaInicio);
    let fin = parseSafeDate(filtros.fechaFin, true);
    if (inicio && fin && inicio > fin) [inicio, fin] = [fin, inicio];

    return (eventos || []).filter((e) => {
      const base = e.fechaEnvio || e.fechaEvento || null;
      if (inicio && (!base || base < inicio)) return false;
      if (fin && (!base || base > fin)) return false;

      if (filtros.cliente && filtros.cliente !== "Todos" && e.cliente !== filtros.cliente) return false;

      const key = norm(e.operador);
      const opProfile = opsMap.byEmail.get(key) || opsMap.byName.get(key) || null;

      if (filtros.turno) {
        if (!opProfile?.turno || norm(opProfile.turno) !== norm(filtros.turno)) return false;
      }

      if (filtros.operador) {
        const target = norm(filtros.operador);
        const hit =
          key === target ||
          norm(opProfile?.usuario) === target ||
          norm(opProfile?.nombre) === target ||
          norm(opProfile?.usuario || opProfile?.nombre || "") === target;
        if (!hit) return false;
      }

      const haystack = [e.cliente, e.operador, e.evento, e.ubicacion, e.observacion, e.resolucion, e.razones, e.respuestaResidente]
        .filter(Boolean)
        .join(" · ");
      if (!includesAllTerms(haystack, filtros.q)) return false;

      return true;
    });
  }, [eventos, filtros, opsMap]);

  const rangoResumen = useMemo(() => {
    const dates = eventosFiltrados
      .map((e) => e.fechaEnvio || e.fechaEvento)
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (dates.length === 0) return { from: null, to: null };
    return { from: dates[0], to: dates[dates.length - 1] };
  }, [eventosFiltrados]);

  // ===== métricas por operador + muestra de eventos =====
  const analytics = useMemo(() => {
    const byOp = new Map();

    const add = (key, patch) => {
      const cur = byOp.get(key) || {
        key,
        name: key || "Sin operador",
        total: 0,
        withObs: 0,
        withRes: 0,
        withResp: 0,
        lags: [],
        alerts: new Set(),
        profile: null,
        examples: [],
      };
      const next = { ...cur, ...patch };
      byOp.set(key, next);
      return next;
    };

    for (const e of eventosFiltrados) {
      const keyRaw = e.operador || "Sin operador";
      const key = keyRaw.trim() || "Sin operador";
      const keyN = norm(key);

      const prof = opsMap.byEmail.get(keyN) || opsMap.byName.get(keyN) || null;
      const row = add(key, { profile: prof, name: prof?.nombre || prof?.usuario || key });

      row.total += 1;
      if (e.observacion) row.withObs += 1;
      if (e.resolucion) row.withRes += 1;
      if (e.respuestaResidente) row.withResp += 1;

      if (e.fechaEnvio && e.fechaEvento) {
        const lagMin = Math.round((e.fechaEnvio.getTime() - e.fechaEvento.getTime()) / 60000);
        if (Number.isFinite(lagMin) && lagMin < -2) row.alerts.add("Fecha evento posterior al envío");
        if (Number.isFinite(lagMin) && lagMin >= 0 && lagMin <= 60 * 24 * 3) row.lags.push(lagMin);
      }

      const isPMA = norm(e.evento).includes("pma") || norm(e.evento).includes("puerta mantenida abierta");
      if (isPMA && !e.razones) row.alerts.add("PMA sin razones");
      if (!e.observacion) row.alerts.add("Sin observación");

      const ts = (e.fechaEnvio || e.fechaEvento)?.getTime?.() ?? 0;
      row.examples.push({
        ts,
        cliente: e.cliente,
        evento: e.evento,
        ubicacion: e.ubicacion,
        fecha: e.fechaEnvio || e.fechaEvento || null,
        observacion: e.observacion,
        respuestaResidente: e.respuestaResidente,
        resolucion: e.resolucion,
        razones: e.razones,
      });
      if (row.examples.length > 14) {
        row.examples.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        row.examples = row.examples.slice(0, 10);
      }

      byOp.set(key, row);
    }

    const rows = Array.from(byOp.values()).map((r) => {
      const obsPct = r.total ? Math.round((r.withObs / r.total) * 100) : 0;
      const resPct = r.total ? Math.round((r.withRes / r.total) * 100) : 0;

      const lags = [...(r.lags || [])].sort((a, b) => a - b);
      const lagAvg = lags.length ? Math.round(lags.reduce((a, b) => a + b, 0) / lags.length) : null;
      const lagP90 = lags.length ? lags[Math.min(lags.length - 1, Math.floor(lags.length * 0.9))] : null;

      const alerts = new Set(r.alerts || []);
      if (lagAvg != null && lagAvg >= 60) alerts.add("Lag alto");
      if (obsPct < 70) alerts.add("Baja calidad obs");
      if (resPct < 50) alerts.add("Baja resolución");

      const examples = [...(r.examples || [])].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 8);

      return {
        key: r.key,
        name: r.name,
        rol: r.profile?.rol || "",
        turno: r.profile?.turno || "",
        total: r.total,
        obsPct,
        resPct,
        lagAvg,
        lagP90,
        withResp: r.withResp || 0,
        alerts: Array.from(alerts).slice(0, 6),
        examples,
      };
    });

    rows.sort((a, b) => (b.total || 0) - (a.total || 0));

    const totalEventos = eventosFiltrados.length;
    const operadoresActivos = rows.filter((r) => (r.total || 0) > 0).length;

    const lagAll = [];
    let withObsAll = 0;
    let withResAll = 0;

    for (const e of eventosFiltrados) {
      if (e.observacion) withObsAll++;
      if (e.resolucion) withResAll++;
      if (e.fechaEnvio && e.fechaEvento) {
        const lagMin = Math.round((e.fechaEnvio.getTime() - e.fechaEvento.getTime()) / 60000);
        if (Number.isFinite(lagMin) && lagMin >= 0 && lagMin <= 60 * 24 * 3) lagAll.push(lagMin);
      }
    }

    lagAll.sort((a, b) => a - b);
    const lagAvgAll = lagAll.length ? Math.round(lagAll.reduce((a, b) => a + b, 0) / lagAll.length) : null;
    const lagP90All = lagAll.length ? lagAll[Math.min(lagAll.length - 1, Math.floor(lagAll.length * 0.9))] : null;

    const obsPctAll = totalEventos ? Math.round((withObsAll / totalEventos) * 100) : 0;
    const resPctAll = totalEventos ? Math.round((withResAll / totalEventos) * 100) : 0;

    const byDia = {};
    const byFranja = {};
    for (const e of eventosFiltrados) {
      const d = e.fechaEnvio || e.fechaEvento;
      if (!d) continue;
      const dia = DIAS[d.getDay()] || "Sin dato";
      const fr = franjaDeHora(d.getHours());
      byDia[dia] = (byDia[dia] || 0) + 1;
      byFranja[fr] = (byFranja[fr] || 0) + 1;
    }

    const top = (obj, n = 6) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([label, value]) => ({ label, value }));

    return {
      rows,
      kpis: { totalEventos, operadoresActivos, obsPctAll, resPctAll, lagAvgAll, lagP90All },
      tops: {
        operadores: rows.slice(0, 8).map((r) => ({ label: r.name, value: r.total, sub: r.turno ? `Turno: ${r.turno}` : "" })),
        dias: top(byDia, 7),
        franjas: top(byFranja, 4),
      },
    };
  }, [eventosFiltrados, opsMap]);

  const exportOpsCSV = () => {
    const header = ["operador", "rol", "turno", "eventos", "obs_pct", "res_pct", "lag_avg_min", "lag_p90_min", "alertas"];
    const rows = analytics.rows.map((r) => [
      r.name,
      r.rol || "",
      r.turno || "",
      r.total,
      r.obsPct,
      r.resPct,
      r.lagAvg ?? "",
      r.lagP90 ?? "",
      (r.alerts || []).join(" | "),
    ]);
    downloadCSV(`kpis_operadores_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  const clearFilters = () => {
    setFiltros({ cliente: "", operador: "", turno: "", fechaInicio: "", fechaFin: "", q: "" });
  };

  const turnos = useMemo(() => {
    const set = new Set();
    for (const o of ops) if (o.turno) set.add(o.turno);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ops]);

  const operadoresPick = useMemo(() => {
    const set = new Set(["Sin operador"]);
    for (const o of ops) {
      if (o.nombre) set.add(o.nombre);
      else if (o.usuario) set.add(o.usuario);
    }
    for (const e of eventos) if (e?.operador) set.add(String(e.operador).trim());
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [ops, eventos]);

  const filtrosActivosCount = useMemo(() => {
    const v = filtros;
    return [v.cliente, v.operador, v.turno, v.fechaInicio, v.fechaFin, (v.q || "").trim().length ? "q" : ""].filter(Boolean).length;
  }, [filtros]);

  return (
    <div style={{ minHeight: "100vh", background: UI.pageBg }}>
      <style>{`
        .oda-wrap{ width: min(1240px, calc(100vw - 32px)); margin: 0 auto; padding: 16px 0 28px; }

        .oda-sticky{
          position: sticky; top: 0; z-index: 10;
          padding: 12px 0;
          background: rgba(246,247,251,.86);
          border-bottom: 1px solid rgba(2,6,23,.06);
          backdrop-filter: blur(10px);
        }

        .oda-hero{
          border: 1px solid ${UI.line};
          background:
            radial-gradient(900px 520px at 0% 0%, rgba(59,130,246,.10), transparent 60%),
            radial-gradient(820px 520px at 100% 0%, rgba(99,102,241,.10), transparent 60%),
            rgba(255,255,255,.94);
          border-radius: 18px;
          padding: 14px;
          box-shadow: ${UI.shadow};
        }

        .oda-hero.filters-open{
          max-height: 56vh;
          overflow: auto;
        }

        .oda-title{ display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start; }
        .oda-title h1{
          margin:0; color: ${UI.ink}; font-size: 16px; letter-spacing: .2px; font-weight: 980;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial;
        }
        .oda-sub{ margin-top: 6px; color: ${UI.sub}; font-size: 12.5px; font-weight: 850; line-height: 1.35; }

        .oda-actions{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

        .oda-btn{
          border: 1px solid ${UI.line};
          background: rgba(255,255,255,.92);
          color: ${UI.ink};
          border-radius: 12px;
          padding: 9px 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 980;
          display:flex; align-items:center; gap:8px;
          box-shadow: 0 6px 18px rgba(2,6,23,.06);
          transition: transform .12s ease, background .12s ease, box-shadow .12s ease, border-color .12s ease;
        }
        .oda-btn:hover{ background: rgba(255,255,255,1); transform: translateY(-1px); box-shadow: 0 10px 24px rgba(2,6,23,.08); border-color: ${UI.line2}; }
        .oda-btn:active{ transform: translateY(0); }
        .oda-btn:focus{ outline: none; }
        .oda-btn:focus-visible{ box-shadow: 0 0 0 3px rgba(17,197,166,.28), 0 10px 24px rgba(2,6,23,.10); }

        .oda-btn.teal{ background: rgba(17,197,166,.12); border-color: rgba(17,197,166,.30); }
        .oda-btn.teal:hover{ background: rgba(17,197,166,.16); }
        .oda-btn.danger{ background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.22); }
        .oda-btn.danger:hover{ background: rgba(239,68,68,.14); }
        .oda-btn.ghost{ background: rgba(2,6,23,.04); }

        .oda-row{
          margin-top: 10px;
          display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between;
        }
        .oda-pill{
          display:flex; gap:8px; flex-wrap:wrap; align-items:center;
          color: ${UI.sub};
          font-size: 12.5px;
          font-weight: 900;
        }
        .oda-badge{
          display:inline-flex; align-items:center; justify-content:center;
          min-width: 22px; height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          background: rgba(17,197,166,.14);
          border: 1px solid rgba(17,197,166,.24);
          color: ${UI.ink};
          font-weight: 980;
          font-size: 12px;
        }

        .oda-filters{
          margin-top: 12px;
          display:grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1020px){ .oda-filters{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }

        .oda-field{
          border: 1px solid ${UI.line};
          background: rgba(255,255,255,.88);
          border-radius: 14px;
          padding: 10px;
          display:grid;
          gap: 6px;
        }
        .oda-field label{
          font-size: 11px;
          color: ${UI.sub};
          font-weight: 980;
          letter-spacing: .2px;
        }
        .oda-field input, .oda-field select{
          border: 1px solid rgba(2,6,23,.12);
          background: rgba(255,255,255,.92);
          color: ${UI.ink};
          border-radius: 10px;
          padding: 9px 10px;
          outline: none;
          font-size: 12.5px;
          font-weight: 900;
          transition: box-shadow .12s ease, border-color .12s ease;
        }
        .oda-field input::placeholder{ color: rgba(11,18,32,.45); font-weight: 800; }
        .oda-field input:focus, .oda-field select:focus{ border-color: rgba(17,197,166,.45); box-shadow: 0 0 0 3px rgba(17,197,166,.18); }

        .hint{
          margin-top: 10px;
          color: ${UI.sub};
          font-size: 12.5px;
          font-weight: 850;
          line-height: 1.45;
        }

        .oda-grid{
          margin-top: 12px;
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1020px){ .oda-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px){ .oda-grid{ grid-template-columns: 1fr; } }

        .oda-kpi-card{ transition: transform .12s ease, box-shadow .12s ease; }
        .oda-kpi-card:hover{ transform: translateY(-2px); box-shadow: 0 14px 34px rgba(2,6,23,.12); }

        .oda-panels{
          margin-top: 12px;
          display:grid;
          grid-template-columns: 1.15fr .85fr;
          gap: 12px;
        }
        @media (max-width: 1020px){ .oda-panels{ grid-template-columns: 1fr; } }

        .oda-mini-btn{
          border: 1px solid ${UI.line};
          background: rgba(255,255,255,.86);
          border-radius: 12px;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 980;
          font-size: 12px;
          color: ${UI.ink};
        }
        .oda-mini-btn:hover{ background: rgba(255,255,255,1); }
        .oda-mini-btn:focus{ outline: none; }
        .oda-mini-btn:focus-visible{ box-shadow: 0 0 0 3px rgba(17,197,166,.18); }

        .oda-row-click:hover td{ background: rgba(17,197,166,.045); }
      `}</style>

      <div className="oda-wrap">
        <div className="oda-sticky">
          <div className={`oda-hero ${filtersOpen ? "filters-open" : ""}`}>
            <div className="oda-title">
              <div style={{ minWidth: 260 }}>
                <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FaUserClock /> Analítica de Operadores
                </h1>
                <div className="oda-sub">
                  Mide <b>volumen</b>, <b>calidad</b> (obs/resolución) y <b>tiempos</b> (lag) por operador. Modo datos:{" "}
                  <b>{loadingMode === "full" ? "Completo" : "Live"}</b>.
                </div>
              </div>

              <div className="oda-actions">
                <Link to="/dashboard" style={{ textDecoration: "none" }}>
                  <button className="oda-btn" type="button" title="Volver al dashboard">
                    <FaArrowLeft /> Volver
                  </button>
                </Link>

                <button className="oda-btn teal" type="button" onClick={() => setFiltersOpen((v) => !v)} title="Mostrar/Ocultar filtros">
                  <FaFilter />
                  {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}{" "}
                  <span className="oda-badge" title="Cantidad de filtros activos">
                    {filtrosActivosCount}
                  </span>
                </button>

                <button className="oda-btn" type="button" onClick={() => loadEventos(loadingMode)} title="Re-suscribir / refrescar">
                  <FaSyncAlt /> Refrescar
                </button>

                <button className="oda-btn" type="button" onClick={exportOpsCSV} title="Exportar KPIs por operador a CSV">
                  <FaDownload /> Exportar
                </button>

                <button className="oda-btn danger" type="button" onClick={clearFilters} title="Limpiar filtros">
                  <FaTimes /> Limpiar
                </button>
              </div>
            </div>

            <div className="oda-row">
              <div className="oda-pill">
             
              
              </div>

              <div className="oda-pill" style={{ gap: 10 }}>
                <span style={{ color: UI.sub }}>Calidad objetivo:</span>
                <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(17,197,166,.14)", border: "1px solid rgba(17,197,166,.22)", padding: "3px 10px", borderRadius: 999, color: UI.ink, fontWeight: 980 }}>
                    Obs ≥ 85%
                  </span>
                  <span style={{ background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.20)", padding: "3px 10px", borderRadius: 999, color: UI.ink, fontWeight: 980 }}>
                    Res ≥ 70%
                  </span>
                </span>
              </div>
            </div>

            {filtersOpen && (
              <>
                <div className="oda-filters">
                  <div className="oda-field">
                    <label>Cliente</label>
                    <select value={filtros.cliente} onChange={(e) => setFiltros((p) => ({ ...p, cliente: e.target.value }))}>
                      <option value="">Todos</option>
                      <option value="TGS">TGS</option>
                      <option value="Edificios">Edificios</option>
                      <option value="VTV">VTV</option>
                      <option value="Barrios">Barrios</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>

                  <div className="oda-field">
                    <label>Operador</label>
                    <select value={filtros.operador} onChange={(e) => setFiltros((p) => ({ ...p, operador: e.target.value }))}>
                      <option value="">Todos</option>
                      {operadoresPick.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="oda-field">
                    <label>Turno</label>
                    <select value={filtros.turno} onChange={(e) => setFiltros((p) => ({ ...p, turno: e.target.value }))}>
                      <option value="">Todos</option>
                      {turnos.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="oda-field">
                    <label>Desde</label>
                    <input type="date" value={filtros.fechaInicio} onChange={(e) => setFiltros((p) => ({ ...p, fechaInicio: e.target.value }))} />
                  </div>

                  <div className="oda-field">
                    <label>Hasta</label>
                    <input type="date" value={filtros.fechaFin} onChange={(e) => setFiltros((p) => ({ ...p, fechaFin: e.target.value }))} />
                  </div>

                  <div className="oda-field">
                    <label>Buscar</label>
                    <input
                      type="search"
                      value={filtros.q}
                      placeholder="Evento, ubicación, observación, respuesta…"
                      onChange={(e) => setFiltros((p) => ({ ...p, q: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="hint">
                  Tip: cuando aplicás filtros, el dashboard pasa automáticamente a <b>Modo Completo</b>.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="oda-grid">
          <Card title="Incidencias (filtro actual)" value={analytics.kpis.totalEventos} sub="Total de registros analizados." />
         
          <Card
            title="Calidad: Observación"
            value={`${analytics.kpis.obsPctAll}%`}
            sub="Registros con observación cargada."
            tone={analytics.kpis.obsPctAll >= 85 ? "good" : analytics.kpis.obsPctAll <= 70 ? "bad" : "default"}
          />
          <Card
            title="Calidad: Resolución"
            value={`${analytics.kpis.resPctAll}%`}
            sub="Registros con resolución informada."
            tone={analytics.kpis.resPctAll >= 70 ? "good" : analytics.kpis.resPctAll <= 45 ? "bad" : "default"}
          />
          <Card
            title="Lag promedio (min)"
            value={analytics.kpis.lagAvgAll ?? "-"}
            sub="En eventos con fecha de evento + envío."
            tone={analytics.kpis.lagAvgAll != null && analytics.kpis.lagAvgAll < 30 ? "good" : analytics.kpis.lagAvgAll != null && analytics.kpis.lagAvgAll >= 60 ? "bad" : "default"}
          />
     
    
        </div>

        <div className="oda-panels">
          <div style={{ display: "grid", gap: 12 }}>
            <BarList title="Top operadores (volumen)" items={analytics.tops.operadores} rightLabel="Eventos" />
            <Table rows={analytics.rows} onPick={(r) => setPickedOp(r)} />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <BarList title="Distribución por día" items={analytics.tops.dias} rightLabel="Eventos" />
            <BarList title="Distribución por franja horaria" items={analytics.tops.franjas} rightLabel="Eventos" />

            <div style={{ border: `1px solid ${UI.line}`, background: UI.cardBg, borderRadius: 18, padding: 14, boxShadow: UI.shadow2 }}>
              <div style={{ fontSize: 13, fontWeight: 980, color: UI.ink }}>Cómo leer este tablero</div>
              <div style={{ marginTop: 10, fontSize: 12.5, color: UI.sub, fontWeight: 850, lineHeight: 1.55 }}>
                • <b>Obs</b>: si baja, faltan descripciones (calidad). <br />
                • <b>Res</b>: si baja, falta cierre/resultado. <br />
                • <b>Lag</b>: si sube, el evento se carga tarde (revisar flujo). <br />
                • <b>Alertas</b>: marca problemas típicos (PMA sin razones, sin observación, fechas raras).
              </div>
            </div>
          </div>
        </div>

        <Modal open={!!pickedOp} title={pickedOp ? `Operador: ${pickedOp.name}` : "Operador"} onClose={() => setPickedOp(null)}>
          {pickedOp && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Chip text={`Eventos: ${pickedOp.total}`} />
                <Chip text={`Obs: ${pickedOp.obsPct}%`} tone={pickedOp.obsPct >= 85 ? "good" : pickedOp.obsPct <= 70 ? "bad" : "neutral"} />
                <Chip text={`Res: ${pickedOp.resPct}%`} tone={pickedOp.resPct >= 70 ? "good" : pickedOp.resPct <= 45 ? "bad" : "neutral"} />
                <Chip text={`Resp. residente: ${pickedOp.withResp || 0}`} tone={(pickedOp.withResp || 0) > 0 ? "good" : "warn"} />
                <Chip text={`Lag prom.: ${pickedOp.lagAvg ?? "-"}`} tone={pickedOp.lagAvg != null && pickedOp.lagAvg >= 60 ? "bad" : pickedOp.lagAvg != null && pickedOp.lagAvg < 30 ? "good" : "neutral"} />
                <Chip text={`P90: ${pickedOp.lagP90 ?? "-"}`} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ border: `1px solid ${UI.line}`, borderRadius: 16, padding: 12, background: "rgba(2,6,23,.02)" }}>
                  <div style={{ fontSize: 12, color: UI.sub, fontWeight: 980 }}>Perfil</div>
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: UI.ink, lineHeight: 1.45 }}>
                    Rol: <b>{pickedOp.rol || "-"}</b>
                    <br />
                    Turno: <b>{pickedOp.turno || "-"}</b>
                  </div>
                </div>

                <div style={{ border: `1px solid ${UI.line}`, borderRadius: 16, padding: 12, background: "rgba(2,6,23,.02)" }}>
                  <div style={{ fontSize: 12, color: UI.sub, fontWeight: 980 }}>Alertas</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(pickedOp.alerts || []).length ? pickedOp.alerts.map((a) => <Chip key={a} text={a} tone="bad" />) : <Chip text="OK" tone="good" />}
                  </div>
                </div>
              </div>

              <div style={{ border: `1px solid ${UI.line}`, borderRadius: 16, padding: 12 }}>
                <div style={{ fontSize: 12, color: UI.sub, fontWeight: 980 }}>Últimos eventos (muestra)</div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {(pickedOp.examples || []).length ? (
                    pickedOp.examples.map((ex, i) => (
                      <div
                        key={`${ex.ts}-${i}`}
                        style={{ border: `1px solid ${UI.line}`, borderRadius: 16, padding: 12, background: "rgba(255,255,255,.92)", boxShadow: "0 10px 24px rgba(2,6,23,.06)" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <Chip text={ex.cliente} />
                            <Chip text={ex.evento} tone={norm(ex.evento).includes("pma") ? "warn" : "neutral"} />
                            <Chip text={ex.ubicacion || "Sin ubicación"} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: UI.sub }}>{fmtDate(ex.fecha)}</div>
                        </div>

                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          <ExpandableText title="Observación" text={ex.observacion} />
                          <ExpandableText title="Respuesta del residente" text={ex.respuestaResidente} />
                          <ExpandableText title="Resolución" text={ex.resolucion} initialLines={2} />
                          <ExpandableText title="Razones (PMA)" text={ex.razones} initialLines={2} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12.5, color: UI.sub, fontWeight: 850 }}>No hay muestra para este operador con los filtros actuales.</div>
                  )}
                </div>
              </div>

              <div style={{ border: `1px solid ${UI.line}`, borderRadius: 16, padding: 12 }}>
                <div style={{ fontSize: 12, color: UI.sub, fontWeight: 980 }}>Qué hacer</div>
                <div style={{ marginTop: 8, fontSize: 12.5, color: UI.sub, fontWeight: 850, lineHeight: 1.55 }}>
                  • Si <b>Obs</b> está baja: exigir mínimo “qué pasó + dónde + acción tomada”. <br />
                  • Si <b>Res</b> está baja: definir criterio de cierre por tipo de evento y exigirlo. <br />
                  • Si aparece <b>Fecha evento posterior al envío</b>: revisar cómo se está cargando la hora del evento.
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
