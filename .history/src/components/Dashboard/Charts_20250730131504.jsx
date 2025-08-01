import React from "react";
import BarChart from "./BarChart";
import PieChart from "./PieChart";
import LineChart from "./LineChart";
import HorizontalChart from "./HorizontalChart";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Charts({ eventos }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Eventos por mes */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
        
        <p className="text-sm text-gray-500 mt-3 text-center">
          Enero fue el mes con más actividad (+25% vs promedio)
        </p>
      </div>

      {/* Tendencia Confirmados vs Falsos */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
        <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
          📉 Confirmados vs Falsos
          <span className="text-xs text-gray-500">Comparativa 30 días</span>
        </h3>
        <LineChart eventos={eventos} />
      
      </div>

      {/* Distribución por tipo */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
       
    
      </div>

      {/* Top ubicaciones */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
        <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
          Ubicaciones mas Recurrentes
          <span className="text-xs text-gray-500">Ranking actual</span>
        </h3>
        <HorizontalChart eventos={eventos} />
       
      </div>
    </div>
  );
}
