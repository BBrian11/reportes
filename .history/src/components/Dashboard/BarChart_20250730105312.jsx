import { Bar } from "react-chartjs-2";

export default function BarChart({ eventos }) {
  // Agrupar eventos por MES (orden cronológico)
  const grouped = {};

  eventos.forEach((e) => {
    const date = new Date(e.fecha);
    const month = date.toLocaleString("es-AR", { month: "short", year: "numeric" });
    grouped[month] = (grouped[month] || 0) + 1;
  });

  // ✅ Ordenar por fecha real
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const [ma, ya] = a.split(" ");
    const [mb, yb] = b.split(" ");
    return new Date(`${ya}-${ma}-01`) - new Date(`${yb}-${mb}-01`);
  });

  const data = {
    labels: sortedKeys,
    datasets: [
      {
        label: "Eventos",
        data: sortedKeys.map((m) => grouped[m]),
        backgroundColor: "#2563eb",
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        ticks: { color: "#374151" },
      },
    },
  };

  return <Bar data={data} options={options} />;
}
