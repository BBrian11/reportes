// src/components/Edificios/AnaliticaDetalladaPMA.jsx
import React, { useMemo } from "react";
import "../../styles/edificiostats.css";

export default function AnaliticaDetalladaPMA({ eventos = [], noWrapper = false }) {
  // ===== Utils =====
  const norm = (s) =>
    (s ?? "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  const extractPropietario = (e) => {
    const direct =
      e.propietario || e.owner || e.titular || e.unidadPropietario || e.unidad;
    if (direct) return String(direct).trim();

    const obs = e.observacion || e.obs || "";
    const rxLabel = /(propietario|dueño|owner)\s*[:\-]\s*([^\n,;|]+)/i;
    const m = obs.match(rxLabel);
    if (m?.[2]) return m[2].trim();

    const rxUnidad = /(depto|dpto|unidad|uf)\s*[:#]?\s*([a-z0-9\-]+)/i;
    const mu = obs.match(rxUnidad);
    if (mu?.[2]) return `Unidad ${mu[2].toUpperCase()}`.trim();

    return "Desconocido";
  };

  const REASON_KEYWORDS = [

    { k: ["paqueteria", "paquete", "correspondencia"], label: "Paquetería" },
    { k: ["delivery", "reparto", "pedido"], label: "Delivery" },
    { k: ["no verifica cierre", "no verifico", "sin verificar"], label: "No verifica cierre" },
    { k: ["vecinos conversando", "charla", "hablando"], label: "Vecinos conversando" },
    { k: ["visita", "visitas"], label: "Visitas" },
    { k: ["dificultad motora", "movilidad reducida", "silla de ruedas"], label: "Dificultad motora" },
    { k: ["tiempo insuficiente", "apuro", "apurado"], label: "Tiempo insuficiente" },
  ];


  const extractRazon = (e) => {
    const direct = e.razon || e.motivo || e.causa;
    if (direct) return String(direct).trim();

    const txt = (e.observacion || e.obs || "").trim();
    const rx = /(raz[oó]n|motivo|causa)\s*[:\-]\s*([^\n;|]+)/i;
    const m = txt.match(rx);
    if (m?.[2]) return m[2].trim();

    const n = norm(txt);
    for (const g of REASON_KEYWORDS) {
      if (g.k.some((kw) => n.includes(kw))) return g.label;
    }
    return "Sin identificar";
  };

  // ===== Cálculos =====
  const { totalPMA, topPropietarios, topRazones } = useMemo(() => {
    const data = Array.isArray(eventos) ? eventos : [];
    const isPMA = (e) => (e?.evento || "").includes("Puerta Mantenida Abierta");

    const pma = data.filter(isPMA);
    const totalPMA = pma.length;

    const propietarios = {};
    const razones = {};

    pma.forEach((e) => {
      const prop = extractPropietario(e);
      propietarios[prop] = (propietarios[prop] || 0) + 1;

      const rz = extractRazon(e);
      razones[rz] = (razones[rz] || 0) + 1;
    });

    const topPropietarios = Object.entries(propietarios).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topRazones = Object.entries(razones).sort((a,b)=>b[1]-a[1]).slice(0,6);

    return { totalPMA, topPropietarios, topRazones };
  }, [eventos]);

  // ===== Contenido (sin el wrapper externo) =====
  const Content = (
    <div className="analytics-card">
      <h4 className="ranking-title">Analítica Detallada (PMA)</h4>

      <div className="mini-stats-grid">
        <div className="mini-stats">
          <span className="mini-kpi-label">Puertas abiertas (PMA)</span>
          <span className="mini-kpi-value">{totalPMA}</span>
        </div>
        <div className="mini-stats">
          <span className="mini-kpi-label">Propietario con más PMA</span>
          <span className="mini-kpi-value">
            {topPropietarios[0] ? `${topPropietarios[0][0]} (${topPropietarios[0][1]})` : "—"}
          </span>
        </div>
      </div>

      <div className="analytics-grid">
        <div>
          <h5 className="ranking-subtitle">Top Propietarios</h5>
          {topPropietarios.length ? (
            <ul className="ranking-list">
              {topPropietarios.map(([nombre, count], i) => (
                <li key={i} className="ranking-item">
                  <span className="ranking-name">{nombre}</span>
                  <span className="ranking-count">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ranking-empty">Sin datos de propietarios</p>
          )}
        </div>

        <div>
          <h5 className="ranking-subtitle">Razones más frecuentes</h5>
          {topRazones.length ? (
            <ul className="ranking-list">
              {topRazones.map(([razon, count], i) => (
                <li key={i} className="ranking-item">
                  <span className="ranking-name">{razon}</span>
                  <span className="ranking-count">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ranking-empty">Sin datos de razones</p>
          )}
        </div>
      </div>
    </div>
  );

  // ===== Un solo return =====
  return noWrapper ? Content : <div className="edificio-card">{Content}</div>;
}
