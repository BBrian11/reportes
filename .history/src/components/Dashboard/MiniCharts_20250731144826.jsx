import React, { useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import * as echarts from "echarts";

export default function MiniCharts({ eventos, onExportCharts }) {
  const pieChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const echartsInstance = useRef(null);

  if (!eventos || eventos.length === 0) {
    return <div className="empty-card">📭 No hay datos para mostrar</div>;
  }

  // ✅ KPIs
  const totalEventos = eventos.length;
  const eventosCriticos = eventos.filter(e =>
    ["alarma", "puerta forzada", "coacción", "pánico"].some(word =>
      e.evento.toLowerCase().includes(word)
    )
  ).length;

  // ✅ Dataset LineChart
  const grouped = {};
  eventos.forEach(e => {
    const key = e.fechaObj.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const lineData = {
    labels: Object.keys(grouped),
    datasets: [
      {
        label: "Eventos",
        data: Object.values(grouped),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.15)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
  };

  // ✅ ECharts Pie Chart
  useEffect(() => {
    if (!pieChartRef.current) return;

    echartsInstance.current = echarts.init(pieChartRef.current);

    const eventCounts = {};
    eventos.forEach(e => {
      eventCounts[e.evento] = (eventCounts[e.evento] || 0) + 1;
    });

    echartsInstance.current.setOption({
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          data: Object.keys(eventCounts).map(k => ({ name: k, value: eventCounts[k] })),
          itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
        },
      ],
    });

    const handleResize = () => echartsInstance.current.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      echartsInstance.current.dispose();
      window.removeEventListener("resize", handleResize);
    };
  }, [eventos]);

  // ✅ Capturar imágenes cuando cambian datos
  useEffect(() => {
    const timer = setTimeout(() => {
      const lineImg = lineChartRef.current?.toBase64Image();
      const pieImg = echartsInstance.current?.getDataURL();
      if (onExportCharts) {
        onExportCharts({ lineChart: lineImg, pieChart: pieImg });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [eventos]);

  return (
    <div className="mini-dashboard-grid">
      {/* KPIs */}
      <div className="mini-card kpi-card">
        <h4>Total Eventos</h4>
        <p>{totalEventos}</p>
      </div>
      <div className="mini-card kpi-card">
        <h4>Eventos Críticos</h4>
        <p>{eventosCriticos}</p>
      </div>

      {/* Line Chart */}
      

      {/* Pie Chart */}
      <div className="mini-card chart-card">
        <h5>Distribución por Tipo</h5>
        <div ref={pieChartRef} className="pie-chart-wrapper" style={{ width: "100%", height: "250px" }}></div>
      </div>
    </div>
  );
}
