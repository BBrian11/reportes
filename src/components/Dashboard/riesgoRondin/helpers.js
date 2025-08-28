export const OPERARIOS_DEFAULT = ["Brisa","Luis","Bruno","Benjamín","Denise","Pedro","Romina"];
export const MAX_TANDAS = 20;
export const CANALES_OPCIONES = Array.from({ length: 64 }, (_, i) => i + 1);
// helpers.js
// helpers.js
// helpers.js (ejemplo)
export const ESTADOS = [
  { key: "ok",    label: "OK",    color: "#16a34a" },
  { key: "medio", label: "Medio", color: "#f59e0b" },
  { key: "grave", label: "Grave", color: "#ef4444" },
];

export function estadoMeta(k) {
  const def = { label: "Sin estado", color: "#9ca3af" };
  return ESTADOS.find(e => e.key === k) || def;
}

export const nuevaTanda = (id = Date.now()) => ({
  id: `tanda-${id}`,
  cliente: "",
  resumen: "",
  camaras: [{
    id: `cam-${id}-1`,
    canal: 1,
    estado: null,
    estadoPrevio: null,   // 👈 necesario para colorear por estado anterior
    nota: "",
    touched: false,
    history: [],          // 👈 seguimiento de cambios
  }],
  checklist: {
    grabacionesOK: null,
    grabacionesFallan: { cam1:false, cam2:false, cam3:false, cam4:false },
    cortes220v: null,
    equipoOffline: null,
  },
});


export const MIN_CAMERAS_REQUIRED = 0;

export const RISK_WHITELIST = ["LOMAS DE PETION","CHACRA PETION","DROGUERIA BETAPHARMA","LA CASCADA", "TGS BRANDSEN", ];
export const norm = (s = "") =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toUpperCase();
export const RISK_SET = new Set(RISK_WHITELIST.map(norm));



export const ESTADO_KEYS = ["ok", "medio", "grave"];
export const isEstadoKey = (v) => ESTADO_KEYS.includes(v);

// ya tenés esto:

export const shuffle = (arr) =>
  arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(([,v])=>v);

export const hh = (ms) => String(Math.floor(ms / 3600000)).padStart(2, "0");
export const mm = (ms) => String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
export const ss = (ms) => String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
