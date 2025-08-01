import React from "react";
import { Bar } from "react-chartjs-2";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter((e) =>
    e.evento.includes("Ingreso de Personal")
  ).length;
  const cierres = eventos.filter((e) =>
    e.evento.includes("Salida de Personal")
  ).length;
  const cortes = eventos.filter((e) =>
    e.evento.includes("Corte de energía eléctrica")
  ).length;
  const restauraciones = eventos.filter((e) =>
    e.evento.includes("Restauración de energía eléctrica")
  ).length;

  const chartData = {
    labels: ["Ingresos", "Salidas", "Cortes", "Restauraciones"],
    datasets: [
      {
        data: [aperturas, cierres, cortes, restauraciones],
        backgroundColor: ["#2563eb", "#10b981", "#f59e0b", "#ef4444"],
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6 hover:shadow-lg transition">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-700">🚛 TGS - Resumen</h3>
        <span className="text-sm text-gray-500">Periodo actual</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-sm text-gray-500">Ingresos</p>
          <h2 className="text-2xl font-bold text-blue-700">{aperturas}</h2>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <p className="text-sm text-gray-500">Salidas</p>
          <h2 className="text-2xl font-bold text-green-700">{cierres}</h2>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <p className="text-sm text-gray-500">Cortes</p>
          <h2 className="text-2xl font-bold text-yellow-600">{cortes}</h2>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <p className="text-sm text-gray-500">Restauraciones</p>
          <h2 className="text-2xl font-bold text-red-700">{restauraciones}</h2>
        </div>
      </div>
      <Bar
        data={chartData}
        options={{
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: "#f1f5f9" } },
          },
        }}
        height={80}
      />
    </div>
  );
}
