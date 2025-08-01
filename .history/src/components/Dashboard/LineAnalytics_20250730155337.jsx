import React from "react";
import { Line } from "react-chartjs-2";

export default function LineAnalytics({ eventos, cliente }) {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  // ✅ Filtrar últimos 30 días y cliente
  const ultimosEventos = eventos.filter(
    (e) => e.fechaObj && e.fechaObj >= hace30dias && e.fechaObj <= hoy && (!cliente || e.cliente === cliente)
  );

  // ✅ Agrupación diaria por categorías
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    if (!grouped[key]) {
      grouped[key] = {
        energia: 0,
        restauracion: 0,
        confirmados: 0,
        falsos: 0,
        cctvOffline: 0,
        cctvOnline: 0,
        detalles: [],
      };
    }

    grouped[key].detalles.push(`${e.evento} | ${e.observacion}`);
    const ev = e.evento.toLowerCase();

    if (ev.includes("corte de energía")) grouped[key].energia++;
    if (ev.includes("restauración")) grouped[key].restauracion++;
    if (ev.includes("confirmado")) grouped[key].confirmados++;
    if (ev.includes("falso")) grouped[key].falsos++;
    if (ev.includes("fuera de línea")) grouped[key].cctvOffline++;
    if (ev.includes("en línea")) grouped[key].cctvOnline++;
  });

  // ✅ Ordenar fechas
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parse = (str) => {
      const [d, m] = str.split(" ");
      const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      return new Date(new Date().getFullYear(), meses.indexOf(m), parseInt(d));
    };
    return parse(a) - parse(b);
  });

  // ✅ Configuración dinámica por tipo de cliente
  const categorias = {
    TGS: ["ingreso", "salida", "energia", "restauracion", "confirmados", "falsos"],
    Edificios: ["pma", "forzada", "alarmas", "confirmados", "falsos"],
    Barrios: ["energia", "restauracion", "cctvOffline", "cctvOnline", "confirmados", "falsos"],
    General: ["energia", "confirmados", "falsos"],
  };

  const colores = {
    energia: "#f59e0b",
    restauracion: "#eab308",
    confirmados: "#16a34a",
    falsos: "#dc2626",
    cctvOffline: "#ef4444",
    cctvOnline: "#22c55e",
  };

  const tipo = cliente || "General";
  const keys = categorias[tipo] || categorias.General;

  const datasets = keys
    .map((k) => {
      const dataArray = sortedKeys.map((day) => grouped[day][k] || 0);
      if (dataArray.every((val) => val === 0)) return null;
      return {
        label: k.replace(/([A-Z])/g, " $1"),
        data: dataArray,
        borderColor: colores[k],
        backgroundColor: colores[k] + "33",
        fill: true,
        tension: 0.3,
      };
    })
    .filter(Boolean);

  const data = { labels: sortedKeys, datasets };

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
            const lines = [
              `⚡ Energía: ${d.energia}`,
              `✅ Confirmados: ${d.confirmados}`,
              `❌ Falsos: ${d.falsos}`,
              `📹 CCTV Offline: ${d.cctvOffline}`,
              `📶 CCTV Online: ${d.cctvOnline}`,
              "",
              "Detalles:",
              ...d.detalles.slice(0, 3).map((item) => `• ${item}`),
            ];
            return lines;
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
      <h4 className="analytics-title">📡 Analítica {cliente || "General"} (Últimos 30 días)</h4>
      <div className="analytics-chart" style={{ height: "400px" }}>
        {datasets.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <p className="text-center text-gray-500">No hay datos para mostrar</p>
        )}
      </div>
    </div>
  );
}
