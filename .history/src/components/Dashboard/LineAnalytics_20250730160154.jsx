import React from "react";
import { Line } from "react-chartjs-2";

export default function LineAnalytics({ eventos, cliente }) {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  // ✅ Filtrar últimos 30 días y cliente
  const ultimosEventos = eventos.filter(
    (e) =>
      e.fechaObj &&
      e.fechaObj >= hace30dias &&
      e.fechaObj <= hoy &&
      (!cliente || e.cliente === cliente)
  );

  // ✅ Agrupación diaria avanzada
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });

    if (!grouped[key]) {
      grouped[key] = {
        ingreso: 0,
        salida: 0,
        confirmados: 0,
        falsos: 0,
        energia: 0,
        restauracion: 0,
        pma: 0,
        forzada: 0,
        alarmas: 0,
        cctvOffline: 0,
        cctvOnline: 0,
        detalles: [],
      };
    }

    grouped[key].detalles.push(`${e.evento} | ${e.observacion}`);

    const ev = e.evento.toLowerCase();
    if (ev.includes("ingreso")) grouped[key].ingreso++;
    if (ev.includes("salida")) grouped[key].salida++;
    if (ev.includes("corte de energía")) grouped[key].energia++;
    if (ev.includes("restauración")) grouped[key].restauracion++;
    if (ev.includes("puerta mantenida")) grouped[key].pma++;
    if (ev.includes("puerta forzada")) grouped[key].forzada++;
    if (["alarma", "coacción", "pánico"].some((w) => ev.includes(w))) grouped[key].alarmas++;
    if (ev.includes("confirmado")) grouped[key].confirmados++;
    if (ev.includes("falso")) grouped[key].falsos++;
    if (ev.includes("cctv fuera de línea")) grouped[key].cctvOffline++;
    if (ev.includes("cctv en línea")) grouped[key].cctvOnline++;
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

  // ✅ Categorías dinámicas
  const categorias = {
    TGS: ["ingreso",  "energia",  "confirmados", "falsos"],
    Edificios: ["pma", "forzada", "alarmas", "confirmados", "falsos"],
    Barrios: ["energia", "cctvOffline", "cctvOnline", "confirmados", "falsos"],
    General: ["ingreso", "salida", "pma", "forzada", "energia", "confirmados", "falsos", "cctvOffline"],
  };

  const colores = {
    ingreso: "#2563eb",
    salida: "#10b981",
    energia: "#f59e0b",
    restauracion: "#eab308",
    pma: "#f97316",
    forzada: "#dc2626",
    alarmas: "#7c3aed",
    confirmados: "#16a34a",
    falsos: "#6b7280",
    cctvOffline: "#ef4444",
    cctvOnline: "#22c55e",
  };

  const tipo = cliente || "General";
  const keys = categorias[tipo];

  // ✅ Generar datasets dinámicos
  const datasets = keys
    .map((k) => {
      const dataArray = sortedKeys.map((day) => grouped[day][k] || 0);
      if (dataArray.every((val) => val === 0)) return null;
      return {
        label: k.charAt(0).toUpperCase() + k.slice(1),
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
            const detalles = grouped[key].detalles.slice(0, 3).map((d) => `• ${d}`);
            return [
              `Ingreso: ${grouped[key].ingreso}`,
              `Salida: ${grouped[key].salida}`,
              `PMA: ${grouped[key].pma}`,
              `Energía: ${grouped[key].energia}`,
              `Confirmados: ${grouped[key].confirmados}`,
              `Falsos: ${grouped[key].falsos}`,
              `CCTV Offline: ${grouped[key].cctvOffline}`,
              `CCTV Online: ${grouped[key].cctvOnline}`,
              "",
              "Detalles:",
              ...detalles,
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
      <h4 className="analytics-title">📈 Analítica {cliente || "General"} (Últimos 30 días)</h4>
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
