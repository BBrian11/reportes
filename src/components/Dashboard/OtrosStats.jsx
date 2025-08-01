import React from "react";
import { Bar } from "react-chartjs-2";
import { Pie } from "react-chartjs-2";

export default function OtrosStats({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-md text-center">
        <p className="text-gray-500">📭 No hay datos para mostrar</p>
      </div>
    );
  }

  // ✅ KPIs
  const totalEventos = eventos.length;
  const eventoFrecuente = eventos.reduce((acc, e) => {
    acc[e.evento] = (acc[e.evento] || 0) + 1;
    return acc;
  }, {});
  const topEvento = Object.entries(eventoFrecuente).sort((a, b) => b[1] - a[1])[0] || ["Sin datos", 0];

  const ubicacionesUnicas = new Set(eventos.map((e) => e.ubicacion)).size;

  // ✅ Datos para BarChart (eventos por tipo)
  const labelsEventos = Object.keys(eventoFrecuente);
  const dataEventos = Object.values(eventoFrecuente);

  const barData = {
    labels: labelsEventos,
    datasets: [
      {
        label: "Eventos",
        data: dataEventos,
        backgroundColor: ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#6b7280"],
        borderRadius: 8,
      },
    ],
  };

  // ✅ Datos para PieChart (ubicaciones)
  const ubicacionCounts = eventos.reduce((acc, e) => {
    acc[e.ubicacion] = (acc[e.ubicacion] || 0) + 1;
    return acc;
  }, {});
  const pieData = {
    labels: Object.keys(ubicacionCounts),
    datasets: [
      {
        data: Object.values(ubicacionCounts),
        backgroundColor: ["#2563eb", "#9333ea", "#f59e0b", "#10b981", "#ef4444"],
      },
    ],
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition mb-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">📊 Estadísticas - Otros</h3>

      {/* ✅ KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <h4 className="text-gray-600 text-sm">Total Eventos</h4>
          <p className="text-2xl font-bold text-blue-600">{totalEventos}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <h4 className="text-gray-600 text-sm">Evento más frecuente</h4>
          <p className="text-lg font-semibold">{topEvento[0]}</p>
          <span className="text-gray-500 text-sm">{topEvento[1]} veces</span>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <h4 className="text-gray-600 text-sm">Ubicaciones únicas</h4>
          <p className="text-2xl font-bold text-green-600">{ubicacionesUnicas}</p>
        </div>
      </div>

      {/* ✅ Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BarChart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h5 className="text-gray-700 mb-2">Eventos por Tipo</h5>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>

        {/* PieChart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h5 className="text-gray-700 mb-2">Distribución por Ubicación</h5>
          <Pie data={pieData} options={{ responsive: true }} />
        </div>
      </div>
    </div>
  );
}
