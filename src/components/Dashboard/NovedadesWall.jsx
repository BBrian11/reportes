import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AppBar, Toolbar, Box, Typography, Stack, IconButton, Divider, Badge, Tooltip, Chip, Menu, MenuItem, Chip as MuiChip
} from "@mui/material";
import {
  FaCompress, FaExpand, FaTimes, FaListUl, FaBell, FaBellSlash,
  FaFilter, FaChartBar, FaEye, FaEdit, FaCopy, FaTrash,
  FaColumns, FaThLarge, FaTv
} from "react-icons/fa";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import "sweetalert2/dist/sweetalert2.min.css";

const MySwal = withReactContent(Swal);

/* ==== Paleta ==== */
const PALETTE = {
  bg: "#0A0F1C", panel: "#0D1628", header: "#0B1324", border: "#1E2A44",
  text: "#E8EEF7", subtext: "#A9BEDF", brand: "#2A9DF4",
  critical: "#FF3B30", criticalBg: "#2A1113", criticalFg: "#FFE5E7",
  warning: "#FFC300", warningBg: "#2A2208", warningFg: "#FFF4D5",
  ok: "#00D97E", okBg: "#0E2318", okFg: "#D4FFE9",
  info: "#3B82F6", infoBg: "#0D1A2E", infoFg: "#DCEBFF",
  offline: "#FF3B30", offlineBg: "#2A1113", offlineFg: "#FFE5E7",
  marqueeBg: "#2A1113", marqueeText: "#FFE5E7",
};

const PILL_COLORS = {
  ok:       { bg: PALETTE.okBg, fg: PALETTE.okFg, bd: PALETTE.ok,       name: "REGULAR", icon: "success"  },
  info:     { bg: PALETTE.infoBg, fg: PALETTE.infoFg, bd: PALETTE.info, name: "MEDIO",   icon: "info"     },
  warning:  { bg: PALETTE.warningBg, fg: PALETTE.warningFg, bd: PALETTE.warning, name: "ALTO", icon: "warning" },
  critical: { bg: PALETTE.criticalBg, fg: PALETTE.criticalFg, bd: PALETTE.critical, name: "CRÍTICO", icon: "error" },
  offline:  { bg: PALETTE.offlineBg, fg: PALETTE.offlineFg, bd: PALETTE.offline, name: "CRÍTICO", icon: "error" },
};

const SEV_ORDER = ["critical", "offline", "warning", "info", "ok"];

/* ==== Helpers visibles ==== */
function escapeHtml(s) { return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
function clip(s, n) { const ss = String(s || ""); return ss.length > n ? ss.slice(0, n - 1) + "…" : ss; }
function toLocalInputValue(date){ try { const d = (date instanceof Date)? date : new Date(date); const pad=n=> String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; } catch { return ''; } }

/* ==== Beep sutil ==== */
function useBeep() {
  const ctxRef = useRef(null);
  const ensure = () => { try { if (ctxRef.current) return ctxRef.current; const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null; ctxRef.current = new Ctx(); return ctxRef.current; } catch { return null; } };
  return (sev = "info") => { try { const ctx = ensure(); if (!ctx) return; const o = ctx.createOscillator(); const g = ctx.createGain(); const now = ctx.currentTime; const freq = sev === "critical" || sev === "offline" ? 880 : sev === "warning" ? 620 : 480; o.frequency.setValueAtTime(freq, now); o.type = "sine"; g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.18, now + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35); o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.38); } catch {} };
}

/* ==== Preferencias ==== */
const LS_PREFS = "novedades_wall_prefs";
const defaultPrefs = { notify: { critical: true, offline: true, warning: true, info: false, ok: false }, sound: true, initialToasts: false };

/* ==== Layouts y shows (solo locales, sin BC) ==== */
const DENSITIES = /** @type const */ (["comfy","cozy","compact","ultra"]);
const LS_TV_ID = "wallboard_tv_id";
const LS_TV_SHOWS = "wallboard_tv_shows";
const TV_DEFAULT = () => `TV-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

/* ====== Mapeo a Niveles ======
   - crítico: sev critical/offline
   - alto:    sev warning
   - medio:   sev info
   - regular: sev ok
*/
function levelOf(card) {
  const s = String(card?.sev || "").toLowerCase();
  if (s === "critical" || s === "offline") return "critico";
  if (s === "warning") return "alto";
  if (s === "info") return "medio";
  return "regular";
}

function ListRow({ card, onEdit, onClose, onDuplicate, onDelete, onView }) {
  const meta = PILL_COLORS[card.sev] || PILL_COLORS.info;
  const at = card.at instanceof Date ? card.at : new Date(card.at);
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "110px 1fr 220px 120px",
        gap: 10,
        alignItems: "center",
        px: 1,
        py: 0.75,
        borderBottom: `1px solid ${PALETTE.border}`,
      }}
      title="Doble click para editar"
      onDoubleClick={() => onEdit?.(card)}
    >
      <MuiChip
        label={PILL_COLORS[card.sev]?.name || card.sev.toUpperCase()}
        size="small"
        sx={{ fontWeight: 900, color: meta.fg, bgcolor: meta.bg, border: `1px solid ${meta.bd}` }}
      />

      {/* TEXTO MUY CORTO EN LA FILA */}
      <Typography
        sx={{
          fontWeight: 900,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          // si querés 2 líneas con “…” en vez de 1:
          // display: "-webkit-box",
          // WebkitLineClamp: 2,
          // WebkitBoxOrient: "vertical",
          // whiteSpace: "normal",
        }}
        title={card.text || "—"}
      >
        {clip(card.text || "—", 120)}
      </Typography>

      <Typography sx={{ fontFamily: "ui-monospace, Menlo, monospace", opacity: 0.9 }}>
        {at.toLocaleString("es-AR")}
      </Typography>

      {/* ACCIONES (con “Ver”) */}
      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
        <IconButton size="small" onClick={() => onView?.(card)} title="Ver texto completo" sx={{ color: PALETTE.subtext }}>
          <FaEye />
        </IconButton>
        <IconButton size="small" onClick={() => onEdit?.(card)} title="Editar" sx={{ color: PALETTE.subtext }}>
          <FaEdit />
        </IconButton>
        <IconButton size="small" onClick={() => onDuplicate?.(card.id)} title="Duplicar" sx={{ color: PALETTE.subtext }}>
          <FaCopy />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete?.(card.id)} title="Eliminar" sx={{ color: PALETTE.subtext }}>
          <FaTrash />
        </IconButton>
        <IconButton size="small" onClick={() => onClose?.(card.id)} title="Ocultar en esta pantalla" sx={{ color: PALETTE.subtext }}>
          <FaTimes />
        </IconButton>
      </Box>
    </Box>
  );
}


/* ========================= PANEL LISTA ========================= */
function PanelList({ title, color, items, rowActions }) {
  return (
    <Box sx={{ border: `1px solid ${PALETTE.border}`, borderRadius: 2, overflow: 'hidden', background: PALETTE.panel, minHeight: 200 }}>
      <Box sx={{ px: 1, py: .75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${PALETTE.border}`, background: '#0B1428' }}>
        <Typography sx={{ fontWeight: 900, color }}>{title}</Typography>
        <Typography sx={{ fontWeight: 800, color: PALETTE.subtext }}>{items.length} items</Typography>
      </Box>

      {/* Encabezado */}
      <Box sx={{ display: 'grid', gridTemplateColumns: "110px 1fr 220px 110px 120px", gap: 10, alignItems: 'center', px: 1, py: .75, borderBottom: `1px solid ${PALETTE.border}`, color: PALETTE.subtext, fontWeight: 800, textTransform: 'uppercase', fontSize: 12 }}>
        <span>Sev</span>
        <span>Texto</span>
        <span>Fecha</span>
        <span>ID</span>
        <span style={{ textAlign: 'right' }}>Acciones</span>
      </Box>

      {/* Items */}
      <Box>
        {items.map((card) => (
          <ListRow key={card.id} card={card} {...rowActions} />
        ))}
      </Box>
    </Box>
  );
}

/* ========================= PRINCIPAL ========================= */
export default function NovedadesWall() {
  const [isFs, setIsFs] = useState(false);
  const [density, setDensity] = useState("comfy");
  const [layout, setLayout] = useState("4"); // por defecto 4 paneles
  const [tvId, setTvId] = useState(() => { try { return localStorage.getItem(LS_TV_ID) || TV_DEFAULT(); } catch { return TV_DEFAULT(); } });
  useEffect(() => { try { localStorage.setItem(LS_TV_ID, tvId); } catch {} }, [tvId]);
  const [tvShows, setTvShows] = useState("all");
  useEffect(() => { try { localStorage.setItem(LS_TV_SHOWS, JSON.stringify(tvShows)); } catch {} }, [tvShows]);
    // ⏱️ Reloj en vivo
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);
  // Cards y ticker desde localStorage (formato existente)
  const [miniCards, setMiniCards] = useState(() => {
    try {
      const raw = localStorage.getItem("wallboard_mini_cards");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(c => ({ ...c, at: c.at ? new Date(c.at) : new Date() })) : [];
    } catch { return []; }
  });
  const [tickerItems, setTickerItems] = useState(() => {
    try {
      const raw = localStorage.getItem("wallboard_ticker_items");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(x => ({ ...x, time: x.time ? new Date(x.time) : new Date() })) : [];
    } catch { return []; }
  });

  // Seed demo si está vacío
  useEffect(() => {
    if (miniCards.length === 0) {
      const demo = [
        { id: "demo-crit", sev: "critical", text: "CRÍTICO: UPS sin enlace en sucursal Centro.", at: new Date() },
        { id: "demo-alt", sev: "warning", text: "ALTO: Jitter alto en backbone.", at: new Date() },
        { id: "demo-med", sev: "info", text: "MEDIO: Imagen borrosa en cámara Patio.", at: new Date() },
        { id: "demo-reg", sev: "ok", text: "REGULAR: Check de rutina.", at: new Date() },
      ];
      try { localStorage.setItem("wallboard_mini_cards", JSON.stringify(demo)); } catch {}
      setMiniCards(demo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escuchar cambios en storage para sync suave (misma pestaña/otras)
  useEffect(() => {
    const onStorage = (ev) => {
      if (ev.key === "wallboard_mini_cards" && ev.newValue) {
        try { const incoming = JSON.parse(ev.newValue).map((c) => ({ ...c, at: c.at ? new Date(c.at) : new Date() })); setMiniCards(incoming); } catch {}
      }
      if (ev.key === "wallboard_ticker_items" && ev.newValue) {
        try { setTickerItems(JSON.parse(ev.newValue).map((x) => ({ ...x, time: x.time ? new Date(x.time) : new Date() }))); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Notificaciones / prefs (local)
  const [prefs, setPrefs] = useState(() => { try { const s = JSON.parse(localStorage.getItem(LS_PREFS) || "null"); return s ? { ...defaultPrefs, ...s, notify: { ...defaultPrefs.notify, ...(s.notify || {}) } } : defaultPrefs; } catch { return defaultPrefs; } });
  useEffect(() => { try { localStorage.setItem(LS_PREFS, JSON.stringify(prefs)); } catch {} }, [prefs]);
  const [dismissed, setDismissed] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("novedades_dismissed") || "[]")); } catch { return new Set(); } });
  const saveDismissed = (nextSet) => { setDismissed(new Set(nextSet)); try { localStorage.setItem("novedades_dismissed", JSON.stringify(Array.from(nextSet))); } catch {} };
  const resetHidden = () => { saveDismissed(new Set()); MySwal.fire({ icon: "success", title: "Listo", text: "Se re-mostraron todas las novedades ocultas en esta pantalla.", timer: 1200, showConfirmButton: false, background: PALETTE.panel, color: PALETTE.text }); };
  const beep = useBeep();

  const setAndPersistMiniCards = (next) => { setMiniCards(next); try { localStorage.setItem("wallboard_mini_cards", JSON.stringify(next)); } catch {} };
  const updateOne = (id, patch) => setAndPersistMiniCards(miniCards.map(c => (c.id === id ? { ...c, ...patch } : c)));
  const deleteOne = (id) => { setAndPersistMiniCards(miniCards.filter(c => c.id !== id)); const d = new Set(dismissed); d.delete(id); saveDismissed(d); };
  const duplicateOne = (id) => { const card = miniCards.find(c => c.id === id); if (!card) return; const nid = Math.random().toString(36).slice(2, 9); const clone = { ...card, id: nid, at: new Date() }; setAndPersistMiniCards([clone, ...miniCards]); };
// ✅ DENTRO de NovedadesWall (después de deleteOne/duplicateOne)
const onViewCard = (card) => {
  const safe = escapeHtml(card.text || "");
  MySwal.fire({
    icon: "info",
    title: "Texto completo",
    html: `<div style="text-align:left;white-space:pre-wrap">${safe || "<i>Sin texto</i>"}</div>`,
    confirmButtonText: "Cerrar",
    background: PALETTE.panel,
    color: PALETTE.text,
  });
};

// Acciones por fila (ahora sí con ámbito correcto)

  // Editor simple
  const openEditCard = (card) => {
    const isNew = !card;
    const base = card || { id: Math.random().toString(36).slice(2,9), sev: "info", text: "", at: new Date() };
    const html = `
      <div style="display:grid;gap:12px;text-align:left">
        <label style="font-weight:800">Severidad</label>
        <select id="f-sev" class="swal2-select">
          ${SEV_ORDER.map(s => `<option value="${s}" ${s===base.sev?"selected":""}>${(PILL_COLORS[s]?.name)||s}</option>`).join("")}
        </select>
        <label style="font-weight:800">Texto</label>
        <textarea id="f-text" class="swal2-textarea" rows="4" placeholder="Escribí el mensaje...">${escapeHtml(base.text)}</textarea>
        <label style="font-weight:800">Fecha/Hora</label>
        <input id="f-date" type="datetime-local" class="swal2-input" value="${toLocalInputValue(base.at)}" />
      </div>`;
    MySwal.fire({
      title: isNew? 'Nueva novedad' : `Editar ${base.id}`,
      html, background: PALETTE.panel, color: PALETTE.text,
      focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar',
      preConfirm: () => {
        const sev = /** @type {HTMLSelectElement} */(document.getElementById('f-sev')).value;
        const text = /** @type {HTMLTextAreaElement} */(document.getElementById('f-text')).value.trim();
        const when = /** @type {HTMLInputElement} */(document.getElementById('f-date')).value;
        if (!text) { MySwal.showValidationMessage('El texto es obligatorio'); return false; }
        return { sev, text, at: new Date(when || Date.now()) };
      }
    }).then(r => {
      if (!r.isConfirmed || !r.value) return;
      const patch = { sev: r.value.sev, text: r.value.text, at: r.value.at };
      if (isNew) setAndPersistMiniCards([{ ...base, ...patch }, ...miniCards]);
      else updateOne(base.id, patch);
      if (prefs.sound) beep(patch.sev);
    });
  };

  // Filtrado / orden: siempre por nivel de atención (críticos → altos → medios → regulares) y dentro por fecha desc
  const ordered = useMemo(() => {
    const base = [...miniCards].filter(c => !dismissed.has(c.id));
    const rank = { critico: 0, alto: 1, medio: 2, regular: 3 };
    base.sort((a,b) => {
      const ra = rank[levelOf(a)]; const rb = rank[levelOf(b)];
      if (ra !== rb) return ra - rb;
      const ta = a.at instanceof Date ? a.at.getTime() : new Date(a.at).getTime();
      const tb = b.at instanceof Date ? b.at.getTime() : new Date(b.at).getTime();
      return tb - ta;
    });
    return base;
  }, [miniCards, dismissed]);

  // Grupos por nivel (contenido fijo por panel → cero parpadeo al cambiar layout)
  const grupos = useMemo(() => {
    const g = { critico: [], alto: [], medio: [], regular: [] };
    for (const c of ordered) g[levelOf(c)].push(c);
    return g;
  }, [ordered]);

  const marquee = useMemo(() => tickerItems.map((t) => t.text).join("   •   "), [tickerItems]);

  // fullscreen
  const toggleFs = async () => { try { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); } else { await document.exitFullscreen(); } } catch {} };
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    const onKey = (e) => { if ((e.key || "").toLowerCase() === "f") toggleFs(); };
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onFs); window.removeEventListener("keydown", onKey); };
  }, []);

  // ocultar helpers
  const removeLocal = (id) => { const next = new Set(dismissed); next.add(id); saveDismissed(next); };
  const removeBySeverity = (sev) => { const ids = ordered.filter(c => c.sev === sev).map(c => c.id); const next = new Set(dismissed); ids.forEach(id => next.add(id)); saveDismissed(next); };

  // UI helpers
  const openPreferencias = () => {
    const html = `
      <div style="display:grid;gap:10px;text-align:left">
        ${SEV_ORDER.map(s=>`<label style="display:flex;align-items:center;gap:8px"><input id="nf-${s}" type="checkbox" ${prefs.notify[s]?"checked":""}/> Notificar ${(PILL_COLORS[s]?.name)||s}</label>`).join("")}
        <label style="display:flex;align-items:center;gap:8px"><input id="nf-sound" type="checkbox" ${prefs.sound?"checked":""}/> Sonido</label>
        <label style="display:flex;align-items:center;gap:8px"><input id="nf-initial" type="checkbox" ${prefs.initialToasts?"checked":""}/> Mostrar toasts al cargar</label>
      </div>`;
    MySwal.fire({
      title: 'Preferencias', html, background: PALETTE.panel, color: PALETTE.text,
      showCancelButton: true, confirmButtonText: 'Guardar',
      preConfirm: () => {
        const get = id => /** @type {HTMLInputElement} */(document.getElementById(id)).checked;
        return {
          notify: {
            critical: get('nf-critical'),
            offline: get('nf-offline'),
            warning: get('nf-warning'),
            info: get('nf-info'),
            ok: get('nf-ok'),
          },
          sound: get('nf-sound'),
          initialToasts: get('nf-initial'),
        };
      }
    }).then(r => { if (r.isConfirmed && r.value) setPrefs(r.value); });
  };

  const openResumen = () => {
    const counts = {
      CRÍTICOS: grupos.critico.length,
      ALTOS: grupos.alto.length,
      MEDIOS: grupos.medio.length,
      REGULARES: grupos.regular.length,
    };
    const html = `
      <div style="display:grid;gap:10px;text-align:left">
        ${Object.entries(counts).map(([k,v]) => `<div style="padding:8px;border:1px solid ${PALETTE.border};background:#0B1428"><b>${k}</b>: ${v}</div>`).join("")}
      </div>`;
    MySwal.fire({ title: 'Resumen por atención', html, background: PALETTE.panel, color: PALETTE.text, confirmButtonText: 'OK' });
  };

  // Acciones por fila
  const rowActions = {
    onEdit: openEditCard,
    onClose: removeLocal,
    onDuplicate: duplicateOne,
    onDelete: deleteOne
  };

  // Vistas: 1, 2 o 4 paneles (contenido NO cambia → sin flashes)
  const renderContent = () => {
    if (ordered.length === 0) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography sx={{ color: PALETTE.subtext }}>
            <i>No hay novedades visibles.</i>{" "}
            <span style={{ textDecoration: "underline", cursor: "pointer", fontWeight: 800 }} onClick={resetHidden} title="Restaurar novedades ocultas">Mostrar ocultas</span>{" "}
            o agregá items en “Editar”.
          </Typography>
        </Box>
      );
    }

    if (layout === "1") {
      // Lista única, orden: critico > alto > medio > regular
      return (
        <Box sx={{ p: 1 }}>
          <PanelList title="Todos (orden por nivel)" color={PALETTE.text} items={ordered} rowActions={rowActions} />
        </Box>
      );
    }

    if (layout === "2") {
      // 2 columnas: izquierda (Críticos + Altos), derecha (Medios + Regulares)
      const left = [...grupos.critico, ...grupos.alto];
      const right = [...grupos.medio, ...grupos.regular];
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, p: 12 }}>
          <PanelList title={`Críticos + Altos (${left.length})`} color={PALETTE.critical} items={left} rowActions={rowActions} />
          <PanelList title={`Medios + Regulares (${right.length})`} color={PALETTE.info} items={right} rowActions={rowActions} />
        </Box>
      );
    }

    // layout === "4": 4 paneles fijos
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, p: 12 }}>
        <PanelList title={`Críticos (${grupos.critico.length})`} color={PALETTE.critical} items={grupos.critico} rowActions={rowActions} />
        <PanelList title={`Altos (${grupos.alto.length})`} color={PALETTE.warning} items={grupos.alto} rowActions={rowActions} />
        <PanelList title={`Medios (${grupos.medio.length})`} color={PALETTE.info} items={grupos.medio} rowActions={rowActions} />
        <PanelList title={`Regulares (${grupos.regular.length})`} color={PALETTE.ok} items={grupos.regular} rowActions={rowActions} />
      </Box>
    );
  };

  return (
    <Box sx={{ height: "100vh", display: "grid", gridTemplateRows: "auto auto 1fr", bgcolor: PALETTE.bg, color: PALETTE.text }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: PALETTE.header, borderBottom: `1px solid ${PALETTE.border}` }}>
        <Toolbar sx={{ minHeight: 88, gap: 1, py: 1.5 }}>
          {/* Estado + Reloj */}
          <Box sx={{ display:"flex", alignItems:"center", gap:1.5, mr:1.5 }}>
            <Box sx={{ px: 1.4, py: .6, borderRadius: 1, border: `1px solid ${PALETTE.border}`, bgcolor: navigator.onLine ? PALETTE.okBg : PALETTE.offlineBg, color:  navigator.onLine ? PALETTE.okFg : PALETTE.offlineFg, fontWeight: 900, fontSize: 13, letterSpacing: .4 }}>{navigator.onLine ? 'ONLINE' : 'OFFLINE'}</Box>
                   
           <Box sx={{ lineHeight: 1 }}>
              <Typography
                sx={{
                  fontFamily:"ui-monospace, Menlo, monospace",
                  fontWeight:900,
                   fontSize: 56,
                  background: "#0E2318",
                  padding: "2px 8px",
                  borderRadius: 6,
                  letterSpacing: 1,
                  color: PALETTE.ok,                    // ✅ verde
                  textShadow: `0 0 8px ${PALETTE.ok}55` // glow sutil
                }}
              >
                {now.toLocaleTimeString("es-AR", { hour12:false, timeZone: "America/Argentina/Buenos_Aires" })}
              </Typography>
             <Typography
                sx={{
                  fontFamily:"ui-monospace, Menlo, monospace",
                  fontWeight:800,
                  fontSize: 14,
                  color: PALETTE.subtext,
                  textAlign: "right",
                 mt: "-2px"
                }}
              >
                {now.toLocaleDateString("es-AR", {
                  weekday:"short", day:"2-digit", month:"2-digit", year:"numeric",
                  timeZone: "America/Argentina/Buenos_Aires"
                })}
              </Typography>
           </Box>

          </Box>

          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: .6, ml: 1 }}>Wall de Novedades (por nivel de atención)</Typography>
          <Box sx={{ flex: 1 }} />

          {/* TV actual */}
          <Chip icon={<FaTv/>} label={`TV: ${tvId}`} onClick={() => {
            MySwal.fire({ title: 'Nombre de este TV', input: 'text', inputValue: tvId, background: PALETTE.panel, color: PALETTE.text, confirmButtonText: 'Guardar', showCancelButton: true }).then(r => { if (r.isConfirmed && r.value) { const v = String(r.value).trim(); setTvId(v); } });
          }} sx={{ fontWeight: 900, bgcolor: '#112048', color: PALETTE.text, border: `1px solid ${PALETTE.border}` }} />

          {/* Selector de layout */}
          <Tooltip title={`Layout: ${layout === '1' ? '1 panel' : layout === '2' ? '2 paneles' : '4 paneles'}`}>
            <Stack direction="row" spacing={1}>
              <IconButton onClick={() => setLayout("1")} sx={{ color: layout === '1' ? PALETTE.text : PALETTE.subtext }} title="1 panel (lista)"><FaListUl/></IconButton>
              <IconButton onClick={() => setLayout("2")} sx={{ color: layout === '2' ? PALETTE.text : PALETTE.subtext }} title="2 paneles (split)"><FaColumns/></IconButton>
              <IconButton onClick={() => setLayout("4")} sx={{ color: layout === '4' ? PALETTE.text : PALETTE.subtext }} title="4 paneles (2x2)"><FaThLarge/></IconButton>
            </Stack>
          </Tooltip>

          {/* Densidad (visual) */}
          <Tooltip title={`Densidad: ${density}`}>
            <IconButton onClick={() => { const i = DENSITIES.indexOf(density); const next = DENSITIES[(i + 1) % DENSITIES.length]; setDensity(next); }} sx={{ color: PALETTE.subtext }}>
              <FaCompress />
            </IconButton>
          </Tooltip>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Resumen por atención"><IconButton onClick={() => openResumen()} sx={{ color: PALETTE.subtext }}><FaChartBar /></IconButton></Tooltip>
            <Tooltip title="Preferencias de notificaciones"><IconButton onClick={() => openPreferencias()} sx={{ color: PALETTE.subtext }}><FaFilter /></IconButton></Tooltip>
            <Tooltip title={Object.values(prefs.notify).some(Boolean) ? "Notificaciones ON" : "Notificaciones OFF"}>
              <IconButton onClick={() => { const anyOn = Object.values(prefs.notify).some(Boolean); if (anyOn) setPrefs((p) => ({ ...p, notify: { critical:false, offline:false, warning:false, info:false, ok:false } })); else setPrefs((p) => ({ ...p, notify: { ...defaultPrefs.notify } })); }} sx={{ color: PALETTE.subtext }}>
                {Object.values(prefs.notify).some(Boolean) ? <FaBell/> : <FaBellSlash/>}
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} sx={{ color: PALETTE.subtext }} title={isFs ? "Salir de pantalla completa [F]" : "Pantalla completa [F]"}>{isFs ? <FaCompress /> : <FaExpand />}</IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Marquee del ticker */}
      <Box sx={{ height: 40, display: "flex", alignItems: "center", color: PALETTE.marqueeText, bgcolor: PALETTE.marqueeBg, px: 2, borderBottom: `1px solid ${PALETTE.border}`, overflow: "hidden", whiteSpace: "nowrap" }}>
        <Typography sx={{ display: "inline-block", animation: marquee ? "scroll 40s linear infinite" : "none", "@keyframes scroll": { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(-100%)" } }, fontWeight: 800, letterSpacing: .4, textShadow: `0 1px 0 ${PALETTE.border}` }}>{marquee || "Cargá mensajes en el ticker desde la pantalla principal"}</Typography>
      </Box>

      {/* Contenido */}
      <Box sx={{ overflow: "auto" }}>
        {renderContent()}

        {/* Acciones masivas por severidad */}
        {ordered.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", p: 2 }}>
            {SEV_ORDER.map((sev) => {
              const meta = PILL_COLORS[sev] || PILL_COLORS.info;
              const count = ordered.filter(c => c.sev === sev).length;
              if (!count) return null;
              return (
                <button
                  key={sev}
                  onClick={() => removeBySeverity(sev)}
                  style={{
                    border: `1px solid ${meta.bd}`,
                    background: meta.bg,
                    color: meta.fg,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                  title={`Ocultar todas: ${meta.name}`}
                >
                  Ocultar {meta.name} ({count})
                </button>
              );
            })}
          </Stack>
        )}

        <Divider sx={{ mt: 1, borderColor: PALETTE.border }} />
      </Box>
    </Box>
  );
}
