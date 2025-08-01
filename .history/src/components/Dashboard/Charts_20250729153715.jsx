// src/components/Dashboard/Charts.jsx
import React from "react";
import BarChart from "./BarChart.jsx";
import PieChart from "./PieChart.jsx";
import LineChart from "./LineChart.jsx";
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-6">
      <div className="col-span-2 bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-2 text-center">📊 Eventos en el Tiempo</h3>
        <BarChart eventos={eventos} />
      </div>
    
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-2 text-center">📉 Tendencia de Eventos</h3>
        <LineChart eventos={eventos} />
      </div>
    </div>
  );
}
