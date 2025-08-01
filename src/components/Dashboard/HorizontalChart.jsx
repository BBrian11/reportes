import { Bar } from "react-chartjs-2";
import "../../styles/horizontalchart.css"; // ✅ Nueva hoja de estilos

export default function HorizontalChart({ eventos }) {
  const countByLocation = {};
  eventos.forEach(e => {
    countByLocation[e.ubicacion] = (countByLocation[e.ubicacion] || 0) + 1;
  });

  const sorted = Object.entries(countByLocation)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const labels = sorted.map(([loc]) => loc);
  const values = sorted.map(([_, count]) => count);
  const total = values.reduce((a, b) => a + b, 0);

  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#6b7280"];

  const data = {
    labels,
    datasets: [
      {
        label: "Eventos",
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
        barThickness: 28,
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
            return ` ${count} eventos (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: (value) => value + " evt",
        },
      },
    },
  };

  return (
    <div className="horizontal-chart-card">
      <h4 className="horizontal-chart-title">📍 Top 5 Ubicaciones</h4>
      <div className="horizontal-chart-wrapper">
        <Bar data={data} options={options} />
      </div>
      <div className="horizontal-chart-footer">
        Total: <span>{total}</span> eventos
      </div>
    </div>
  );
}
