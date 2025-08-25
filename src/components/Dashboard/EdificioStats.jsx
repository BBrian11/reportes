// src/components/Edificios/EdificioStats.jsx
import React, { useMemo } from "react";
import "../../styles/edificiostats.css";

// Helpers
const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const getEventoTxt = (e) => String(e?.evento ?? e?.["evento-edificio"] ?? "").trim();

// Matchers robustos
const isPMA = (txt = "") => {
  const t = norm(txt);
  return t.includes("puerta mantenida abierta") || /\bpma\b/.test(t);
};

const isForzada = (txt = "") => {
  const t = norm(txt);
  return t.includes("puerta forzada") || /\bforzada?\b/.test(t);
};

const isEventoEncargado = (txt = "") =>
  /evento\s*[-–]?\s*encargado/i.test(String(txt));

// 👇 NUEVO: CCTV fuera de línea (cubre varias formas comunes)
const isCCTVOffline = (txt = "") => {
  const t = norm(txt);
  return (
    t.includes("dispositivo cctv fuera de linea") ||
    t.includes("cctv fuera de linea") ||
    t.includes("dispositivo fuera de linea") ||
    t.includes("equipo offline") ||
    t.includes("equipo fuera de linea") ||
    t.includes("camara fuera de linea") ||
    t.includes("camaras fuera de linea") ||
    t.includes("dvr offline") ||
    t.includes("nvr offline")
  );
};

export default function EdificioStats({ eventos = [], noWrapper = false }) {
  const evs = Array.isArray(eventos) ? eventos : [];

  const {
    totalEventos,
    totalPMA,
    totalForzada,
    totalEncargado,
    totalCCTVOffline,
    totalOtros,
    sumCategorias,
  } = useMemo(() => {
    const totalEventos = evs.length;

    let pma = 0, forzada = 0, encargado = 0, cctvOff = 0;

    for (const e of evs) {
      const txt = getEventoTxt(e);
      if (!txt) continue;

      // Contabilizamos una sola categoría por evento (si querés multi-categoría, cambia estos else if por if)
      if (isPMA(txt)) pma++;
      else if (isForzada(txt)) forzada++;
      else if (isEventoEncargado(txt)) encargado++;
      else if (isCCTVOffline(txt)) cctvOff++;
    }

    const sumCategorias = pma + forzada + encargado + cctvOff;
    const otros = Math.max(0, totalEventos - sumCategorias);

    return {
      totalEventos,
      totalPMA: pma,
      totalForzada: forzada,
      totalEncargado: encargado,
      totalCCTVOffline: cctvOff,
      totalOtros: otros,
      sumCategorias,
    };
  }, [evs]);

  const Content = (
    <>
      <h3 className="section-title">Edificios - Accesos</h3>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-icon">🚪</div>
          <div>
            <p className="stats-title">Puertas Mantenidas Abiertas</p>
            <h2 className="stats-value">{totalPMA}</h2>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon">🔓</div>
          <div>
            <p className="stats-title">Puertas Forzadas</p>
            <h2 className="stats-value">{totalForzada}</h2>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon">🧑‍🔧</div>
          <div>
            <p className="stats-title">Evento - Encargado</p>
            <h2 className="stats-value">{totalEncargado}</h2>
          </div>
        </div>

        {/* NUEVO KPI: CCTV fuera de línea */}
        <div className="stats-card">
          <div className="stats-icon">📹</div>
          <div>
            <p className="stats-title">CCTV fuera de línea</p>
            <h2 className="stats-value">{totalCCTVOffline}</h2>
          </div>
        </div>

        {/* Totales para que “cierren” */}
     

        <div className="stats-card">
          <div className="stats-icon">Σ</div>
          <div>
            <p className="stats-title">Total Eventos</p>
            <h2 className="stats-value">{totalEventos}</h2>
            <p className="stats-subvalue" style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            
            </p>
          </div>
        </div>
      </div>

      {sumCategorias + totalOtros !== totalEventos && (
        <p style={{ marginTop: 8, color: "#b45309", fontSize: 12 }}>
          ⚠️ Revisa los textos de evento: hay formatos no contemplados.
        </p>
      )}
    </>
  );

  return noWrapper ? Content : <div className="edificio-card">{Content}</div>;
}
