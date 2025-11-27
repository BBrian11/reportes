// src/pages/OperadorDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { initOpLogger, logOp, logView, logFilterChange } from "../../utils/opLogger";

/* === INIT FIREBASE (igual que en tu wizard) === */
const firebaseConfig = {
  apiKey: "AIzaSyCZcj7AOQoXHHn1vDiyoCQbDIQRMfvhOlA",
  authDomain: "reportesg3t.firebaseapp.com",
  projectId: "reportesg3t",
  storageBucket: "reportesg3t.firebasestorage.app",
  messagingSenderId: "571918948751",
  appId: "1:571918948751:web:055d012f4e1f3f8de5d3fa",
  measurementId: "G-P7T4BRND8L",
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Init del logger con metadatos del app
initOpLogger(db, { app: "OperadorDashboard", appVersion: "1.0.0" });

/* ===========================================================
   CONFIG: categorías → path de subcolección eventos
   =========================================================== */
const CATEGORY_PATHS = {
  edificios: "novedades/edificios/eventos",
  tgs: "novedades/tgs/eventos",
  vtv: "novedades/vtv/eventos",
  // barrios: "novedades/barrios/eventos",
  // otros:   "novedades/otros/eventos",
};

/* ====== Helpers ====== */
const toDate = (ts) => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d) ? null : d;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtPct = (num, den) => {
  const n = Number(num) || 0;
  const d = Number(den) || 0;
  if (d <= 0) return "—";
  return `${((n * 100) / d).toFixed(0)}%`;
};

/* ====== Micro UI ====== */
const Badge = ({ children }) => (
  <span className="badge rounded-pill text-bg-light" style={{ border: "1px solid #e5e7eb" }}>
    {children}
  </span>
);

/* ====== Micro Charts (SVG) ====== */
function BarChart({ data, height = 160, pad = 8 }) {
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  return (
    <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const y = i * (height / data.length);
        const barH = height / data.length - 4;
        const w = 100 * ((d.value || 0) / max);
        return (
          <g key={d.label} transform={`translate(0,${y})`}>
            <rect x={pad} y={2} width={clamp(w - pad * 2, 0, 100)} height={barH} rx="3" />
            <text x={pad} y={barH / 2 + 2} fontSize="4" dominantBaseline="middle">
              {d.label} ({d.value})
            </text>
          </g>
        );
      })}
    </svg>
  );
}
function DonutCounts({ a = 0, b = 0, size = 140, stroke = 18, labelA = "A", labelB = "B" }) {
  const total = Math.max(1, a + b);
  const pA = a / total;
  const r = size / 2 - stroke / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="img" aria-label="Donut chart">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={`${C * pA} ${C}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <g dominantBaseline="middle" textAnchor="middle">
        <text x={size / 2} y={size / 2 - 10} fontSize="13">
          {fmtPct(a, a + b)}
        </text>
        <text x={size / 2} y={size / 2 + 8} fontSize="10">
          {labelA}:{a} / {labelB}:{b}
        </text>
      </g>
    </svg>
  );
}
function Spark({ points = [], width = 220, height = 50, pad = 4 }) {
  if (!points.length) return <div style={{ height }} />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const dx = (width - pad * 2) / Math.max(1, points.length - 1);
  const mapY = (v) => (max === min ? height / 2 : pad + (height - pad * 2) * (1 - (v - min) / (max - min)));
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * dx} ${mapY(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Sparkline">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function Heatmap({ counts = {}, cell = 16 }) {
  const days = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
  const hours = [...Array(24)].map((_, h) => h);
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `auto repeat(24, ${cell}px)`, gap: 4 }}>
      <div />
      {hours.map((h) => (
        <div key={`h-${h}`} style={{ fontSize: 10, textAlign: "center" }}>
          {h}
        </div>
      ))}
      {days.map((d) => (
        <React.Fragment key={`row-${d}`}>
          <div style={{ fontSize: 10, alignSelf: "center" }}>{d}</div>
          {hours.map((h) => {
            const k = `${d}-${h}`;
            const v = counts[k] || 0;
            const alpha = 0.12 + 0.88 * (v / max);
            return (
              <div
                key={k}
                title={`${d} ${h}:00 → ${v}`}
                style={{ width: cell, height: cell, borderRadius: 4, background: `rgba(37,99,235,${alpha})` }}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ==========================
   DATA (sin CG índices)
   ========================== */
async function fetchCategoryEvents(path, from, to) {
  const base = collection(db, path);
  const conds = [];
  if (from) conds.push(where("fechaHoraEnvio", ">=", Timestamp.fromDate(from)));
  if (to) conds.push(where("fechaHoraEnvio", "<", Timestamp.fromDate(to)));
  const qEv = conds.length ? query(base, ...conds, orderBy("fechaHoraEnvio", "desc")) : query(base, orderBy("fechaHoraEnvio", "desc"));
  const snap = await getDocs(qEv);
  const out = [];
  snap.forEach((doc) => out.push({ id: doc.id, ...doc.data() }));
  return out;
}
function inferCatAndOperador(data) {
  const cat =
    data["planta-vtv"] ? "vtv" : data["locaciones-tgs"] ? "tgs" : data["edificio"] ? "edificios" : data["barrio"] ? "barrios" : "otros";
  const operadorCampo =
    data["operador-vtv"] ||
    data["operador-tgs"] ||
    data["operador-edificios"] ||
    data["operador-barrios"] ||
    data["operador-otros"] ||
    data["operador"] ||
    "";
  return { _cat: cat, _operador: operadorCampo };
}

function useOperatorAnalytics({ from, to, operador, categoria, categoriasSeleccionadas }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cats = categoriasSeleccionadas.length ? categoriasSeleccionadas : Object.keys(CATEGORY_PATHS);
        const promised = cats.filter((c) => CATEGORY_PATHS[c]).map((c) => fetchCategoryEvents(CATEGORY_PATHS[c], from, to));
        const results = await Promise.all(promised);
        const merged = results.flat().map((r) => ({ ...r, ...inferCatAndOperador(r) }));

        // Filtros de UI
        const filtered = merged.filter((r) => {
          if (categoria && r._cat !== categoria) return false;
          if (operador && r._operador) return r._operador.toLowerCase().includes(operador.toLowerCase());
          if (operador && !r._operador) return false;
          return true;
        });

        // Orden defensivo
        filtered.sort((a, b) => {
          const A = toDate(a.fechaHoraEnvio) || toDate(a.fechaHoraEvento) || 0;
          const B = toDate(b.fechaHoraEnvio) || toDate(b.fechaHoraEvento) || 0;
          return B - A;
        });
        setRows(filtered);

        // Bitácora
        const bitCol = collection(db, "bitacora-operador");
        const condsB = [];
        if (from) condsB.push(where("ts", ">=", Timestamp.fromDate(from)));
        if (to) condsB.push(where("ts", "<", Timestamp.fromDate(to)));
        const qB = condsB.length ? query(bitCol, ...condsB, orderBy("ts", "desc")) : query(bitCol, orderBy("ts", "desc"));
        const snapB = await getDocs(qB);
        const allLogs = [];
        snapB.forEach((doc) => allLogs.push({ id: doc.id, ...doc.data() }));
        const logsFil = allLogs.filter((l) => {
          if (operador && l.operador) return l.operador.toLowerCase().includes(operador.toLowerCase());
          if (categoria && l.categoria) return l.categoria === categoria;
          return true;
        });
        setLogs(logsFil);
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to, operador, categoria, categoriasSeleccionadas]);

  // Universo y universo del operador
  const statsGlobal = useMemo(() => {
    const out = {
      total: rows.length,
      pendientes: 0,
      procesados: 0,
      pma: 0,
      intr: 0,
      reqSi: 0,
      reqNo: 0,
      tEventoAEnvioSeg: [],
      sparkByDay: [],
      heatmap: {},
      topLugares: {},
      byOperador: {},
    };
    const byDay = new Map();

    rows.forEach((r) => {
      const estado = (r.estado || "").toLowerCase();
      if (estado === "pendiente") out.pendientes++;
      if (estado === "procesado") out.procesados++;

      const ev = (r["evento-vtv"] || r["evento-tgs"] || r["evento-edificio"] || r["evento-barrios"] || r["evento-otros"] || r.evento || "").toLowerCase();
      if (ev.includes("puerta mantenida abierta")) out.pma++;
      if (ev.includes("forzada") || ev.includes("intrusión") || ev.includes("intrusion")) out.intr++;

      const req = (r.requiereGrabacion ?? "").toString().toLowerCase();
      if (req === "si") out.reqSi++;
      else if (req === "no") out.reqNo++;

      const fe = toDate(r.fechaHoraEvento);
      const fs = toDate(r.fechaHoraEnvio);
      if (fe && fs) out.tEventoAEnvioSeg.push(Math.max(0, (fs - fe) / 1000));

      const lugar = r["planta-vtv"] || r["locaciones-tgs"] || r["edificio"] || r["barrio"] || r["otros"] || r["lugar"] || "";
      if (lugar) out.topLugares[lugar] = (out.topLugares[lugar] || 0) + 1;

      const d = fs || fe;
      if (d) {
        const keyDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
        byDay.set(keyDay, (byDay.get(keyDay) || 0) + 1);
        const dow = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"][d.getDay()];
        const h = d.getHours();
        const hk = `${dow}-${h}`;
        out.heatmap[hk] = (out.heatmap[hk] || 0) + 1;
      }

      const op = (r._operador || "—").trim() || "—";
      out.byOperador[op] ??= { total: 0, proc: 0, pend: 0, pma: 0, intr: 0, tmoSegs: [] };
      out.byOperador[op].total++;
      if (estado === "procesado") out.byOperador[op].proc++;
      if (estado === "pendiente") out.byOperador[op].pend++;
      if (ev.includes("puerta mantenida abierta")) out.byOperador[op].pma++;
      if (ev.includes("forzada") || ev.includes("intrusión") || ev.includes("intrusion")) out.byOperador[op].intr++;
      if (fe && fs) out.byOperador[op].tmoSegs.push(Math.max(0, (fs - fe) / 1000));
    });

    // spark 14 días
    const today = new Date();
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(byDay.get(key) || 0);
    }
    out.sparkByDay = days;

    out.tmo = out.tEventoAEnvioSeg.length ? out.tEventoAEnvioSeg.reduce((a, b) => a + b, 0) / out.tEventoAEnvioSeg.length : null;

    return out;
  }, [rows]);

  // Lista única de operadores detectados (para autocompletar/select rápida)
  const operadoresUnicos = useMemo(() => {
    return Object.keys(statsGlobal.byOperador || {})
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [statsGlobal]);

  // KPIs del operador seleccionado (si se ingresó string en "operador")
  const kpiOperador = useMemo(() => {
    const key = operadoresUnicos.find((o) => operador && o.toLowerCase().includes(operador.toLowerCase()));
    const base = key ? statsGlobal.byOperador[key] : null;
    const tmo = base?.tmoSegs?.length ? base.tmoSegs.reduce((a, b) => a + b, 0) / base.tmoSegs.length : null;
    return {
      operadorKey: key || (operador || "—"),
      total: base?.total || 0,
      proc: base?.proc || 0,
      pend: base?.pend || 0,
      pma: base?.pma || 0,
      intr: base?.intr || 0,
      tmo,
    };
  }, [operador, operadoresUnicos, statsGlobal]);

  // Ranking rendimiento por operador (por total)
  const rankingOper = useMemo(() => {
    const arr = Object.entries(statsGlobal.byOperador || {}).map(([label, v]) => ({ label, value: v.total || 0 }));
    return arr.sort((a, b) => b.value - a.value).slice(0, 12);
  }, [statsGlobal]);

  // Top lugares
  const topLugares = useMemo(() => {
    return Object.entries(statsGlobal.topLugares)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [statsGlobal.topLugares]);

  return {
    loading,
    rows,
    logs,
    operadoresUnicos,
    statsGlobal,
    kpiOperador,
    rankingOper,
    topLugares,
  };
}

/* ====== UI principal ====== */
export default function OperadorDashboard() {
  // Filtros
  const [operador, setOperador] = useState(""); // foco principal
  const [categoria, setCategoria] = useState("");
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState(["edificios", "tgs", "vtv"]);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const { loading, rows, logs, operadoresUnicos, statsGlobal, kpiOperador, rankingOper, topLugares } =
    useOperatorAnalytics({ from, to, operador, categoria, categoriasSeleccionadas });

  const prettyDur = (sec) => {
    if (sec == null) return "—";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Log de apertura (mount)
  useEffect(() => {
    logView({
      detalle: "open_dashboard",
      extra: {
        categoriasSeleccionadas,
        rango: { from: from.toISOString(), to: to.toISOString() },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce para loguear cambios de filtros sin inundar la bitácora
  const [debounceId, setDebounceId] = useState(null);
  useEffect(() => {
    if (debounceId) clearTimeout(debounceId);
    const id = setTimeout(() => {
      logFilterChange({
        operador,
        categoria,
        detalle: "filters_changed",
        extra: {
          categoriasSeleccionadas,
          rango: { from: from.toISOString(), to: to.toISOString() },
        },
      });
    }, 600);
    setDebounceId(id);
    return () => clearTimeout(id);
  }, [operador, categoria, categoriasSeleccionadas, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCat = (c) => {
    setCategoriasSeleccionadas((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      logOp(null, "toggle_category", {
        categoria: c,
        detalle: prev.includes(c) ? "remove" : "add",
        extra: { next },
      });
      return next;
    });
  };

  const setRango = (dias) => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    if (dias === 0) {
      // Hoy
      setFrom(start);
      setTo(end);
      logOp(null, "quick_range", { detalle: "hoy", extra: { from: start.toISOString(), to: end.toISOString() } });
      return;
    }
    const s = new Date();
    s.setDate(now.getDate() - dias);
    s.setHours(0, 0, 0, 0);
    setFrom(s);
    setTo(end);
    logOp(null, "quick_range", { detalle: `${dias}d`, extra: { from: s.toISOString(), to: end.toISOString() } });
  };

  return (
    <div className="dash wrap" style={{ padding: "16px 20px" }}>
      <header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 className="m-0">Dashboard Operador</h1>
          <div className="mt-1 d-flex gap-2 flex-wrap">
            {categoriasSeleccionadas.map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
            <Badge>Total eventos: {loading ? "…" : statsGlobal.total}</Badge>
          </div>
        </div>
        <div className="d-flex gap-2">
          <a
            href="/#"
            onClick={(e) => {
              e.preventDefault();
              logOp(null, "nav_back", { detalle: "from_dashboard" });
              window.history.back();
            }}
            className="btn btn-light btn-sm"
          >
            ← Volver
          </a>
        </div>
      </header>

      {/* Filtros */}
      <section className="card card-body mt-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-lg-5">
            <label className="lbl">Operador (autocompleta)</label>
            <input
              list="ops"
              className="form-control"
              placeholder="Ej: Monitoreo, Juan, etc."
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
            />
            <datalist id="ops">{operadoresUnicos.map((o) => <option key={o} value={o} />)}</datalist>
            <small className="text-muted">Tip: escribí parte del nombre para filtrar solo ese operador.</small>
          </div>

          <div className="col-12 col-md-3">
            <label className="lbl">Categoría (filtro visual)</label>
            <select className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Todas</option>
              <option value="tgs">TGS</option>
              <option value="vtv">VTV</option>
              <option value="edificios">Edificios</option>
              <option value="barrios">Barrios</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label className="lbl d-block">Categorías a consultar</label>
            {Object.keys(CATEGORY_PATHS).map((c) => (
              <label key={c} className="me-3">
                <input
                  type="checkbox"
                  className="form-check-input me-1"
                  checked={categoriasSeleccionadas.includes(c)}
                  onChange={() => toggleCat(c)}
                />
                {c}
              </label>
            ))}
          </div>

          <div className="col-12 col-md-6 d-flex flex-wrap align-items-end gap-2">
            <div className="flex-grow-1">
              <label className="lbl">Desde</label>
              <input
                type="date"
                className="form-control"
                value={from.toISOString().slice(0, 10)}
                onChange={(e) => {
                  const d = new Date(e.target.value + "T00:00");
                  setFrom(d);
                }}
              />
            </div>
            <div className="flex-grow-1">
              <label className="lbl">Hasta</label>
              <input
                type="date"
                className="form-control"
                value={to.toISOString().slice(0, 10)}
                onChange={(e) => {
                  const d = new Date(e.target.value + "T23:59:59");
                  setTo(d);
                }}
              />
            </div>
            <div className="ms-auto d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setRango(0)}>
                Hoy
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setRango(7)}>
                7d
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setRango(14)}>
                14d
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setRango(30)}>
                30d
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs foco operador */}
      <section className="mt-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        <div className="card card-body">
          <div className="muted">Operador</div>
          <div className="h4 m-0">{kpiOperador.operadorKey || "—"}</div>
          <div className="mt-2">
            <Badge>Eventos: {loading ? "…" : kpiOperador.total}</Badge>
          </div>
          <div className="mt-2">
            <Spark points={statsGlobal.sparkByDay} />
          </div>
        </div>
        <div className="card card-body">
          <div className="muted">Pendientes / Procesados</div>
          <DonutCounts a={kpiOperador.pend} b={kpiOperador.proc} labelA="Pend" labelB="Proc" />
        </div>
        <div className="card card-body">
          <div className="muted">PMA / Intrusión</div>
          <DonutCounts a={kpiOperador.pma} b={kpiOperador.intr} labelA="PMA" labelB="Intr" />
        </div>
        <div className="card card-body">
          <div className="muted">TMO evento → envío</div>
          <div className="h2 m-0">{loading ? "…" : prettyDur(kpiOperador.tmo)}</div>
          <small className="text-muted">* Promedio del operador cuando existen ambos timestamps</small>
        </div>
      </section>

      {/* Rendimiento por operador + Heatmap */}
      <section className="mt-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
        <div className="card card-body">
          <h3 className="m-0">Rendimiento por operador (volumen)</h3>
          <div className="mt-2">
            <BarChart data={rankingOper.length ? rankingOper : [{ label: "—", value: 0 }]} />
          </div>
        </div>
        <div className="card card-body">
          <h3 className="m-0">Actividad por día y hora</h3>
          <small className="text-muted">Fuente: fechaHoraEnvio / evento</small>
          <div className="mt-2">
            <Heatmap counts={statsGlobal.heatmap} />
          </div>
        </div>
      </section>

      {/* Top lugares */}
      <section className="card card-body mt-3">
        <h3 className="m-0">Top lugares</h3>
        <div className="mt-2">
          <BarChart data={topLugares.length ? topLugares : [{ label: "—", value: 0 }]} />
        </div>
      </section>

      {/* Bitácora operador */}
      <section className="card card-body mt-3">
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="m-0">Bitácora de acciones del operador</h3>
          <small className="muted">{logs.length} eventos</small>
        </div>
        <div className="table-responsive mt-2">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Operador</th>
                <th>Acción</th>
                <th>Categoría</th>
                <th>Evento</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Cargando…</td>
                </tr>
              ) : logs.length ? (
                logs.slice(0, 200).map((l) => {
                  const d = toDate(l.ts);
                  return (
                    <tr key={l.id}>
                      <td>{d ? d.toLocaleString("es-AR") : "—"}</td>
                      <td>{l.operador || "—"}</td>
                      <td>{l.action}</td>
                      <td>{l.categoria || "—"}</td>
                      <td>{l.evento || "—"}</td>
                      <td>
                        <small className="muted">{l.detalle || "—"}</small>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">Sin registros en este rango.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla de eventos */}
      <section className="card card-body mt-3">
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="m-0">Eventos (detalle)</h3>
          <small className="muted">{rows.length} registros</small>
        </div>
        <div className="table-responsive mt-2">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Fecha envío</th>
                <th>Operador</th>
                <th>Categoría</th>
                <th>Lugar</th>
                <th>Evento</th>
                <th>Estado</th>
                <th>Grab.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Cargando…</td>
                </tr>
              ) : rows.length ? (
                rows.slice(0, 500).map((r) => {
                  const d = toDate(r.fechaHoraEnvio) || toDate(r.fechaHoraEvento);
                  const cat = r._cat;
                  const lugar =
                    r["planta-vtv"] ||
                    r["locaciones-tgs"] ||
                    r["edificio"] ||
                    r["barrio"] ||
                    r["otros"] ||
                    r["lugar"] ||
                    "—";
                  const ev =
                    r["evento-vtv"] ||
                    r["evento-tgs"] ||
                    r["evento-edificio"] ||
                    r["evento-barrios"] ||
                    r["evento-otros"] ||
                    r.evento ||
                    "—";
                  const grab = (r.requiereGrabacion ?? "—").toString().toUpperCase();
                  return (
                    <tr key={r.id}>
                      <td>{d ? d.toLocaleString("es-AR") : "—"}</td>
                      <td>{r._operador || "—"}</td>
                      <td>{cat}</td>
                      <td>{lugar}</td>
                      <td>{ev}</td>
                      <td>{(r.estado || "—").toUpperCase()}</td>
                      <td>{grab}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7">Sin registros en este rango.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
