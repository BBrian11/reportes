import React from "react";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e => e.evento.includes("Ingreso de Personal")).length;
  const cierres = eventos.filter(e => e.evento.includes("Salida de Personal")).length;
  const cortes = eventos.filter(e => e.evento.includes("Corte de energía eléctrica")).length;
  const restauraciones = eventos.filter(e => e.evento.includes("Restauración de energía eléctrica")).length;

  const stats = [
    { label: "Ingresos", value: aperturas, color: "text-blue-600" },
    { label: "Salidas", value: cierres, color: "text-green-600" },
    { label: "Cortes Energía", value: cortes, color: "text-yellow-600" },
    { label: "Restauraciones", value: restauraciones, color: "text-red-600" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">🚛 TGS - Resumen Operativo</h3>
        <span className="text-xs text-gray-500">Periodo Actual</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((item, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-sm transition">
            <p className="text-sm text-gray-500">{item.label}</p>
            <h2 className={`text-2xl font-bold ${item.color}`}>{item.value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
