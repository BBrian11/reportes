import React from "react";

export default function TgsStats({ eventos }) {
  const aperturas = eventos.filter(e => e.evento.includes("Ingreso de Personal")).length;
  const cierres = eventos.filter(e => e.evento.includes("Salida de Personal")).length;
  const cortes = eventos.filter(e => e.evento.includes("Corte de energía eléctrica")).length;
  const restauraciones = eventos.filter(e => e.evento.includes("Restauración de energía eléctrica")).length;

  const stats = [
    { label: "Ingresos", value: aperturas, color: "bg-blue-100 text-blue-600" },
    { label: "Salidas", value: cierres, color: "bg-green-100 text-green-600" },
    { label: "Cortes Energía", value: cortes, color: "bg-yellow-100 text-yellow-600" },
    { label: "Restauraciones", value: restauraciones, color: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">🚛 TGS - Resumen Operativo</h3>
        <span className="text-xs text-gray-500">Periodo Actual</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((item, idx) => (
          <div key={idx} className="rounded-lg p-4 text-center shadow-sm hover:shadow-md transition">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${item.color}`}>
              <span className="text-lg font-bold">{item.value}</span>
            </div>
            <p className="text-sm font-medium text-gray-600">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
