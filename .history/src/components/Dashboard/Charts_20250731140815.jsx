import React, { useRef, useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import ExportPDF from "./ExportPDF";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function Charts({ eventos }) {
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);

  const [chartImages, setChartImages] = useState({ barChart: null, lineChart: null });

  // ✅ Configuración de datos de ejemplo
  const barData = {
    labels: ["Ene", "Feb", "Mar", "Abr"],
    datasets: [{ label: "Eventos", data: [12, 19, 8, 15], backgroundColor: "#2563eb" }],
  };

  const lineData = {
    labels: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
    datasets: [{ label: "Tendencia", data: [10, 20, 15, 25], borderColor: "#9333ea" }],
  };

  // ✅ Capturar imágenes en base64 cuando el componente se monte
  useEffect(() => {
    if (barChartRef.current && lineChartRef.current) {
      const barImage = barChartRef.current.toBase64Image();
      const lineImage = lineChartRef.current.toBase64Image();
      setChartImages({ barChart: barImage, lineChart: lineImage });
    }
  }, [eventos]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* ✅ Gráfico de Barras */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
        <h3 className="text-lg font-semibold mb-4">Eventos por Mes</h3>
        <Bar ref={barChartRef} data={barData} />
      </div>

      {/* ✅ Gráfico de Líneas */}
      <div className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
        <h3 className="text-lg font-semibold mb-4">Tendencia de Eventos</h3>
        <Line ref={lineChartRef} data={lineData} />
      </div>

      {/* ✅ Botón Generar Reporte con Gráficos */}
      <div className="col-span-2 text-right mt-4">
        <ExportPDF eventos={eventos} charts={chartImages} />
      </div>
    </div>
  );
}
