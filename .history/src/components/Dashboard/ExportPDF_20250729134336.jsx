// src/components/Dashboard/ExportPDF.jsx
import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";

export default function ExportPDF({ eventos }) {
  const generatePDF = async () => {
    if (eventos.length === 0) {
      Swal.fire("Aviso", "No hay datos para exportar.", "warning");
      return;
    }

    // ✅ Generar PDF
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Reporte de Eventos G3T", 105, 20, { align: "center" });

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, 30);

    pdf.line(10, 35, 200, 35);

    // ✅ Tabla con autoTable
    const tableData = eventos.map((e) => [
      e.cliente,
      e.evento,
      e.ubicacion,
      e.fecha,
      e.observacion,
    ]);

    autoTable(pdf, {
      head: [["Cliente", "Evento", "Ubicación", "Fecha", "Observación"]],
      body: tableData,
      startY: 40,
      theme: "striped",
      headStyles: { fillColor: [32, 178, 170], textColor: 255 },
      bodyStyles: { fontSize: 10 },
    });

    pdf.save(`REPORTE_EVENTOS_G3T_${Date.now()}.pdf`);
  };

  return (
    <div className="text-right mb-6">
      <button
        onClick={generatePDF}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
      >
        📄 Exportar PDF
      </button>
    </div>
  );
}
