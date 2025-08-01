import React from "react";
import BarChart from "./BarChart.jsx";
import LineChart from "./LineChart.jsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Charts({ eventos }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Gráfico de Barras */}
      <div className="chart-container">
        <h3 className="chart-title">📊 Eventos por Día</h3>
        <div className="chart-wrapper">
          <BarChart eventos={eventos} />
        </div>
      </div>

      {/* Gráfico de Línea */}
      <div className="chart-container">
        <h3 className="chart-title">📉 Tendencia de Eventos</h3>
        <div className="chart-wrapper">
          <LineChart eventos={eventos} />
        </div>
      </div>
    </div>
  );
}
