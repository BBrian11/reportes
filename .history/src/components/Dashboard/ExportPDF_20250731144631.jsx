import React from "react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

// ✅ Estilos PDF
const styles = StyleSheet.create({
  page: { backgroundColor: "#fff", padding: 20, fontSize: 12, fontFamily: "Helvetica" },
  header: { textAlign: "center", marginBottom: 20, borderBottom: "2px solid #2563eb", paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: "bold", color: "#2563eb" },
  subtitle: { fontSize: 12, color: "#555", marginTop: 4 },
  kpiContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, padding: 10, border: "1px solid #ccc", borderRadius: 5 },
  kpiCard: { width: "30%", textAlign: "center" },
  kpiValue: { fontSize: 16, fontWeight: "bold", color: "#111" },
  chartImage: { width: 500, height: 250, marginBottom: 20, alignSelf: "center" },
  tableHeader: { flexDirection: "row", backgroundColor: "#2563eb", color: "#fff", padding: 5, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #ccc", padding: 4 },
  col: { flex: 1, fontSize: 10 },
});

// ✅ Componente del PDF
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Monitoreo</Text>
          <Text style={styles.subtitle}>Generado el: {new Date().toLocaleString("es-AR")}</Text>
        </View>

        {/* KPIs */}
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

        {/* Charts */}
        {charts?.lineChart && <Image src={charts.lineChart} style={styles.chartImage} />}
        {charts?.pieChart && <Image src={charts.pieChart} style={styles.chartImage} />}

        {/* Tabla */}
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 1 }]}>Cliente</Text>
            <Text style={[styles.col, { flex: 1.5 }]}>Evento</Text>
            <Text style={[styles.col, { flex: 1 }]}>Ubicación</Text>
            <Text style={[styles.col, { flex: 1 }]}>Fecha</Text>
          </View>
          {eventos.slice(0, 50).map((e, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.col, { flex: 1 }]}>{e.cliente}</Text>
              <Text style={[styles.col, { flex: 1.5 }]}>{e.evento}</Text>
              <Text style={[styles.col, { flex: 1 }]}>{e.ubicacion}</Text>
              <Text style={[styles.col, { flex: 1 }]}>{e.fecha}</Text>
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

  const totalEventos = eventos.length;
  const eventoFrecuente = eventos.reduce((acc, e) => {
    acc[e.evento] = (acc[e.evento] || 0) + 1;
    return acc;
  }, {});
  const topEvento = Object.entries(eventoFrecuente).sort((a, b) => b[1] - a[1])[0] || ["Sin datos", 0];

  const wsData = [
    ["Reporte de Monitoreo"],
    [`Generado el: ${new Date().toLocaleString("es-AR")}`],
    [],
    ["KPIs"],
    ["Total Eventos", totalEventos],
    ["Evento más frecuente", `${topEvento[0]} (${topEvento[1]} ocurrencias)`],
    [],
    ["Cliente", "Evento", "Ubicación", "Fecha", "Observación"],
    ...eventos.map((e) => [e.cliente, e.evento, e.ubicacion, e.fecha, e.observacion]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, `REPORTE_MONITOREO_${Date.now()}.xlsx`);
};

// ✅ Botón que hace las dos exportaciones
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
            onClick={() => generateExcel(eventos)} // ✅ Exporta Excel junto con PDF
          >
            {loading ? "Generando..." : "📄 PDF + 📊 Excel"}
          </button>
        )}
      </PDFDownloadLink>
    </div>
  );
}
