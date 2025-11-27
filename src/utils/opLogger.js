// src/utils/opLogger.js
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/** ======== Estado global simple ======== */
const OPLOG_NS = "__G3T_OPLOG__";
function getState() {
  if (!window[OPLOG_NS]) {
    window[OPLOG_NS] = {
      db: null,
      sessionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      baseMeta: {},
      queueKey: "g3t_oplog_queue",
      flushInFlight: false,
    };
  }
  return window[OPLOG_NS];
}

/** ======== Utils seguros ======== */
function safeString(v, max = 1000) {
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > max ? s.slice(0, max) + "…[trim]" : s;
  } catch {
    return String(v);
  }
}
function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => (out[k] = obj?.[k]));
  return out;
}
function getUA() {
  const n = window.navigator || {};
  return {
    ua: n.userAgent || "",
    lang: n.language || "",
    online: !!n.onLine,
    platform: n.platform || "",
  };
}
function getScreen() {
  const s = window.screen || {};
  return { w: s.width || null, h: s.height || null, dpr: window.devicePixelRatio || 1 };
}
function getLocals() {
  return {
    path: (window.location && (window.location.pathname + window.location.search)) || "",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    nowLocal: new Date().toISOString(),
  };
}

/** ======== Cola offline (localStorage) ======== */
function readQueue() {
  const { queueKey } = getState();
  try {
    return JSON.parse(localStorage.getItem(queueKey) || "[]");
  } catch {
    return [];
  }
}
function writeQueue(arr) {
  const { queueKey } = getState();
  try {
    localStorage.setItem(queueKey, JSON.stringify(arr));
  } catch {}
}
async function flushQueue() {
  const st = getState();
  if (st.flushInFlight || !st.db) return;
  const q = readQueue();
  if (!q.length) return;

  st.flushInFlight = true;
  try {
    const col = collection(st.db, "bitacora-operador");
    const keep = [];
    for (const payload of q) {
      try {
        await addDoc(col, payload);
      } catch {
        keep.push(payload); // si falla, lo mantenemos
      }
    }
    writeQueue(keep);
  } finally {
    st.flushInFlight = false;
  }
}

/** ======== Init ======== */
export function initOpLogger(db, baseMeta = {}) {
  const st = getState();
  st.db = db || st.db;
  st.baseMeta = { ...st.baseMeta, ...baseMeta };

  // Intentamos flush al iniciar y cuando vuelve la conexión
  flushQueue();
  window.removeEventListener("online", flushQueue);
  window.addEventListener("online", flushQueue);
}

/** ======== Core sender ======== */
async function sendOrQueue(payload) {
  const st = getState();
  const col = st.db ? collection(st.db, "bitacora-operador") : null;

  // Si no hay DB o estamos offline → queue
  if (!col || (typeof navigator !== "undefined" && navigator && navigator.onLine === false)) {
    const q = readQueue();
    q.push(payload);
    writeQueue(q);
    return;
  }

  try {
    await addDoc(col, payload);
  } catch {
    // si falla, a la cola
    const q = readQueue();
    q.push(payload);
    writeQueue(q);
  }
}

/** ======== API pública ======== */
export async function logOp(db, action, meta = {}) {
  try {
    // db opcional: si no viene, usamos el de init
    if (db) initOpLogger(db);

    const st = getState();
    const auth = getAuth();
    const u = auth?.currentUser || null;

    const operadorEmail =
      u?.email ||
      window.__G3T_USER_EMAIL ||
      localStorage.getItem("g3t_user_email") ||
      sessionStorage.getItem("g3t_user_email") ||
      "";

    const operador =
      meta.operador ||
      localStorage.getItem("g3t_last_operador") ||
      (operadorEmail ? (operadorEmail.split("@")[0] || "").replace(/\./g, " ") : "");

    const payload = {
      ts: serverTimestamp(),
      action: String(action || "").slice(0, 80), // breve
      operador: (operador || "").trim(),
      operadorEmail: operadorEmail || "",
      categoria: meta.categoria || "",
      lugar: meta.lugar || "",
      evento: meta.evento || "",
      estado: meta.estado || "",
      requiereGrabacion: meta.requiereGrabacion ?? "",
      detalle: safeString(meta.detalle ?? "", 1500),
      extra: meta.extra ? JSON.parse(safeString(meta.extra, 4000)) : null,
      reqId:
        meta.reqId ||
        getState().baseMeta?.reqId ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      // contexto enriquecido
      __ctx: {
        ...getUA(),
        ...getScreen(),
        ...getLocals(),
        sessionId: getState().sessionId,
        app: getState().baseMeta?.app || "",
        appVersion: getState().baseMeta?.appVersion || "",
      },
    };

    await sendOrQueue(payload);
  } catch (e) {
    console.warn("[opLogger] fallo al registrar acción:", action, e);
  }
}

/** Helpers semánticos */
export function logView(meta = {}) {
  return logOp(null, "view", { detalle: "view", ...meta });
}
export function logFilterChange(meta = {}) {
  return logOp(null, "filter_change", meta);
}
export function logError(meta = {}) {
  return logOp(null, "error", meta);
}
