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

  // ✅ Agrupación diaria con clasificación avanzada
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    if (!grouped[key]) grouped[key] = { total: 0, criticos: 0, operativos: 0, energia: 0, otros: 0 };

    grouped[key].total += 1;

    const eventoLower = e.evento.toLowerCase();
    if (["pánico", "intrusión", "coacción", "puerta forzada"].some((w) => eventoLower.includes(w))) {
      grouped[key].criticos += 1;
    } else if (
      ["ingreso", "salida", "apertura", "visita"].some((w) => eventoLower.includes(w))
    ) {
      grouped[key].operativos += 1;
    } else if (["corte de energía", "restauración"].some((w) => eventoLower.includes(w))) {
      grouped[key].energia += 1;
    } else {
      grouped[key].otros += 1;
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

  // ✅ Data para Chart.js
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
        borderDash: [5, 5],
      },
      {
        label: "Críticos",
        data: sortedKeys.map((k) => grouped[k].criticos),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.15)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Operativos",
        data: sortedKeys.map((k) => grouped[k].operativos),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.15)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Energía",
        data: sortedKeys.map((k) => grouped[k].energia),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.15)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Otros",
        data: sortedKeys.map((k) => grouped[k].otros),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.15)",
        fill: true,
        tension: 0.3,
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
            const { total, criticos, operativos, energia, otros } = grouped[key];
            return [
              `Total: ${total}`,
              `Críticos: ${criticos}`,
              `Operativos: ${operativos}`,
              `Energía: ${energia}`,
              `Otros: ${otros}`,
            ][ctx.dataIndex];
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
      <h4 className="analytics-title">📊 Análisis Completo (Últimos 30 días)</h4>
      <div className="analytics-chart">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
