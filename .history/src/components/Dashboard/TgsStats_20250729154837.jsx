import React from "react";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e =>
    e.evento.includes("Ingreso de Personal")
  ).length;
  const cierres = eventos.filter(e =>
    e.evento.includes("Salida de Personal")
  ).length;
  const cortes = eventos.filter(e =>
    e.evento.includes("Corte de energía eléctrica")
  ).length;
  const restauraciones = eventos.filter(e =>
    e.evento.includes("Restauración de energía eléctrica")
  ).length;

  const stats = [
    { label: "Ingresos", value: aperturas, color: "bg-blue-500" },
    { label: "Salidas", value: cierres, color: "bg-green-500" },
    { label: "Cortes Energía", value: cortes, color: "bg-yellow-500" },
    { label: "Restauraciones", value: restauraciones, color: "bg-red-500" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          🚛 TGS - Resumen Operativo
        </h3>
        <span className="text-xs text-gray-500">Periodo Actual</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition"
          >
            <div
              className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold mb-2`}
            >
              {item.value}
            </div>
            <p className="text-sm text-gray-700 font-medium">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
