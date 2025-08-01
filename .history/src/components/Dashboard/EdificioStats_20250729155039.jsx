import React from "react";

export default function EdificioStats({ eventos }) {
  // Cálculos
  const totalPMA = eventos.filter(e =>
    e.evento.includes("Puerta Mantenida Abierta")
  ).length;

  const totalForzada = eventos.filter(e =>
    e.evento.includes("Puerta Forzada")
  ).length;

  const encargados = {};
  eventos.forEach(e => {
    if (e.evento.includes("Puerta Mantenida Abierta") && e.observacion) {
      if (e.observacion.includes("Encargado")) {
        encargados[e.observacion] = (encargados[e.observacion] || 0) + 1;
      }
    }
  });

  const topEncargados = Object.entries(encargados)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition mb-6">
      {/* Título */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🏢 Edificios - Accesos</h3>
        <span className="text-xs text-gray-500">Periodo Actual</span>
      </div>

      {/* Tarjetas métricas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col items-center bg-blue-50 rounded-lg p-4">
          <span className="text-2xl text-blue-600 mb-1">🚪</span>
          <p className="text-sm text-gray-500">Puertas Mantenidas</p>
          <h2 className="text-xl font-bold text-blue-700">{totalPMA}</h2>
        </div>
        <div className="flex flex-col items-center bg-red-50 rounded-lg p-4">
          <span className="text-2xl text-red-600 mb-1">🔓</span>
          <p className="text-sm text-gray-500">Puertas Forzadas</p>
          <h2 className="text-xl font-bold text-red-700">{totalForzada}</h2>
        </div>
      </div>

      {/* Ranking */}
      <h4 className="text-gray-700 font-semibold mb-2">Top Encargados (PMA)</h4>
      <div className="bg-gray-50 rounded-lg p-3">
        {topEncargados.length > 0 ? (
          <ul className="space-y-2">
            {topEncargados.map(([nombre, count], idx) => (
              <li
                key={idx}
                className="flex justify-between text-sm border-b pb-1 last:border-none"
              >
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
