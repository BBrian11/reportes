import { Bar } from "react-chartjs-2";
import "../../styles/barChart.css";

export default function BarChart({ eventos }) {
  // ✅ Filtrar últimos 30 días
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  const ultimosEventos = eventos.filter(e => {
    const fecha = new Date(e.fecha);
    return fecha >= hace30dias && fecha <= hoy;
  });

  // ✅ Agrupar por día
  const grouped = {};
  ultimosEventos.forEach(e => {
    const date = new Date(e.fecha);
    const key = date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    grouped[key] = (grouped[key] || 0) + 1;
  });

  // ✅ Ordenar por fecha real (usando índice de fecha)
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parse = (str) => {
      const [day, month] = str.split(" ");
      const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
      return new Date(2025, meses.indexOf(month), parseInt(day));
    };
    return parse(a) - parse(b);
  });

  const data = {
    labels: sortedKeys,
    datasets: [
      {
        label: "Eventos",
        data: sortedKeys.map(k => grouped[k]),
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
