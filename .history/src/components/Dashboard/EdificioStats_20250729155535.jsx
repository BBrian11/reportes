import React from "react";

export default function EdificioStats({ eventos }) {
  const totalPMA = eventos.filter(e => e.evento.includes("Puerta Mantenida Abierta")).length;
  const totalForzada = eventos.filter(e => e.evento.includes("Puerta Forzada")).length;

  const encargados = {};
  eventos.forEach(e => {
    if (e.evento.includes("Puerta Mantenida Abierta") && e.observacion?.includes("Encargado")) {
      encargados[e.observacion] = (encargados[e.observacion] || 0) + 1;
    }
  });

  const topEncargados = Object.entries(encargados).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">🏢 Edificios - Accesos</h3>
        <span className="text-xs text-gray-500">Periodo Actual</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg bg-blue-100 p-4 text-center shadow hover:shadow-md transition">
          <p className="text-sm text-gray-600">Puertas Mantenidas</p>
          <h2 className="text-2xl font-bold text-blue-700">{totalPMA}</h2>
        </div>
        <div className="rounded-lg bg-red-100 p-4 text-center shadow hover:shadow-md transition">
          <p className="text-sm text-gray-600">Puertas Forzadas</p>
          <h2 className="text-2xl font-bold text-red-700">{totalForzada}</h2>
        </div>
      </div>
      <h4 className="text-gray-700 font-semibold mb-3">Top Encargados (PMA)</h4>
      <div className="bg-gray-50 rounded-lg p-3">
        {topEncargados.length > 0 ? (
          <ul className="divide-y divide-gray-200 text-sm">
            {topEncargados.map(([nombre, count], idx) => (
              <li key={idx} className="flex justify-between py-1">
                <span>{nombre}</span>
                <span className="font-bold">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No hay datos</p>
        )}
      </div>
    </div>
  );
}
