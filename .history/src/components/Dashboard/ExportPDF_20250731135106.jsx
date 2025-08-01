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

    // ✅ Crear documento PDF
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Reporte de Monitoreo", 105, 15, { align: "center" });

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generado el: ${new Date().toLocaleString("es-AR")}`, 14, 25);
    pdf.line(10, 28, 200, 28);

    let y = 35;

    // ✅ Capturar gráficos por ID (EXCLUIMOS PieChart)
    const charts = ["barChart", "lineChart"]; // IDs definidos en tus gráficos
    for (const chartId of charts) {
      const chartElement = document.getElementById(chartId);
      if (chartElement) {
        const canvas = await html2canvas(chartElement, { backgroundColor: "#fff", scale: 2 });

        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (y + imgHeight > 260) {
          pdf.addPage();
          y = 20;
        }
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 15, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      }
    }

    // ✅ Agregar tabla de eventos
    if (y + 40 > 280) {
      pdf.addPage();
      y = 20;
    }
    autoTable(pdf, {
      startY: y + 5,
      head: [["Cliente", "Evento", "Ubicación", "Fecha", "Observación"]],
      body: eventos.map((e) => [e.cliente, e.evento, e.ubicacion, e.fecha, e.observacion]),
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    });

    // ✅ Descargar archivo
    pdf.save(`REPORTE_MONITOREO_${Date.now()}.pdf`);
  };

  return (
    <div className="report-button-container">
      <button onClick={generateReport} className="btn-primary">
        📄 Generar Reporte
      </button>
    </div>
  );
}
