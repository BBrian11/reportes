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
  footer: { position: "absolute", bottom: 10, left: 20, right: 20, textAlign: "center", fontSize: 8, color: "#666" },
});

/* ===== Helpers ===== */
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};
const safe = (v) => (v === undefined || v === null ? "" : String(v));
const getClienteLower = (row) => (row?.cliente || (row?.edificio ? "Edificios" : "otros")).toString().toLowerCase();
const getEventoTitulo = (row) => row?.evento ?? row?.["evento-edificio"] ?? "";
const getUbicacionDisplay = (row) => row?.ubicacion || row?.edificio || "";
const getObservacion = (row) =>
  row?.observacion ?? row?.["observaciones-edificios"] ?? row?.[`observaciones-${getClienteLower(row)}`] ?? "";

  const safeUrl = (u) => {
    if (!u || typeof u !== "string") return null;
    try {
      const url = new URL(u);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };
  
  // Limpia URLs pegadas con ',', '.', ')', ']' etc + soporta "www."
  const normalizeUrl = (raw) => {
    if (!raw) return "";
    let s = String(raw).trim();
    if (!s) return "";
  
    // soporta www.
    if (/^www\./i.test(s)) s = `https://${s}`;
  
    // saca envoltorios típicos
    s = s.replace(/^[('"“‘<\[]+/, "");
    s = s.replace(/[)"”’>\]]+$/, "");
  
    // saca puntuación final que rompe URL
    s = s.replace(/[.,;:!?]+$/g, "");
  
    return safeUrl(s) || "";
  };
  
  // Primera URL encontrada en un texto (observación)
  const firstUrlInText = (txt) => {
    if (!txt) return "";
    const m = String(txt).match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    if (!m) return "";
    return normalizeUrl(m[0]);
  };
  


const getResolucion = (row) =>
  row?.["resolusion-evento"] ??
  row?.["resolucion-evento"] ??
  row?.resolucion ??
  row?.resolucionEvento ??
  row?.resolusionEvento ??
  "";

const getRespuestaResidente = (row) => row?.["respuesta-residente"] ?? row?.respuesta ?? "";
const getRazones = (row) => row?.["razones-pma"] ?? row?.["razones_pma"] ?? row?.["razonesPma"] ?? row?.razones ?? "";

const isEdificioRow = (row) => {
  const cl = (row?.cliente || "").toString().trim().toUpperCase();
  if (cl.includes("EDIFICIO")) return true;
  if (row?.edificio) return true;
  return getClienteLower(row) === "edificios";
};

const formatDateValue = (row) => {
  const v = row?.fechaObj || (row?.fecha instanceof Date ? row.fecha : new Date(row?.fecha ?? row?.fechaHoraEnvio));
  if (!(v instanceof Date) || isNaN(v)) return "";
  return v.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

const dateMs = (row) => {
  const v = row?.fechaObj || (row?.fecha instanceof Date ? row.fecha : new Date(row?.fecha ?? row?.fechaHoraEnvio));
  return v instanceof Date && !isNaN(v) ? v.getTime() : 0;
};

const sig = (e) => e?.id ?? `${e?.cliente ?? ""}|${getEventoTitulo(e)}|${e?.fecha ?? e?.fechaHoraEnvio ?? ""}`;

/* ===== Capturas: “pixel-trim” (recorta blanco real del canvas) ===== */
function parseHexColor(hex) {
  const h = String(hex || "").trim();
  if (!h) return { r: 255, g: 255, b: 255 };
  const v = h.startsWith("#") ? h.slice(1) : h;
  if (v.length === 3) {
    const r = parseInt(v[0] + v[0], 16);
    const g = parseInt(v[1] + v[1], 16);
    const b = parseInt(v[2] + v[2], 16);
    return { r, g, b };
  }
  if (v.length === 6) {
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return { r, g, b };
  }
  return { r: 255, g: 255, b: 255 };
}

function cropCanvas(canvas, sx, sy, sw, sh) {
  const out = document.createElement("canvas");
  out.width = Math.max(1, sw);
  out.height = Math.max(1, sh);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return out;
}

/**
 * Recorta bordes “vacíos” por pixel (contra bg).
 * - tol: tolerancia (cuanto más alto, más “permisivo” con blancos/claros)
 * - step: salta pixeles para velocidad (8/10 va muy bien en canvas grandes)
 */
function trimCanvasByBg(canvas, bgHex = "#ffffff", { paddingPx = 24, tol = 14, step = 10 } = {}) {
  const { r: br, g: bg, b: bb } = parseHexColor(bgHex);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;

  const isBg = (r, g, b, a) => {
    if (a < 6) return true; // transparente = fondo
    return Math.abs(r - br) <= tol && Math.abs(g - bg) <= tol && Math.abs(b - bb) <= tol;
  };

  for (let y = 0; y < h; y += step) {
    const row = y * w * 4;
    for (let x = 0; x < w; x += step) {
      const i = row + x * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2],
        a = data[i + 3];
      if (!isBg(r, g, b, a)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // si no encontró contenido, devolver original
  if (maxX < 0 || maxY < 0) return canvas;

  // padding y clamp
  const pad = Math.max(0, paddingPx);
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const ex = Math.min(w, maxX + pad);
  const ey = Math.min(h, maxY + pad);
  return cropCanvas(canvas, sx, sy, ex - sx, ey - sy);
}

async function captureAsImage(selector, opts = {}) {
  const {
    scale = Math.max(4, (window.devicePixelRatio || 1) * 2.5),
    format = "png",
    quality = 0.95,
    bg = "#ffffff",

    // ✅ la clave: pixel trim
    pixelTrim = true,
    trimPaddingPx = 28,
    trimTol = 14,
    trimStep = 10,
  } = opts;

  const el = document.querySelector(selector);
  if (!el) return null;

  await (document.fonts?.ready ?? Promise.resolve());
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 80));

  const rect = el.getBoundingClientRect();

  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: bg,
    useCORS: true,
    allowTaint: true,
    logging: false,
    removeContainer: true,

    scrollX: -window.scrollX,
    scrollY: -window.scrollY,

    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),

    onclone: (doc) => {
      doc.documentElement.style.background = bg;
      doc.body.style.background = bg;

      // (opcional pero ayuda) apagar efectos visuales
      const cloneEl = doc.querySelector(selector);
      if (cloneEl) {
        cloneEl.style.transform = "none";
        cloneEl.style.filter = "none";
        cloneEl.style.backdropFilter = "none";
        cloneEl.style.webkitBackdropFilter = "none";
      }
    },
  });

  const finalCanvas = pixelTrim
    ? trimCanvasByBg(canvas, bg, { paddingPx: trimPaddingPx, tol: trimTol, step: trimStep })
    : canvas;

  const src = format === "jpeg" ? finalCanvas.toDataURL("image/jpeg", quality) : finalCanvas.toDataURL("image/png");
  return { src, w: finalCanvas.width, h: finalCanvas.height };
}

async function captureAll(selectors, opts = {}) {
  const out = [];
  for (const sel of selectors) {
    try {
      const img = await captureAsImage(sel, opts);
      if (img) out.push(img);
    } catch {}
  }
  return out;
}

const fit = (img, maxW = 530, maxH = 700) => {
  const r = img.h / img.w;
  let w = maxW,
    h = w * r;
  if (h > maxH) {
    h = maxH;
    w = h / r;
  }
  return { w, h };
};

/* ===== Documento PDF ===== */
const ReportDocument = ({ eventos, capturedImages, observaciones }) => {
  const onlyEdificio = eventos.length > 0 && eventos.every(isEdificioRow);
  const totalEventos = eventos.length;

  const eventoFrecuente = eventos.reduce((acc, e) => {
    const k = getEventoTitulo(e) || "Sin Evento";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const topEvento = Object.entries(eventoFrecuente).sort((a, b) => b[1] - a[1])[0] || ["Sin datos", 0];

  const clientes = Array.from(new Set(eventos.map((e) => (e.cliente || "").trim()).filter(Boolean)));
  const ubicaciones = Array.from(new Set(eventos.map((e) => (getUbicacionDisplay(e) || "").trim()).filter(Boolean)));
  const listify = (arr, max = 4) =>
    !arr.length ? "—" : arr.length <= max ? arr.join(", ") : `${arr.slice(0, max).join(", ")} (+${arr.length - max} más)`;

  const baseRow = (e) => {
    const observacion = safe(getObservacion(e));
    const linkField = e.linkDrive || e.link || e["link-drive"] || e["link_drive"] || "";
    const linkDrive = normalizeUrl(linkField) || firstUrlInText(observacion) || "";

    return {
      cliente: safe(e.cliente),
      evento: safe(getEventoTitulo(e)),
      ubicacion: safe(getUbicacionDisplay(e)),
      fecha: safe(formatDateValue(e)),
      observacion,
      linkDrive,
    };
  };

  const extraRow = (e) => ({
    razones: safe(getRazones(e)),
    resolucion: safe(getResolucion(e)),
    respuesta: safe(getRespuestaResidente(e)),
  });

  const rows = eventos.map((e) => (onlyEdificio ? { ...baseRow(e), ...extraRow(e) } : baseRow(e)));

  // ✅ KPI en primera página, y Estadística/Analítica SIEMPRE en páginas dedicadas (para que se vean grandes)
  const Img = ({ img, maxW, maxH }) => {
    const s = fit(img, maxW, maxH);
    return (
      <Image
        src={img.src}
        style={{
          width: s.w,
          height: s.h,
          objectFit: "contain",
          alignSelf: "center",
          marginBottom: 8,
        }}
      />
    );
  };

  return (
    <Document>
      {/* ===== Página 1: resumen + KPI ===== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Monitoreo</Text>
          <Text style={styles.subtitle}>Generado el: {new Date().toLocaleString("es-AR")}</Text>
        </View>

        <View
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            padding: 8,
            marginTop: 6,
            marginBottom: 8,
            backgroundColor: "#f9fafb",
          }}
        >
          <Text style={{ fontSize: 9 }}>
            <Text style={{ fontWeight: "bold" }}>Cliente(s): </Text>
            {listify(clientes)}
          </Text>
          <Text style={{ fontSize: 9 }}>
            <Text style={{ fontWeight: "bold" }}>Edificio(s) / Ubicación(es): </Text>
            {listify(ubicaciones, 6)}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 6 }}>
          {[
            { label: "Total Eventos", value: totalEventos },
            { label: "Evento más frecuente", value: safe(topEvento[0]) },
          ].map((k, i) => (
            <View
              key={i}
              style={{ flexGrow: 1, border: "1px solid #ddd", borderRadius: 6, padding: 8, textAlign: "center" }}
            >
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
            <Img img={capturedImages.kpi} maxW={540} maxH={520} />
          </>
        )}

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      {/* ===== Página 2: Estadística (grande) ===== */}
      {capturedImages.edificio && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Estadística</Text>
          <Img img={capturedImages.edificio} maxW={540} maxH={680} />
          <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </Page>
      )}

      {/* ===== Página 3: Analítica Detallada (grande) ===== */}
      {capturedImages.pma && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Analítica Detallada (PMA)</Text>
          <Img img={capturedImages.pma} maxW={540} maxH={680} />
          <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </Page>
      )}

      {/* ===== Gráficos adicionales ===== */}
      {(capturedImages.charts || []).length > 0 &&
        chunk(capturedImages.charts, 1).map((chunkImgs, idx) => (
          <Page key={`charts-${idx}`} size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>Gráficos{idx ? " (cont.)" : ""}</Text>
            {chunkImgs.map((img, i) => (
              <Img key={i} img={img} maxW={540} maxH={680} />
            ))}
            <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
          </Page>
        ))}

      {/* ===== Tabla ===== */}
      {chunk(rows, 30).map((pageRows, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Tabla de eventos (pág. {idx + 1})</Text>

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

          {pageRows.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.col, { flex: 0.7 }]}>{r.cliente}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.evento}</Text>
              <Text style={[styles.col, { flex: 1.1 }]}>{r.ubicacion}</Text>
              <Text style={[styles.col, { flex: 0.9 }]}>{r.fecha}</Text>

              <View style={[styles.col, { flex: 1.2 }]}>
                <Text>{r.observacion}</Text>
                {r.linkDrive ? (
                  <Link src={r.linkDrive} style={{ color: "#2563eb", textDecoration: "underline", marginTop: 2 }}>
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

/* ===== Excel ===== */
const generateExcel = (eventos) => {
  if (!eventos?.length) return Swal.fire("Aviso", "No hay datos para exportar.", "warning");
  const onlyEdificio = eventos.length > 0 && eventos.every(isEdificioRow);

  const headerBase = ["Cliente", "Evento", "Ubicación", "Fecha", "Observación", "Link (Drive)"];
  const headerExtra = ["Razones", "Resolución", "Respuesta"];
  const header = onlyEdificio ? [...headerBase, ...headerExtra] : headerBase;

  const rowBase = (e) => {
    const observacion = getObservacion(e) || "";
    const linkField = e.linkDrive || e.link || e["link-drive"] || e["link_drive"] || "";
    const linkDrive = normalizeUrl(linkField) || firstUrlInText(observacion) || "";


    return [e.cliente || "", getEventoTitulo(e) || "", getUbicacionDisplay(e) || "", formatDateValue(e) || "", observacion, linkDrive];
  };

  const rowExtra = (e) => [getRazones(e) || "", getResolucion(e) || "", getRespuestaResidente(e) || ""];
  const rows = eventos.map((e) => (onlyEdificio ? [...rowBase(e), ...rowExtra(e)] : rowBase(e)));

  const wsData = [["Reporte de Monitoreo"], [`Generado el: ${new Date().toLocaleString("es-AR")}`], [], header, ...rows];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 26 },
    { wch: 20 },
    { wch: 40 },
    { wch: 40 },
    ...(onlyEdificio ? [{ wch: 24 }, { wch: 24 }, { wch: 24 }] : []),
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, `REPORTE_MONITOREO_${Date.now()}.xlsx`);
};

/* ===== ExportPDF ===== */
export default function ExportPDF({ eventos }) {
  const [capturedImages, setCapturedImages] = useState({ kpi: null, edificio: null, pma: null, charts: [] });

  const propArray = Array.isArray(eventos) ? eventos : [];

  const dataset = useMemo(() => {
    const fromWindow = Array.isArray(window.__FILTERED_EVENTOS__) ? window.__FILTERED_EVENTOS__ : [];
    if (!fromWindow.length) return propArray.slice().sort((a, b) => dateMs(b) - dateMs(a));

    const winIds = new Set(fromWindow.map(sig));
    const filtered = propArray.filter((e) => winIds.has(sig(e)));
    const base = filtered.length ? filtered : fromWindow;
    return base.slice().sort((a, b) => dateMs(b) - dateMs(a));
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
    return isConfirmed ? value || "" : "";
  }, []);

  const doCapture = useCallback(async () => {
    // ✅ pixelTrim es LA clave para eliminar blanco gigante y que en PDF se escale bien
    const kpi = await captureAsImage("#kpi-cards", {
      scale: 6,
      format: "png",
      bg: "#ffffff",
      pixelTrim: true,
      trimPaddingPx: 34,
      trimTol: 16,
      trimStep: 10,
    });

    const edificio = await captureAsImage("#edificio-stats-capture", {
      scale: 5,
      format: "png",
      bg: "#ffffff",
      pixelTrim: true,
      trimPaddingPx: 34,
      trimTol: 16,
      trimStep: 10,
    });

    const pma = await captureAsImage("#analitica-pma-capture", {
      scale: 5,
      format: "png",
      bg: "#ffffff",
      pixelTrim: true,
      trimPaddingPx: 34,
      trimTol: 16,
      trimStep: 10,
    });

    const charts = await captureAll(["#charts-capture", "#mini-charts-capture", "#line-analytics-capture"], {
      scale: 4,
      format: "jpeg",
      quality: 0.92,
      bg: "#ffffff",
      pixelTrim: true,
      trimPaddingPx: 30,
      trimTol: 16,
      trimStep: 10,
    });

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
    <>
      <style>{`
        .g3t-export-btn{
          appearance:none;
          border: 1px solid rgba(37,99,235,.35);
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          line-height: 1;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 24px rgba(37,99,235,.22);
        }
        .g3t-export-btn:hover{ filter: brightness(1.04); transform: translateY(-1px); }
        .g3t-export-btn:active{ transform: translateY(0px); }
        .g3t-export-btn:disabled{ opacity:.6; cursor:not-allowed; transform:none; }
      `}</style>

      <div className="report-button-container" style={{ display: "flex", gap: 10 }}>
        <button type="button" className="g3t-export-btn" onClick={handleExport} disabled={!dataset.length} title="Exportar PDF y Excel">
          PDF + Excel
        </button>
      </div>
    </>
  );
}
