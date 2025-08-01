import React from 'react';

export default function ExportPDF() {
  const handleExport = () => {
    alert('Generación de PDF en desarrollo');
  };

  return (
    <div className="text-center mb-4">
      <button
        onClick={handleExport}
        className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 transition"
      >
        📄 Exportar PDF
      </button>
    </div>
  );
}