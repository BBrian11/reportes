import React from "react";
import { Line } from "react-chartjs-2";

export default function LineAnalytics({ eventos }) {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  // ✅ Filtrar últimos 30 días
  const ultimosEventos = eventos.filter(
    (e) => e.fechaObj && e.fechaObj >= hace30dias && e.fechaObj <= hoy
  );

  // ✅ Clasificación y agrupación diaria
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });

    if (!grouped[key]) grouped[key] = { total: 0, criticos: 0, operativos: 0 };
    grouped[key].total += 1;

    const eventoLower = e.evento.toLowerCase();
    const esCritico = ["alarma", "puerta forzada", "pánico", "intrusión", "coacción"].some((word) =>
      eventoLower.includes(word)
    );

    if (esCritico) {
      grouped[key].criticos += 1;
    } else {
      grouped[key].operativos += 1;
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

  // ✅ Preparar datasets
  const data = {
    labels: sortedKeys,
    datasets: [
      {
        label: "Total Eventos",
        data: sortedKeys.map((k) => grouped[k].total),
        borderColor: "#9ca3af",
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        fill: true,
        tension: 0.3,
        borderDash: [4, 4],
      },
      {
        label: "Críticos",
        data: sortedKeys.map((k) => grouped[k].criticos),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.2)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#dc2626",
      },
      {
        label: "Operativos",
        data: sortedKeys.map((k) => grouped[k].operativos),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#2563eb",
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
          title: (ctx) => `📅 ${ctx[0].label}`,
          label: (ctx) => {
            const key = ctx.label;
            const { total, criticos, operativos } = grouped[key];
            if (ctx.dataset.label === "Total Eventos") return `Total: ${total}`;
            if (ctx.dataset.label === "Críticos") return `Críticos: ${criticos}`;
            if (ctx.dataset.label === "Operativos") return `Operativos: ${operativos}`;
          },
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
      <h4 className="analytics-title">📈 Análisis de Eventos (Últimos 30 días)</h4>
      <div className="analytics-chart">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
