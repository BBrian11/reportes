import React from "react";
import "../../styles/globalstats.css";

export default function GlobalStats({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return <div className="loading-message">Cargando datos globales...</div>;
  }

  const eventCount = {};
  let totalDia = 0;
  let totalNoche = 0;

  // ✅ Parser robusto con logs
  const parseFecha = (valor) => {
    if (valor?.seconds) {
      const date = new Date(valor.seconds * 1000);
      console.log("🔥 Firestore timestamp detectado:", valor, "→", date);
      return date;
    }

    if (typeof valor === "string") {
      console.log("📌 String original:", valor);
      const clean = valor.replace(/\u202F/g, " ").trim();
      console.log("➡ Limpio:", clean);

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

        const finalDate = new Date(anio, mes, parseInt(dia), hora, min, seg);
        console.log("✅ Parseado:", finalDate);
        return finalDate;
      } else {
        console.warn("⚠ No match para:", clean);
      }
    }

    const fallback = new Date(valor);
    console.log("⚠ Fallback date:", fallback);
    return fallback;
  };

  // ✅ Procesar eventos
  eventos.forEach((e, index) => {
    eventCount[e.evento] = (eventCount[e.evento] || 0) + 1;
    const fecha = parseFecha(e.fechaHoraEnvio);

    if (!isNaN(fecha)) {
      const hora = fecha.getHours();
      console.log(`Evento #${index} → Hora: ${hora}`);
      if (hora >= 6 && hora < 18) {
        totalDia++;
      } else {
        totalNoche++;
      }
    } else {
      console.error("❌ Fecha inválida para evento:", e);
    }
  });

  console.log("📊 Totales calculados → Día:", totalDia, " | Noche:", totalNoche);

  const eventosOrdenados = Object.entries(eventCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalEventos = eventos.length;

  return (
    <div className="global-card">
      <h3 className="global-title">📊 Analítica General</h3>

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
