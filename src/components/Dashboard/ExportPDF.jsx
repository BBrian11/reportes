import React from "react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

// ✅ Estilos PDF
const styles = StyleSheet.create({
  page: { backgroundColor: "#fff", padding: 20, fontSize: 10, fontFamily: "Helvetica" },
  header: { textAlign: "center", marginBottom: 15, borderBottom: "2px solid #2563eb", paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: "bold", color: "#2563eb" },
  subtitle: { fontSize: 10, color: "#555", marginTop: 2 },
  kpiContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, padding: 8, border: "1px solid #ccc", borderRadius: 5 },
  kpiCard: { width: "30%", textAlign: "center" },
  kpiValue: { fontSize: 14, fontWeight: "bold", color: "#111" },
  chartImage: { width: 500, height: 250, marginBottom: 20, alignSelf: "center" },
  tableHeader: { flexDirection: "row", backgroundColor: "#2563eb", color: "#fff", padding: 4, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #ccc", padding: 3 },
  col: { flex: 1, fontSize: 8 },
});

// ✅ PDF con Observaciones
const ReportDocument = ({ eventos, charts }) => {
  const totalEventos = eventos.length;
  const eventoFrecuente = eventos.reduce((acc, e) => {
    acc[e.evento] = (acc[e.evento] || 0) + 1;
    return acc;
  }, {});
  const topEvento = Object.entries(eventoFrecuente).sort((a, b) => b[1] - a[1])[0] || ["Sin datos", 0];

  return (
    <Document>
      <Page style={styles.page}>
        {/* ✅ Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Monitoreo</Text>
          <Text style={styles.subtitle}>Generado el: {new Date().toLocaleString("es-AR")}</Text>
        </View>

        {/* ✅ KPIs */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text>Total Eventos</Text>
            <Text style={styles.kpiValue}>{totalEventos}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text>Evento más frecuente</Text>
            <Text style={styles.kpiValue}>{topEvento[0]}</Text>
          </View>
        </View>

        {/* ✅ Gráficos */}
        {charts?.lineChart && <Image src={charts.lineChart} style={styles.chartImage} />}
        {charts?.pieChart && <Image src={charts.pieChart} style={styles.chartImage} />}

        {/* ✅ Tabla con Observación */}
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 0.8 }]}>Cliente</Text>
            <Text style={[styles.col, { flex: 1.2 }]}>Evento</Text>
            <Text style={[styles.col, { flex: 1 }]}>Ubicación</Text>
            <Text style={[styles.col, { flex: 0.8 }]}>Fecha</Text>
            <Text style={[styles.col, { flex: 2 }]}>Observación</Text>
          </View>
          {eventos.slice(0, 50).map((e, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.col, { flex: 0.8 }]}>{e.cliente}</Text>
              <Text style={[styles.col, { flex: 1.2 }]}>{e.evento}</Text>
              <Text style={[styles.col, { flex: 1 }]}>{e.ubicacion}</Text>
              <Text style={[styles.col, { flex: 0.8 }]}>{e.fecha}</Text>
              <Text style={[styles.col, { flex: 2 }]}>{e.observacion || "Sin observación"}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

// ✅ Generar Excel
const generateExcel = (eventos) => {
  if (eventos.length === 0) {
    Swal.fire("Aviso", "No hay datos para exportar.", "warning");
    return;
  }

  const wsData = [
    ["Reporte de Monitoreo"],
    [`Generado el: ${new Date().toLocaleString("es-AR")}`],
    [],
    ["Cliente", "Evento", "Ubicación", "Fecha", "Observación"],
    ...eventos.map((e) => [e.cliente, e.evento, e.ubicacion, e.fecha, e.observacion || "Sin observación"]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, `REPORTE_MONITOREO_${Date.now()}.xlsx`);
};

// ✅ Botón combinado (PDF + Excel)
export default function ExportPDFExcel({ eventos, charts }) {
  return (
    <div className="report-button-container" style={{ display: "flex", gap: "10px" }}>
      <PDFDownloadLink
        document={<ReportDocument eventos={eventos} charts={charts} />}
        fileName={`REPORTE_MONITOREO_${Date.now()}.pdf`}
      >
        {({ loading }) => (
          <button
            className="btn-primary"
            onClick={() => generateExcel(eventos)} // ✅ Genera Excel al mismo tiempo
          >
            {loading ? "Generando..." : "📄 PDF + 📊 Excel"}
          </button>
        )}
      </PDFDownloadLink>
    </div>
  );
}
