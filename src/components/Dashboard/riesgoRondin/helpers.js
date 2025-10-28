// src/components/Dashboard/riesgoRondin/helpers.js

// === Estados de cámara (única definición) ===
export const ESTADOS = [
  { key: "ok",    label: "OK",    color: "#16a34a" },
  { key: "medio", label: "Medio", color: "#f59e0b" },
  { key: "grave", label: "Grave", color: "#ef4444" },
];

export function estadoMeta(k) {
  const def = { label: "Sin estado", color: "#64748b" };
  return ESTADOS.find((e) => e.key === k) || def;
}

// === Opciones de canal ===
// Preferí este en los <Select> para evitar “[object Object]”
export const CANALES_OPCIONES = Array.from({ length: 64 }, (_, i) => i + 1);

// Si en algún Autocomplete querés objetos:
export const CANALES_OPCIONES_OBJ = CANALES_OPCIONES.map((n) => ({ value: n, label: String(n) }));

// === Normalizador de canal (SIEMPRE usarlo al leer/escribir "canal") ===
// Acepta number, string ("5" o "Cámara 5") u objeto { value|id|canal|key|name|label }
export const toChannelNumber = (v) => {
  const pick = (x) => x?.value ?? x?.id ?? x?.canal ?? x?.key ?? x?.name ?? x?.label ?? null;

  const parseNum = (x) => {
    if (typeof x === "number") return x;
    if (typeof x === "string") {
      const m = x.match(/\d+/);            // extrae 12 de "Cámara 12"
      return m ? Number(m[0]) : NaN;
    }
    return NaN;
  };

  let n = NaN;
  if (v == null) n = NaN;
  else if (typeof v === "object") n = parseNum(pick(v));
  else n = parseNum(v);

  if (!Number.isFinite(n) || n < 1) n = 1;
  if (n > 64) n = 64;
  return n;
};

// === Valores/constantes compartidos ===
export const MAX_TANDAS = 64;
export const OPERARIOS_DEFAULT = [
  "Brisa","Luis","Bruno","Benjamín","Denise","Pedro","Romina","Martín","Juan"
];

export const norm = (s = "") =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toUpperCase();

export const ESTADO_KEYS = ["ok", "medio", "grave"];
export const isEstadoKey = (v) => ESTADO_KEYS.includes(v);

export const shuffle = (arr) =>
  arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

export const hh = (ms) => String(Math.floor(ms / 3600000)).padStart(2, "0");
export const mm = (ms) => String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
export const ss = (ms) => String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");

// === Modelo de nueva tanda ===
export function nuevaTanda(id = Date.now()) {
  return {
    id: `tanda-${id}`,
    cliente: "",
    resumen: "",
    // 👇 sin cámaras iniciales
    camaras: [],
    checklist: {
      grabacionesOK: null,
      cortes220v: null,
      equipoHora: null,
      equipoOffline: null,
    },
  };
}



// Por ahora sin mínimo global de cámaras obligatorias
export const MIN_CAMERAS_REQUIRED = 0;
