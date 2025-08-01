import React from "react";
import { Doughnut } from "react-chartjs-2";

export default function EdificioStats({ eventos }) {
  const totalPMA = eventos.filter(e => e.evento.includes("Puerta Mantenida Abierta")).length;
  const totalForzada = eventos.filter(e => e.evento.includes("Puerta Forzada")).length;

  const encargados = {};
  eventos.forEach(e => {
    if (e.evento.includes("Puerta Mantenida Abierta") && e.observacion) {
      if (e.observacion.includes("Encargado")) {
        encargados[e.observacion] = (encargados[e.observacion] || 0) + 1;
      }
    }
  });
  const topEncargados = Object.entries(encargados).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const chartData = {
    labels: ["PMA", "Puerta Forzada"],
    datasets: [
      {
        data: [totalPMA, totalForzada],
        backgroundColor: ["#3b82f6", "#ef4444"],
        borderWidth: 2
      }
    ]
  };

  return (
    <div className="analytics-widget bg-white p-6 rounded-xl shadow-md mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-700">Edificios - Análisis de Accesos</h3>
        <span className="text-sm text-gray-500">Periodo actual</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Doughnut data={chartData} options={{ plugins: { legend: { position: "bottom" } } }} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-600 mb-2">Ranking Encargados (PMA)</h4>
          <ul className="text-sm text-gray-700">
            {topEncargados.length > 0 ? (
              topEncargados.map(([nombre, count], idx) => (
                <li key={idx} className="flex justify-between border-b py-1">
                  <span>{nombre}</span>
                  <span className="font-bold">{count}</span>
                </li>
              ))
            ) : (
              <li>No hay datos</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
