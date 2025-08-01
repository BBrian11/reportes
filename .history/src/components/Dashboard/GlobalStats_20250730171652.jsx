import React from "react";
import "../../styles/globalstats.css";

export default function GlobalStats({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return <div className="loading-message">Cargando datos globales...</div>;
  }

  // ✅ Inicializar contadores
  const eventCount = {};
  let totalDia = 0;
  let totalNoche = 0;

  // ✅ Parser robusto
  const parseFecha = (valor) => {
    if (valor?.seconds) return new Date(valor.seconds * 1000);
    if (typeof valor === "string") {
      const clean = valor.replace(/\u202F/g, " ").trim();
      const match = clean.match(
        /(\d{1,2}) de (\w+) de (\d{4}), (\d{1,2}):(\d{2}):(\d{2})\s?(a\.m\.|p\.m\.)/
      );

      if (match) {
        let [_, dia, mesTxt, anio, hora, min, seg, meridiano] = match;
        const meses = [
          "enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ];
        const mes = meses.indexOf(mesTxt.toLowerCase());

        hora = parseInt(hora);
        min = parseInt(min);
        seg = parseInt(seg);

        if (meridiano.includes("p.m.") && hora < 12) hora += 12;
        if (meridiano.includes("a.m.") && hora === 12) hora = 0;

        return new Date(anio, mes, parseInt(dia), hora, min, seg);
      }
    }
    return new Date(valor);
  };

  // ✅ Procesar eventos
  eventos.forEach((e) => {
    eventCount[e.evento] = (eventCount[e.evento] || 0) + 1;
    const fecha = parseFecha(e.fechaHoraEnvio);

    if (!isNaN(fecha)) {
      const hora = fecha.getHours();
      if (hora >= 6 && hora < 18) totalDia++;
      else totalNoche++;
    }
  });

  const eventosOrdenados = Object.entries(eventCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalEventos = eventos.length;

  return (
    <div className="global-card">
      <h3 className="global-title">📊 Analítica General</h3>

      {/* ✅ Totales generales */}
      <div className="global-grid">
        <div className="global-item">
          <p className="global-label">Total Eventos</p>
          <h2 className="global-value">{totalEventos}</h2>
        </div>
        <div className="global-item">
          <p className="global-label">Eventos únicos</p>
          <h2 className="global-value">{Object.keys(eventCount).length}</h2>
        </div>
      </div>

      {/* ✅ Totales por turno */}
      <div className="shift-grid">
        <div className="shift-item day-shift">
          <p className="shift-label">Turno Día (06:00-18:00)</p>
          <h3 className="shift-value">{totalDia}</h3>
        </div>
        <div className="shift-item night-shift">
          <p className="shift-label">Turno Noche (18:00-06:00)</p>
          <h3 className="shift-value">{totalNoche}</h3>
        </div>
      </div>

      {/* ✅ Ranking */}
      <div className="ranking-card">
        <h4 className="ranking-title">Eventos más frecuentes</h4>
        <ul className="ranking-list">
          {eventosOrdenados.map(([evento, count], idx) => (
            <li key={idx} className="ranking-item">
              <span className="ranking-name">{evento}</span>
              <span className="ranking-count">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
