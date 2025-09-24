import React, { useCallback, useMemo, useState } from "react";
import { Document, Page, Text, View, StyleSheet, Image, pdf, Link } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";

/* ===== Estilos PDF ===== */
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

/* ===== Helpers ===== */
const chunk = (arr, size) => { const out=[]; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; };
const safe = (v) => (v === undefined || v === null ? "" : String(v));
const getClienteLower = (row) =>
  (row?.cliente || (row?.edificio ? "Edificios" : "otros")).toString().toLowerCase();
const getEventoTitulo = (row) => row?.evento ?? row?.["evento-edificio"] ?? "";
const getUbicacionDisplay = (row) => row?.ubicacion || row?.edificio || "";
const getObservacion = (row) =>
  row?.observacion ??
  row?.["observaciones-edificios"] ??
  row?.[`observaciones-${getClienteLower(row)}`] ??
  "";
const safeUrl = (u) => {
  if (!u || typeof u !== "string") return null;
  try { const url = new URL(u); return (url.protocol === "http:" || url.protocol === "https:") ? url.href : null; }
  catch { return null; }
};
/* NUEVO: primera URL dentro de un texto (observación) */
const firstUrlInText = (txt) => {
  if (!txt) return "";
  const m = String(txt).match(/https?:\/\/[^\s)]+/i);
  return m ? (safeUrl(m[0]) || "") : "";
};

const getResolucion = (row) =>
  row?.["resolusion-evento"] ??
  row?.["resolucion-evento"] ??
  row?.resolucion ??
  row?.resolucionEvento ??
  row?.resolusionEvento ??
  "";
const getRespuestaResidente = (row) => row?.["respuesta-residente"] ?? row?.respuesta ?? "";
const getRazones = (row) =>
  row?.["razones-pma"] ?? row?.["razones_pma"] ?? row?.["razonesPma"] ?? row?.razones ?? "";
const isEdificioRow = (row) => {
  const cl = (row?.cliente || "").toString().trim().toUpperCase();
  if (cl.includes("EDIFICIO")) return true;
  if (row?.edificio) return true;
  return getClienteLower(row) === "edificios";
};
const formatDateValue = (row) => {
  const v =
    row?.fechaObj ||
    (row?.fecha instanceof Date ? row.fecha : new Date(row?.fecha ?? row?.fechaHoraEnvio));
  if (!(v instanceof Date) || isNaN(v)) return "";
  return v.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};
const dateMs = (row) => {
  const v =
    row?.fechaObj ||
    (row?.fecha instanceof Date ? row.fecha : new Date(row?.fecha ?? row?.fechaHoraEnvio));
  return v instanceof Date && !isNaN(v) ? v.getTime() : 0;
};
const sig = (e) => e?.id ?? `${e?.cliente ?? ""}|${getEventoTitulo(e)}|${e?.fecha ?? e?.fechaHoraEnvio ?? ""}`;

/* ===== Capturas (opcional: KPI/gráficos del dashboard) ===== */
async function captureAsImage(selector, opts = {}) {
  const { scale = Math.max(3, (window.devicePixelRatio || 1) * 2), format = "png", quality = 0.92, bg = "#ffffff" } = opts;
  const originalEl = document.querySelector(selector);
  if (!originalEl) return null;
  await (document.fonts?.ready ?? Promise.resolve());
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const canvas = await html2canvas(originalEl, {
    scale, backgroundColor: bg, useCORS: true, allowTaint: true, foreignObjectRendering: false,
  });
  return canvas
    ? { src: (format === "jpeg") ? canvas.toDataURL("image/jpeg", quality) : canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height }
    : null;
}
async function captureAll(selectors, opts = {}) {
  const out = [];
  for (const sel of selectors) {
    try { const img = await captureAsImage(sel, opts); if (img) out.push(img); } catch {}
  }
  return out;
}
const fit = (img, maxW = 520, maxH = 300) => {
  const r = img.h / img.w; let w = maxW, h = w * r; if (h > maxH) { h = maxH; w = h / r; } return { w, h };
};

/* ===== Documento PDF ===== */
const ReportDocument = ({ eventos, capturedImages, observaciones }) => {
  const onlyEdificio = eventos.length > 0 && eventos.every(isEdificioRow);
  const totalEventos = eventos.length;
  const eventoFrecuente = eventos.reduce((acc, e) => {
    const k = getEventoTitulo(e) || "Sin Evento"; acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  const topEvento = Object.entries(eventoFrecuente).sort((a,b)=>b[1]-a[1])[0] || ["Sin datos", 0];

  const clientes = Array.from(new Set(eventos.map(e => (e.cliente || "").trim()).filter(Boolean)));
  const ubicaciones = Array.from(new Set(eventos.map(e => (getUbicacionDisplay(e) || "").trim()).filter(Boolean)));
  const listify = (arr, max = 4) => !arr.length ? "—" : (arr.length <= max ? arr.join(", ") : `${arr.slice(0,max).join(", ")} (+${arr.length-max} más)`);

  /* MODIFICADO: observación primero y link desde varias fuentes o desde la observación */
  const baseRow = (e) => {
    const observacion = safe(getObservacion(e));
    const linkField = e.linkDrive || e.link || e["link-drive"] || e["link_drive"] || "";
    const linkDrive = safeUrl(linkField) || firstUrlInText(observacion) || "";
    return {
      cliente: safe(e.cliente),
      evento: safe(getEventoTitulo(e)),
      ubicacion: safe(getUbicacionDisplay(e)),
      fecha: safe(formatDateValue(e)),
      observacion,
      linkDrive
    };
  };

  const extraRow = (e) => ({
    razones: safe(getRazones(e)),
    resolucion: safe(getResolucion(e)),
    respuesta: safe(getRespuestaResidente(e)),
  });

  const rows = eventos.map((e) => onlyEdificio ? { ...baseRow(e), ...extraRow(e) } : baseRow(e));

  const joinFirstPage = (observaciones?.trim().length || 0) <= 280;
  const fitFirst = (img) => fit(img, 520, joinFirstPage ? 220 : 280);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Monitoreo</Text>
          <Text style={styles.subtitle}>Generado el: {new Date().toLocaleString("es-AR")}</Text>
        </View>

        <View style={{ border: "1px solid #e5e7eb", borderRadius: 4, padding: 8, marginTop: 6, marginBottom: 8, backgroundColor: "#f9fafb" }}>
          <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: "bold" }}>Cliente(s): </Text>{listify(clientes)}</Text>
          <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: "bold" }}>Edificio(s) / Ubicación(es): </Text>{listify(ubicaciones, 6)}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 6 }}>
          {[
            { label: "Total Eventos", value: totalEventos },
            { label: "Evento más frecuente", value: safe(topEvento[0]) },
          ].map((k, i) => (
            <View key={i} style={{ flexGrow: 1, border: "1px solid #ddd", borderRadius: 6, padding: 8, textAlign: "center" }}>
              <Text style={{ fontSize: 9, marginBottom: 2 }}>{k.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold" }}>{k.value}</Text>
            </View>
          ))}
        </View>

        {observaciones?.trim() ? (
          <View style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8, marginTop: 8, backgroundColor: "#fffbea" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4, color: "#92400e" }}>Observaciones</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.35 }}>{observaciones}</Text>
          </View>
        ) : null}

        {capturedImages.kpi && (
          <>
            <Text style={styles.sectionTitle}>KPI (Tarjetas visuales)</Text>
            {(() => { const s = fit(capturedImages.kpi, 520, 200); return <Image src={capturedImages.kpi.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />; })()}
          </>
        )}

        {joinFirstPage && capturedImages.edificio && (
          <>
            <Text style={styles.sectionTitle}>Estadística</Text>
            {(() => { const s = fitFirst(capturedImages.edificio); return <Image src={capturedImages.edificio.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />; })()}
          </>
        )}

        {joinFirstPage && capturedImages.pma && (
          <>
            <Text style={styles.sectionTitle}>Analítica Detallada</Text>
            {(() => { const s = fitFirst(capturedImages.pma); return <Image src={capturedImages.pma.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />; })()}
          </>
        )}

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      {!joinFirstPage && (capturedImages.edificio || capturedImages.pma) && (
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

      {(capturedImages.charts || []).length > 0 &&
        chunk(capturedImages.charts, 2).map((chunkImgs, idx) => (
          <Page key={`charts-${idx}`} size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>Gráficos{idx ? " (cont.)" : ""}</Text>
            {chunkImgs.map((img, i) => {
              const s = fit(img, 520, 300);
              return <Image key={i} src={img.src} style={{ width: s.w, height: s.h, alignSelf: "center", marginBottom: 8 }} />;
            })}
            <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
          </Page>
        ))
      }

      {chunk(rows, 30).map((pageRows, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Tabla de eventos (pág. {idx + 1})</Text>

          {/* Leyenda SOLO para Edificios y SOLO en la primera página de la tabla */}
          {onlyEdificio && idx === 0 && (
            <View style={{ backgroundColor: "#f1f5f9", borderRadius: 6, borderWidth: 1, borderColor: "#e5e7eb", padding: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>Leyenda de eventos</Text>
              <Text style={{ fontSize: 9, marginBottom: 2 }}>
                <Text style={{ fontWeight: "bold" }}>Puertas Mantenidas Abiertas:</Text> la puerta permaneció abierta más tiempo del permitido.
              </Text>
              <Text style={{ fontSize: 9, marginBottom: 2 }}>
                <Text style={{ fontWeight: "bold" }}>Puertas Forzadas:</Text> apertura sin autorización/lectura válida; el sistema detecta apertura sin evento de acceso.
              </Text>
              <Text style={{ fontSize: 9, marginBottom: 2 }}>
                <Text style={{ fontWeight: "bold" }}>Evento - Encargado:</Text> Evento registrado por el personal del edificio (Puertas Mantenidas Abiertas).
              </Text>
              <Text style={{ fontSize: 9 }}>
                <Text style={{ fontWeight: "bold" }}>CCTV fuera de línea:</Text> cámara o NVR sin comunicación (posible corte de energía/red o falla de equipo).
              </Text>
            </View>
          )}

          {/* Header de la tabla */}
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 0.7 }]}>Cliente</Text>
            <Text style={[styles.col, { flex: 1.1 }]}>Evento</Text>
            <Text style={[styles.col, { flex: 1.1 }]}>Ubicación</Text>
            <Text style={[styles.col, { flex: 0.9 }]}>Fecha</Text>
            <Text style={[styles.col, { flex: 1.2 }]}>Observación</Text>
            {onlyEdificio && (
              <>
                <Text style={[styles.col, { flex: 1.1 }]}>Razones</Text>
                <Text style={[styles.col, { flex: 1.1 }]}>Resolución</Text>
                <Text style={[styles.col, { flex: 1.1 }]}>Respuesta</Text>
              </>
            )}
          </View>

          {/* Filas */}
          {pageRows.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.col, { flex: 0.7 }]}>{r.cliente}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.evento}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.ubicacion}</Text>
              <Text style={[styles.col, { flex: 0.9 }]}>{r.fecha}</Text>

              {/* Observación + link (AHORA SIEMPRE muestra link si existe) */}
              <View style={[styles.col, { flex: 1.2 }]}>
                <Text>{r.observacion}</Text>
                {r.linkDrive ? (
                  <Link
                    src={r.linkDrive}
                    style={{ color: "#2563eb", textDecoration: "underline", marginTop: 2 }}
                  >
                    Imágenes (Drive)
                  </Link>
                ) : null}
              </View>

              {onlyEdificio && (
                <>
                  <Text style={[styles.col, { flex: 1.1 }]}>{r.razones}</Text>
                  <Text style={[styles.col, { flex: 1.1 }]}>{r.resolucion}</Text>
                  <Text style={[styles.col, { flex: 1.1 }]}>{r.respuesta}</Text>
                </>
              )}
            </View>
          ))}

          <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </Page>
      ))}
    </Document>
  );
};

/* ===== Excel (mismo dataset) ===== */
const generateExcel = (eventos) => {
  if (!eventos?.length) return Swal.fire("Aviso", "No hay datos para exportar.", "warning");
  const onlyEdificio = eventos.length > 0 && eventos.every(isEdificioRow);

  /* MODIFICADO: el link va SIEMPRE en base, y extra ya no lo incluye */
  const headerBase = ["Cliente","Evento","Ubicación","Fecha","Observación","Link (Drive)"];
  const headerExtra = ["Razones","Resolución","Respuesta"];
  const header = onlyEdificio ? [...headerBase, ...headerExtra] : headerBase;

  const rowBase = (e) => {
    const observacion = getObservacion(e) || "";
    const linkField = e.linkDrive || e.link || e["link-drive"] || e["link_drive"] || "";
    const linkDrive = safeUrl(linkField) || firstUrlInText(observacion) || "";
    return [
      e.cliente || "",
      getEventoTitulo(e) || "",
      getUbicacionDisplay(e) || "",
      formatDateValue(e) || "",
      observacion,
      linkDrive,
    ];
  };
  const rowExtra = (e) => ([
    getRazones(e) || "",
    getResolucion(e) || "",
    getRespuestaResidente(e) || "",
  ]);

  const rows = eventos.map(e => onlyEdificio ? [...rowBase(e), ...rowExtra(e)] : rowBase(e));

  const wsData = [
    ["Reporte de Monitoreo"],
    [`Generado el: ${new Date().toLocaleString("es-AR")}`],
    [],
    header,
    ...rows,
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 18 }, { wch: 28 }, { wch: 26 }, { wch: 20 }, { wch: 40 }, { wch: 40 },
    ...(onlyEdificio ? [{ wch: 24 }, { wch: 24 }, { wch: 24 }] : [])
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, `REPORTE_MONITOREO_${Date.now()}.xlsx`);
};

/* ===== ExportPDF: usa eventos del padre, con fallback seguro al subconjunto visible ===== */
export default function ExportPDF({ eventos }) {
  const [capturedImages, setCapturedImages] = useState({ kpi:null, edificio:null, pma:null, charts:[] });

  // 1) Array que te pasa el padre
  const propArray = Array.isArray(eventos) ? eventos : [];

  // 2) Si la tabla dejó una copia global, y es MÁS CHICA, usamos exactamente ese subconjunto
  const dataset = useMemo(() => {
    const fromWindow = Array.isArray(window.__FILTERED_EVENTOS__) ? window.__FILTERED_EVENTOS__ : [];
    if (!fromWindow.length) {
      return propArray.slice().sort((a,b) => dateMs(b) - dateMs(a));
    }
    const winIds = new Set(fromWindow.map(sig));
    const filtered = propArray.filter(e => winIds.has(sig(e)));
    const base = filtered.length ? filtered : fromWindow;
    return base.slice().sort((a,b) => dateMs(b) - dateMs(a));
  }, [propArray]);

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
      heightAuto: false,
    });
    return isConfirmed ? (value || "") : "";
  }, []);

  const doCapture = useCallback(async () => {
    const kpi = await captureAsImage("#kpi-cards", { scale: 3 });
    const edificio = await captureAsImage("#edificio-stats-capture", { scale: 3 });
    const pma = await captureAsImage("#analitica-pma-capture", { scale: 3 });
    const charts = await captureAll(["#charts-capture", "#mini-charts-capture", "#line-analytics-capture"], { scale: 4, format: "jpeg", quality: 0.9 });
    const imgs = { kpi, edificio, pma, charts };
    setCapturedImages(imgs);
    return imgs;
  }, []);

  const handleExport = useCallback(async () => {
    try {
      if (!dataset.length) {
        await Swal.fire("Aviso", "No hay datos para exportar.", "warning");
        return;
      }
      const observaciones = await askObservaciones();
      const imgs = await doCapture();

      const doc = <ReportDocument eventos={dataset} capturedImages={imgs} observaciones={observaciones} />;
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `REPORTE_MONITOREO_${Date.now()}.pdf`);

      generateExcel(dataset);
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire("Error", String(err?.message || err || "Fallo exportando el PDF/Excel."), "error");
    }
  }, [askObservaciones, doCapture, dataset]);

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
