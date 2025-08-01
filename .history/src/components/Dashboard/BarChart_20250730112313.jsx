import { Bar } from "react-chartjs-2";
import "../../styles/barChart.css";

export default function BarChart({ eventos }) {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  // ✅ Filtrar eventos de los últimos 30 días
  const ultimosEventos = eventos.filter(
    (e) => e.fechaObj && e.fechaObj >= hace30dias && e.fechaObj <= hoy
  );

  // ✅ Agrupar por día
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const key = e.fechaObj.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
    grouped[key] = (grouped[key] || 0) + 1;
  });

  // ✅ Generar TODOS los días del rango (incluso si tienen 0 eventos)
  const diasCompletos = [];
  const cursor = new Date(hace30dias);
  while (cursor <= hoy) {
    diasCompletos.push(
      cursor.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  // ✅ Data para el gráfico
  const data = {
    labels: diasCompletos,
    datasets: [
      {
        label: "Eventos",
        data: diasCompletos.map((dia) => grouped[dia] || 0),
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
        ticks: { color: "#4b5563", font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
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
