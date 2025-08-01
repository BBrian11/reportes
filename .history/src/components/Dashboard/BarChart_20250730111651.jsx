import { Bar } from "react-chartjs-2";
import "../../styles/barChart.css";

export default function BarChart({ eventos }) {
  // ✅ Filtrar últimos 30 días
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  const ultimosEventos = eventos.filter((e) => e.fechaObj && e.fechaObj >= hace30dias && e.fechaObj <= hoy);

  // ✅ Agrupar por día
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
    grouped[key] = (grouped[key] || 0) + 1;
  });

  // ✅ Ordenar por fecha real
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parseKey = (str) => {
      const [day, month] = str.split(" ");
      const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
      return new Date(new Date().getFullYear(), meses.indexOf(month), parseInt(day));
    };
    return parseKey(a) - parseKey(b);
  });

  const data = {
    labels: sortedKeys,
    datasets: [
      {
        label: "Eventos",
        data: sortedKeys.map((k) => grouped[k]),
        backgroundColor: "#2563eb",
        borderRadius: 6,
        barThickness: 18,
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
      <h4 className="bar-chart-title">📊 Actividad últimos 30 días</h4>
      <div className="bar-chart-wrapper">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
