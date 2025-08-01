import React from "react";
import { Line } from "react-chartjs-2";

export default function LineAnalytics({ eventos }) {
  // ✅ Filtrar últimos 30 días
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  const ultimosEventos = eventos.filter(
    (e) => e.fechaObj && e.fechaObj >= hace30dias && e.fechaObj <= hoy
  );

  // ✅ Agrupar Confirmados vs Falsos por día
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });

    if (!grouped[key]) grouped[key] = { confirmados: 0, falsos: 0 };
    if (e.evento.toLowerCase().includes("confirmado")) {
      grouped[key].confirmados += 1;
    } else if (e.evento.toLowerCase().includes("falso")) {
      grouped[key].falsos += 1;
    }
  });

  // ✅ Ordenar fechas
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parseKey = (str) => {
      const [day, month] = str.split(" ");
      const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      return new Date(new Date().getFullYear(), meses.indexOf(month), parseInt(day));
    };
    return parseKey(a) - parseKey(b);
  });

  const data = {
    labels: sortedKeys,
    datasets: [
      {
        label: "Confirmados",
        data: sortedKeys.map((k) => grouped[k].confirmados),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22, 163, 74, 0.2)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#16a34a",
      },
      {
        label: "Falsos",
        data: sortedKeys.map((k) => grouped[k].falsos),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.2)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#dc2626",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} eventos`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#4b5563", font: { size: 12 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#4b5563" },
        grid: { color: "#f3f4f6" },
      },
    },
  };

  return (
    <div className="analytics-card">
      <h4 className="analytics-title">📉 Confirmados vs Falsos (Últimos 30 días)</h4>
      <div className="analytics-chart">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
