// src/components/ExportPDFExcel.jsx
import React, { useCallback, useState } from "react";
import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";

// ===== Estilos PDF =====
const styles = StyleSheet.create({
  page: { backgroundColor: "#fff", padding: 20, fontSize: 9, fontFamily: "Helvetica" },
  header: { textAlign: "center", marginBottom: 12, borderBottom: "2px solid #2563eb", paddingBottom: 6 },
  title: { fontSize: 16, fontWeight: "bold", color: "#2563eb" },
  subtitle: { fontSize: 9, color: "#555", marginTop: 2 },
  sectionTitle: { marginTop: 8, marginBottom: 6, fontSize: 12, fontWeight: "bold", color: "#111" },
  img: { width: 520, height: 260, marginBottom: 8, alignSelf: "center" },
  tableHeader: { flexDirection: "row", backgroundColor: "#2563eb", color: "#fff", padding: 4, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #ddd", paddingVertical: 3, paddingHorizontal: 2 },
  col: { flex: 1, fontSize: 8 },
  footer: { position: "absolute", bottom: 10, left: 20, right: 20, textAlign: "center", fontSize: 8, color: "#666" }
});

// ===== Helpers =====
const chunk = (arr, size) => { const out=[]; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; };
const safe = (v) => (v === undefined || v === null ? "" : String(v));

// === Captura un selector a imagen base64 (robusto) ===
async function captureAsImage(selector) {
  const originalEl = document.querySelector(selector);
  if (!originalEl) return null;

  originalEl.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
  await (document.fonts?.ready ?? Promise.resolve());
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const snapWith = async (useFO) => {
    const cs = getComputedStyle(originalEl);
    const widthPx = cs.width;
    const bg = "#ffffff";

    const canvas = await html2canvas(originalEl, {
      scale: 2,
      backgroundColor: bg,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: useFO,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      onclone: (doc) => {
        const el = doc.querySelector(selector);
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "none";
        el.style.filter = "none";
        el.style.position = "static";
        el.style.overflow = "visible";
        el.style.contain = "none";
        el.style.width = widthPx;
        el.style.maxWidth = "none";
        el.style.background = bg;
        let p = el.parentElement;
        for (let i = 0; i < 5 && p; i++) {
          const pcs = doc.defaultView.getComputedStyle(p);
          p.style.opacity = "1";
          p.style.transform = "none";
          p.style.filter = "none";
          p.style.position = (pcs.position === "sticky") ? "static" : pcs.position;
          p.style.overflow = "visible";
          p.style.contain = "none";
          p = p.parentElement;
        }
      },
    });
    return canvas;
  };

  try {
    const c1 = await snapWith(false);
    if (c1 && c1.width > 50 && c1.height > 50) return c1.toDataURL("image/png");
  } catch {}

  try {
    const c2 = await snapWith(true);
    if (c2 && c2.width > 50 && c2.height > 50) return c2.toDataURL("image/png");
  } catch {}

  // Fallback: clonar fuera de pantalla
  const portal = document.createElement("div");
  portal.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;display:block;z-index:-1;";
  const clone = originalEl.cloneNode(true);
  clone.style.width = getComputedStyle(originalEl).width;
  clone.style.transform = "none";
  clone.style.opacity = "1";
  clone.style.filter = "none";
  clone.style.overflow = "visible";
  portal.appendChild(clone);
  document.body.appendChild(portal);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: false,
    });
    return canvas?.toDataURL("image/png") ?? null;
  } finally {
    document.body.removeChild(portal);
  }
}

// === Captura múltiples selectores (A NIVEL MÓDULO) ===
async function captureAll(selectors) {
  const imgs = [];
  for (const sel of selectors) {
    try {
      const img = await captureAsImage(sel);
      if (img) imgs.push(img);
    } catch (e) {
      console.error("captureAll error en", sel, e);
    }
  }
  return imgs;
}

// ===== Documento PDF =====
const ReportDocument = ({ eventos, capturedImages }) => {
  const totalEventos = eventos.length;
  const eventoFrecuente = eventos.reduce((acc, e) => {
    const key = e.evento || "Sin Evento";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topEvento = Object.entries(eventoFrecuente).sort((a,b)=>b[1]-a[1])[0] || ["Sin datos", 0];

  const rows = eventos.map((e) => ({
    cliente: safe(e.cliente),
    evento: safe(e.evento),
    ubicacion: safe(e.ubicacion || e.edificio),
    fecha: safe(e.fecha),
    observacion: safe(e.observacion ?? e["observaciones-edificios"] ?? e[`observaciones-${(e?.cliente||"").toLowerCase()}`]),
    razones: safe(e["razones-pma"] ?? e["razones_pma"] ?? e["razonesPma"] ?? e.razones),
    resolucion: safe(e["resolusion-evento"] ?? e["resolucion-evento"] ?? e.resolucion ?? e.resolucionEvento ?? e.resolusionEvento),
    respuesta: safe(e["respuesta-residente"] ?? e.respuesta),
  }));
  const tablePages = chunk(rows, 30);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Monitoreo</Text>
          <Text style={styles.subtitle}>Generado el: {new Date().toLocaleString("es-AR")}</Text>
        </View>

        <Text style={styles.sectionTitle}>KPI</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ width: "32%", textAlign: "center", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}>
            <Text>Total Eventos</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>{totalEventos}</Text>
          </View>
          <View style={{ width: "32%", textAlign: "center", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}>
            <Text>Evento más frecuente</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>{safe(topEvento[0])}</Text>
          </View>
          <View style={{ width: "32%", textAlign: "center", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}>
            <Text>Ocur. top</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>{safe(topEvento[1])}</Text>
          </View>
        </View>

        {capturedImages.kpi && (
          <>
            <Text style={styles.sectionTitle}>KPI (Tarjetas)</Text>
            <Image src={capturedImages.kpi} style={styles.img} />
          </>
        )}

        {capturedImages.edificio && (
          <>
            <Text style={styles.sectionTitle}>Estadística Edificios</Text>
            <Image src={capturedImages.edificio} style={styles.img} />
          </>
        )}

        {capturedImages.pma && (
          <>
            <Text style={styles.sectionTitle}>Analítica Detallada (PMA)</Text>
            <Image src={capturedImages.pma} style={styles.img} />
          </>
        )}

        {capturedImages.charts?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Gráficos</Text>
            {capturedImages.charts.map((src, i) => (
              <Image key={i} src={src} style={styles.img} />
            ))}
          </>
        )}

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      {tablePages.map((pageRows, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Tabla de eventos (pág. {idx + 1})</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 0.7 }]}>Cliente</Text>
            <Text style={[styles.col, { flex: 1.1 }]}>Evento</Text>
            <Text style={[styles.col, { flex: 1.1 }]}>Ubicación</Text>
            <Text style={[styles.col, { flex: 0.9 }]}>Fecha</Text>
            <Text style={[styles.col, { flex: 1.2 }]}>Observación</Text>
            <Text style={[styles.col, { flex: 1.1 }]}>Razones</Text>
            <Text style={[styles.col, { flex: 1.1 }]}>Resolución</Text>
            <Text style={[styles.col, { flex: 1.1 }]}>Respuesta</Text>
          </View>
          {pageRows.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.col, { flex: 0.7 }]}>{r.cliente}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.evento}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.ubicacion}</Text>
              <Text style={[styles.col, { flex: 0.9 }]}>{r.fecha}</Text>
              <Text style={[styles.col, { flex: 1.2 }]}>{r.observacion}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.razones}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.resolucion}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.respuesta}</Text>
            </View>
          ))}
          <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </Page>
      ))}
    </Document>
  );
};

// ===== Excel =====
const generateExcel = (eventos) => {
  if (!eventos?.length) return Swal.fire("Aviso", "No hay datos para exportar.", "warning");
  const header = ["Cliente","Evento","Ubicación","Fecha","Observación","Razones","Resolución","Respuesta"];
  const rows = eventos.map(e => ([
    e.cliente || "",
    e.evento || "",
    e.ubicacion || e.edificio || "",
    e.fecha || "",
    e.observacion ?? e["observaciones-edificios"] ?? e[`observaciones-${(e?.cliente||"").toLowerCase()}`] ?? "",
    e["razones-pma"] ?? e["razones_pma"] ?? e["razonesPma"] ?? e.razones ?? "",
    e["resolusion-evento"] ?? e["resolucion-evento"] ?? e.resolucion ?? e.resolucionEvento ?? e.resolusionEvento ?? "",
    e["respuesta-residente"] ?? e.respuesta ?? "",
  ]));
  const wsData = [
    ["Reporte de Monitoreo"],
    [`Generado el: ${new Date().toLocaleString("es-AR")}`],
    [],
    header,
    ...rows,
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 26 }, { wch: 20 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, `REPORTE_MONITOREO_${Date.now()}.xlsx`);
};

// ===== Componente exportador =====
export default function ExportPDF({ eventos }) {
  const [capturedImages, setCapturedImages] = useState({ kpi:null, edificio:null, pma:null, charts:[] });

  const doCapture = useCallback(async () => {
    const kpi = await captureAsImage("#kpi-cards");
    const edificio = await captureAsImage("#edificio-stats-capture");
    const pma = await captureAsImage("#analitica-pma-capture");

    const charts = await captureAll([
      "#charts-capture",
      "#mini-charts-capture",
      "#line-analytics-capture",
    ]);

    setCapturedImages({ kpi, edificio, pma, charts });
    return { kpi, edificio, pma, charts };
  }, []);

  const handleExport = useCallback(async () => {
    try {
      if (!eventos?.length) {
        await Swal.fire("Aviso", "No hay datos para exportar.", "warning");
        return;
      }
      const imgs = await doCapture();
      const doc = <ReportDocument eventos={eventos} capturedImages={imgs} />;
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `REPORTE_MONITOREO_${Date.now()}.pdf`);
      generateExcel(eventos);
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire("Error", String(err?.message || err || "Fallo exportando el PDF/Excel."), "error");
    }
  }, [doCapture, eventos]);

  return (
    <div className="report-button-container" style={{ display: "flex", gap: 10 }}>
      <button
        type="button"
        className="btn-primary"
        onClick={handleExport}
        style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "#fff", fontWeight: 600 }}
      >
        📄 PDF + 📊 Excel
      </button>
    </div>
  );
}
