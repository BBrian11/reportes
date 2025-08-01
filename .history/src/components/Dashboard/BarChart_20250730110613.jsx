import { Bar } from "react-chartjs-2";
import "../../styles/barChart.css";

export default function BarChart({ eventos }) {
  // ✅ Fecha actual y límite (últimos 30 días)
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hoy.getDate() - 30);

  // ✅ Parseador seguro para formato dd/mm/yyyy hh:mm:ss
  const parseFecha = (fechaStr) => {
    if (!fechaStr) return null;
    const [fechaPart, horaPart] = fechaStr.split(" ");
    const [dia, mes, anio] = fechaPart.split("/");
    return new Date(anio, mes - 1, dia); // YYYY, MM, DD
  };

  // ✅ Filtrar últimos 30 días
  const ultimosEventos = eventos.filter((e) => {
    const fecha = parseFecha(e.fecha);
    return fecha && fecha >= hace30dias && fecha <= hoy;
  });

  // ✅ Agrupar por día
  const grouped = {};
  ultimosEventos.forEach((e) => {
    const fecha = parseFecha(e.fecha);
    const key = fecha.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
    grouped[key] = (grouped[key] || 0) + 1;
  });

  // ✅ Ordenar por fecha real
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const parseKey = (key) => {
      const [day, month] = key.split(" ");
      const meses = [
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic",
      ];
      return new Date(2025, meses.indexOf(month), parseInt(day));
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
