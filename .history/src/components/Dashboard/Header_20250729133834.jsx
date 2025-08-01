// src/components/Dashboard/Header.jsx
import React from "react";

export default function Header() {
  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-lg shadow-lg p-5 mb-6 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          📡 Dashboard G3T
        </h1>
        <p className="text-sm text-gray-300">
          Monitoreo avanzado y reportes en tiempo real
        </p>
      </div>
      <div>
        <button
          id="btnGeneratePDF"
          className="bg-white text-slate-700 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition"
        >
          📄 Generar Reporte
        </button>
      </div>
    </div>
  );
}
