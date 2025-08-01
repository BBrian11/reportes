// src/components/Dashboard/ExportPDF.jsx
import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import SignaturePad from "signature_pad";

export default function ExportPDF({ eventos }) {
  const generatePDF = async () => {
    if (eventos.length === 0) {
      Swal.fire("Aviso", "No hay datos para exportar.", "warning");
      return;
    }

    // ✅ Solicitar nombre del operador
    const { value: operador } = await Swal.fire({
      title: "Nombre del Operador",
      input: "text",
      inputLabel: "Ingrese su nombre:",
      showCancelButton: true,
      confirmButtonText: "Continuar",
      inputValidator: (value) => {
        if (!value) return "Debe ingresar un nombre.";
      },
    });
    if (!operador) return;

    // ✅ Capturar firma digital
    let signatureImage = null;
    await Swal.fire({
      title: "Firma Digital",
      html: `
        <p>Por favor, firme en el recuadro:</p>
        <canvas id="signaturePad" style="border:1px solid #ccc; width:100%; height:150px;"></canvas>
        <button id="clearSignature" class="btn btn-secondary mt-2">Borrar Firma</button>
      `,
      didOpen: () => {
        const canvas = document.getElementById("signaturePad");
        const pad = new SignaturePad(canvas);
        document.getElementById("clearSignature").onclick = () => pad.clear();

        Swal.update({
          preConfirm: () => {
            if (pad.isEmpty()) {
              Swal.showValidationMessage("Debe firmar antes de continuar");
              return false;
            }
            signatureImage = pad.toDataURL();
            return true;
          },
        });
      },
      showCancelButton: true,
      confirmButtonText: "Guardar Firma",
    });
    if (!signatureImage) return;

    // ✅ Generar PDF
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Reporte de Eventos G3T", 105, 20, { align: "center" });

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generado por: ${operador}`, 14, 30);
    pdf.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 150, 30);

    pdf.line(10, 35, 200, 35);

    // ✅ Tabla con autoTable
    const tableData = eventos.map((e) => [e.cliente, e.evento, e.ubicacion, e.fecha, e.observacion]);
    autoTable(pdf, {
      head: [["Cliente", "Evento", "Ubicación", "Fecha", "Observación"]],
      body: tableData,
      startY: 40,
      theme: "striped",
      headStyles: { fillColor: [32, 178, 170], textColor: 255 },
    });

    let finalY = pdf.lastAutoTable.finalY + 20;

    // ✅ Agregar firma
    pdf.text("Firma del Operador:", 14, finalY);
    if (signatureImage) {
      pdf.addImage(signatureImage, "PNG", 14, finalY + 5, 50, 20);
    }

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
