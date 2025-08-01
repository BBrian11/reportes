import React, { useEffect } from "react";
import { Line } from "react-chartjs-2";
import * as echarts from "echarts";
import "../../styles/minicharts.css";

export default function MiniCharts({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return <div className="empty-card">📭 No hay datos para mostrar</div>;
  }

  // ✅ Métricas clave
  const totalEventos = eventos.length;
  const eventosCriticos = eventos.filter((e) =>
    ["alarma", "puerta forzada", "coacción", "pánico"].some((word) =>
      e.evento.toLowerCase().includes(word)
    )
  ).length;
  const ubicacionesUnicas = new Set(eventos.map((e) => e.ubicacion)).size;

  // ✅ Dataset para mini LineChart (eventos por día)
  const grouped = {};
  eventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const labels = Object.keys(grouped);
  const values = Object.values(grouped);

  const lineData = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.15)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
  };

  // ✅ Gráfico de Pie con ECharts
  useEffect(() => {
    const chartDom = document.getElementById("pieChartMini");
    const myChart = echarts.init(chartDom);

    const eventCounts = {};
    eventos.forEach((e) => {
      eventCounts[e.evento] = (eventCounts[e.evento] || 0) + 1;
    });

    const data = Object.keys(eventCounts).map((key) => ({
      name: key,
      value: eventCounts[key],
    }));

    myChart.setOption({
      tooltip: { trigger: "item" },
      series: [
        {
          name: "Eventos",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
          data,
        },
      ],
      color: ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#6b7280"],
    });

    return () => myChart.dispose();
  }, [eventos]);

  return (
    <div className="mini-dashboard-grid">
      {/* ✅ KPIs */}
      <div className="mini-card">
        <h4>Total Eventos</h4>
        <p>{totalEventos}</p>
        <span className="mini-subtext">Últimos 30 días</span>
      </div>
      <div className="mini-card">
        <h4>Eventos Críticos</h4>
        <p>{eventosCriticos}</p>
        <span className="mini-subtext">Alertas prioritarias</span>
      </div>
      <div className="mini-card">
        <h4>Ubicaciones</h4>
        <p>{ubicacionesUnicas}</p>
        <span className="mini-subtext">Activas en el período</span>
      </div>

      {/* ✅ Gráfico LineChart */}
      <div className="mini-chart">
        <h5>Tendencia (30 días)</h5>
        <Line data={lineData} options={lineOptions} height={60} />
      </div>

      {/* ✅ Gráfico Pie */}
      <div className="mini-chart">
        <h5>Distribución por Tipo</h5>
        <div id="pieChartMini" style={{ height: "180px" }}></div>
      </div>
    </div>
  );
}
