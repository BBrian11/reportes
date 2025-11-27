// src/components/Edificios/AnaliticaDetalladaPMA.jsx
import React, { useMemo } from "react";
import "../../styles/edificiostats.css";

const AR_TZ = "America/Argentina/Buenos_Aires";

export default function AnaliticaDetalladaPMA({ eventos = [], noWrapper = false }) {
  // ===== Utils =====
  const norm = (s) =>
    (s ?? "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  const pickFirst = (obj, keys = []) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return null;
  };

  const getEventoTexto = (e) =>
    String(
      pickFirst(e, [
        "evento",
        "evento-edificio",
        "evento-edificios",
        "eventoEdificio",
        "eventoEdificios",
        "tipoEvento",
      ]) || ""
    ).trim();

  const getResolucionTexto = (e) =>
    String(
      pickFirst(e, [
        "resolusion-evento", // 👈 en tu data a veces está así
        "resolucion-evento",
        "resolucion",
        "resolusion",
        "resultado",
        "estadoResolucion",
      ]) || ""
    ).trim();

  const getObsTexto = (e) =>
    String(
      pickFirst(e, [
        "observacion",
        "observaciones",
        "observaciones-edificios",
        "observaciones-edificio",
        "obs",
        "detalle",
        "descripcion",
      ]) || ""
    ).trim();

  // Unidad / Propietario (ignora vacíos)
  const extractPropietario = (e) => {
    const direct = pickFirst(e, [
      "propietario",
      "owner",
      "dueño",
      "titular",
      "unidadPropietario",
      "unidad",
    ]);
    if (direct) return String(direct).trim();

    const obs = getObsTexto(e);
    const rxLabel = /(propietario|dueño|owner)\s*[:\-]\s*([^\n,;|]+)/i;
    const m = obs.match(rxLabel);
    if (m?.[2]) return m[2].trim();

    const rxUnidad = /(depto|dpto|unidad|uf)\s*[:#]?\s*([a-z0-9\-]+)/i;
    const mu = obs.match(rxUnidad);
    if (mu?.[2]) return `Unidad ${mu[2].toUpperCase()}`.trim();

    return ""; // ✅ no "Desconocido"
  };

  const REASON_KEYWORDS = [
    { k: ["paqueteria", "paquete", "correspondencia"], label: "Paquetería" },
    { k: ["delivery", "reparto", "pedido"], label: "Delivery" },
    { k: ["no verifica cierre", "no verifico", "sin verificar"], label: "No verifica cierre" },
    { k: ["vecinos conversando", "charla", "hablando"], label: "Vecinos conversando" },
    { k: ["visita", "visitas"], label: "Visitas" },
    { k: ["dificultad motora", "movilidad reducida", "silla de ruedas"], label: "Dificultad motora" },
    { k: ["tiempo insuficiente", "apuro", "apurado"], label: "Tiempo insuficiente" },
    { k: ["mudanza", "mudandose", "flete"], label: "Mudanza" },
  ];

  // Razón: ignora vacíos (no muestra "Sin identificar")
  const extractRazon = (e) => {
    const direct = pickFirst(e, [
      "razones-pma",
      "razon",
      "motivo",
      "causa",
      "razones",
      "razon-evento",
      "razon-edificios",
    ]);
    if (direct) return String(direct).trim();

    const txt = getObsTexto(e);
    const rx = /(raz[oó]n|motivo|causa)\s*[:\-]\s*([^\n;|]+)/i;
    const m = txt.match(rx);
    if (m?.[2]) return m[2].trim();

    const n = norm(txt);
    for (const g of REASON_KEYWORDS) {
      if (g.k.some((kw) => n.includes(kw))) return g.label;
    }
    return "";
  };

  // ===== Fecha/Hora robusta =====
  const tryDate = (d) => (d instanceof Date && !isNaN(d.getTime()) ? d : null);

  const fromSecondsObject = (obj) => {
    const s = obj?.seconds;
    if (typeof s === "number" && Number.isFinite(s)) return tryDate(new Date(s * 1000));
    return null;
  };

  const parseLocalAR = (str) => {
    const m = String(str)
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;

    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = Number(m[6] || 0);

    // AR = UTC-3 => UTC = local + 3
    const utcMs = Date.UTC(y, mo, da, hh + 3, mm, ss);
    return tryDate(new Date(utcMs));
  };

  const parseAnyDate = (v) => {
    if (!v) return null;
    if (v?.toDate && typeof v.toDate === "function") return tryDate(v.toDate());
    if (v instanceof Date) return tryDate(v);
    if (typeof v === "number") return tryDate(new Date(v));

    if (typeof v === "object") {
      const d1 = fromSecondsObject(v);
      if (d1) return d1;
    }

    if (typeof v === "string") {
      const s = v.trim();
      const dIso = tryDate(new Date(s));
      if (dIso) return dIso;
      const dLocal = parseLocalAR(s);
      if (dLocal) return dLocal;
    }
    return null;
  };

  const getDateFromEvento = (e) => {
    const v = pickFirst(e, [
      "fechaHoraEvento",
      "fechaHoraEventoISO",
      "fechaHoraEventoLocal",
      "fechaHoraEnvio",
      "fechaObj",
      "fecha",
      "timestamp",
      "createdAt",
      "date",
    ]);
    return parseAnyDate(v);
  };

  const getARParts = (date) => {
    const parts = new Intl.DateTimeFormat("es-AR", {
      timeZone: AR_TZ,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const weekday = (parts.find((p) => p.type === "weekday")?.value || "").toLowerCase();
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    return { weekday, hour, minute };
  };

  const WEEK_ORDER = ["lun", "mar", "mié", "mie", "jue", "vie", "sáb", "sab", "dom"];
  const prettyWeek = (w) => {
    const m = {
      lun: "Lunes",
      mar: "Martes",
      "mié": "Miércoles",
      mie: "Miércoles",
      jue: "Jueves",
      vie: "Viernes",
      "sáb": "Sábado",
      sab: "Sábado",
      dom: "Domingo",
    };
    return m[w] || w || "—";
  };

  const hourBucket = (h) => {
    if (h >= 0 && h <= 5) return "00–06";
    if (h >= 6 && h <= 11) return "06–12";
    if (h >= 12 && h <= 17) return "12–18";
    return "18–24";
  };

  // ===== Motor de analítica =====
  const buildAnalytics = (rows) => {
    const propietarios = {};
    const razones = {};
    const dias = {};
    const horas = {};
    const franjas = {};
    let totalConFecha = 0;

    rows.forEach((e) => {
      const prop = extractPropietario(e);
      if (prop) propietarios[prop] = (propietarios[prop] || 0) + 1;

      const rz = extractRazon(e);
      if (rz) razones[rz] = (razones[rz] || 0) + 1;

      const d = getDateFromEvento(e);
      if (d) {
        totalConFecha += 1;

        const { weekday, hour } = getARParts(d);
        const wk = norm(weekday).slice(0, 3);
        dias[wk] = (dias[wk] || 0) + 1;

        const hh = Number.isFinite(hour) ? hour : 0;
        const keyH = String(hh).padStart(2, "0") + ":00";
        horas[keyH] = (horas[keyH] || 0) + 1;

        const b = hourBucket(hh);
        franjas[b] = (franjas[b] || 0) + 1;
      }
    });

    const topPropietarios = Object.entries(propietarios).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topRazones = Object.entries(razones).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const topDias = Object.entries(dias)
      .sort((a, b) => (b[1] - a[1]) || (WEEK_ORDER.indexOf(a[0]) - WEEK_ORDER.indexOf(b[0])))
      .slice(0, 7);

    const topHoras = Object.entries(horas).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topFranjas = Object.entries(franjas).sort((a, b) => b[1] - a[1]).slice(0, 4);

    return { total: rows.length, totalConFecha, topPropietarios, topRazones, topDias, topHoras, topFranjas };
  };

  // ===== Cálculos (PMA + Encargado) =====
  const { pmaA, encA } = useMemo(() => {
    const data = Array.isArray(eventos) ? eventos : [];

    const isPMA = (e) => {
      const ev = norm(getEventoTexto(e));
      return ev.includes("puerta mantenida abierta") || ev.includes("pma");
    };

    // ✅ Encargado: SOLO por nombre del evento (no por resolución)
    const isEncargado = (e) => {
      const ev = norm(getEventoTexto(e));
      return ev.includes("evento") && ev.includes("encargado");
    };

    const pma = data.filter(isPMA);
    const enc = data.filter(isEncargado);

    return { pmaA: buildAnalytics(pma), encA: buildAnalytics(enc) };
  }, [eventos]);

  // ===== UI helpers =====
  const kpiText = (A) => ({
    owner: A.topPropietarios?.[0] ? `${A.topPropietarios[0][0]} (${A.topPropietarios[0][1]})` : "—",
    dia: A.topDias?.[0] ? `${prettyWeek(A.topDias[0][0])} (${A.topDias[0][1]})` : "—",
    franja: A.topFranjas?.[0] ? `${A.topFranjas[0][0]} (${A.topFranjas[0][1]})` : "—",
  });

  const renderAnalyticsBlock = (title, A) => {
    const kpi = kpiText(A);

    return (
      <div className="analytics-card" style={{ marginBottom: 14 }}>
        <h4 className="ranking-title" title={title} aria-label={title}>
          {title}
        </h4>

        <div className="mini-stats-grid">
          <div className="mini-stats" title={`${title}: ${A.total}`} aria-label={`${title}: ${A.total}`}>
            <span className="mini-kpi-label">Total</span>
            <span className="mini-kpi-value">{A.total}</span>
          </div>

          <div className="mini-stats" title={`Top unidad: ${kpi.owner}`} aria-label={`Top unidad: ${kpi.owner}`}>
            <span className="mini-kpi-label">Top unidad</span>
            <span className="mini-kpi-value">{kpi.owner}</span>
          </div>

          <div className="mini-stats" title={`Día más frecuente: ${kpi.dia}`} aria-label={`Día más frecuente: ${kpi.dia}`}>
            <span className="mini-kpi-label">Día más frecuente</span>
            <span className="mini-kpi-value">{kpi.dia}</span>
          </div>

          <div
            className="mini-stats"
            title={`Franja horaria (hora del día): ${kpi.franja}`}
            aria-label={`Franja horaria (hora del día): ${kpi.franja}`}
          >
            <span className="mini-kpi-label">Franja horaria (hora del día)</span>
            <span className="mini-kpi-value">{kpi.franja}</span>
          </div>
        </div>

        <div className="analytics-grid">
          <div>
            <h5 className="ranking-subtitle">Unidades</h5>
            {A.topPropietarios.length ? (
              <ul className="ranking-list">
                {A.topPropietarios.map(([nombre, count], i) => (
                  <li key={i} className="ranking-item" title={`${nombre} (${count})`} aria-label={`${nombre} (${count})`}>
                    <span className="ranking-name">{nombre}</span>
                    <span className="ranking-count">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ranking-empty">Sin datos</p>
            )}
          </div>

          <div>
            <h5 className="ranking-subtitle">Razones más frecuentes</h5>
            {A.topRazones.length ? (
              <ul className="ranking-list">
                {A.topRazones.map(([razon, count], i) => (
                  <li key={i} className="ranking-item" title={`${razon} (${count})`} aria-label={`${razon} (${count})`}>
                    <span className="ranking-name">{razon}</span>
                    <span className="ranking-count">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ranking-empty">Sin razones detectadas</p>
            )}
          </div>

          <div>
            <h5 className="ranking-subtitle">Días con más eventos</h5>
            {A.topDias?.length ? (
              <ul className="ranking-list">
                {A.topDias.map(([dia, count], i) => {
                  const txt = `${prettyWeek(dia)} (${count})`;
                  return (
                    <li key={i} className="ranking-item" title={txt} aria-label={txt}>
                      <span className="ranking-name">{prettyWeek(dia)}</span>
                      <span className="ranking-count">{count}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="ranking-empty">Sin fechas en eventos</p>
            )}
          </div>

          <div>
            <h5 className="ranking-subtitle">Franjas horarias (hora del día)</h5>

            {A.topFranjas?.length ? (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {A.topFranjas.map(([fr, count], i) => {
                    const tip = `Franja ${fr} — ${count} evento(s)`;
                    return (
                      <span
                        key={`fr-${i}`}
                        title={tip}
                        aria-label={tip}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          fontSize: 12,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <b style={{ whiteSpace: "nowrap" }}>{fr}</b>
                        <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>({count})</span>
                      </span>
                    );
                  })}
                </div>

                {A.topHoras?.length ? (
                  <>
                    <h5 className="ranking-subtitle" style={{ marginTop: 2 }}>
                      Horas del día
                    </h5>
                    <ul className="ranking-list">
                      {A.topHoras.map(([hh, count], i) => {
                        const tip = `Hora ${hh} — ${count} evento(s)`;
                        return (
                          <li key={i} className="ranking-item" title={tip} aria-label={tip}>
                            <span className="ranking-name">{hh}</span>
                            <span className="ranking-count">{count}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}
              </>
            ) : (
              <p className="ranking-empty">Sin fechas en eventos</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===== Render: mostrar SOLO según evento detectado =====
  const dataForMode = Array.isArray(eventos) ? eventos : [];

  const hasPMA = dataForMode.some((e) => {
    const ev = norm(getEventoTexto(e));
    return ev.includes("puerta mantenida abierta") || ev.includes("pma");
  });

  const hasEnc = dataForMode.some((e) => {
    const ev = norm(getEventoTexto(e));
    return ev.includes("evento") && ev.includes("encargado");
  });

  // Prioridad: PMA gana (si hay PMA, NO mostrar encargado)
  const mode = hasPMA ? "PMA" : hasEnc ? "ENC" : "NONE";

  const blocks = [];
  if (mode === "PMA" && pmaA.total > 0) blocks.push(renderAnalyticsBlock("Analítica Detallada (PMA)", pmaA));
  if (mode === "ENC" && encA.total > 0) blocks.push(renderAnalyticsBlock("Analítica Detallada (Encargado)", encA));

  const Content = (
    <div>
      {blocks.length ? (
        blocks
      ) : (
        <div className="analytics-card">
          <h4 className="ranking-title">Analítica</h4>
          <p className="ranking-empty" style={{ margin: 0 }}>
            Sin datos para PMA / Encargado con los filtros actuales.
          </p>
        </div>
      )}
    </div>
  );

  return noWrapper ? Content : <div className="edificio-card">{Content}</div>;
}
