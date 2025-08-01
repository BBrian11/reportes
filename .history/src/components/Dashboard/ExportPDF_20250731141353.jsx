import React from "react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#fff",
    padding: 20,
    fontSize: 12,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
    borderBottom: "2px solid #2563eb",
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#2563eb" },
  subtitle: { fontSize: 12, color: "#555", marginTop: 4 },
  kpiContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 5,
  },
  kpiCard: { width: "30%", textAlign: "center" },
  kpiValue: { fontSize: 16, fontWeight: "bold", color: "#111" },
  chartImage: { width: 500, height: 250, marginBottom: 20, alignSelf: "center" },
  tableHeader: { flexDirection: "row", backgroundColor: "#2563eb", color: "#fff", padding: 5, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #ccc", padding: 4 },
  col: { flex: 1, fontSize: 10 },
});

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
        {charts?.barChart && <Image src={charts.barChart} style={styles.chartImage} />}
        {charts?.lineChart && <Image src={charts.lineChart} style={styles.chartImage} />}

        {/* ✅ Tabla */}
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

export default function ExportPDF({ eventos, charts }) {
  return (
    <div className="report-button-container">
      <PDFDownloadLink
        document={<ReportDocument eventos={eventos} charts={charts} />}
        fileName={`REPORTE_MONITOREO_${Date.now()}.pdf`}
      >
        {({ loading }) => (
          <button className="btn-primary">{loading ? "Generando..." : "📄 Generar Reporte"}</button>
        )}
      </PDFDownloadLink>
    </div>
  );
}
