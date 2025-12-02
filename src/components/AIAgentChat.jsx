// src/components/AIAgentChat.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getApps } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

/**
 * AIAgentChat (Firebase AI Logic / Gemini)
 * - Drawer flotante con chat persistido (localStorage).
 * - Anti-atajos globales: stopPropagation en CAPTURE.
 * - Soporta “consultas” externas a tu app con resolveExtraContext(userText, context)
 * - Formal, sin emojis/símbolos decorativos.
 * - PDF (Dashboard): agrega gráficos capturados por DOM (sin mostrar IDs/textos técnicos).
 * - Carga de hoja de cálculo (XLSX/CSV) para análisis: resumen, muestra y estadísticas básicas.
 * - Selector de hoja (si hay varias) + botón “Resumen planilla” (sin llamar a la IA).
 * - NUEVO: Editor de PDF (para elegir qué va / qué no va) + opciones de inclusión.
 *
 * Requiere:
 *   npm i jspdf
 *   npm i xlsx
 */
export default function AIAgentChat({
  categoria,
  form,
  sop,
  onApplyText,
  onDisableAuto,
  title = "Agente IA",
  storageKey = "g3t_ai_agent_chat_v2",
  modelName = "gemini-2.5-flash",
  resolveExtraContext = null,
  maxExtraItems = 25,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");

  // ====== Planilla ======
  const fileInputRef = useRef(null);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetErr, setSheetErr] = useState("");
  const [sheetDigest, setSheetDigest] = useState(null);
  const wbRef = useRef(null);
  const [activeSheetName, setActiveSheetName] = useState("");

  // ====== PDF Editor ======
  const [pdfEditorOpen, setPdfEditorOpen] = useState(false);
  const [pdfDraftText, setPdfDraftText] = useState("");
  const [pdfOptions, setPdfOptions] = useState({
    includeContext: true,
    includeSheetMeta: true,
    includeGeneratedStamp: false,
    includeVisual: true,
  });

  const [msgs, setMsgs] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const listRef = useRef(null);
  const inputRef = useRef(null);

  // evita “closure viejo”
  const msgsRef = useRef([]);
  useEffect(() => {
    msgsRef.current = msgs;
  }, [msgs]);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(msgs.slice(-80)));
    } catch {}
  }, [msgs, storageKey]);

  // Auto-scroll
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, open]);

  const nowISO = () => new Date().toISOString();

  const isDash = useMemo(() => {
    return String(categoria || "").toLowerCase().includes("dashboard");
  }, [categoria]);

  // Interpreta ventanas de tiempo desde el texto del usuario
  const inferWindowDays = (text) => {
    const t = String(text || "").toLowerCase();

    const mRange = t.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{4}).*?(al|a|hasta).*?(\d{1,2})\/(\d{1,2})\/(\d{4})/i
    );
    if (mRange) {
      const d1 = new Date(Number(mRange[3]), Number(mRange[2]) - 1, Number(mRange[1]), 0, 0, 0);
      const d2 = new Date(Number(mRange[7]), Number(mRange[6]) - 1, Number(mRange[5]), 23, 59, 59);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (Number.isFinite(diff) && diff > 0) return Math.min(3650, diff);
    }

    if (t.includes("6 meses") || t.includes("seis meses")) return 183;
    if (t.includes("3 meses") || t.includes("tres meses")) return 92;
    if (t.includes("2 meses") || t.includes("dos meses")) return 62;
    if (t.includes("1 mes") || t.includes("un mes")) return 31;

    const mDias = t.match(/(\d+)\s*(d[ií]as|dia|día)\b/);
    if (mDias?.[1]) {
      const n = parseInt(mDias[1], 10);
      return Number.isFinite(n) ? Math.min(3650, Math.max(1, n)) : null;
    }

    const mMeses = t.match(/(\d+)\s*mes(es)?\b/);
    if (mMeses?.[1]) {
      const n = parseInt(mMeses[1], 10);
      return Number.isFinite(n) ? Math.min(3650, Math.max(1, n * 30)) : null;
    }

    return null;
  };

  const context = useMemo(() => {
    return {
      categoria: categoria || "",
      lugar: form?.lugar || "",
      operador: form?.operador || "",
      evento: form?.evento || "",
      fechaHoraEvento: form?.fechaHoraEvento || "",
      unidad: form?.unidad || "",
      zona: form?.zona || "",
      requiereGrabacion: form?.requiereGrabacion || "",
      extras: form?.extras || {},
      observacionesActuales: (form?.observaciones || "").toString(),
      sop: sop || null,
    };
  }, [categoria, form, sop]);

  // System instruction: formal, sin símbolos, y NO inventar “limitaciones” ni texto inútil
  const systemInstruction = useMemo(() => {
    const base = [
      "Sos un asistente para operadores de un Centro de Monitoreo y análisis operativo.",
      "Reglas estrictas:",
      "No inventes datos. Usá únicamente el contexto provisto y/o los datos consultados.",
      "Redactá en español (Argentina), con tono formal, operativo y profesional.",
      "No uses emojis, símbolos decorativos, asteriscos, Markdown, ni viñetas con caracteres especiales.",
      "Usá títulos simples y numeración 1), 2), 3) cuando sea necesario.",
      "Si falta un dato crítico, realizá una sola pregunta concreta y breve.",
      "No incluyas frases sobre limitaciones del asistente para generar o descargar PDF.",
      "El PDF, si se requiere, lo gestiona el sistema. Tu tarea es entregar el contenido del informe.",
      "Si hay una planilla cargada, usala como fuente principal para análisis. No asumas columnas que no existan.",
      "Si la planilla está truncada, declaralo SOLO en cobertura de forma breve (muestra analizada vs total), sin justificar con temas técnicos.",
      "Evitá frases como: “limitación de rendimiento”, “solo una porción”, “no puede determinarse”, “no se puede precisar”, etc.",
    ];

    if (isDash) {
      base.push(
        "Modo DASHBOARD:",
        "Respondé como informe ejecutivo.",
        "Estructura obligatoria:",
        "1) Cobertura del dato (fuente, hoja, filas analizadas vs total y rango temporal si se puede inferir).",
        "2) Resumen ejecutivo (un párrafo).",
        "3) Hallazgos principales (Top 5 por evento/ubicación/proveedor si existen).",
        "4) Tendencia o distribución (picos por fecha, días de semana más frecuentes y franjas/horas más frecuentes si se puede).",
        "No incluir en Hallazgos principales categorías tipo 'Sin Evento'/'Sin Ubicación'.",
        "5) Recomendaciones (2 a 4 acciones concretas)."
      );
    } else {
      base.push(
        "Objetivo: ayudar a redactar observaciones profesionales, claras y concisas o realizar análisis con planillas.",
        "Si el pedido es sobre una planilla cargada, devolvé análisis y conclusiones operativas.",
        "Si es redacción de observaciones, entregá un texto final listo para pegar (máximo 12 líneas) o realizá una sola pregunta concreta si falta un dato crítico."
      );
    }

    return base.join("\n");
  }, [isDash]);

  // Firebase AI init
  const model = useMemo(() => {
    try {
      const app = getApps()[0];
      if (!app) throw new Error("FirebaseApp no inicializado (getApps()[0] vacío).");
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      return getGenerativeModel(ai, { model: modelName, systemInstruction });
    } catch (e) {
      console.error("[AIAgentChat] init error:", e);
      return null;
    }
  }, [modelName, systemInstruction]);

  useEffect(() => {
    if (!model) setErr("No se pudo inicializar Firebase AI. Verifique el setup del SDK y AI Logic.");
    else setErr("");
  }, [model]);

  const pushMsg = useCallback((role, text) => {
    const m = {
      id: Math.random().toString(16).slice(2),
      role, // "user" | "assistant"
      text: String(text || ""),
      ts: nowISO(),
    };
    setMsgs((prev) => [...prev, m]);
    return m;
  }, []);

  // ====== XLSX Loader (npm / fallback CDN) ======
  const ensureXLSX = async () => {
    if (window.XLSX) return window.XLSX;

    try {
      const mod = await import("xlsx");
      const xlsx = mod?.default || mod;
      window.XLSX = xlsx;
      return xlsx;
    } catch {
      const url = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-xlsx="1"]');
        if (existing && window.XLSX) return resolve();

        const s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.defer = true;
        s.dataset.xlsx = "1";
        s.onload = resolve;
        s.onerror = () => reject(new Error("No se pudo cargar XLSX desde CDN"));
        document.head.appendChild(s);
      });
      if (!window.XLSX) throw new Error("XLSX no está disponible");
      return window.XLSX;
    }
  };

  // ====== Safe JSON (evita circular + recorta strings para no explotar tokens) ======
  const safeJSONStringify = (obj, maxChars = 14000) => {
    const seen = new WeakSet();

    const replacer = (_k, v) => {
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "bigint") return String(v);

      if (typeof v === "string") {
        if (v.length > 1200) return v.slice(0, 1200) + "…";
        return v;
      }

      if (typeof v === "object" && v !== null) {
        if (seen.has(v)) return "[Circular]";
        seen.add(v);
      }

      return v;
    };

    let s = "";
    try {
      s = JSON.stringify(obj, replacer, 2);
    } catch (e) {
      s = JSON.stringify({ warning: "No se pudo serializar el objeto.", error: String(e?.message || e) }, null, 2);
    }

    if (s.length > maxChars) return s.slice(0, maxChars) + "\n…(contenido recortado por tamaño)";
    return s;
  };

  const makeSheetPromptDigest = (sheet) => {
    if (!sheet) return null;

    const MAX_COLS = 30;
    const MAX_SAMPLE = 12;

    const columns = Array.isArray(sheet.columns) ? sheet.columns.slice(0, MAX_COLS) : [];
    const sampleRows = Array.isArray(sheet.sampleRows)
      ? sheet.sampleRows.slice(0, MAX_SAMPLE).map((r) => {
          const o = {};
          for (const c of columns) o[c] = r?.[c] ?? null;
          return o;
        })
      : [];

    const freq = sheet?.stats?.frequencies || {};
    const freqCols = Object.keys(freq).slice(0, 6);
    const frequencies = {};
    for (const c of freqCols) frequencies[c] = (freq[c] || []).slice(0, 8);

    const numeric = sheet?.stats?.numeric || {};
    const numericCols = Object.keys(numeric).slice(0, 20);
    const numericReduced = {};
    for (const c of numericCols) numericReduced[c] = numeric[c];

    return {
      fileName: sheet.fileName,
      sheets: sheet.sheets,
      activeSheet: sheet.activeSheet,
      totalRows: sheet.totalRows,
      processedRows: sheet.processedRows,
      columns,
      sampleRows,
      stats: { numeric: numericReduced, frequencies },
      truncated: sheet.truncated,
      notes: sheet.notes,
      processedAt: sheet.processedAt,
    };
  };

  const safeString = (v) => {
    if (v == null) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (v instanceof Date) return v.toISOString();
    return String(v);
  };

  const toNumberOrNull = (v) => {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const s = v.trim().replace(/\./g, "").replace(",", "."); // soporte AR simple
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const computeSheetDigest = (rows, fileName, sheetName) => {
    // Límites para no explotar memoria:
    const MAX_ROWS_PROCESS = 5000;
    const MAX_SAMPLE = 25;
    const MAX_FREQ_COLS = 8;
    const MAX_FREQ_TOP = 10;

    const totalRows = rows.length;
    const truncated = totalRows > MAX_ROWS_PROCESS;
    const work = truncated ? rows.slice(0, MAX_ROWS_PROCESS) : rows;
    const processedRows = work.length;

    // columns = unión de keys
    const colSet = new Set();
    for (const r of work) Object.keys(r || {}).forEach((k) => colSet.add(k));
    const columns = Array.from(colSet);

    // sample rows (limpia strings gigantes)
    const sampleRows = work.slice(0, MAX_SAMPLE).map((r) => {
      const o = {};
      for (const k of columns) {
        const val = r?.[k];
        let s = val;
        if (typeof s === "string" && s.length > 220) s = s.slice(0, 220) + "…";
        o[k] = s;
      }
      return o;
    });

    // stats numéricas
    const numericStats = {};
    for (const col of columns) {
      let count = 0;
      let sum = 0;
      let min = null;
      let max = null;

      for (const r of work) {
        const n = toNumberOrNull(r?.[col]);
        if (n == null) continue;
        count++;
        sum += n;
        if (min == null || n < min) min = n;
        if (max == null || n > max) max = n;
      }

      // guardamos solo si tiene “suficiente densidad”
      if (count >= Math.max(5, Math.floor(work.length * 0.2))) {
        numericStats[col] = {
          count,
          min,
          max,
          mean: count ? Number((sum / count).toFixed(4)) : null,
        };
      }
    }

    // frecuencias para columnas “categóricas”
    const freq = {};
    const nonNumericCols = columns.filter((c) => !numericStats[c]);
    const freqCols = nonNumericCols.slice(0, MAX_FREQ_COLS);

    for (const col of freqCols) {
      const map = new Map();
      for (const r of work) {
        const s = safeString(r?.[col]);
        if (!s) continue;
        const key = s.length > 120 ? s.slice(0, 120) + "…" : s;
        map.set(key, (map.get(key) || 0) + 1);
      }
      const top = Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_FREQ_TOP)
        .map(([value, count]) => ({ value, count }));

      if (top.length) freq[col] = top;
    }

    // notas (sin “excusa técnica”)
    const notes = [];
    if (!columns.length) notes.push("No se detectaron columnas (planilla vacía o formato no soportado).");
    if (truncated) notes.push(`Cobertura parcial: muestra analizada ${processedRows} filas sobre ${totalRows} filas totales.`);

    return {
      fileName,
      activeSheet: sheetName || "",
      totalRows,
      processedRows,
      columns,
      sampleRows,
      stats: {
        numeric: numericStats,
        frequencies: freq,
      },
      truncated,
      notes,
      processedAt: new Date().toISOString(),
    };
  };

  const computeDigestFromWb = (XLSX, wb, fileName, sheetName) => {
    const sheets = wb?.SheetNames || [];
    const active = sheetName || sheets[0] || "";
    if (!active) throw new Error("La planilla no contiene hojas.");

    const ws = wb.Sheets?.[active];
    if (!ws) throw new Error("No se pudo leer la hoja seleccionada.");

    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    const digest = computeSheetDigest(rows, fileName, active);
    digest.sheets = sheets;
    return digest;
  };

  const loadSpreadsheetFile = async (file) => {
    setSheetErr("");
    setSheetBusy(true);
    try {
      const name = file?.name || "planilla";
      const ext = name.split(".").pop()?.toLowerCase();

      const XLSX = await ensureXLSX();

      // CSV: mejor como texto (evita problemas de encoding)
      let wb = null;
      if (ext === "csv") {
        const text = await file.text();
        wb = XLSX.read(text, { type: "string", cellDates: true });
      } else {
        const buf = await file.arrayBuffer();
        wb = XLSX.read(buf, { type: "array", cellDates: true });
      }

      wbRef.current = wb;

      const sheets = wb.SheetNames || [];
      const first = sheets[0] || "";
      if (!first) throw new Error("La planilla no contiene hojas.");

      setActiveSheetName(first);

      const digest = computeDigestFromWb(XLSX, wb, name, first);
      setSheetDigest(digest);

      const colsPreview = (digest.columns || []).slice(0, 20).join(", ");
      pushMsg(
        "assistant",
        [
          "Planilla cargada para análisis.",
          `Archivo: ${digest.fileName}`,
          `Hoja: ${digest.activeSheet}`,
          `Filas totales: ${digest.totalRows}`,
          `Filas analizadas: ${digest.processedRows}${digest.truncated ? " (muestra)" : ""}`,
          `Columnas: ${digest.columns.length ? colsPreview + (digest.columns.length > 20 ? ", …" : "") : "-"}`,
          sheets.length > 1 ? `Hojas disponibles: ${sheets.join(", ")}` : "",
          "Ahora puede pedir: “Hacé un informe”, “Top 10”, “Tendencias”, “Segmentación”, “Anomalías”, etc.",
        ]
          .filter(Boolean)
          .join("\n")
      );
    } catch (e) {
      console.error("[AIAgentChat] sheet load error:", e);
      wbRef.current = null;
      setActiveSheetName("");
      setSheetDigest(null);
      setSheetErr(String(e?.message || e));
    } finally {
      setSheetBusy(false);
    }
  };

  // Recalcular digest al cambiar de hoja
  useEffect(() => {
    if (!activeSheetName) return;
    if (!wbRef.current) return;
    if (!sheetDigest?.fileName) return;

    (async () => {
      try {
        const XLSX = await ensureXLSX();
        const digest = computeDigestFromWb(XLSX, wbRef.current, sheetDigest.fileName, activeSheetName);
        setSheetDigest(digest);
        pushMsg("assistant", `Hoja activa para análisis: ${digest.activeSheet}`);
      } catch (e) {
        console.warn("[AIAgentChat] change sheet error:", e);
        setSheetErr(String(e?.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSheetName]);

  const clearSpreadsheet = () => {
    wbRef.current = null;
    setActiveSheetName("");
    setSheetDigest(null);
    setSheetErr("");
    try {
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {}
    pushMsg("assistant", "Planilla removida. Para analizar otra, cargue un nuevo archivo.");
  };

  // ====== Resumen planilla (sin IA) ======
  const buildSheetSummaryText = (digest) => {
    if (!digest) return "No hay planilla cargada.";

    const lines = [];
    lines.push("Resumen de planilla");
    lines.push(`Archivo: ${digest.fileName || "-"}`);
    lines.push(`Hoja: ${digest.activeSheet || "-"}`);
    lines.push(`Filas totales: ${digest.totalRows ?? "-"}`);
    lines.push(`Filas analizadas: ${digest.processedRows ?? "-"}`);
    lines.push(`Columnas: ${(digest.columns || []).length}`);
    if (Array.isArray(digest.notes) && digest.notes.length) {
      lines.push("Notas:");
      digest.notes.slice(0, 6).forEach((n) => lines.push(`- ${n}`));
    }

    // Top frecuencias
    const freq = digest?.stats?.frequencies || {};
    const freqCols = Object.keys(freq);
    if (freqCols.length) {
      lines.push("");
      lines.push("Principales frecuencias (muestra):");
      for (const col of freqCols.slice(0, 6)) {
        const top = (freq[col] || []).slice(0, 6);
        if (!top.length) continue;
        lines.push(`${col}:`);
        for (const it of top) lines.push(`- ${it.value}: ${it.count}`);
      }
    }

    // Numéricos
    const numeric = digest?.stats?.numeric || {};
    const numCols = Object.keys(numeric);
    if (numCols.length) {
      lines.push("");
      lines.push("Columnas numéricas (estadísticas base):");
      for (const col of numCols.slice(0, 10)) {
        const s = numeric[col];
        lines.push(`${col}: n=${s.count}, min=${s.min}, max=${s.max}, media=${s.mean}`);
      }
    }

    // Muestra de datos
    const cols = (digest.columns || []).slice(0, 10);
    const sample = (digest.sampleRows || []).slice(0, 8);
    if (cols.length && sample.length) {
      lines.push("");
      lines.push("Muestra (primeras filas, columnas principales):");
      lines.push(`Columnas mostradas: ${cols.join(", ")}`);
      sample.forEach((r, i) => {
        const parts = cols.map((c) => `${c}=${safeString(r?.[c]) || "-"}`);
        const rowTxt = parts.join(" | ");
        lines.push(`${i + 1}) ${rowTxt.length > 900 ? rowTxt.slice(0, 900) + "…" : rowTxt}`);
      });
    }

    return lines.join("\n");
  };

  const showSheetSummary = () => {
    if (!sheetDigest) {
      pushMsg("assistant", "No hay planilla cargada.");
      return;
    }
    pushMsg("assistant", buildSheetSummaryText(sheetDigest));
  };

  const buildPrompt = useCallback(
    ({ userText, history, ctx, extra, sheet }) => {
      const histTxt = (history || [])
        .slice(-12)
        .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.text}`)
        .join("\n");

      const safeExtra = extra == null ? null : Array.isArray(extra) ? extra.slice(0, maxExtraItems) : extra;

      const dash = String(ctx?.categoria || "").toLowerCase().includes("dashboard");

      // Importante: mandamos solo digest (no el XLSX crudo) y además recortado.
      const safeSheet = sheet
        ? {
            fileName: sheet.fileName,
            sheets: sheet.sheets,
            activeSheet: sheet.activeSheet,
            totalRows: sheet.totalRows,
            processedRows: sheet.processedRows,
            columns: sheet.columns,
            sampleRows: sheet.sampleRows,
            stats: sheet.stats,
            truncated: sheet.truncated,
            notes: sheet.notes,
            processedAt: sheet.processedAt,
          }
        : null;

      const promptSheet = makeSheetPromptDigest(safeSheet);

      return [
        "CONTEXTO (usar únicamente esta información)",
        safeJSONStringify(ctx),
        "",
        "PLANILLA CARGADA (si existe)",
        promptSheet ? safeJSONStringify(promptSheet) : "(sin planilla cargada)",
        "",
        "DATOS CONSULTADOS (si existen)",
        safeExtra ? safeJSONStringify(safeExtra) : "(sin datos consultados)",
        "",
        "HISTORIAL RECIENTE",
        histTxt || "(sin historial)",
        "",
        "MENSAJE ACTUAL",
        `Usuario: ${userText}`,
        "",
        "INSTRUCCIONES DE RESPUESTA",
        dash
          ? [
              "Redactá un informe ejecutivo formal.",
              "Si hay planilla, usala como base: en cobertura, indicar SOLO: hoja, filas analizadas vs total.",
              "No usar: “limitación de rendimiento”, “solo una porción”, “no puede determinarse”, “no se puede precisar”.",
              "Estructura obligatoria:",
              "1) Cobertura del dato.",
              "2) Resumen ejecutivo (un párrafo).",
              "3) Hallazgos principales (Top 5 si hay datos).",
              "4) Tendencias o distribución (si hay series y se puede inferir).",
              "5) Recomendaciones (2 a 4 acciones concretas).",
              "No utilices emojis, símbolos decorativos ni formato Markdown.",
              "Limitate a entregar el contenido del informe.",
            ].join("\n")
          : [
              "Si hay planilla y el pedido es analítico, respondé con análisis operativo basado en lo provisto (muestra + estadísticas).",
              "Si el usuario pide un cálculo no posible con el digest, pedí UNA aclaración concreta o solicitá una columna específica.",
              "Si es redacción de observaciones, devolvé un texto final listo para pegar (máximo 12 líneas).",
              "Limitate al contenido solicitado.",
            ].join("\n"),
      ].join("\n");
    },
    [maxExtraItems]
  );

  // ===== Limpieza de texto (evita “frases inútiles”) =====
  const stripBoilerplate = (t) => {
    if (!t) return t;
    const lines = String(t).replace(/\r/g, "").split("\n");
    const bad = [
      /limitaci[oó]n\s+de\s+rendimiento/i,
      /solo\s+una\s+porci[oó]n/i,
      /no\s+puede\s+ser\s+determinado/i,
      /no\s+se\s+puede\s+precisar/i,
      /no\s+puede\s+ser\s+determinado\s+con\s+precisi[oó]n/i,
      /a\s+partir\s+de\s+las\s+estad[ií]sticas\s+proporcionadas/i,
    ];
    const cleaned = lines.filter((ln) => !bad.some((rx) => rx.test(ln)));
    return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  const normalizeAssistantText = (input) => {
    let t = String(input || "").replace(/\r/g, "").trim();

    t = t.replace(/^contenido\s*\n+/i, "");

    // Si el modelo insiste con “disclaimers”, se recorta cuando corresponde
    const hasPdfDisclaimer =
      /pdf/i.test(t) &&
      /(no\s+es\s+posible|no\s+puedo|mi\s+funcionalidad|se\s+limita\s+a\s+la\s+provisi[oó]n)/i.test(t);

    if (hasPdfDisclaimer) {
      const idx = t.search(/\bINFORME\b|\b1\)\s*Cobertura\b|\bCobertura\s+del\s+Dato\b/i);
      if (idx > 0) t = t.slice(idx).trim();
    }

    t = stripBoilerplate(t);
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    return t;
  };

  const getLastAssistantText = () => {
    const last = [...(msgsRef.current || [])].reverse().find((m) => m.role === "assistant");
    return last?.text ? normalizeAssistantText(last.text) : "";
  };

  // ===== PDF Editor helpers =====
  const openPdfEditor = () => {
    const last = getLastAssistantText();
    setPdfDraftText(last || "");
    setPdfEditorOpen(true);
  };

  const loadPdfFromLastAssistant = () => {
    setPdfDraftText(getLastAssistantText() || "");
  };

  const loadPdfFromSheetSummary = () => {
    if (!sheetDigest) return;
    const txt = buildSheetSummaryText(sheetDigest);
    setPdfDraftText(txt || "");
  };

  // ===== Captura de gráficos (Dashboard) para PDF =====
  const DASH_CAPTURE_IDS = useMemo(
    () => [
      "kpi-cards",
      "charts-capture",
      "mini-charts-capture",
      "line-analytics-capture",
      "edificio-stats-capture",
      "analitica-pma-capture",
    ],
    []
  );

  const ensureHtml2Canvas = async () => {
    if (window.html2canvas) return window.html2canvas;

    try {
      const mod = await import("html2canvas");
      const h2c = mod.default || mod;
      window.html2canvas = h2c;
      return h2c;
    } catch {
      const url = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-h2c="1"]');
        if (existing && window.html2canvas) return resolve();

        const s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.defer = true;
        s.dataset.h2c = "1";
        s.onload = resolve;
        s.onerror = () => reject(new Error("No se pudo cargar html2canvas"));
        document.head.appendChild(s);
      });

      if (!window.html2canvas) throw new Error("html2canvas no está disponible");
      return window.html2canvas;
    }
  };

  const isNodeVisible = (node) => {
    if (!node) return false;
    const st = window.getComputedStyle(node);
    if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 12 && rect.height > 12;
  };

  const captureNodePng = async (node) => {
    const html2canvas = await ensureHtml2Canvas();

    const prevBg = node.style.background;
    if (!node.style.background) node.style.background = "#ffffff";

    node.scrollIntoView({ block: "center", behavior: "instant" });

    const canvas = await html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: Math.max(node.scrollWidth, node.clientWidth),
      windowHeight: Math.max(node.scrollHeight, node.clientHeight),
    });

    node.style.background = prevBg;
    return canvas.toDataURL("image/png", 1.0);
  };

  const addImageFitted = async (doc, imgData, { left, y, maxWidth, top, bottom, pageHeight }) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = imgData;
    });

    let w = maxWidth;
    let h = (img.height * w) / img.width;

    const available = (yy) => pageHeight - bottom - yy;

    if (h > available(y)) {
      if (y !== top) {
        doc.addPage();
        y = top;
      }
    }

    const availNow = available(y);
    if (h > availNow) {
      const scale = availNow / h;
      h *= scale;
      w *= scale;
    }

    const x = left + (maxWidth - w) / 2;
    doc.addImage(imgData, "PNG", x, y, w, h, undefined, "FAST");
    return y + h;
  };

  const drawHeaderLine = (doc, x1, x2, y) => {
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.6);
    doc.line(x1, y, x2, y);
  };

  const downloadPdf = async (overrideText = null, overrideOptions = null) => {
    try {
      const options = overrideOptions || pdfOptions;

      const baseText = overrideText != null ? String(overrideText) : getLastAssistantText();
      const text = normalizeAssistantText(baseText).trim();
      if (!text) {
        setErr("No hay contenido disponible para exportar a PDF.");
        return;
      }

      const mod = await import("jspdf");
      const jsPDF = mod.jsPDF || mod.default?.jsPDF || mod.default;
      if (!jsPDF) throw new Error("No se pudo cargar jsPDF. Verifique la instalación.");

      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const left = 44;
      const top = 56;
      const bottom = 48;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - left * 2;

      let y = top;

      const newPage = () => {
        doc.addPage();
        y = top;
      };

      const ensureSpace = (needed) => {
        if (y + needed > pageHeight - bottom) newPage();
      };

      // Título
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(25, 30, 45);
      doc.text(String(title || "Reporte").toUpperCase(), left, y);
      y += 14;

      // Fecha
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(80, 90, 110);
      doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, left, y);

      drawHeaderLine(doc, left, pageWidth - left, y + 10);
      y += 26;

      // Contexto (opcional)
      if (options.includeContext) {
        doc.setTextColor(35, 40, 55);
        doc.setFontSize(10);
        doc.text(`Categoría: ${context.categoria || "-"}`, left, y);
        y += 14;
        doc.text(`Lugar: ${context.lugar || "-"}`, left, y);
        y += 14;
        doc.text(`Evento: ${context.evento || "-"}`, left, y);
        y += 18;
      }

      // Meta planilla (opcional)
      if (options.includeSheetMeta && sheetDigest) {
        ensureSpace(70);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(25, 30, 45);
        doc.text("Planilla", left, y);
        y += 12;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(35, 40, 55);
        doc.text(`Archivo: ${sheetDigest.fileName || "-"}`, left, y);
        y += 12;
        doc.text(`Hoja: ${sheetDigest.activeSheet || "-"}`, left, y);
        y += 12;
        doc.text(`Filas totales: ${sheetDigest.totalRows ?? "-"}`, left, y);
        y += 12;
        doc.text(`Filas analizadas: ${sheetDigest.processedRows ?? "-"}`, left, y);
        y += 12;
        doc.text(`Columnas: ${(sheetDigest.columns || []).length}`, left, y);
        y += 10;
        drawHeaderLine(doc, left, pageWidth - left, y);
        y += 16;
      }

      // Encabezado sección Informe
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 30, 45);

      ensureSpace(18);
      doc.text("Informe", left, y);
      y += 10;

      if (options.includeGeneratedStamp) {
        doc.setTextColor(110, 120, 140);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.text("Contenido generado por el asistente según el contexto y datos consultados.", left, y);
        y += 14;
      }

      drawHeaderLine(doc, left, pageWidth - left, y);
      y += 18;

      // Texto principal
      doc.setTextColor(35, 40, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const lines = doc.splitTextToSize(text, maxWidth);
      const lineHeight = 13;

      for (const line of lines) {
        if (y + lineHeight > pageHeight - bottom) newPage();
        doc.text(line, left, y);
        y += lineHeight;
      }

      // Capturas (opcional)
      if (isDash && options.includeVisual) {
        const targets = DASH_CAPTURE_IDS.map((id) => document.getElementById(id)).filter((n) => isNodeVisible(n));
        if (targets.length) {
          y += 14;
          ensureSpace(44);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(25, 30, 45);
          doc.text("Resumen visual", left, y);
          y += 12;

          drawHeaderLine(doc, left, pageWidth - left, y);
          y += 16;

          for (const node of targets) {
            let imgData = null;
            try {
              imgData = await captureNodePng(node);
            } catch (e) {
              console.warn("[AIAgentChat] No se pudo capturar un gráfico:", e);
              continue;
            }

            const yEnd = await addImageFitted(doc, imgData, { left, y, maxWidth, top, bottom, pageHeight });
            y = yEnd + 18;
          }
        }
      }

      const safeName = `${(title || "reporte").toLowerCase().replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

      doc.save(safeName);
      setErr("");
    } catch (e) {
      console.error("[AIAgentChat] PDF error:", e);
      setErr(String(e?.message || e));
    }
  };

  const send = useCallback(
    async (text) => {
      const t = String(text || "").trim();
      if (!t || busy) return;

      if (!model) {
        pushMsg("assistant", "La IA no está inicializada. Verifique la configuración de Firebase AI Logic y el SDK.");
        return;
      }

      setBusy(true);
      setErr("");

      const userMsg = {
        id: Math.random().toString(16).slice(2),
        role: "user",
        text: t,
        ts: nowISO(),
      };
      setMsgs((prev) => [...prev, userMsg]);

      try {
        let extra = null;
        if (typeof resolveExtraContext === "function") {
          try {
            const windowDays = inferWindowDays(t);
            extra = await resolveExtraContext(t, { ...context, request: { windowDays, requestedAt: nowISO() } });
          } catch (e) {
            console.warn("[AIAgentChat] resolveExtraContext error:", e);
            extra = { warning: "No se pudo traer datos extra.", error: String(e?.message || e) };
          }
        }

        const history = [...(msgsRef.current || []), userMsg].map((m) => ({ role: m.role, text: m.text })).slice(-16);

        const prompt = buildPrompt({ userText: t, history, ctx: context, extra, sheet: sheetDigest });

        const result = await model.generateContent(prompt);
        const replyRaw = result?.response?.text?.() || "";
        const reply = normalizeAssistantText(replyRaw);

        setMsgs((prev) => [
          ...prev,
          {
            id: Math.random().toString(16).slice(2),
            role: "assistant",
            text: String(reply || "Sin respuesta.").trim(),
            ts: nowISO(),
          },
        ]);
      } catch (e) {
        console.error("[AIAgentChat] generate error:", e);
        const msg =
          e?.message?.toString?.() || "Error al solicitar respuesta de IA. Verifique AI Logic, App Check y permisos.";

        setMsgs((prev) => [
          ...prev,
          { id: Math.random().toString(16).slice(2), role: "assistant", text: `Aviso: ${msg}`, ts: nowISO() },
        ]);

        setErr(msg);
      } finally {
        setBusy(false);
        setDraft("");
        setTimeout(() => inputRef.current?.focus?.(), 0);
      }
    },
    [busy, model, pushMsg, buildPrompt, context, resolveExtraContext, sheetDigest]
  );

  const quickActions = useMemo(() => {
    const hasSheet = !!sheetDigest;

    if (isDash) {
      return [
        ...(hasSheet
          ? [
              {
                label: "Informe desde planilla",
                text: "Elabore un informe ejecutivo basado en la planilla cargada: cobertura del dato, resumen, hallazgos, tendencia/distribución y recomendaciones.",
              },
              {
                label: "Top 10 (planilla)",
                text: "Con la planilla cargada, construya un Top 10 de los principales grupos (según la columna más representativa) y explique el criterio usado.",
              },
              {
                label: "Anomalías (planilla)",
                text: "Detecte valores atípicos o anomalías en la planilla (picos, outliers numéricos, concentraciones) y proponga acciones.",
              },
            ]
          : []),
        {
          label: "Informe ejecutivo (6 meses)",
          text: "Elabore un informe ejecutivo de los últimos 6 meses: cobertura del dato, resumen, principales hallazgos por evento/ubicación/proveedor, tendencia y recomendaciones.",
        },
        { label: "Top 10 ubicaciones", text: "Indique el Top 10 de ubicaciones por cantidad de eventos, con lectura operativa breve." },
        { label: "Tendencia / picos", text: "Identifique tendencias y picos (fechas con mayor volumen) y sugiera acciones preventivas." },
        { label: "Comparar clientes", text: "Compare volumen y distribución por cliente (TGS/Edificios/VTV/Otros) e indique hallazgos relevantes." },
      ];
    }

    return [
      ...(hasSheet
        ? [
            {
              label: "Analizar planilla",
              text: "Analice la planilla cargada y entregue: cobertura del dato, principales métricas, segmentación relevante y recomendaciones.",
            },
            { label: "Resumen + hallazgos", text: "Con la planilla cargada, haga un resumen ejecutivo y 5 hallazgos accionables." },
            { label: "Preguntas clave", text: "Con la planilla cargada, proponga 10 preguntas de negocio/operativas que se pueden responder con esos datos." },
          ]
        : []),
      { label: "Mejorar observaciones", text: "Mejore y formalice las observaciones con el contexto provisto. Devuelva un texto final listo para pegar." },
      { label: "Versión corta", text: "Genere una versión muy breve (1 a 2 líneas) sin perder información relevante." },
      { label: "Versión detallada", text: "Genere una versión detallada y profesional (6 a 8 líneas)." },
      { label: "Checklist SOP", text: "Con el SOP actual, genere un checklist breve de acciones realizadas y pendientes (sin inventar)." },
      { label: "Consulta (conteos)", text: "Con los datos consultados, devuelva conteos por tipo de evento y por ubicación. Si no hay datos, indíquelo." },
    ];
  }, [isDash, sheetDigest]);

  const clearChat = () => {
    setMsgs([]);
    setErr("");
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const stopKeysCapture = (e) => {
    e.stopPropagation();
  };

  const applyFromAssistant = (assistantText, mode) => {
    const txt = normalizeAssistantText(assistantText).trim();
    if (!txt) return;
    onDisableAuto?.();
    onApplyText?.(txt, { mode });
  };

  return (
    <>
      <style>{`
        :root{
          --ai-bg-0: rgba(6,10,20,.86);
          --ai-bg-1: rgba(12,18,32,.82);
          --ai-stroke: rgba(255,255,255,.10);
          --ai-stroke-2: rgba(255,255,255,.14);
          --ai-text: rgba(240,245,255,.92);
          --ai-sub: rgba(186,204,255,.78);
          --ai-muted: rgba(205,214,235,.62);
          --ai-shadow: 0 20px 60px rgba(0,0,0,.55);
          --ai-radius: 18px;
        }

        .ai-fab{
          position:fixed; right:18px; bottom:18px; z-index:9999;
          width:56px; height:56px; border-radius:999px; border:0;
          color:white; cursor:pointer;
          background: radial-gradient(120% 120% at 30% 20%, rgba(56,189,248,1), rgba(99,102,241,1) 55%, rgba(14,165,233,1) 100%);
          box-shadow: 0 14px 34px rgba(2,132,199,.22), 0 12px 46px rgba(99,102,241,.15);
          display:flex; align-items:center; justify-content:center;
          transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
          font-weight:900; letter-spacing:.4px;
        }
        .ai-fab:hover{ filter:brightness(1.04); transform:translateY(-1px); box-shadow: 0 18px 50px rgba(0,0,0,.35); }
        .ai-fab:active{ transform:translateY(0px) scale(.99); }

        .ai-drawer{
          position:fixed; right:18px; bottom:86px; z-index:9999;
          width:min(470px, calc(100vw - 36px));
          height:min(680px, calc(100vh - 120px));
          border-radius: var(--ai-radius);
          overflow:hidden;
          border:1px solid var(--ai-stroke);
          background: linear-gradient(140deg, var(--ai-bg-0), var(--ai-bg-1));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: var(--ai-shadow);
          display:flex; flex-direction:column;
        }

        .ai-head{
          padding:12px 12px 10px;
          display:flex; align-items:center; justify-content:space-between;
          background: linear-gradient(135deg, rgba(56,189,248,.14), rgba(99,102,241,.10));
          border-bottom:1px solid rgba(255,255,255,.10);
        }

        .ai-title{ display:flex; flex-direction:column; gap:2px; color:var(--ai-text); }
        .ai-title strong{
          font-size:13px; letter-spacing:.25px;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
        .ai-sub{
          font-size:11px; color:var(--ai-sub);
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }

        .ai-head-actions{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }

        .ai-btn{
          border:1px solid var(--ai-stroke);
          background: rgba(255,255,255,.06);
          color: var(--ai-text);
          border-radius: 12px;
          padding:7px 10px;
          cursor:pointer;
          transition: background .15s ease, transform .15s ease, border-color .15s ease;
          font-size:12px;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
          white-space:nowrap;
        }
        .ai-btn:hover{ background: rgba(255,255,255,.10); border-color: var(--ai-stroke-2); transform: translateY(-1px); }
        .ai-btn:active{ transform: translateY(0); }
        .ai-btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; }
        .ai-btn-ghost{ background: transparent; }
        .ai-btn-primary{
          background: rgba(34,197,94,.18);
          border-color: rgba(34,197,94,.35);
          color: rgba(220,255,235,.96);
          font-weight:800;
        }
        .ai-btn-primary:hover{ background: rgba(34,197,94,.23); }

        .ai-context{
          padding:10px 12px;
          display:flex; flex-wrap:wrap; gap:8px;
          border-bottom:1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
        }
        .ai-chip{
          font-size:12px;
          color: var(--ai-text);
          padding:6px 10px;
          border-radius: 999px;
          border:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
        .ai-chip b{ color: rgba(240,245,255,.85); font-weight:800; }
        .ai-chip-muted{ opacity:.85; }

        .ai-quick{
          padding:10px 12px;
          display:flex; flex-wrap:wrap; gap:8px;
          border-bottom:1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.02);
        }
        .ai-quick-btn{
          font-size:12px;
          color: var(--ai-text);
          padding:7px 10px;
          border-radius: 999px;
          border:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          cursor:pointer;
          transition: background .15s ease, transform .15s ease, border-color .15s ease;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
        .ai-quick-btn:hover{ background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.14); transform: translateY(-1px); }
        .ai-quick-btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; }

        .ai-list{
          flex:1 1 auto;
          overflow:auto;
          padding:12px;
          background:
            radial-gradient(900px 480px at 0% 0%, rgba(56,189,248,.10), transparent 55%),
            radial-gradient(760px 420px at 100% 0%, rgba(99,102,241,.10), transparent 55%),
            rgba(255,255,255,.015);
        }

        .ai-empty{
          display:flex; gap:10px; align-items:flex-start;
          padding:14px; border-radius: 14px;
          border:1px dashed rgba(255,255,255,.14);
          color: var(--ai-muted);
          background: rgba(255,255,255,.02);
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
        .ai-empty-title{ font-weight:900; margin-bottom:2px; color: var(--ai-text); font-size:12px; }
        .ai-empty-sub{ font-size:12px; opacity:.9; }

        .ai-msg{ margin-bottom:10px; }
        .ai-bubble{
          border:1px solid rgba(255,255,255,.10);
          border-radius: 14px;
          padding:10px 10px 9px;
          background: rgba(255,255,255,.05);
        }
        .ai-msg.is-user .ai-bubble{
          background: rgba(255,255,255,.07);
          border-color: rgba(255,255,255,.12);
        }

        .ai-role{
          display:flex; justify-content:space-between; gap:10px;
          color: rgba(240,245,255,.88);
          font-weight:900; font-size:11px;
          margin-bottom:6px;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
          letter-spacing:.2px;
        }
        .ai-time{ font-weight:700; opacity:.65; }

        .ai-text{
          margin:0;
          white-space:pre-wrap;
          word-break:break-word;
          color: var(--ai-text);
          font-size:13px;
          line-height:1.45;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }

        .ai-apply{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }

        .ai-foot{
          padding:10px 10px 12px;
          display:flex; gap:10px; align-items:flex-end;
          border-top:1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.02);
        }
        .ai-input{
          flex:1 1 auto;
          border-radius: 14px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.05);
          color: var(--ai-text);
          padding:10px 11px;
          resize:none;
          outline:none;
          min-height:44px;
          font-size:13px;
          line-height:1.35;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
        .ai-input:focus{
          border-color: rgba(56,189,248,.45);
          box-shadow: 0 0 0 4px rgba(56,189,248,.12);
        }

        .ai-send{
          border:0;
          border-radius: 14px;
          padding:10px 14px;
          background: linear-gradient(135deg, rgba(56,189,248,1), rgba(99,102,241,1));
          color: rgba(4,10,20,.95);
          font-weight:900;
          cursor:pointer;
          box-shadow: 0 12px 28px rgba(56,189,248,.14);
          transition: transform .15s ease, filter .15s ease;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
        .ai-send:hover{ filter:brightness(1.03); transform: translateY(-1px); }
        .ai-send:active{ transform: translateY(0px); }
        .ai-send:disabled{ opacity:.55; cursor:not-allowed; transform:none; }

        .ai-error{
          padding:10px 12px;
          font-size:12px;
          color: rgba(255,210,210,.95);
          background: rgba(239,68,68,.10);
          border-top:1px solid rgba(239,68,68,.18);
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }

        .ai-file{ display:none; }

        /* ===== PDF editor modal ===== */
        .ai-modal-backdrop{
          position:fixed;
          inset:0;
          z-index:10000;
          background: rgba(0,0,0,.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:18px;
        }
        .ai-modal{
          width:min(860px, calc(100vw - 36px));
          height:min(740px, calc(100vh - 60px));
          border-radius: 18px;
          border:1px solid rgba(255,255,255,.12);
          background: linear-gradient(140deg, rgba(10,14,26,.95), rgba(12,18,32,.92));
          box-shadow: 0 30px 80px rgba(0,0,0,.55);
          display:flex;
          flex-direction:column;
          overflow:hidden;
        }
        .ai-modal-head{
          padding:12px 12px 10px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          border-bottom:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
        }
        .ai-modal-title{
          color: var(--ai-text);
          font-weight:900;
          font-size:13px;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
          letter-spacing:.2px;
        }
        .ai-modal-body{
          padding:12px;
          display:grid;
          grid-template-columns: 1fr;
          gap:12px;
          flex:1 1 auto;
          overflow:auto;
        }
        .ai-modal-textarea{
          width:100%;
          min-height: 360px;
          border-radius: 14px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.05);
          color: var(--ai-text);
          padding:12px;
          outline:none;
          font-size:13px;
          line-height:1.45;
          resize: vertical;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
        .ai-modal-textarea:focus{
          border-color: rgba(56,189,248,.45);
          box-shadow: 0 0 0 4px rgba(56,189,248,.12);
        }
        .ai-opt{
          display:flex;
          flex-wrap:wrap;
          gap:10px 14px;
          padding:10px 12px;
          border:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          border-radius: 14px;
          color: var(--ai-text);
          font-size:12px;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
        .ai-opt label{
          display:flex;
          align-items:center;
          gap:8px;
          user-select:none;
          cursor:pointer;
          opacity:.95;
        }
        .ai-opt input{ transform: translateY(1px); }
        .ai-modal-foot{
          padding:12px;
          display:flex;
          gap:8px;
          align-items:center;
          justify-content:space-between;
          border-top:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.02);
        }
        .ai-modal-left, .ai-modal-right{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      `}</style>

      <input
        ref={fileInputRef}
        className="ai-file"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadSpreadsheetFile(f);
        }}
      />

      <button
        type="button"
        className="ai-fab"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus?.(), 0);
        }}
        aria-label="Abrir chat IA"
        title="Abrir chat IA"
      >
        IA
      </button>

      {pdfEditorOpen && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setPdfEditorOpen(false)}
          onKeyDownCapture={stopKeysCapture}
          onKeyUpCapture={stopKeysCapture}
          onKeyPressCapture={stopKeysCapture}
        >
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-head">
              <div className="ai-modal-title">Editor de PDF</div>
              <div className="ai-modal-right">
                <button type="button" className="ai-btn" onClick={loadPdfFromLastAssistant} disabled={busy}>
                  Cargar último
                </button>
                {sheetDigest && (
                  <button type="button" className="ai-btn" onClick={loadPdfFromSheetSummary} disabled={busy || sheetBusy}>
                    Cargar resumen planilla
                  </button>
                )}
                <button type="button" className="ai-btn ai-btn-ghost" onClick={() => setPdfDraftText("")} disabled={busy}>
                  Limpiar
                </button>
                <button type="button" className="ai-btn ai-btn-ghost" onClick={() => setPdfEditorOpen(false)}>
                  Cerrar
                </button>
              </div>
            </div>

            <div className="ai-modal-body">
              <div className="ai-opt">
                <label>
                  <input
                    type="checkbox"
                    checked={!!pdfOptions.includeContext}
                    onChange={(e) => setPdfOptions((p) => ({ ...p, includeContext: e.target.checked }))}
                  />
                  Incluir contexto (Categoría/Lugar/Evento)
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={!!pdfOptions.includeSheetMeta}
                    onChange={(e) => setPdfOptions((p) => ({ ...p, includeSheetMeta: e.target.checked }))}
                  />
                  Incluir datos de planilla (archivo/hoja/filas/columnas)
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={!!pdfOptions.includeGeneratedStamp}
                    onChange={(e) => setPdfOptions((p) => ({ ...p, includeGeneratedStamp: e.target.checked }))}
                  />
                  Incluir línea “Contenido generado…”
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={!!pdfOptions.includeVisual}
                    onChange={(e) => setPdfOptions((p) => ({ ...p, includeVisual: e.target.checked }))}
                  />
                  Incluir resumen visual (capturas del dashboard)
                </label>
              </div>

              <textarea
                className="ai-modal-textarea"
                value={pdfDraftText}
                onChange={(e) => setPdfDraftText(e.target.value)}
                placeholder="Pegue o edite aquí el contenido que quiere que salga en el PDF. Este texto es lo que se imprime como “Informe”."
              />
            </div>

            <div className="ai-modal-foot">
              <div className="ai-modal-left">
                <button
                  type="button"
                  className="ai-btn ai-btn-primary"
                  onClick={() => downloadPdf(pdfDraftText, pdfOptions)}
                  disabled={busy || !String(pdfDraftText || "").trim()}
                >
                  Descargar PDF (con este texto)
                </button>
              </div>
              <div className="ai-modal-right">
                <button type="button" className="ai-btn ai-btn-ghost" onClick={() => setPdfEditorOpen(false)}>
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <section
          className="ai-drawer"
          role="dialog"
          aria-modal="false"
          onKeyDownCapture={stopKeysCapture}
          onKeyUpCapture={stopKeysCapture}
          onKeyPressCapture={stopKeysCapture}
        >
          <header className="ai-head">
            <div className="ai-title">
              <strong>{title}</strong>
              <span className="ai-sub">{model ? `Firebase AI · ${modelName}` : "IA no inicializada"}</span>
            </div>

            <div className="ai-head-actions">
              <button
                type="button"
                className="ai-btn"
                onClick={() => fileInputRef.current?.click?.()}
                disabled={busy || sheetBusy}
                title="Cargar archivo XLSX/CSV para análisis"
              >
                {sheetBusy ? "Cargando planilla" : "Cargar planilla"}
              </button>

              {sheetDigest && (
                <button type="button" className="ai-btn" onClick={showSheetSummary} disabled={busy || sheetBusy} title="Ver resumen de planilla (sin IA)">
                  Resumen planilla
                </button>
              )}

              {sheetDigest && (
                <button type="button" className="ai-btn" onClick={clearSpreadsheet} disabled={busy || sheetBusy} title="Quitar planilla">
                  Quitar planilla
                </button>
              )}

              {isDash && (
                <>
                  <button
                    type="button"
                    className="ai-btn"
                    onClick={openPdfEditor}
                    disabled={!model || busy}
                    title="Editar qué va al PDF y descargar"
                  >
                    Editar PDF
                  </button>

                  <button
                    type="button"
                    className="ai-btn"
                    onClick={() => downloadPdf(null, pdfOptions)}
                    disabled={!model || busy}
                    title="Descargar PDF usando el último mensaje del asistente"
                  >
                    Descargar PDF
                  </button>
                </>
              )}

              <button type="button" className="ai-btn ai-btn-ghost" onClick={clearChat} title="Limpiar chat">
                Limpiar
              </button>

              <button type="button" className="ai-btn ai-btn-ghost" onClick={() => setOpen(false)} title="Cerrar">
                Cerrar
              </button>
            </div>
          </header>

          <div className="ai-context">
            <div className="ai-chip">
              <b>Cat:</b> {context.categoria || "—"}
            </div>
            <div className="ai-chip">
              <b>Lugar:</b> {context.lugar || "—"}
            </div>
            <div className="ai-chip">
              <b>Evento:</b> {context.evento || "—"}
            </div>

            <div className="ai-chip ai-chip-muted">
              <b>Planilla:</b>{" "}
              {sheetDigest
                ? `${sheetDigest.fileName} (${sheetDigest.totalRows} filas, analizadas ${sheetDigest.processedRows}${sheetDigest.truncated ? " muestra" : ""})`
                : "No"}
            </div>

            {sheetDigest?.sheets?.length > 1 && (
              <div className="ai-chip">
                <b>Hoja:</b>{" "}
                <select
                  value={activeSheetName || sheetDigest.activeSheet || ""}
                  onChange={(e) => setActiveSheetName(e.target.value)}
                  disabled={busy || sheetBusy}
                  style={{
                    marginLeft: 8,
                    background: "rgba(255,255,255,.06)",
                    color: "rgba(240,245,255,.92)",
                    border: "1px solid rgba(255,255,255,.14)",
                    borderRadius: 10,
                    padding: "4px 8px",
                    outline: "none",
                  }}
                >
                  {(sheetDigest.sheets || []).map((s) => (
                    <option key={s} value={s} style={{ color: "#0b1220" }}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!!sheetErr && <div className="ai-error">{sheetErr}</div>}

          <div className="ai-quick">
            {quickActions.map((a) => (
              <button key={a.label} type="button" className="ai-quick-btn" onClick={() => send(a.text)} disabled={busy || !model}>
                {a.label}
              </button>
            ))}
          </div>

          <div className="ai-list" ref={listRef}>
            {msgs.length === 0 ? (
              <div className="ai-empty">
                <div>
                  <div className="ai-empty-title">Solicitud</div>
                  <div className="ai-empty-sub">
                    Ejemplo: “Analizá la planilla y armá un informe” o “Top 10 por columna X”. También puede cargar una planilla.
                  </div>
                </div>
              </div>
            ) : (
              msgs.map((m) => (
                <article key={m.id} className={`ai-msg ${m.role === "user" ? "is-user" : "is-ai"}`}>
                  <div className="ai-bubble">
                    <div className="ai-role">
                      {m.role === "user" ? "Usuario" : "Asistente"}
                      <span className="ai-time">
                        {new Date(m.ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <pre className="ai-text">{m.text}</pre>

                    {m.role === "assistant" && typeof onApplyText === "function" && (
                      <div className="ai-apply">
                        <button type="button" className="ai-btn ai-btn-primary" onClick={() => applyFromAssistant(m.text, "replace")}>
                          Reemplazar observaciones
                        </button>
                        <button type="button" className="ai-btn" onClick={() => applyFromAssistant(m.text, "append")}>
                          Agregar al final
                        </button>

                        {isDash && (
                          <button
                            type="button"
                            className="ai-btn"
                            onClick={() => {
                              setPdfDraftText(normalizeAssistantText(m.text));
                              setPdfEditorOpen(true);
                            }}
                            title="Editar este mensaje y exportarlo a PDF"
                          >
                            Exportar este a PDF
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          <footer className="ai-foot">
            <textarea
              ref={inputRef}
              className="ai-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder='Escriba su mensaje (Ctrl+Enter para enviar). Ej: "Armá un informe en base a la planilla cargada".'
              rows={2}
              disabled={busy || !model}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === "Enter") {
                  e.preventDefault();
                  send(draft);
                }
              }}
            />
            <button type="button" className="ai-send" onClick={() => send(draft)} disabled={busy || !model || !draft.trim()} title="Enviar">
              {busy ? "Procesando" : "Enviar"}
            </button>
          </footer>

          {!!err && <div className="ai-error">{err}</div>}
        </section>
      )}
    </>
  );
}
