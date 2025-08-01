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
      }
    ]
  };

  return (
    <div className="analytics-widget bg-white p-6 rounded-xl shadow-md mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-700">TGS - Resumen Operativo</h3>
        <span className="text-sm text-gray-500">Periodo actual</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="kpi-card bg-blue-50">
          <p className="kpi-title">👤 Ingresos</p>
          <h2 className="kpi-value">{aperturas}</h2>
          <p className="kpi-sub">Aperturas registradas</p>
        </div>
        <div className="kpi-card bg-green-50">
          <p className="kpi-title">🔓 Salidas</p>
          <h2 className="kpi-value">{cierres}</h2>
          <p className="kpi-sub">Cierres registrados</p>
        </div>
        <div className="kpi-card bg-yellow-50">
          <p className="kpi-title">⚡ Cortes energía</p>
          <h2 className="kpi-value">{cortes}</h2>
          <p className="kpi-sub">Interrupciones detectadas</p>
        </div>
        <div className="kpi-card bg-red-50">
          <p className="kpi-title">🔌 Restauraciones</p>
          <h2 className="kpi-value">{restauraciones}</h2>
          <p className="kpi-sub">Suministro reanudado</p>
        </div>
      </div>
    
    </div>
  );
}
