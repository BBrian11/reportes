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
  tableHeader: { flexDirection: "row", backgroundColor: "#2563eb", color: "#fff", padding: 4, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #ddd", paddingVertical: 3, paddingHorizontal: 2 },
  col: { flex: 1, fontSize: 8 },
  footer: { position: "absolute", bottom: 10, left: 20, right: 20, textAlign: "center", fontSize: 8, color: "#666" }
});

// ===== Helpers =====
const chunk = (arr, size) => { const out=[]; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; };
const safe = (v) => (v === undefined || v === null ? "" : String(v));

// === Captura DOM a imagen base64 con alta resolución ===
async function captureAsImage(selector, opts = {}) {
  const {
    scale = Math.max(3, (window.devicePixelRatio || 1) * 2),
    format = "png",
    quality = 0.92,
    bg = "#ffffff",
  } = opts;

  const originalEl = document.querySelector(selector);
  if (!originalEl) return null;

  originalEl.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
  await (document.fonts?.ready ?? Promise.resolve());
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const snapWith = async (useFO) => {
    const cs = getComputedStyle(originalEl);
    const widthPx = cs.width;
    const canvas = await html2canvas(originalEl, {
      scale, backgroundColor: bg, useCORS: true, allowTaint: true, foreignObjectRendering: useFO,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      onclone: (doc) => {
        const el = doc.querySelector(selector);
        if (!el) return;
        el.style.opacity = "1"; el.style.transform = "none"; el.style.filter = "none";
        el.style.position = "static"; el.style.overflow = "visible"; el.style.contain = "none";
        el.style.width = widthPx; el.style.maxWidth = "none"; el.style.background = bg;
      },
    });
    return canvas;
  };

  const toData = (canvas) => ({
    src: (opts.format === "jpeg")
      ? canvas.toDataURL("image/jpeg", opts.quality ?? 0.92)
      : canvas.toDataURL("image/png"),
    w: canvas.width,
    h: canvas.height
  });

  try { const c1 = await snapWith(false); if (c1?.width > 50 && c1?.height > 50) return toData(c1); } catch {}
  try { const c2 = await snapWith(true);  if (c2?.width > 50 && c2?.height > 50) return toData(c2); } catch {}

  // Fallback fuera de pantalla
  const portal = document.createElement("div");
  portal.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;display:block;z-index:-1;";
  const clone = originalEl.cloneNode(true);
  clone.style.width = getComputedStyle(originalEl).width;
  clone.style.transform = "none"; clone.style.opacity = "1"; clone.style.filter = "none"; clone.style.overflow = "visible";
  portal.appendChild(clone); document.body.appendChild(portal);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    const canvas = await html2canvas(clone, { scale, backgroundColor: bg, useCORS: true, allowTaint: true, foreignObjectRendering: false });
    return canvas ? toData(canvas) : null;
  } finally { document.body.removeChild(portal); }
}

async function captureAll(selectors, opts = {}) {
  const out = [];
  for (const sel of selectors) {
    try { const img = await captureAsImage(sel, opts); if (img) out.push(img); }
    catch (e) { console.error("captureAll error en", sel, e); }
  }
  return out;
}

// ===== Utils de layout =====
const fit = (img, maxW = 520, maxH = 300) => {
  const r = img.h / img.w;
  let w = maxW, h = w * r;
  if (h > maxH) { h = maxH; w = h / r; }
  return { w, h };
};

// ===== Documento PDF =====
const ReportDocument = ({ eventos, capturedImages, observaciones }) => {
  const totalEventos = eventos.length;
  const eventoFrecuente = eventos.reduce((acc, e) => {
    const k = e.evento || "Sin Evento"; acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  const topEvento = Object.entries(eventoFrecuente).sort((a,b)=>b[1]-a[1])[0] || ["Sin datos", 0];

  // Contexto
  const clientes = Array.from(new Set(eventos.map(e => (e.cliente || "").trim()).filter(Boolean)));
  const ubicaciones = Array.from(new Set(eventos.map(e => (e.ubicacion || e.edificio || "").trim()).filter(Boolean)));
  const listify = (arr, max = 4) => !arr.length ? "—" : (arr.length <= max ? arr.join(", ") : `${arr.slice(0,max).join(", ")} (+${arr.length-max} más)`);

  // Tabla
  const rows = eventos.map((e) => ({
    cliente: safe(e.cliente), evento: safe(e.evento),
    ubicacion: safe(e.ubicacion || e.edificio), fecha: safe(e.fecha),
    observacion: safe(e.observacion ?? e["observaciones-edificios"] ?? e[`observaciones-${(e?.cliente||"").toLowerCase()}`]),
    razones: safe(e["razones-pma"] ?? e["razones_pma"] ?? e["razonesPma"] ?? e.razones),
    resolucion: safe(e["resolusion-evento"] ?? e["resolucion-evento"] ?? e.resolucion ?? e.resolucionEvento ?? e.resolusionEvento),
    respuesta: safe(e["respuesta-residente"] ?? e.respuesta),
  }));
  const tablePages = chunk(rows, 30);

  const chartsChunks = chunk(capturedImages.charts || [], 2);
  const joinFirstPage =
  (observaciones?.trim().length || 0) <= 280; // umbral ajustable

// helper para tamaños distintos según la página
const fitFirst = (img) => fit(img, 520, joinFirstPage ? 220 : 280);

  return (
    <Document>
    {/* ===== PÁGINA 1 ===== */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Reporte de Monitoreo</Text>
        <Text style={styles.subtitle}>Generado el: {new Date().toLocaleString("es-AR")}</Text>
      </View>
  
      {/* CONTEXTO */}
      <View style={{ border: "1px solid #e5e7eb", borderRadius: 4, padding: 8, marginTop: 6, marginBottom: 8, backgroundColor: "#f9fafb" }}>
        <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4, color: "#111827" }}>Contexto</Text>
        <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: "bold" }}>Cliente(s): </Text>{listify(clientes)}</Text>
        <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: "bold" }}>Edificio(s) / Ubicación(es): </Text>{listify(ubicaciones, 6)}</Text>
      </View>
  
      {/* KPI Nativos */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[
          { label: "Total Eventos", value: totalEventos },
          { label: "Evento más frecuente", value: safe(topEvento[0]) },
          { label: "Cantidad de PMA", value: safe(topEvento[1]) },
        ].map((k, i) => (
          <View key={i} style={{ flexGrow: 1, border: "1px solid #ddd", borderRadius: 6, padding: 8, textAlign: "center" }}>
            <Text style={{ fontSize: 9, marginBottom: 2 }}>{k.label}</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>{k.value}</Text>
          </View>
        ))}
      </View>
  
      {/* Observaciones */}
      {observaciones?.trim() ? (
        <View style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8, marginTop: 8, backgroundColor: "#fffbea" }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4, color: "#92400e" }}>Observaciones</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.35 }}>{observaciones}</Text>
        </View>
      ) : null}
  
      {/* OPCIONAL: Tarjetas KPI como imagen */}
      {capturedImages.kpi && (
        <>
          <Text style={styles.sectionTitle}>KPI (Tarjetas visuales)</Text>
          {(() => { const s = fit(capturedImages.kpi, 520, 200); return <Image src={capturedImages.kpi.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />; })()}
        </>
      )}
  
      {/* ⬇️ NUEVO: si hay espacio, subo Edificios + PMA a esta misma página */}
      {joinFirstPage && (
        <>
          {capturedImages.edificio && (
            <>
              <Text style={styles.sectionTitle}>Estadística Edificios</Text>
              {(() => { const s = fitFirst(capturedImages.edificio); return <Image src={capturedImages.edificio.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />; })()}
            </>
          )}
          {capturedImages.pma && (
            <>
              <Text style={styles.sectionTitle}>Analítica Detallada (PMA)</Text>
              {(() => { const s = fitFirst(capturedImages.pma); return <Image src={capturedImages.pma.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />; })()}
            </>
          )}
        </>
      )}
  
      <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
    </Page>
  
    {/* ===== PÁGINA 2 (solo si NO subimos Edificios/PMA) ===== */}
    {!joinFirstPage && (
      <Page size="A4" style={styles.page}>
        {capturedImages.edificio && (
          <>
            <Text style={styles.sectionTitle}>Estadística Edificios</Text>
            {(() => { const s = fit(capturedImages.edificio, 520, 300); return <Image src={capturedImages.edificio.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />; })()}
          </>
        )}
        {capturedImages.pma && (
          <>
            <Text style={styles.sectionTitle}>Analítica Detallada (PMA)</Text>
            {(() => { const s = fit(capturedImages.pma, 520, 300); return <Image src={capturedImages.pma.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />; })()}
          </>
        )}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    )}
  
    {/* Gráficos (2 por página) */}
    {chartsChunks.map((chunkImgs, idx) => (
      <Page key={`charts-${idx}`} size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Gráficos{idx ? " (cont.)" : ""}</Text>
        {chunkImgs.map((img, i) => {
          const s = fit(img, 520, 300);
          return <Image key={i} src={img.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />;
        })}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    ))}

      {/* TABLAS */}
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

  // 🔸 NUEVO: pedir observaciones antes de exportar
  const askObservaciones = useCallback(async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: "Agregar observaciones",
      input: "textarea",
      inputLabel: "Se imprimirá debajo de los KPI",
      inputPlaceholder: "Escribe aquí tus observaciones...",
      inputAttributes: { "aria-label": "Observaciones" },
      confirmButtonText: "Usar en PDF",
      cancelButtonText: "Omitir",
      showCancelButton: true,
      heightAuto: false, // evita saltos en móviles
    });
    return isConfirmed ? (value || "") : "";
  }, []);

  const doCapture = useCallback(async () => {
    const kpi = await captureAsImage("#kpi-cards", { scale: 3 });
    const edificio = await captureAsImage("#edificio-stats-capture", { scale: 3 });
    const pma = await captureAsImage("#analitica-pma-capture", { scale: 3 });
    const charts = await captureAll(
      ["#charts-capture", "#mini-charts-capture", "#line-analytics-capture"],
      { scale: 4, format: "jpeg", quality: 0.9 }
    );
    const imgs = { kpi, edificio, pma, charts };
    setCapturedImages(imgs);
    return imgs;
  }, []);

  const handleExport = useCallback(async () => {
    try {
      if (!eventos?.length) {
        await Swal.fire("Aviso", "No hay datos para exportar.", "warning");
        return;
      }

      // 1) Pide Observaciones
      const observaciones = await askObservaciones();

      // 2) Capturas HD
      const imgs = await doCapture();

      // 3) Genera PDF con Observaciones
      const doc = <ReportDocument eventos={eventos} capturedImages={imgs} observaciones={observaciones} />;
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `REPORTE_MONITOREO_${Date.now()}.pdf`);

      // 4) Excel
      generateExcel(eventos);
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire("Error", String(err?.message || err || "Fallo exportando el PDF/Excel."), "error");
    }
  }, [askObservaciones, doCapture, eventos]);

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
