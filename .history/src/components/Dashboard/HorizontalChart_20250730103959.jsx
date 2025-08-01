import { Bar } from "react-chartjs-2";

export default function HorizontalChart({ eventos }) {
  // Contar eventos por ubicación
  const countByLocation = {};
  eventos.forEach(e => {
    countByLocation[e.ubicacion] = (countByLocation[e.ubicacion] || 0) + 1;
  });

  // Ordenar y tomar top 5
  const sorted = Object.entries(countByLocation)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const labels = sorted.map(([loc]) => loc);
  const values = sorted.map(([_, count]) => count);

  // Calcular totales para porcentajes
  const total = values.reduce((a, b) => a + b, 0);

  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#6b7280"];

  const data = {
    labels,
    datasets: [
      {
        label: "Eventos por Ubicación",
        data: values,
        backgroundColor: colors,
        borderRadius: 8,
        barThickness: 24,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const count = ctx.parsed.x;
            const pct = ((count / total) * 100).toFixed(1);
            const rank = ctx.dataIndex + 1;
            return `#${rank} • ${count} eventos (${pct}%)`;
          },
        },
      },
      title: {
        display: true,
        text: "Top 5 Ubicaciones con Más Eventos",
        font: { size: 16, weight: "bold" },
      },
    },
    scales: {
      x: {
        grid: { color: "#f1f5f9" },
        ticks: { color: "#475569", font: { size: 12 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#334155", font: { size: 13, weight: "bold" } },
      },
    },
  };

  return (
    <div className="h-80">
      <Bar data={data} options={options} />
      <div className="text-sm text-gray-500 mt-2 text-center">
        Total: {total} eventos registrados
      </div>
    </div>
  );
}
