import React from "react";

export default function EdificioStats({ eventos }) {
  const totalPMA = eventos.filter(e => e.evento.includes("Puerta Mantenida Abierta")).length;
  const totalForzada = eventos.filter(e => e.evento.includes("Puerta Forzada")).length;

  // Encargado PMA (si observación contiene "Encargado")
  const encargados = {};
  eventos.forEach(e => {
    if (e.evento.includes("Puerta Mantenida Abierta") && e.observacion) {
      if (e.observacion.includes("Encargado")) {
        encargados[e.observacion] = (encargados[e.observacion] || 0) + 1;
      }
    }
  });

  const topEncargados = Object.entries(encargados).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-bold mb-4">Estadísticas Edificios</h3>
      <p>Total PMA: <strong>{totalPMA}</strong></p>
      <p>Total Puerta Forzada: <strong>{totalForzada}</strong></p>
      <h4 className="font-semibold mt-4">Ranking Encargados (PMA)</h4>
      <ul>
        {topEncargados.slice(0, 5).map(([nombre, count], idx) => (
          <li key={idx}>{nombre}: {count}</li>
        ))}
      </ul>
    </div>
  );
}
