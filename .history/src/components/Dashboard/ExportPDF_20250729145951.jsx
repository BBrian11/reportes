import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";

export default function ExportPDF({ eventos }) {
  const generateReport = async () => {
    if (eventos.length === 0) {
      Swal.fire("Aviso", "No hay datos para exportar.", "warning");
      return;
    }

    // ✅ Crear documento
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Reporte de Monitoreo - G3T", 105, 15, { align: "center" });

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generado el: ${new Date().toLocaleString("es-AR")}`, 14, 25);

    pdf.line(10, 28, 200, 28);

    let y = 35;

    // ✅ Capturar los gráficos y agregarlos al PDF
    const charts = ["barChart", "pieChart", "lineChart"]; // IDs de los divs de tus gráficos
    for (const chartId of charts) {
      const chartElement = document.getElementById(chartId);
      if (chartElement) {
        const canvas = await html2canvas(chartElement, { backgroundColor: "#fff", scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 15, y, 180, 80);
        y += 90;
      }
    }

    // ✅ Tabla de eventos
    autoTable(pdf, {
      startY: y + 10,
      head: [["Cliente", "Evento", "Ubicación", "Fecha", "Observación"]],
      body: eventos.map((e) => [e.cliente, e.evento, e.ubicacion, e.fecha, e.observacion]),
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    });

    pdf.save(`REPORTE_G3T_${Date.now()}.pdf`);
  };

  return (
    <div className="text-right mb-6">
      <button
        onClick={generateReport}
        className="btn-primary"
      >
        📄 Generar Reporte
      </button>
    </div>
  );
}
