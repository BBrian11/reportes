import React from "react";
import { Line } from "react-chartjs-2";

export default function LineAnalytics({ eventos, cliente }) {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  // Filtrar últimos 30 días y cliente
  const ultimosEventos = eventos.filter(
    (e) =>
      e.fechaObj &&
      e.fechaObj >= hace30dias &&
      e.fechaObj <= hoy &&
      (!cliente || e.cliente === cliente)
  );

  console.log("Eventos filtrados:", ultimosEventos.length, "Cliente:", cliente);

  // Agrupación diaria avanzada
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
    grouped[key].detalles.push(`${e.evento} | ${e.observacion || "-"}`);

    const ev = e.evento.toLowerCase();
    if (ev.includes("ingreso")) grouped[key].ingreso++;
    if (ev.includes("salida")) grouped[key].salida++;
    if (ev.includes("corte de energía")) grouped[key].energia++;
    if (ev.includes("restauración")) grouped[key].restauracion++;
    if (ev.includes("puerta mantenida")) grouped[key].pma++;
    if (ev.includes("puerta forzada")) grouped[key].forzada++;
    if (["alarma", "coacción", "pánico", "incendio"].some((w) => ev.includes(w)))
      grouped[key].alarmas++;
    if (ev.includes("confirmado")) grouped[key].confirmados++;
    if (ev.includes("falso")) grouped[key].falsos++;
  });

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parseDate = (str) => {
      const [day, month] = str.split(" ");
      const meses = [
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic",
      ];
      return new Date(new Date().getFullYear(), meses.indexOf(month), parseInt(day));
    };
    return parseDate(a) - parseDate(b);
  });

  const datasets = [];

  if (cliente === "TGS") {
    datasets.push(
      {
        label: "Ingreso Personal",
        data: sortedKeys.map((k) => grouped[k].ingreso),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.2)",
        fill: true,
      },
      {
        label: "Salida Personal",
        data: sortedKeys.map((k) => grouped[k].salida),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.2)",
        fill: true,
      },
      {
        label: "Corte Energía",
        data: sortedKeys.map((k) => grouped[k].energia),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        fill: true,
      },
      {
        label: "Restauración Energía",
        data: sortedKeys.map((k) => grouped[k].restauracion),
        borderColor: "#eab308",
        backgroundColor: "rgba(234,179,8,0.2)",
        fill: true,
      },
      {
        label: "Confirmados",
        data: sortedKeys.map((k) => grouped[k].confirmados),
        borderColor: "#9333ea",
        backgroundColor: "rgba(147,51,234,0.2)",
        fill: true,
      },
      {
        label: "Falsos Positivos",
        data: sortedKeys.map((k) => grouped[k].falsos),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.2)",
        fill: true,
      }
    );
  } else if (cliente === "Edificios") {
    datasets.push(
      {
        label: "PMA",
        data: sortedKeys.map((k) => grouped[k].pma),
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.2)",
        fill: true,
      },
      {
        label: "Puerta Forzada",
        data: sortedKeys.map((k) => grouped[k].forzada),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.2)",
        fill: true,
      },
      {
        label: "Alarmas",
        data: sortedKeys.map((k) => grouped[k].alarmas),
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124,58,237,0.2)",
        fill: true,
      },
      {
        label: "Corte Energía",
        data: sortedKeys.map((k) => grouped[k].energia),
        borderColor: "#eab308",
        backgroundColor: "rgba(234,179,8,0.2)",
        fill: true,
      },
      {
        label: "Confirmados",
        data: sortedKeys.map((k) => grouped[k].confirmados),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.2)",
        fill: true,
      },
      {
        label: "Falsos Positivos",
        data: sortedKeys.map((k) => grouped[k].falsos),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.2)",
        fill: true,
      }
    );
  } else {
    datasets.push(
      {
        label: "Total Eventos",
        data: sortedKeys.map((k) => grouped[k].total),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.2)",
        fill: true,
      },
      {
        label: "Críticos (Alarmas)",
        data: sortedKeys.map((k) => grouped[k].alarmas),
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
        label: "Cortes Energía",
        data: sortedKeys.map((k) => grouped[k].energia),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        fill: true,
      }
    );
  }

  const data = { labels: sortedKeys, datasets };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          afterBody: (context) => {
            const label = context[0].label;
            return grouped[label]?.detalles.slice(0, 5).join("\n") || "";
          },
        },
      },
    },
  };

  return (
    <div className="analytics-card">
      <h4 className="analytics-title">📊 Tendencia ({cliente || "General"})</h4>
      <div className="analytics-chart" style={{ height: "420px" }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
