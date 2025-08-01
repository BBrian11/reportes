import { Bar } from "react-chartjs-2";

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

  const data = {
    labels,
    datasets: [
      {
        label: "Eventos",
        data: values,
        backgroundColor: "#2563eb",
      },
    ],
  };

  const options = {
    indexAxis: "y", // Horizontal
    responsive: true,
    plugins: { legend: { display: false } },
  };

  return <Bar data={data} options={options} />;
}
