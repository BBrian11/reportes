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
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
      {/* ✅ Eventos por mes */}
     

      {/* ✅ Tendencia Temporal */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
        <h3 className="text-lg font-semibold mb-4">Tendencia Temporal</h3>
        <LineChart eventos={eventos} />
      </div>

      {/* ✅ Distribución por Tipo de Evento */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
        <h3 className="text-lg font-semibold mb-4">Distribución de Eventos</h3>
        <PieChart eventos={eventos} />
      </div>

      {/* ✅ Ubicaciones más Recurrentes */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition col-span-2">
        <h3 className="text-lg font-semibold mb-4">Ubicaciones más Recurrentes</h3>
        <HorizontalChart eventos={eventos} />
      </div>

      {/* ✅ Comparativa Día vs Noche */}
      
    </div>
  );
}
