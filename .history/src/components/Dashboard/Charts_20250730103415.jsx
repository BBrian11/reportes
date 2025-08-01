import React from "react";
import BarChart from "./BarChart.jsx";
import PieChart from "./PieChart.jsx";
import LineChart from "./LineChart.jsx";
import HorizontalChart from "./HorizontalChart.jsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Charts({ eventos }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Eventos por mes */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-4 text-center">📊 Eventos por Mes</h3>
        <BarChart eventos={eventos} />
      </div>

      {/* Tendencia Confirmados vs Falsos */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-4 text-center">📉 Confirmados vs Falsos</h3>
        <LineChart eventos={eventos} />
      </div>

      {/* Proporción por tipo */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-4 text-center">🟢 Distribución por Tipo</h3>
        <PieChart eventos={eventos} />
      </div>

      {/* Top ubicaciones */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-4 text-center">📍 Top Ubicaciones</h3>
        <HorizontalChart eventos={eventos} />
      </div>
    </div>
  );
}
