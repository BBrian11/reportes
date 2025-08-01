import React from "react";
import { Line } from "react-chartjs-2";
import "../../styles/minicharts.css";

export default function MiniCharts({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return <div className="empty-card">No hay datos para mostrar</div>;
  }

  // Calcular métricas
  const totalEventos = eventos.length;
  const eventosCriticos = eventos.filter((e) =>
    ["alarma", "puerta forzada", "coacción", "pánico"].some((word) =>
      e.evento.toLowerCase().includes(word)
    )
  ).length;
  const ubicacionesUnicas = new Set(eventos.map((e) => e.ubicacion)).size;

  // Generar datos para mini gráfico (eventos por día)
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

  const data = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  return (
    <div className="mini-charts-container">
      <div className="mini-card">
        <h4>Total Eventos</h4>
        <p>{totalEventos}</p>
      </div>
      <div className="mini-card">
        <h4>Eventos Críticos</h4>
        <p>{eventosCriticos}</p>
      </div>
      <div className="mini-card">
        <h4>Ubicaciones</h4>
        <p>{ubicacionesUnicas}</p>
      </div>
      <div className="mini-chart">
        <Line data={data} options={options} height={50} />
      </div>
    </div>
  );
}
