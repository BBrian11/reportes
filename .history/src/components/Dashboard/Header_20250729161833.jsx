import React from 'react';

export default function Header() {
  return (
    <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 rounded-lg shadow-md flex justify-between items-center mb-4">
      <div>
        <h1 className="text-xl font-bold">📡 Dashboard G3T</h1>
        <p className="text-sm">Monitoreo y reportes en tiempo real</p>
      </div>
      <button className="bg-white text-blue-900 px-4 py-2 rounded shadow hover:bg-gray-200 transition">
        📄 Exportar PDF
      </button>
    </div>
  );
}