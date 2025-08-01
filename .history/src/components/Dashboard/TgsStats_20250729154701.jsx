import React from "react";
import { Bar } from "react-chartjs-2";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e => e.evento.includes("Ingreso de Personal")).length;
  const cierres = eventos.filter(e => e.evento.includes("Salida de Personal")).length;
  const cortes = eventos.filter(e => e.evento.includes("Corte de energía eléctrica")).length;
  const restauraciones = eventos.filter(e => e.evento.includes("Restauración de energía eléctrica")).length;

  const chartData = {
    labels: ["Ingresos", "Salidas", "Cortes", "Restauraciones"],
    datasets: [
      {
        data: [aperturas, cierres, cortes, restauraciones],
        backgroundColor: ["#2563eb", "#10b981", "#f59e0b", "#ef4444"],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 hover:shadow-xl transition">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">🚛 TGS - Resumen Operativo</h3>
        <span className="text-xs text-gray-500">Periodo actual</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Ingresos", value: aperturas, color: "text-blue-600" },
          { label: "Salidas", value: cierres, color: "text-green-600" },
          { label: "Cortes", value: cortes, color: "text-yellow-600" },
          { label: "Restauraciones", value: restauraciones, color: "text-red-600" },
        ].map((item, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">{item.label}</p>
            <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
          </div>
        ))}
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
