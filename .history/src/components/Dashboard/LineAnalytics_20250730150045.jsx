import React, { useState } from "react";
import { Line } from "react-chartjs-2";

export default function LineAnalytics({ eventos, cliente }) {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  const ultimosEventos = eventos.filter(
    (e) => e.fechaObj && e.fechaObj >= hace30dias && e.fechaObj <= hoy
  );

  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    if (!grouped[key]) grouped[key] = { eventos: [], stats: {} };

    grouped[key].eventos.push(e);

    const eventoLower = e.evento.toLowerCase();

    // Clasificación dinámica
    const stats = grouped[key].stats;
    stats.total = (stats.total || 0) + 1;

    // Confirmados / Falsos
    if (eventoLower.includes("confirmado")) stats.confirmados = (stats.confirmados || 0) + 1;
    if (eventoLower.includes("falso")) stats.falsos = (stats.falsos || 0) + 1;

    // PMA (solo edificios)
    if (eventoLower.includes("puerta mantenida")) stats.pma = (stats.pma || 0) + 1;

    // Energía
    if (eventoLower.includes("corte de energía")) stats.cortes = (stats.cortes || 0) + 1;
    if (eventoLower.includes("restauración")) stats.restauraciones = (stats.restauraciones || 0) + 1;

    // Críticos
    if (["pánico", "intrusión", "coacción"].some((w) => eventoLower.includes(w))) {
      stats.criticos = (stats.criticos || 0) + 1;
    }

    // Ingreso / Salida (TGS)
    if (eventoLower.includes("ingreso")) stats.ingresos = (stats.ingresos || 0) + 1;
    if (eventoLower.includes("salida")) stats.salidas = (stats.salidas || 0) + 1;
  });

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parseKey = (str) => {
      const [day, month] = str.split(" ");
      const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
      return new Date(new Date().getFullYear(), meses.indexOf(month), parseInt(day));
    };
    return parseKey(a) - parseKey(b);
  });

  // Dataset dinámico según cliente
  const datasets = [
    {
      label: "Total",
      data: sortedKeys.map((k) => grouped[k].stats.total || 0),
      borderColor: "#9ca3af",
      backgroundColor: "rgba(156,163,175,0.1)",
      borderDash: [4, 4],
      fill: false,
    },
    ...(cliente === "Edificios"
      ? [
          {
            label: "PMA",
            data: sortedKeys.map((k) => grouped[k].stats.pma || 0),
            borderColor: "#f97316",
            backgroundColor: "rgba(249,115,22,0.2)",
            fill: true,
          },
          {
            label: "Críticos",
            data: sortedKeys.map((k) => grouped[k].stats.criticos || 0),
            borderColor: "#dc2626",
            backgroundColor: "rgba(220,38,38,0.2)",
            fill: true,
          },
        ]
      : cliente === "TGS"
      ? [
          {
            label: "Ingresos",
            data: sortedKeys.map((k) => grouped[k].stats.ingresos || 0),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.2)",
            fill: true,
          },
          {
            label: "Salidas",
            data: sortedKeys.map((k) => grouped[k].stats.salidas || 0),
            borderColor: "#16a34a",
            backgroundColor: "rgba(22,163,74,0.2)",
            fill: true,
          },
          {
            label: "Cortes Energía",
            data: sortedKeys.map((k) => grouped[k].stats.cortes || 0),
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.2)",
            fill: true,
          },
        ]
      : [
          {
            label: "Confirmados",
            data: sortedKeys.map((k) => grouped[k].stats.confirmados || 0),
            borderColor: "#16a34a",
            backgroundColor: "rgba(22,163,74,0.2)",
            fill: true,
          },
          {
            label: "Falsos",
            data: sortedKeys.map((k) => grouped[k].stats.falsos || 0),
            borderColor: "#6b7280",
            backgroundColor: "rgba(107,114,128,0.2)",
            fill: true,
          },
        ]),
  ];

  const data = { labels: sortedKeys, datasets };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          title: (ctx) => `📅 ${ctx[0].label}`,
          afterBody: (ctx) => {
            const key = ctx[0].label;
            const eventosDia = grouped[key].eventos;
            const detalle = eventosDia.map(
              (ev) => `• ${ev.evento} (${ev.ubicacion})`
            );
            return [`Eventos del día:`, ...detalle.slice(0, 5), detalle.length > 5 ? "..." : ""];
          },
        },
      },
    },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
  };

  return (
    <div className="analytics-card">
      <h4 className="analytics-title">
        📊 Analítica {cliente || "General"} (Últimos 30 días)
      </h4>
      <div className="analytics-chart">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
