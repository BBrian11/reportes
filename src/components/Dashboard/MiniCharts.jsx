// src/components/Dashboard/MiniCharts.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import * as echarts from "echarts";

/* === Registro mínimo para react-chartjs-2 (si ya lo hacés global, podés borrar esto) === */
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Filler, Tooltip, Legend);

/* === Helpers de fecha robustos === */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  if (typeof value === "object" && typeof value.toDate === "function") {
    const d = value.toDate();
    return isNaN(d) ? null : d;
  }
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m.map(Number);
      return new Date(yyyy, (mm || 1) - 1, dd || 1);
    }
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  return null;
}
function fmtDiaMes(d) {
  return d?.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) ?? "—";
}

export default function MiniCharts({ eventos, onExportCharts }) {
  // 🔒 Hooks siempre arriba, sin returns antes
  const [tab, setTab] = useState("hoy");

  const pieChartRef = useRef(null);
  const echartsInstance = useRef(null);

  // En react-chartjs-2 v5 el ref apunta a la instancia de Chart (no al canvas)
  const lineChartRef = useRef(null);

  // Normalizo lista
  const lista = Array.isArray(eventos) ? eventos : [];

  // KPIs
  const { totalEventos, eventosCriticos } = useMemo(() => {
    const total = lista.length;
    const crit = lista.filter((e) =>
      ["alarma", "puerta forzada", "coacción", "pánico"].some((word) =>
        String(e?.evento || "").toLowerCase().includes(word)
      )
    ).length;
    return { totalEventos: total, eventosCriticos: crit };
  }, [lista]);

  // Agrupación por día (usa e.fechaObj | e.fecha | e.fechaHora | e.ts | e.createdAt)
  const lineData = useMemo(() => {
    const grouped = new Map();
    for (const e of lista) {
      const raw = e?.fechaObj ?? e?.fecha ?? e?.fechaHora ?? e?.ts ?? e?.createdAt;
      const d = toDate(raw);
      const key = fmtDiaMes(d || new Date(0));
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    const labels = Array.from(grouped.keys());
    const data = Array.from(grouped.values());
    return {
      labels,
      datasets: [
        {
          label: "Eventos",
          data,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 2,
        },
      ],
    };
  }, [lista]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { display: true, grid: { display: false } },
        y: { display: true, grid: { display: false }, ticks: { precision: 0 } },
      },
    }),
    []
  );

  // ECharts Pie (init + resize + dispose)
  useEffect(() => {
    if (!pieChartRef.current) return;

    // Reusar instancia si existe
    echartsInstance.current = echartsInstance.current || echarts.init(pieChartRef.current);

    const eventCounts = {};
    for (const e of lista) {
      const k = String(e?.evento || "—");
      eventCounts[k] = (eventCounts[k] || 0) + 1;
    }
    const data = Object.keys(eventCounts).map((k) => ({ name: k, value: eventCounts[k] }));

    echartsInstance.current.setOption({
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          data,
          itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
        },
      ],
    });

    const handleResize = () => echartsInstance.current && echartsInstance.current.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (echartsInstance.current) {
        echartsInstance.current.dispose();
        echartsInstance.current = null;
      }
    };
  }, [lista]);

  // Exportar imágenes cuando cambian los datos (espera un tick para que se pinten)
  useEffect(() => {
    const timer = setTimeout(() => {
      const lineChart = lineChartRef.current; // instancia ChartJS
      const lineImg =
        typeof lineChart?.toBase64Image === "function"
          ? lineChart.toBase64Image()
          : null;

      const pieImg =
        typeof echartsInstance.current?.getDataURL === "function"
          ? echartsInstance.current.getDataURL({ pixelRatio: 2, backgroundColor: "#fff" })
          : null;

      onExportCharts?.({ lineChart: lineImg, pieChart: pieImg });
    }, 400);

    return () => clearTimeout(timer);
  }, [lineData, lista, onExportCharts]);

  // 🟦 Estado vacío (después de hooks)
  if (!lista.length) {
    return (
      <div className="mini-dashboard-grid">
        <div className="mini-card kpi-card">
          <h4>Total Eventos</h4>
          <p>0</p>
        </div>
        <div className="mini-card chart-card">
          <h5>Distribución por Tipo</h5>
          <div className="pie-chart-wrapper" style={{ width: "100%", height: 250, display: "grid", placeItems: "center", color: "#64748b" }}>
            📭 No hay datos para mostrar
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mini-dashboard-grid">
      {/* KPIs */}
      <div className="mini-card kpi-card">
        <div className="kpi-header">
          <h4>Total Eventos</h4>
          <div className="tabs">
            <button className={tab === "hoy" ? "active" : ""} onClick={() => setTab("hoy")}>Hoy</button>
            <button className={tab === "semana" ? "active" : ""} onClick={() => setTab("semana")}>Semana</button>
          </div>
        </div>
        <p style={{ fontSize: 28, margin: 0 }}>{totalEventos}</p>
        <small style={{ color: "#ef4444" }}>Críticos: {eventosCriticos}</small>
      </div>

      {/* Line Chart */}
      <div className="mini-card chart-card" style={{ minHeight: 260 }}>
        <h5>Tendencia diaria</h5>
        <div style={{ position: "relative", width: "100%", height: 220 }}>
          {/* En v5, ref recibe la instancia ChartJS */}
          <Line ref={lineChartRef} data={lineData} options={lineOptions} />
        </div>
      </div>

      {/* Pie Chart (ECharts) */}
      <div className="mini-card chart-card">
        <h5>Distribución por Tipo</h5>
        <div
          ref={pieChartRef}
          className="pie-chart-wrapper"
          style={{ width: "100%", height: 250 }}
        />
      </div>
    </div>
  );
}
