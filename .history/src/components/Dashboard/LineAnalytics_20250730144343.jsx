import React from "react";
import { Line } from "react-chartjs-2";

export default function LineAnalytics({ eventos }) {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  // Filtrar últimos 30 días
  const ultimosEventos = eventos.filter(
    (e) => e.fechaObj && e.fechaObj >= hace30dias && e.fechaObj <= hoy
  );

  // Agrupación diaria avanzada
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    if (!grouped[key]) {
      grouped[key] = {
        total: 0,
        criticos: 0,
        pma: 0,
        energia: 0,
        confirmados: 0,
        falsos: 0,
      };
    }
    grouped[key].total += 1;

    const eventoLower = e.evento.toLowerCase();

    // Clasificación detallada
    if (["pánico", "intrusión", "coacción", "puerta forzada"].some((w) => eventoLower.includes(w))) {
      grouped[key].criticos += 1;
    }
    if (eventoLower.includes("puerta mantenida")) {
      grouped[key].pma += 1;
    }
    if (["corte de energía", "restauración"].some((w) => eventoLower.includes(w))) {
      grouped[key].energia += 1;
    }
    if (eventoLower.includes("confirmado")) {
      grouped[key].confirmados += 1;
    }
    if (eventoLower.includes("falso")) {
      grouped[key].falsos += 1;
    }
  });

  // Ordenar fechas
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
        label: "Total",
        data: sortedKeys.map((k) => grouped[k].total),
        borderColor: "#9ca3af",
        backgroundColor: "rgba(156,163,175,0.1)",
        borderDash: [5, 5],
        fill: false,
      },
      {
        label: "Críticos",
        data: sortedKeys.map((k) => grouped[k].criticos),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.2)",
        fill: true,
      },
      {
        label: "PMA",
        data: sortedKeys.map((k) => grouped[k].pma),
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.2)",
        fill: true,
      },
      {
        label: "Energía",
        data: sortedKeys.map((k) => grouped[k].energia),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        fill: true,
      },
      {
        label: "Confirmados",
        data: sortedKeys.map((k) => grouped[k].confirmados),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.2)",
        fill: true,
      },
      {
        label: "Falsos",
        data: sortedKeys.map((k) => grouped[k].falsos),
        borderColor: "#6b7280",
        backgroundColor: "rgba(107,114,128,0.2)",
        fill: true,
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
          afterBody: (ctx) => {
            const key = ctx[0].label;
            const d = grouped[key];
            return [
              `Total: ${d.total}`,
              `Críticos: ${d.criticos}`,
              `PMA: ${d.pma}`,
              `Energía: ${d.energia}`,
              `Confirmados: ${d.confirmados}`,
              `Falsos: ${d.falsos}`,
            ];
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: "#374151" }, grid: { display: false } },
      y: { beginAtZero: true, grid: { color: "#f3f4f6" } },
    },
  };

  return (
    <div className="analytics-card">
      <h4 className="analytics-title">📈 Tendencia por Categoría (30 días)</h4>
      <div className="analytics-chart">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
