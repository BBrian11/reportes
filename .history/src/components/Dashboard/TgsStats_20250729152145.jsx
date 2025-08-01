import React from "react";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e => e.evento.includes("Ingreso de Personal")).length;
  
  const cortes = eventos.filter(e => e.evento.includes("Corte de energía eléctrica")).length;
  const restauraciones = eventos.filter(e => e.evento.includes("Restauración de energía eléctrica")).length;

  return (
    <div className="stats-grid">
      <div className="stat-card" style={{ background: "#2563eb" }}>
        <p className="kpi-label">👤 Ingresos</p>
        <h2 className="kpi-value">{aperturas}</h2>
        <p className="kpi-footer">Cantidad de accesos autorizados (Apertura de alarma)</p>
      </div>


      <div className="stat-card" style={{ background: "#f59e0b" }}>
        <p className="kpi-label">⚡ Cortes energía</p>
        <h2 className="kpi-value">{cortes}</h2>
        <p className="kpi-footer">Cantidad de interrupciones eléctricas detectadas</p>
      </div>

      <div className="stat-card" style={{ background: "#ef4444" }}>
        <p className="kpi-label">🔌 Restauraciones</p>
        <h2 className="kpi-value">{restauraciones}</h2>
        <p className="kpi-footer">Reanudaciones de suministro eléctrico</p>
      </div>
    </div>
  );
}
