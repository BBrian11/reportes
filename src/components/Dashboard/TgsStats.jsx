import React, { useMemo } from "react";
import "../../styles/tgsstats.css";

export default function TgsStats({ eventos }) {
  // ===== Helpers =====
  const norm = (s) => (s || "").toString().trim().replace(/\s+/g, " ");
  const getProveedor = (row) =>
    row?.["proveedor-personal"] ??
    row?.proveedor_personal ??
    row?.proveedorPersonal ??
    row?.proveedor ??
    row?.personal ??
    "";
  const isTGSRow = (e) => (e?.cliente || "").toString().toUpperCase().includes("TGS");

  // ===== Dataset TGS =====
  const tgsEventos = useMemo(() => (eventos || []).filter(isTGSRow), [eventos]);

  // KPI
  const aperturas = tgsEventos.filter((e) => (e.evento || "").includes("Ingreso de Personal")).length;
  const cierres = tgsEventos.filter((e) => (e.evento || "").includes("Salida de Personal")).length;
  const cortes = tgsEventos.filter((e) => (e.evento || "").includes("Corte de energía eléctrica")).length;
  const restauraciones = tgsEventos.filter((e) => (e.evento || "").includes("Restauración de energía eléctrica")).length;

  // Analítica Proveedores
  const proveedoresStats = useMemo(() => {
    const provs = tgsEventos.map(getProveedor).map(norm).filter(Boolean);
    const total = provs.length;
    const counts = provs.reduce((acc, p) => ((acc[p] = (acc[p] || 0) + 1), acc), {});
    const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const topN = 8;
    const top = arr.slice(0, topN).map(([name, count]) => ({
      name,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
    }));
    const usados = top.reduce((s, x) => s + x.count, 0);

    return {
      totalMovs: total,
      uniqueProvs: Object.keys(counts).length,
      top,
      otros: total - usados,
      maxCount: Math.max(...arr.map(([, c]) => c), 1),
    };
  }, [tgsEventos]);

  // Barras SVG
  const Bars = ({ data, maxCount }) => {
    const padding = { top: 8, right: 16, bottom: 8, left: 160 };
    const rowH = 28, gap = 8, innerW = 640;
    const innerH = data.length * (rowH + gap) - gap;
    const width = padding.left + innerW + padding.right;
    const height = padding.top + innerH + padding.bottom;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" style={{ display: "block" }}>
        <rect x="0" y="0" width={width} height={height} fill="#fff" />
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1={padding.left + innerW * t} y1={padding.top - 4}
                x2={padding.left + innerW * t} y2={height - padding.bottom + 4}
                stroke="#e5e7eb" strokeDasharray="3 4" />
        ))}
        {data.map((d, i) => {
          const y = padding.top + i * (rowH + gap);
          const w = Math.max(2, (d.count / maxCount) * innerW);
          return (
            <g key={d.name}>
              <text x={padding.left - 8} y={y + rowH / 2} textAnchor="end"
                    dominantBaseline="middle" fontSize="12" fill="#111827">{d.name}</text>
              <rect x={padding.left} y={y} width={w} height={rowH} rx="6" ry="6" fill="#2563eb" opacity="0.9" />
              <text x={padding.left + w + 6} y={y + rowH / 2} dominantBaseline="middle"
                    fontSize="12" fill="#111827">{d.count} ({d.percent}%)</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const stats = [
    { icon: "🚪", label: "Ingresos", value: aperturas },

    { icon: "⚡", label: "Cortes Energía", value: cortes },


    { icon: "👥", label: "Proveedores ", value: proveedoresStats.uniqueProvs },
  ];

  const topEventos = useMemo(() => {
    const count = {};
    tgsEventos.forEach((e) => { const k = e.evento || "Sin Evento"; count[k] = (count[k] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [tgsEventos]);

  return (
    <div className="tgs-section">
      <h3 className="section-title">TGS - Resumen Operativo</h3>

      <div className="tgs-grid">
        {/* Card KPI */}
        <div className="card kpi-card">
          <h4 className="card-title">KPI</h4>
          <div className="stats-grid">
            {stats.map((item, idx) => (
              <div key={idx} className="stats-card">
                <div className="stats-icon">{item.icon}</div>
                <div>
                  <p className="stats-title">{item.label}</p>
                  <h2 className="stats-value">{item.value}</h2>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Proveedores */}
        <div id="tgs-providers-capture" className="card providers-card">
          <div className="providers-header">
            <h4 className="card-title">Proveedores más frecuentes</h4>
            <p className="providers-sub">
              Total movimientos: <strong>{proveedoresStats.totalMovs}</strong> · Proveedores :{" "}
              <strong>{proveedoresStats.uniqueProvs}</strong>
            </p>
          </div>

          {proveedoresStats.top.length ? (
            <>
              <div className="providers-chart-wrapper">
                <Bars data={proveedoresStats.top} maxCount={proveedoresStats.maxCount} />
              </div>
              <ul className="ranking-list">
                {proveedoresStats.top.map((p, i) => (
                  <li key={p.name} className="ranking-item">
                    <span className="ranking-name">{i + 1}. {p.name}</span>
                    <span className="ranking-count">{p.count} · {p.percent}%</span>
                  </li>
                ))}
                {proveedoresStats.otros > 0 && (
                  <li className="ranking-item ranking-otros">
                    <span className="ranking-name">Otros</span>
                    <span className="ranking-count">{proveedoresStats.otros}</span>
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="ranking-empty">Sin datos de proveedores</p>
          )}
        </div>

       
      </div>
    </div>
  );
}
