import React, { useMemo } from "react";
import "../../styles/tgsstats.css";

export default function TgsKpi({ eventos }) {
  const isTGSRow = (e) => (e?.cliente || "").toString().toUpperCase().includes("TGS");
  const tgsEventos = useMemo(() => (eventos || []).filter(isTGSRow), [eventos]);

  const aperturas = tgsEventos.filter((e) => (e.evento || "").includes("Ingreso de Personal")).length;
  const cierres   = tgsEventos.filter((e) => (e.evento || "").includes("Salida de Personal")).length;
  const cortes    = tgsEventos.filter((e) => (e.evento || "").includes("Corte de energía eléctrica")).length;

  // Proveedores únicos
  const norm = (s) => (s || "").toString().trim().replace(/\s+/g, " ");
  const getProveedor = (row) =>
    row?.["proveedor-personal"] ?? row?.proveedor_personal ?? row?.proveedorPersonal ?? row?.proveedor ?? row?.personal ?? "";
  const proveedoresUnicos = useMemo(() => {
    const set = new Set(tgsEventos.map(getProveedor).map(norm).filter(Boolean));
    return set.size;
  }, [tgsEventos]);

  const stats = [
    { icon: "🚪", label: "Ingresos", value: aperturas },

    { icon: "⚡", label: "Cortes Energía", value: cortes },
    { icon: "👥", label: "Proveedores", value: proveedoresUnicos },
  ];

  return (
    <div id="tgs-kpi-cards" className="card">
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
  );
}
