import React from "react";
import { Line } from "react-chartjs-2";

export default function LineAnalytics({ eventos, cliente }) {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  // ✅ Filtrar por cliente y últimos 30 días
  const ultimosEventos = eventos.filter(
    (e) =>
      e.fechaObj &&
      e.fechaObj >= hace30dias &&
      e.fechaObj <= hoy &&
      (!cliente || e.cliente === cliente)
  );

  // ✅ Agrupación diaria por categorías específicas
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });

    if (!grouped[key]) {
      grouped[key] = {
        total: 0,
        ingreso: 0,
        salida: 0,
        energia: 0,
        restauracion: 0,
        pma: 0,
        forzada: 0,
        alarmas: 0,
        confirmados: 0,
        falsos: 0,
        detalles: [],
      };
    }

    grouped[key].total++;
    grouped[key].detalles.push(`${e.evento} | ${e.observacion}`);

    const ev = e.evento.toLowerCase();
    if (ev.includes("ingreso")) grouped[key].ingreso++;
    if (ev.includes("salida")) grouped[key].salida++;
    if (ev.includes("corte de energía")) grouped[key].energia++;
    if (ev.includes("restauración")) grouped[key].restauracion++;
    if (ev.includes("puerta mantenida")) grouped[key].pma++;
    if (ev.includes("puerta forzada")) grouped[key].forzada++;
    if (["alarma", "coacción", "pánico"].some((w) => ev.includes(w)))
      grouped[key].alarmas++;
    if (ev.includes("confirmado")) grouped[key].confirmados++;
    if (ev.includes("falso")) grouped[key].falsos++;
  });

  // ✅ Ordenar fechas
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parseDate = (str) => {
      const [day, month] = str.split(" ");
      const meses = [
        "ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"
      ];
      return new Date(new Date().getFullYear(), meses.indexOf(month), parseInt(day));
    };
    return parseDate(a) - parseDate(b);
  });

  // ✅ Datasets dinámicos por cliente
  const datasets = [];

  if (cliente === "TGS") {
    datasets.push(
      {
        label: "Ingreso Personal",
        data: sortedKeys.map((k) => grouped[k].ingreso),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Salida Personal",
        data: sortedKeys.map((k) => grouped[k].salida),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Corte Energía",
        data: sortedKeys.map((k) => grouped[k].energia),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Restauración Energía",
        data: sortedKeys.map((k) => grouped[k].restauracion),
        borderColor: "#eab308",
        backgroundColor: "rgba(234,179,8,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Confirmados",
        data: sortedKeys.map((k) => grouped[k].confirmados),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Falsos Positivos",
        data: sortedKeys.map((k) => grouped[k].falsos),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.2)",
        fill: true,
        tension: 0.3,
      }
    );
  }

  if (cliente === "Edificios") {
    datasets.push(
      {
        label: "PMA",
        data: sortedKeys.map((k) => grouped[k].pma),
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Puerta Forzada",
        data: sortedKeys.map((k) => grouped[k].forzada),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Alarmas",
        data: sortedKeys.map((k) => grouped[k].alarmas),
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124,58,237,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Corte Energía",
        data: sortedKeys.map((k) => grouped[k].energia),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        fill: true,
        tension: 0.3,
      }
    );
  }

  const data = {
    labels: sortedKeys,
    datasets,
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
            return grouped[key].detalles.slice(0, 5).map((d) => `• ${d}`);
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
      <h4 className="analytics-title">
        📊 Tendencia de {cliente || "General"} (Últimos 30 días)
      </h4>
      <div className="analytics-chart">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
