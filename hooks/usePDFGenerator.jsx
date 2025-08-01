import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function usePDFGenerator() {
  const generatePDF = async (elementId) => {
    const input = document.getElementById(elementId);
    if (!input) return;

    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
    pdf.save('reporte.pdf');
  };

  return { generatePDF };
}