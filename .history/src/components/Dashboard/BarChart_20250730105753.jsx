import { Bar } from "react-chartjs-2";
import "../../styles/barChart.css";

export default function BarChart({ eventos }) {
  // Agrupar eventos por DÍA si el rango es corto (menos de 31 días) o por MES si es largo
  const grouped = {};

  eventos.forEach((e) => {
    const date = new Date(e.fecha);
    const key =
      eventos.length > 31
        ? date.toLocaleString("es-AR", { month: "short", year: "numeric" })
        : date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

    grouped[key] = (grouped[key] || 0) + 1;
  });

  // ✅ Ordenar por fecha real
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parse = (str) => {
      const parts = str.split(" ");
      if (parts.length === 2) return new Date(`01 ${str}`); // Mes y año
      return new Date(`${parts[1]} ${parts[0]} ${new Date().getFullYear()}`); // Día y mes
    };
    return parse(a) - parse(b);
  });

  const data = {
    labels: sortedKeys,
    datasets: [
      {
        label: "Eventos",
        data: sortedKeys.map((m) => grouped[m]),
        backgroundColor: "#2563eb",
        borderRadius: 8,
        barThickness: 24,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} eventos`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#4b5563", font: { size: 12 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#4b5563" },
        grid: { color: "#f3f4f6" },
      },
    },
  };

  return (
    <div className="bar-chart-card">
      <h4 className="bar-chart-title">📊 Actividad en el Periodo</h4>
      <div className="bar-chart-wrapper">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
