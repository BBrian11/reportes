// src/pages/NovedadesWizardPro.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import "../../styles/novedades-form.css";

 import NotificationsBridge from "../common/NotificationsBridge.jsx";
 import useNotifications from "./hooks/useNotifications.js";
/* Firebase (modular) */
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/* ⚠️ En producción usá env vars (VITE_*, NEXT_PUBLIC_* o .env) */
const firebaseConfig = {
  apiKey: "AIzaSyCZcj7AOQoXHHn1vDiyoCQbDIQRMfvhOlA",
  authDomain: "reportesg3t.firebaseapp.com",
  projectId: "reportesg3t",
  storageBucket: "reportesg3t.firebasestorage.app",
  messagingSenderId: "571918948751",
  appId: "1:571918948751:web:055d012f4e1f3f8de5d3fa",
  measurementId: "G-P7T4BRND8L",
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/* ===== Catálogos ===== */
const OPERADORES = ["Operador 1", "Operador 2", "Operador 3", "Operador 4", "Operador 5", "Operador 6"];

const EVENTOS = {
  tgs: [
    "Ingreso de Personal (Apertura de Alarma)",
    "Salida de Personal (Cierre de Alarma)",
    "Corte de energía eléctrica",
    "Restauración de energía eléctrica",
    "Evento Confirmado",
    "Evento NO confirmado (Falso positivo)",
    "Dispositivo CCTV fuera de línea",
  ],
  vtv: [
    "Corte de energía eléctrica",
    "Restauración de energía eléctrica",
    "Evento Confirmado",
    "Evento NO confirmado (Falso positivo)",
    "Dispositivo CCTV fuera de línea",
    "Falla del servicio de internet",
  ],
  edificios: [
    "Puerta Mantenida Abierta (PMA)",
    "Puerta Forzada (Intrusión)",
    "Evento - Encargado",
    "Portón Mantenido Abierto (PMA)",
    "Evento Confirmado",
    "Evento NO confirmado (Falso positivo)",
    "Puerta cerrada con llave",
    "Dispositivo CCTV fuera de línea",
    "Corte de energía eléctrica",
    "Restauración de energía eléctrica",
    "Alarma de incendio",
    "Alarma Tamper",
    "Botón de pánico",
    "Pánico de App",
    "Código de coacción",
    
  ],
  barrios: [
    "Corte de energía eléctrica",
    "Restauración de energía eléctrica",
    "Evento Confirmado",
    "Evento NO confirmado (Falso positivo)",
    "Dispositivo CCTV fuera de línea",
    "Apertura de Alarma",
    "Falla del servicio de internet",
  ],
  otros: [
    "Evento Interno - Centro de Monitoreo",
    "Descarga de grabaciones",
    "Persona sospechosa detectada",
    "Vehículo sospechoso detectado",
    "Objeto sospechoso detectado",
    "Ingreso NO autorizado en zona restringida",
    "Falla de red o comunicación",
    "Falla en servidor de video",
    "Intento de sabotaje a la cámara",
    "Intento de sabotaje a la alarma",
    "Intento de sabotaje a cerradura electrónica",
  ],
};

const CONTACTOS_INTRUSION = [
  "Supervisor","Encargado","Residente","Administración","Seguridad privada",
  "Policía / 911","Bomberos","Emergencias médicas","Vecino de referencia","Otro…",
];

const LUGAR_LABEL = {
  tgs: "¿En qué Punto de Medición o Planta?",
  vtv: "¿En qué Planta?",
  edificios: "Seleccione el Edificio",
  barrios: "¿En qué barrio?",
  otros: "¿En qué lugar?",
};

const OPERADOR_NAME = {
  tgs: "operador-tgs",
  vtv: "operador-vtv",
  edificios: "operador-edificios",
  barrios: "operador-barrios",
  otros: "operador-otros",
};

const LUGAR_NAME = {
  tgs: "locaciones-tgs",
  vtv: "planta-vtv",
  edificios: "edificio",
  barrios: "barrio",
  otros: "otro",
};

const EVENTO_NAME = {
  tgs: "evento-tgs",
  vtv: "evento-vtv",
  edificios: "evento-edificio",
  barrios: "evento-barrios",
  otros: "evento-otros",
};
/* ===== SOP ===== */
const SOP = {
  "Puerta Mantenida Abierta (PMA)": {
    def: "Puerta de acceso abierta más tiempo del permitido.",
    pasos: ["Fijar cámara del acceso.","Observar si hay riesgo de intrusión.","Contactar residente/encargado.","Esperar 5 min y escalar si no responde.","Confirmar cierre visualmente."],
    registro: ["Hora señal","Persona contactada","Resolución"],
    quick: { timers: [{ label: "Esperar respuesta (5 min)", sec: 300 }] },
  },
  "Portón Mantenido Abierto (PMA)": {
    def: "Portón vehicular permanece abierto más del tiempo permitido.",
    pasos: ["Fijar cámara","Verificar riesgos","Contactar encargado","Escalar si no responde","Confirmar cierre"],
    registro: ["Hora","Contacto","Cierre/Escalamiento"],
    quick: { timers: [{ label: "Esperar respuesta (5 min)", sec: 300 }] },
  },
  "Puerta Forzada (Intrusión)": {
    def: "Apertura no autorizada o sabotaje de sensor.",
    pasos: ["Verificar control de accesos","Analizar cámaras","Activar protocolo si hay indicios","Notificar 911/supervisor"],
    registro: ["Hora exacta","Identificación posible","Acciones","Evidencia"],
    quick: { warn: "⚠️ Intrusión: avisar fuerzas y supervisor de inmediato." },
  },
  "Corte de energía eléctrica": {
    def: "Interrupción del suministro eléctrico.",
    pasos: ["Confirmar señal","Verificar UPS","Corroborar CCTV/NVR","Informar si hay impacto general"],
    registro: ["Hora","Equipos afectados","Duración/Medidas"],
  },
  "Restauración de energía eléctrica": {
    def: "Vuelve el suministro tras un corte.",
    pasos: ["Confirmar restauración","Verificar sistemas","Registrar normalización"],
    registro: ["Hora restablecimiento","Estado","Anomalías"],
  },
};

/* ===== Campos extra por evento (base, sin "-") ===== */
const EXTRA_FIELDS = {
  edificios: {
    "Puerta Mantenida Abierta (PMA)": [
      {
        type: "select",
        name: "razones-pma",
        label: "Razones de PMA",
        required: true,
        options: [
          "Ingreso/egreso habitual",

          /* NUEVAS OPCIONES (solicitadas) */
          "Paquetería",
          "Delivery",
          "No verifica cierre",
          "Vecinos conversando",
          "Mudanza",
          "Dificultad motora",
          "Tiempo insuficiente",

          /* Existentes (se conservan) */
          "Mantenimiento / servicio",
          "Traslado de elementos",
          "Asistencia a persona mayor / movilidad reducida",
          "Maniobra con cochecito / silla de ruedas",
          "Puerta con retardo de cierre",
          "Tiempo insuficiente para el paso",
          "Reunión breve en hall",
          "Visitas",
          "Mudanza programada",
          "Ventilación / limpieza momentánea",
          "Otros",
        ],
      },
      {
        type: "select",
        name: "respuesta-residente",
        label: "Respuesta del residente",
        required: true,
        options: [], // dinámico con getFieldOptions
      },
      {
        type: "select",
        name: "resolusion-evento",
        label: "¿Cómo se resolvió?",
        required: true,
        options: [], // dinámico con getFieldOptions
      },
    ],

    "Portón Mantenido Abierto (PMA)": [
      {
        type: "text",
        name: "vehiculos-en-cola",
        label: "¿Hay vehículos en cola? (detalle opcional)",
        required: false,
        placeholder: "Ej: 3 vehículos esperando",
      },
      {
        type: "select",
        name: "resolusion-evento",
        label: "¿Cómo se resolvió?",
        required: true,
        options: [], // dinámico con getFieldOptions
      },
    ],

    "Puerta Forzada (Intrusión)": [
      {
        type: "select",
        name: "evidencia-visual",
        label: "¿Evidencia visual de intrusión?",
        required: true,
        options: ["Sí", "No"],
      },
      {
        type: "select",
        name: "quien-contactado",
        label: "¿A quién se contactó?",
        required: true,
        options: CONTACTOS_INTRUSION, // conserva "Otro…"
      },
      {
        type: "text",
        name: "quien-contactado-otro",
        label: "Especificá a quién",
        required: true,
        placeholder: "Ej: Guardia nocturna de edificio",
      },
      {
        type: "select",
        name: "fuerzas-notificadas",
        label: "¿Se notificó a fuerzas?",
        required: true,
        options: [], // dinámico con getFieldOptions
      },
    ],
  },

  tgs: {
    "Ingreso de Personal (Apertura de Alarma)": [
      { type: "text", name: "proveedor-personal", label: "Nombre del proveedor/personal", required: true,  placeholder: "Ej: Juan Pérez" },
      { type: "text", name: "motivo-ingreso",     label: "Motivo del ingreso",            required: true,  placeholder: "Mantenimiento / Entrega / Auditoría" },
    ],
    "Salida de Personal (Cierre de Alarma)": [
      { type: "text", name: "proveedor-personal", label: "Nombre del proveedor/personal", required: false, placeholder: "Ej: Juan Pérez" },
    ],
  },

  vtv: {
    "Falla del servicio de internet": [
      { type: "text", name: "proveedor-internet", label: "Proveedor de internet (opcional)", required: false, placeholder: "Ej: ISP de la planta" },
    ],
  },
};

/* ========== RESPUESTAS SUGERIDAS ========== */
const RESPUESTAS_SUGERIDAS = {
  general: [
    "Se verifica señal y estado de cámaras.",
    "Se informa a la administración y se deja constancia.",
    "Se mantiene monitoreo activo hasta normalización.",
  ],
  "Puerta Mantenida Abierta (PMA)": [
    "Se fija cámara al acceso y se alerta a encargado/residente.",
    "Se solicita cierre inmediato y se aguarda 5 minutos.",
    "Se confirma cierre visual y se normaliza el evento.",
  ],
  "Portón Mantenido Abierto (PMA)": [
    "Se visualiza portón abierto y flujo vehicular.",
    "Se informa a encargado y se solicita cierre del portón.",
    "Se confirma cierre y circulación normal.",
  ],
  "Puerta Forzada (Intrusión)": [
    "Se detecta apertura no autorizada en acceso.",
    "Se verifica en CCTV y se activa protocolo de alarma.",
    "Se notifica a 911 y al supervisor de turno.",
  ],
  "Corte de energía eléctrica": [
    "Se confirma corte y estado de UPS/NVR.",
    "Se informa impacto operacional al contacto de sitio.",
    "Se continúa supervisión hasta restablecimiento.",
  ],
  "Restauración de energía eléctrica": [
    "Se confirma restablecimiento de energía.",
    "Se verifican subsistemas (CCTV/Accesos/NVR).",
    "Se registra normalización sin anomalías.",
  ],
};
/* === Patch append-only: añadir razones PMA sin modificar arrays existentes === */
(() => {
  try {
    const target = EXTRA_FIELDS?.edificios?.["Puerta Mantenida Abierta (PMA)"]?.[0]?.options;
    if (!Array.isArray(target)) return;
    const toAdd = [
      "Paquetería",
      "Delivery",
      "No verifica cierre",
      "Vecinos conversando",
      "Mudanza",
      "Dificultad motora",
      "Tiempo insuficiente",
    ];
    toAdd.forEach(opt => { if (!target.includes(opt)) target.push(opt); });
  } catch (e) {
    console.warn("Patch PMA razones no aplicado:", e);
  }
})();
/* === Patch append-only: compat dinámicos PMA para nuevas etiquetas === */
(() => {
  if (typeof getFieldOptions !== "function") return;
  const _origGetFieldOptions = getFieldOptions;

  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();

  const isOperacionPuntual = (rz) => {
    const r = norm(rz);
    return [
      "paqueteria",
      "delivery",
      "mantenimiento / servicio",
      "traslado de elementos",
      "mudanza",
      "mudanza programada",
      "visitas"
    ].includes(r);
  };
  const isMovilidadReducida = (rz) => {
    const r = norm(rz);
    return [
      "dificultad motora",
      "asistencia a persona mayor / movilidad reducida",
      "maniobra con cochecito / silla de ruedas"
    ].includes(r);
  };
  const isTiempoORetardo = (rz) => {
    const r = norm(rz);
    return r === "tiempo insuficiente" || r === "tiempo insuficiente para el paso" || r === "puerta con retardo de cierre";
  };

  // Helper para deduplicar manteniendo orden (append)
  const dedupAppend = (arr, extras=[]) => {
    const set = new Set(arr);
    extras.forEach(x => { if (x && !set.has(x)) arr.push(x); });
    return arr;
  };

  getFieldOptions = function(ctx) {
    const opts = _origGetFieldOptions(ctx);
    if (!ctx || ctx.categoria !== "edificios" || ctx.evento !== "Puerta Mantenida Abierta (PMA)") return opts;

    const razon = ctx?.form?.extras?.["razones-pma"];
    if (!razon) return opts;

    // Complementa dinámicos para nuevas razones:
    if (ctx.name === "respuesta-residente") {
      const extras = [];
      if (isMovilidadReducida(razon)) {
        extras.push("Indicó movilidad reducida y actuó en consecuencia");
      }
      if (isOperacionPuntual(razon)) {
        extras.push("Indicó operación puntual autorizada y procedió al cierre");
      }
      if (norm(razon) === "puerta con retardo de cierre") {
        extras.push("Mencionó retardo de cierre; se verificó funcionamiento");
      }
      return dedupAppend([...opts], extras);
    }

    if (ctx.name === "resolusion-evento") {
      const extras = [];
      if (isTiempoORetardo(razon) || isOperacionPuntual(razon)) {
        extras.push("Se normaliza por cierre automático / retardo");
      }
      return dedupAppend([...opts], extras);
    }

    return opts;
  };
})();
/* === Patch append-only: agrega 4 respuestas "negativas" para PMA === */
(() => {
  if (typeof getFieldOptions !== "function") return;
  const _orig = getFieldOptions;

  getFieldOptions = function (ctx) {
    const opts = _orig(ctx);
    if (
      ctx &&
      ctx.categoria === "edificios" &&
      ctx.evento === "Puerta Mantenida Abierta (PMA)" &&
      ctx.name === "respuesta-residente"
    ) {
      const extras = [
        "No atendió el teléfono ni contestó mensajes",
        "Expresó que no volvería a cerrar la puerta",
        "Dijo que NO fue intencional, que NO le alcanzó el tiempo",
        "Cerró con llave y se negó a revertir la situación",
      ];
      const out = Array.isArray(opts) ? [...opts] : [];
      extras.forEach(x => { if (!out.includes(x)) out.push(x); });
      return out;
    }
    return opts;
  };
})();

/* Utils */
const getArgentinaTimestamp = () => Timestamp.fromDate(new Date());
const normalizar = (txt) => (txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
function Label({ children }) { return <label className="lbl">{children}</label>; }
function KV({ k, v }) { return (<><dt>{k}</dt><dd>{v}</dd></>); }
function labelFor(k) {
  switch (k) { case "tgs": return "TGS"; case "vtv": return "VTV"; case "edificios": return "Edificios"; case "barrios": return "Barrios"; case "otros": return "Otros"; default: return k || "-"; }
}



/* === PATCH: Vista previa del envío === */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function serializeForPreview(x) {
  if (!x) return x;
  if (x instanceof Timestamp) {
    const d = x.toDate();
    return {
      _type: "Timestamp",
      local: d.toLocaleString("es-AR"),
      iso: d.toISOString(),
      seconds: x.seconds,
      nanoseconds: x.nanoseconds,
    };
  }
  if (Array.isArray(x)) return x.map(serializeForPreview);
  if (typeof x === "object") {
    const out = {};
    for (const k of Object.keys(x)) out[k] = serializeForPreview(x[k]);
    return out;
  }
  return x;
}
function pruneEmpty(obj) {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(pruneEmpty).filter(v => v !== undefined);
  if (typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) {
      const v = pruneEmpty(obj[k]);
      if (v === "" || v === null || v === undefined) continue;
      out[k] = v;
    }
    return out;
  }
  return obj;
}

async function confirmEnvio({ categoria, data, imagenes }) {
  // serializamos Timestamps, limpiamos vacíos y armamos preview
  const clean = pruneEmpty(serializeForPreview({
    categoria,
    collectionPath: `novedades/${categoria}/eventos`,
    data,
    imagenes: (imagenes ? Array.from(imagenes).map(f => ({
      name: f.name, type: f.type, size: f.size
    })) : []),
  }));

  const pretty = JSON.stringify(clean, null, 2);
  window.__LAST_ENVIO_PREVIEW__ = clean; // para inspección en consola si querés

  const { isConfirmed } = await Swal.fire({
    title: "Confirmar envío",
    html: `
      <div style="text-align:left">
        <p style="margin:0 0 8px"><b>Colección</b>: ${clean.collectionPath}</p>
        <p style="margin:0 0 12px"><b>Imágenes</b>: ${clean.imagenes?.length || 0}</p>
        <pre style="
          white-space:pre-wrap; word-break:break-word; max-height:50vh; overflow:auto;
          padding:12px; background:#0f172a10; border-radius:8px; border:1px solid #e5e7eb;
          font-size:12px; line-height:1.5;"
        >${escapeHtml(pretty)}</pre>
      </div>
    `,
    width: 900,
    showCancelButton: true,
    confirmButtonText: "Confirmar y enviar",
    cancelButtonText: "Volver a editar",
    focusConfirm: false,
  });

  return isConfirmed;
}
// Helper: diff plano (primitivos/strings/fechas/arrays simples)
// === PREVIEW MINIMALISTA: solo confirmar o cancelar ===
async function previewEnvio({ categoria, data, imagenes, original = null, editId = null }) {
  const isEdit = !!(original || editId);
  const { isConfirmed } = await Swal.fire({
    title: isEdit ? "¿Guardar cambios?" : "¿Enviar registro?",
    text: isEdit ? "Se actualizará el evento existente." : "Se creará un nuevo evento.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: isEdit ? "Guardar" : "Enviar",
    cancelButtonText: "Cancelar",
    allowOutsideClick: false,
    allowEscapeKey: true,
  });
  return isConfirmed;
}

function generateUnidadOptions() {
  const out = [], pisos = 12, unidadesPorPiso = 5, letras = ["A","B","C","D","E","F","G"], prefNum = ["Cochera","Local","Portón","Piso"], esp = 20, unicos = ["Encargado","Sala de Maquinas","SUM","Bunker"];
  for (let p=1;p<=pisos;p++) for (let u=1;u<=unidadesPorPiso;u++) out.push(`${p}${String(u).padStart(2,"0")}`);
  for (let p=1;p<=pisos;p++) letras.forEach(L=>out.push(`${p}${L}`));
  for (let p=1;p<=pisos;p++) for (let u=1;u<=unidadesPorPiso;u++) out.push(`${p}-${u}`);
  prefNum.forEach(pre=>{ for (let n=1;n<=esp;n++) out.push(`${pre} ${n}`);});
  unicos.forEach(x=>out.push(x));
  return out;
}
function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }
function pulse(el, times = 2) {
  if (!el) return;
  el.animate([{boxShadow:'0 0 0 0 rgba(37,99,235,0.0)'},{boxShadow:'0 0 0 6px rgba(37,99,235,.25)'}], {duration:380, iterations:times, direction:'alternate'});
}
function scrollIntoViewSafe(el) {
  if (!el) return;
  try { el.scrollIntoView({behavior:'smooth', block:'center'}); } catch {}
  pulse(el);
}

/* ===== Opciones dinámicas ===== */
function getFieldOptions({ categoria, evento, name, form }) {
  const base = ((EXTRA_FIELDS[categoria] || {})[evento] || []).find(f => f.name === name);
  const def = base?.options || [];

  if (categoria === "edificios") {
    if (evento === "Puerta Mantenida Abierta (PMA)") {
      const razon = form.extras?.["razones-pma"] || "";

      if (name === "respuesta-residente") {
        const comunes = [
          "Cerró de inmediato al ser notificado",
          "Se encontraba en tránsito y regresó a cerrar",
          "Compromiso de verificar cierre en lo sucesivo",
          "Solicitó asistencia para cerrar",
        ];
        const segunRazon = [];
        if ([
          "Asistencia a persona mayor / movilidad reducida",
          "Maniobra con cochecito / silla de ruedas"
        ].includes(razon)) {
          segunRazon.push("Indicó movilidad reducida y actuó en consecuencia");
        }
        if ([
          "Paquetería / entrega",
          "Mantenimiento / servicio",
          "Mudanza programada",
          "Traslado de elementos"
        ].includes(razon)) {
          segunRazon.push("Indicó operación puntual autorizada y procedió al cierre");
        }
        if (razon === "Puerta con retardo de cierre") {
          segunRazon.push("Mencionó retardo de cierre; se verificó funcionamiento");
        }
        return [...new Set([...segunRazon, ...comunes])];
      }

      if (name === "resolusion-evento") {
        const comun = [
          "Se ocupó de volver y cerrar la puerta",
          "Cierre verificado por Encargado",
          "Cierre verificado por otro residente",
          "Se deja aviso y se realiza seguimiento",
          "Escalado a administración",
        ];
        const segunRazon = [];
        if ([
          "Paquetería / entrega",
          "Mantenimiento / servicio",
          "Mudanza programada",
          "Traslado de elementos",
          "Puerta con retardo de cierre",
          "Tiempo insuficiente para el paso",
          "Ventilación / limpieza momentánea"
        ].includes(razon)) {
          segunRazon.push("Se normaliza por cierre automático / retardo");
        }
        return [...new Set([...segunRazon, ...comun])];
      }
    }

    if (evento === "Portón Mantenido Abierto (PMA)") {
      if (name === "resolusion-evento") {
        const hayCola = !!(form.extras?.["vehiculos-en-cola"] || "").trim();
        return [
          "Se cierra el portón y se normaliza",
          "Cierre verificado por Encargado",
          "Cierre por temporizador / automatismo",
          ...(hayCola ? ["Circulación reordenada; sin incidentes"] : []),
          "Se deja aviso a administración y se monitorea",
          "Escalado a supervisor",
        ];
      }
    }

    if (evento === "Puerta Forzada (Intrusión)") {
      if (name === "fuerzas-notificadas") {
        const ev = form.extras?.["evidencia-visual"];
        if (ev === "No") return ["No corresponde", "No", "Sí (911)", "Sí (seguridad privada)"];
        if (ev === "Sí") return ["Sí (911)", "Sí (seguridad privada)", "No"];
        return ["Sí (911)", "Sí (seguridad privada)", "No", "No corresponde"];
      }
    }
  }

  return def;
}

/* =========================
   Generador de observación formal
   ========================= */
function makeAutoObs({ categoria, form }) {
  const lugar = form.lugar || "-";
  const op = form.operador || "-";
  const evento = form.evento || "-";

  const fecha = form.fechaHoraEvento ? form.fechaHoraEvento.replace("T", " ") : null;
  const unidad = form.unidad ? `, unidad ${form.unidad}` : "";
  const zona = form.zona ? ` (Zona/Canal: ${form.zona})` : "";
  const cierre = "Se deja constancia y se mantiene monitoreo activo hasta normalización.";

  if (categoria === "edificios") {
    if (evento === "Puerta Mantenida Abierta (PMA)") {
      const razon = form.extras?.["razones-pma"];
      const resp = form.extras?.["respuesta-residente"];
      const resol = form.extras?.["resolusion-evento"];
      const partes = [
        `Se detecta evento de Puerta Mantenida Abierta en ${lugar}${unidad}${zona}${fecha ? ` (hora real ${fecha})` : ""}.`,
        "Se fija cámara al acceso y se verifica ausencia de riesgos inmediatos.",
        razon ? `Motivo relevado: ${razon}.` : null,
        resp ? `Respuesta del residente/encargado: ${resp}.` : null,
        resol ? `Resolución: ${resol}.` : null,
        cierre,
        `Operador: ${op}.`,
      ].filter(Boolean);
      return partes.join(" ");
    }

    if (evento === "Puerta Forzada (Intrusión)") {
      const evv = form.extras?.["evidencia-visual"];
      const qc = form.extras?.["quien-contactado"];
      const qco = form.extras?.["quien-contactado-otro"];
      const fuerzas = form.extras?.["fuerzas-notificadas"];
      const contacto = qc === "Otro…" ? qco : qc;
      const partes = [
        `Se registra posible intrusión/forzado en ${lugar}${unidad}${zona}${fecha ? ` (hora real ${fecha})` : ""}.`,
        evv ? `Evidencia visual: ${evv}.` : null,
        contacto ? `Contacto realizado: ${contacto}.` : null,
        fuerzas ? `Notificación a fuerzas: ${fuerzas}.` : null,
        "Se aplica procedimiento según SOP y se preserva evidencia.",
        cierre,
        `Operador: ${op}.`,
      ].filter(Boolean);
      return partes.join(" ");
    }

    if (evento === "Portón Mantenido Abierto (PMA)") {
      const cola = (form.extras?.["vehiculos-en-cola"] || "").trim();
      const resol = form.extras?.["resolusion-evento"];
      const partes = [
        `Se visualiza Portón Mantenido Abierto en ${lugar}${zona}${fecha ? ` (hora real ${fecha})` : ""}.`,
        cola ? `Detalle de fila/flujo vehicular: ${cola}.` : null,
        resol ? `Resolución: ${resol}.` : null,
        cierre,
        `Operador: ${op}.`,
      ].filter(Boolean);
      return partes.join(" ");
    }
  }

  if (categoria === "tgs") {
    if (evento === "Ingreso de Personal (Apertura de Alarma)") {
      const nom = form.extras?.["proveedor-personal"];
      const mot = form.extras?.["motivo-ingreso"];
      return [
        `Se registra ingreso en ${lugar}${zona}.`,
        nom ? `Personal/proveedor: ${nom}.` : null,
        mot ? `Motivo: ${mot}.` : null,
        "Se valida contra procedimiento y se mantiene monitoreo.",
        `Operador: ${op}.`,
      ].filter(Boolean).join(" ");
    }
    if (evento === "Salida de Personal (Cierre de Alarma)") {
      const nom = form.extras?.["proveedor-personal"];
      return [
        `Se registra cierre en ${lugar}${zona}.`,
        nom ? `Personal/proveedor: ${nom}.` : null,
        "Se confirma normalización de señales.",
        `Operador: ${op}.`,
      ].filter(Boolean).join(" ");
    }
  }

  if (categoria === "vtv" && (evento === "Corte de energía eléctrica" || evento === "Restauración de energía eléctrica")) {
    return [
      `${evento} en ${lugar}${zona}.`,
      "Se verifica estado de UPS/NVR y cámaras.",
      "Se deja constancia y se mantiene monitoreo activo hasta normalización.",
      `Operador: ${op}.`,
    ].join(" ");
  }

  return [
    `${evento} en ${lugar}${zona}.`,
    "Se registran actuaciones conforme procedimiento.",
    "Se deja constancia y se mantiene monitoreo activo hasta normalización.",
    `Operador: ${op}.`,
  ].join(" ");
}

/* Prompts (SweetAlert helpers) */
async function promptSelect({title, label, options, required = true, initial = ""}) {
  const inputOptions = {}; options.forEach(o => inputOptions[o] = o);
  const { value, isDismissed } = await Swal.fire({
    title, input: 'select', inputLabel: label, inputOptions, inputValue: initial || "",
    showCancelButton: true, confirmButtonText: 'Aceptar', cancelButtonText: 'Cancelar',
    backdrop: true, allowOutsideClick: false, allowEscapeKey: true,
    inputValidator: (v) => (required && (!v || !String(v).trim()) ? "Seleccioná una opción" : undefined),
  });
  if (isDismissed) return null;
  return value;
}
async function promptInput({title, label, placeholder = "", required = false, initial = ""}) {
  const { value, isDismissed } = await Swal.fire({
    title, input: "text", inputLabel: label, inputPlaceholder: placeholder, inputValue: initial,
    showCancelButton: true, confirmButtonText: "Aceptar", cancelButtonText: "Cancelar",
    inputValidator: (v) => (required && !String(v || "").trim() ? "Campo requerido" : undefined),
    allowOutsideClick: false,
  });
  if (isDismissed) return null;
  return (value ?? "").toString();
}
async function promptYesNo({title, label}) {
  const v = await promptSelect({ title, label, initial: "", required: true, options: ["Sí", "No"] });
  if (!v) return null;
  return v === "Sí" ? "si" : "no";
}
async function promptDateTime({title, label, initial = ""}) {
  const { value, isDismissed } = await Swal.fire({
    title,
    html: `
      <div style="text-align:left">
        <label style="display:block;margin-bottom:6px">${label}</label>
        <input id="dt-input" type="datetime-local" class="swal2-input" value="${initial || ""}" />
        <small style="display:block;margin-top:6px;color:#64748b">Es el momento real del evento (no el envío).</small>
      </div>
    `,
    focusConfirm: false,
    preConfirm: () => {
      const el = document.getElementById("dt-input");
      return (el && el.value) ? el.value : null;
    },
    showCancelButton: true, confirmButtonText: "Aceptar", cancelButtonText: "Cancelar", allowOutsideClick: false,
  });
  if (isDismissed) return null;
  return value;
}

/* ===== SOP Panel ===== */
function SOPPanel({ evento, sop, check, onCheckChange }) {
  const [timer, setTimer] = useState(null);
  useEffect(() => { setTimer(null); }, [evento]);

  const startTimer = (sec, label) => {
    setTimer({ secLeft: sec, label });
    const int = setInterval(() => {
      setTimer((t) => {
        if (!t) { clearInterval(int); return null; }
        if (t.secLeft <= 1) {
          clearInterval(int);
          Swal.fire("Tiempo cumplido", label || "Temporizador finalizado", "info");
          return null;
        }
        return { ...t, secLeft: t.secLeft - 1 };
      });
    }, 1000);
  };

  if (!evento || !sop) {
    return (
      <aside className="wiz__sop" aria-label="Guía operativa">
        <div className="sop-empty">
          <div className="emoji">👈</div>
          <div>
            <h4>Guía operativa</h4>
            <p>Elegí un <b>evento</b> para ver el procedimiento recomendado.</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="wiz__sop" aria-live="polite">
      <div className="sop-head">
        <h4>{evento}</h4>
        <p className="def">{sop.def}</p>
        {sop?.quick?.warn && <div className="warn">{sop.quick.warn}</div>}
      </div>

      <div className="sop-block">
        <div className="sop-title">Pasos sugeridos</div>
        <ul className="sop-list">
          {sop.pasos.map((p, i) => (
            <li key={i} className={`sop-step ${check?.pasos?.[i] ? "done" : ""}`}>
              <label>
                <input
                  type="checkbox"
                  checked={!!check?.pasos?.[i]}
                  onChange={() => onCheckChange(i, "pasos")}
                />
                <span>{p}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="sop-block">
        <div className="sop-title">Registrar</div>
        <ul className="sop-list">
          {sop.registro.map((r, i) => (
            <li key={i} className={`sop-step ${check?.registro?.[i] ? "done" : ""}`}>
              <label>
                <input
                  type="checkbox"
                  checked={!!check?.registro?.[i]}
                  onChange={() => onCheckChange(i, "registro")}
                />
                <span>{r}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {sop?.quick?.timers?.length ? (
        <div className="sop-block">
          <div className="sop-title strong">Temporizadores</div>
          <div className="timers">
            {sop.quick.timers.map(({ sec, label }, i) => {
              const pretty = sec >= 60 ? `${Math.round(sec / 60)} min` : `${sec}s`;
              const text = (label && label.trim()) ? label : pretty;
              return (
                <button
                  key={i}
                  type="button"
                  className="timer-btn"
                  title={`${text} • ${pretty}`}
                  onClick={() => startTimer(sec, label)}
                  aria-label={`Iniciar temporizador: ${text}`}
                >
                  <span className="ico">⏱</span>
                  <span className="txt">{text}</span>
                  <span className="sub">({pretty})</span>
                </button>
              );
            })}
            {timer && (
              <div className="timer-inline">
                ⏳ <span className="lbl">{timer.label || "Temporizador"}</span>:
                <b className="digits">{fmt(timer.secLeft)}</b>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-timers">⚙️ No hay temporizadores disponibles.</div>
      )}
    </aside>
  );
}
/* ===== Componente principal ===== */
export default function NovedadesWizardPro() {
  const { notificaciones = [], alertas = [], markAllRead } = useNotifications?.() || {};
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 860px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const on = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  const [step, setStep] = useState(0);
  const [categoria, setCategoria] = useState(null);
  const [estado, setEstado] = useState("pendiente");
  const [clientes, setClientes] = useState({ tgs: [], vtv: [], edificios: [], barrios: [], otros: [] });
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    operador: "",
    lugar: "",
    evento: "",
    fechaHoraEvento: "",
    unidad: "",
    zona: "",
    linkDrive: "",
    observaciones: "",
    imagenes: null,
    extras: {},
    requiereGrabacion: "",
  });

  const mainRef = useRef(null);
  const [editorFull, setEditorFull] = useState(false);
  const taRef = useRef(null);
  const wizardRunning = useRef(false);

  const [autoObsOn, setAutoObsOn] = useState(true);
  const lastAutoRef = useRef("");

  const autoGrow = useCallback((el) => {
    if (!el) return;
    el.style.height = "auto";
    const lim = Math.floor(window.innerHeight * 0.6);
    el.style.height = Math.min(el.scrollHeight, lim) + "px";
  }, []);

  function estadoCalculado(evento, requiereGrabacion) {
    if (evento === "Puerta Mantenida Abierta (PMA)") return "pendiente";
    if (requiereGrabacion === "si") return "pendiente";
    if (requiereGrabacion === "no") return "procesado";
    return "pendiente";
  }

  const [sopCheck, setSopCheck] = useState({});
   // NotificationsBridge: estado local simple

  useEffect(() => {
    document.body.classList.add("page-light");
    return () => document.body.classList.remove("page-light");
  }, []);

  useEffect(() => {
    if (!editorFull) return;
    const onKey = (e) => { if (e.key === "Escape") setEditorFull(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [editorFull]);

  useEffect(() => { autoGrow(taRef.current); }, [autoGrow, form.observaciones, step]);

  // Cargar clientes
  useEffect(() => {
    (async () => {
      try {
        const qy = query(collection(db, "clientes"), orderBy("nombre", "asc"));
        const snap = await getDocs(qy);
        const next = { tgs: [], vtv: [], edificios: [], barrios: [], otros: [] };
        snap.forEach((doc) => {
          const data = doc.data();
          const c = (data.categoria || "").trim().toLowerCase();
          const nombre = data.nombre || "";
          if (c === "locaciones-tgs" || c === "tgs") next.tgs.push(nombre);
          else if (c === "planta-vtv" || c === "vtv") next.vtv.push(nombre);
          else if (c === "edificios" || c === "edificio") next.edificios.push(nombre);
          else if (c === "barrio" || c === "barrios") next.barrios.push(nombre);
          else if (c === "otro" || c === "otros") next.otros.push(nombre);
        });
        setClientes(next);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudieron cargar los clientes", "error");
      }
    })();
  }, []);

  // ---- Helpers de compat/limpieza ----
  function filterExtrasFor(categoriaKey, eventoKey, extras) {
    const def = (EXTRA_FIELDS?.[categoriaKey]?.[eventoKey] || []);
    const allowed = new Set(def.map(f => f.name));
    const out = {};
    Object.keys(extras || {}).forEach(k => {
      if (allowed.has(k)) out[k] = extras[k];
    });
    return out;
  }

  const runCoachPMA = useCallback(async () => {
    if (categoria !== "edificios" || form.evento !== "Puerta Mantenida Abierta (PMA)") return;

    const extrasDef = (EXTRA_FIELDS.edificios || {})[form.evento] || [];
    const NEEDS = {
      razon: extrasDef.find(f=> f.name === "razones-pma"),
      respuesta: extrasDef.find(f=> f.name === "respuesta-residente"),
      resol: extrasDef.find(f=> f.name === "resolusion-evento"),
    };

    if (NEEDS.razon && !form.extras?.["razones-pma"]) {
      const v = await promptSelect({
        title: "Completar: Razones de PMA",
        label: "Seleccioná la razón principal",
        options: getFieldOptions({ categoria, evento: form.evento, name: "razones-pma", form }),
        initial: form.extras?.["razones-pma"] ?? ""
      });
      if (v) setForm(f => ({ ...f, extras: { ...f.extras, ["razones-pma"]: v }}));
    }
    if (NEEDS.respuesta && !form.extras?.["respuesta-residente"]) {
      const v = await promptSelect({
        title: "Completar: Respuesta del residente",
        label: "¿Qué dijo o hizo el residente?",
        options: getFieldOptions({ categoria, evento: form.evento, name: "respuesta-residente", form }),
        initial: form.extras?.["respuesta-residente"] ?? ""
      });
      if (v) setForm(f => ({ ...f, extras: { ...f.extras, ["respuesta-residente"]: v }}));
    }
    if (NEEDS.resol && !form.extras?.["resolusion-evento"]) {
      const v = await promptSelect({
        title: "Completar: ¿Cómo se resolvió?",
        label: "Seleccioná el resultado de la gestión",
        options: getFieldOptions({ categoria, evento: form.evento, name: "resolusion-evento", form }),
        initial: form.extras?.["resolusion-evento"] ?? ""
      });
      if (v) setForm(f => ({ ...f, extras: { ...f.extras, ["resolusion-evento"]: v }}));
    }

    setTimeout(() => {
      const sel1 = document.querySelector('select[name="razones-pma"]') || document.querySelector('[data-fld="razones-pma"]');
      const sel2 = document.querySelector('select[name="respuesta-residente"]') || document.querySelector('[data-fld="respuesta-residente"]');
      const sel3 = document.querySelector('select[name="resolusion-evento"]') || document.querySelector('[data-fld="resolusion-evento"]');
      [sel1, sel2, sel3].forEach(el => { if (el) { scrollIntoViewSafe(el); } });
    }, 50);
  }, [categoria, form.evento, form.extras]);

  const opcionesLugar = useMemo(() => {
    if (!categoria) return [];
    const pool =
      categoria === "barrios" ? clientes.barrios :
      categoria === "edificios" ? clientes.edificios :
      categoria === "vtv" ? clientes.vtv :
      categoria === "tgs" ? clientes.tgs :
      clientes.otros;
    return (pool || []).filter((n) => n.toLowerCase().includes((search || "").toLowerCase()));
  }, [categoria, clientes, search]);
// SOP actual según evento seleccionado
const currentSOP = useMemo(() => {
  return form.evento ? (SOP[form.evento] || null) : null;
}, [form.evento]);

  const warn = (m) => (Swal.fire("Faltan datos", m, "warning"), false);
  const validarPaso = useCallback(() => {
    if (step === 0 && !categoria) return warn("Elegí una categoría para continuar.");
    if (step === 1) {
      if (!form.operador) return warn("Seleccioná el operador.");
      if (!form.lugar) return warn("Seleccioná el lugar.");
    }
    if (step === 2) {
      if (!form.evento) return warn("Seleccioná el tipo de evento.");
      if (form.evento !== "Puerta Mantenida Abierta (PMA)" && !form.requiereGrabacion) {
        return warn("Indicá si requiere grabación (Sí/No).");
      }
      if (categoria === "edificios" && !form.fechaHoraEvento) return warn("Indicá fecha y hora reales del evento.");

      const extrasDef = (EXTRA_FIELDS[categoria] || {})[form.evento] || [];
      for (const fld of extrasDef) {
        if (fld.required) {
          const v = form.extras?.[fld.name];
          if (!v || (typeof v === "string" && !v.trim())) return warn(`Completá: ${fld.label}`);
        }
      }
      if (categoria === "edificios" && form.evento === "Puerta Forzada (Intrusión)") {
        const qc = form.extras?.["quien-contactado"];
        if (qc === "Otro…" && !((form.extras?.["quien-contactado-otro"] || "").trim())) {
          return warn("Indicá a quién se contactó (campo 'Especificá a quién').");
        }
      }
    }
    return true;
  }, [step, categoria, form]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (validarPaso()) setStep((s) => Math.min(s + 1, 4)); }
    if ((e.key === "Enter" && e.shiftKey) || e.key === "Escape") { e.preventDefault(); setStep((s) => Math.max(s - 1, 0)); }
  };
  useEffect(() => { mainRef.current?.focus(); }, [step]);

  const onSelectEvento = (ev) => {
    setForm((f) => ({
      ...f,
      evento: ev,
      requiereGrabacion: "",
      // 🔒 limpia extras que no corresponden al evento elegido
      extras: filterExtrasFor(categoria, ev, f.extras),
    }));
    if (!sopCheck[ev]) {
      const base = SOP[ev];
      if (base) {
        setSopCheck((prev) => ({
          ...prev,
          [ev]: { pasos: new Array(base.pasos.length).fill(false), registro: new Array(base.registro.length).fill(false) },
        }));
      }
    }
  };

  function pickDomOrState(name, form) {
    const fromState = form?.extras?.[name];
    if (fromState && String(fromState).trim()) return fromState;
    const el =
      document.querySelector(`select[name="${name}"]`) ||
      document.querySelector(`[data-fld="${name}"]`);
    const v = el?.value || "";
    return v && v.trim() ? v.trim() : "";
  }

  const eventoTimestampFromLocal = (value) => {
    if (!value) return null;
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return null;
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    const localDate = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (isNaN(localDate.getTime())) return null;
    return { ts: Timestamp.fromDate(localDate), local: value, iso: localDate.toISOString() };
  };

  const subirImagenes = async (fileList, categoriaKey, docId) => {
    if (!fileList || fileList.length === 0) return [];
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    const files = Array.from(fileList).slice(0, 10);
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!allowed.includes(f.type)) {
        await Swal.fire("Formato no permitido", `(${f.type}) Solo JPG/PNG.`, "warning");
        continue;
      }
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `novedades-img/${categoriaKey}/${docId}/imagen_${i + 1}.${ext}`;
      const ref = storageRef(storage, path);
      try {
        const snap = await uploadBytes(ref, f);
        const url = await getDownloadURL(snap.ref);
        urls.push(url);
      } catch (e) {
        console.error("Upload error", e);
        await Swal.fire("Error", "No se pudo subir una de las imágenes.", "error");
      }
    }
    return urls;
  };

  const appendObservacion = (texto) => {
    setForm((f) => ({
      ...f,
      observaciones: (f.observaciones ? (f.observaciones + " ") : "") + texto
    }));
  };
  const plantillasEvento = () => {
    const ev = form.evento;
    if (!ev) return RESPUESTAS_SUGERIDAS.general;
    return (RESPUESTAS_SUGERIDAS[ev] || []).concat(RESPUESTAS_SUGERIDAS.general);
  };

  const runEventoWizard = useCallback(async () => {
    if (!categoria) return;

    const ev = await promptSelect({
      title: "Tipo de evento",
      label: "Seleccioná el evento",
      options: EVENTOS[categoria] || [],
      initial: form.evento || ""
    });
    if (!ev) return;
    onSelectEvento(ev);

    let reqGrab = form.requiereGrabacion || "";
    if (ev !== "Puerta Mantenida Abierta (PMA)") {
      const v = await promptYesNo({ title: "¿Requiere grabación?", label: "Indicá si corresponde registro de video" });
      if (!v) return;
      reqGrab = v;
      setForm(f => ({ ...f, requiereGrabacion: v }));
    } else {
      setForm(f => ({ ...f, requiereGrabacion: "" }));
    }

    if (categoria === "edificios") {
      const dt = await promptDateTime({ title: "Fecha y hora reales del evento", label: "Ingresá el momento real del evento", initial: form.fechaHoraEvento || "" });
      if (!dt) return;
      setForm(f => ({ ...f, fechaHoraEvento: dt }));

      const u = await promptSelect({
        title: "Unidad involucrada (opcional)",
        label: "Podés elegir una unidad (o saltear)",
        options: generateUnidadOptions(),
        initial: form.unidad || "",
        required: false
      });
      if (u !== null) setForm(f => ({ ...f, unidad: u || "" }));
    }

    const extrasDef = (EXTRA_FIELDS[categoria] || {})[ev] || [];
    for (const fld of extrasDef) {
      if (fld.type === "select") {
        const sel = await promptSelect({
          title: "Datos específicos del evento",
          label: fld.label + (fld.required ? " *" : ""),
          options: getFieldOptions({ categoria, evento: ev, name: fld.name, form }),
          initial: form.extras?.[fld.name] ?? ""
        });
        if (sel === null) return;
        if (fld.name === "quien-contactado" && sel === "Otro…") {
          const otro = await promptInput({
            title: "Especificá a quién",
            label: "Ingresá el contacto",
            placeholder: "Ej: Guardia nocturna de edificio",
            required: true,
          });
          if (otro === null) return;
          setForm(f => ({ ...f, extras: { ...f.extras, [fld.name]: sel, ["quien-contactado-otro"]: otro }}));
        } else {
          setForm(f => ({ ...f, extras: { ...f.extras, [fld.name]: sel }}));
        }
      } else if (fld.type === "text") {
        const val = await promptInput({
          title: "Datos específicos del evento",
          label: fld.label + (fld.required ? " *" : ""),
          placeholder: fld.placeholder || "",
          required: !!fld.required,
          initial: form.extras?.[fld.name] ?? ""
        });
        if (val === null) return;
        setForm(f => ({ ...f, extras: { ...f.extras, [fld.name]: val }}));
      }
    }

    if (categoria === "edificios" && ev === "Puerta Mantenida Abierta (PMA)") {
      await Swal.fire({ icon: "info", title: "Tip", text: "Podés usar Ctrl+Enter para reabrir el asistente y ajustar los campos de PMA.", confirmButtonText: "Ok" });
      await runCoachPMA();
    }

    await Swal.fire({
      icon: "success",
      title: "Datos cargados",
      html: `<div style="text-align:left">
        <p style="margin:0 0 6px"><b>Evento:</b> ${ev}</p>
        ${categoria === "edificios" ? `<p style="margin:0 0 6px"><b>Fecha/Hora:</b> ${form.fechaHoraEvento || "—"}</p>` : ""}
        ${ev !== "Puerta Mantenida Abierta (PMA)" ? `<p style="margin:0 0 6px"><b>Requiere grabación:</b> ${(reqGrab || "—").toUpperCase()}</p>` : ""}
        <p style="margin:0">Podés continuar o ajustar desde el formulario.</p>
      </div>`,
      confirmButtonText: "Continuar"
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, form.evento, form.fechaHoraEvento, form.unidad, form.extras]);

  useEffect(() => {
    if (step === 2 && categoria && form.lugar) {
      if (!wizardRunning.current) {
        wizardRunning.current = true;
        (async () => {
          try { await runEventoWizard(); }
          finally { wizardRunning.current = false; }
        })();
      }
    }
  }, [step, categoria, form.lugar, runEventoWizard]);

  useEffect(() => { if (step !== 2) wizardRunning.current = false; }, [step]);

  // Autocompletar observación (sin pisar ediciones humanas)
  useEffect(() => {
    if (!autoObsOn) return;
    const current = (form.observaciones || "").trim();
    if (current && current !== lastAutoRef.current) return;

    const text = makeAutoObs({ categoria, form });
    lastAutoRef.current = text;
    setForm((f) => ({ ...f, observaciones: text }));
  }, [
    autoObsOn,
    categoria,
    form.evento,
    form.fechaHoraEvento,
    form.unidad,
    form.lugar,
    form.zona,
    form.operador,
    form.requiereGrabacion,
    form.extras?.["razones-pma"],
    form.extras?.["respuesta-residente"],
    form.extras?.["resolusion-evento"],
    form.extras?.["evidencia-visual"],
    form.extras?.["quien-contactado"],
    form.extras?.["quien-contactado-otro"],
    form.extras?.["fuerzas-notificadas"],
    form.extras?.["vehiculos-en-cola"],
    form.extras?.["proveedor-personal"],
    form.extras?.["motivo-ingreso"],
    form.extras?.["proveedor-internet"],
  ]);

  const handleSubmit = async () => {
    if (!categoria) return;
    const data = {};
    data[OPERADOR_NAME[categoria]] = form.operador;
    data[LUGAR_NAME[categoria]] = form.lugar;
    data[EVENTO_NAME[categoria]] = form.evento;

    // Estado base
    data.estado = estadoCalculado(form.evento, form.requiereGrabacion);
console.log("[NovedadesWizardPro] ENVIAR", {
  categoria,
  evento: form.evento,
  dataPreview: JSON.parse(JSON.stringify(data)),
});

/* === PATCH: mostrar TODO lo que se envía === */


if (btn) { btn.textContent = "Enviando…"; btn.disabled = true; }
    // Requiere grabación (solo si NO es PMA)
    if (form.evento !== "Puerta Mantenida Abierta (PMA)" && form.requiereGrabacion) {
      data.requiereGrabacion = form.requiereGrabacion;
    }

    if (form.zona) data["zona-otros"] = form.zona;
    if (form.linkDrive) {
      const drive = form.linkDrive.trim();
      data.linkDrive = drive;                        // canónico
      data["enlace-imagenes-drive"] = drive;         // alias compat
    }

    if (categoria === "edificios") {
      if (form.unidad) data["unidad"] = form.unidad;
      const eventoTime = eventoTimestampFromLocal(form.fechaHoraEvento);
      if (!eventoTime) return warn("Seleccioná la fecha y hora del evento.");
      data.fechaHoraEvento = eventoTime.ts;
      data.fechaHoraEventoLocal = eventoTime.local;
      data.fechaHoraEventoISO = eventoTime.iso;

      // PMA: normalización de campos y reglas
      if (form.evento === "Puerta Mantenida Abierta (PMA)") {
        // Forzar reglas de negocio
        delete data.requiereGrabacion;          // PMA no usa este flag
        data.estado = "pendiente";              // PMA siempre pendiente al crear

        const getExtraSafe = (name) => {
          const v1 = (form.extras?.[name] ?? "").trim();
          if (v1) return v1;
          const v2 = pickDomOrState(name, form);
          return (v2 || "").trim();
        };

        const razon = getExtraSafe("razones-pma");
        const resp  = getExtraSafe("respuesta-residente");
        const resol = getExtraSafe("resolucion-evento") || getExtraSafe("resolusion-evento");

        if (razon) { 
          data["razones-pma"] = razon;
          data.razonesPma     = razon;        // alias camelCase
        }
        if (resp)  { 
          data["respuesta-residente"] = resp;
          data.respuestaResidente     = resp; // alias camelCase
        }
        if (resol) { 
          data["resolucion-evento"] = resol;   // correcto
          data["resolusion-evento"] = resol;   // legacy compat
          data.resolucionEvento     = resol;   // alias camelCase
        }
      }

      // Extras del evento (solo los válidos)
      const extrasDef = (EXTRA_FIELDS.edificios || {})[form.evento] || [];
      extrasDef.forEach((fdef) => {
        let v = form.extras?.[fdef.name];
        if (fdef.name === "quien-contactado" && v === "Otro…") {
          const otro = (form.extras?.["quien-contactado-otro"] || "").trim();
          if (otro) v = otro;
        }
        if (v) data[fdef.name] = v;
      });
    }

    if (categoria === "tgs") {
      const extrasDef = (EXTRA_FIELDS.tgs || {})[form.evento] || [];
      extrasDef.forEach((fdef) => {
        const v = form.extras?.[fdef.name];
        if (v) data[fdef.name] = v;
      });
    }

    if (categoria === "vtv") {
      const extrasDef = (EXTRA_FIELDS.vtv || {})[form.evento] || [];
      extrasDef.forEach((fdef) => {
        const v = form.extras?.[fdef.name];
        if (v) data[fdef.name] = v;
      });
    }

    const obsField = "observaciones-" + (categoria === "edificios" ? "edificios" : categoria);
    if (form.observaciones?.trim()) data[obsField] = form.observaciones.trim();
    data.fechaHoraEnvio = getArgentinaTimestamp();

    // Opcional: si querés timestamp de edición desde cliente
    // data.editedAt = getArgentinaTimestamp();

    // Traza previa a guardar
    console.log("[NovedadesWizardPro] ENVIAR", {
      categoria,
      evento: form.evento,
      dataPreview: JSON.parse(JSON.stringify(data)),
    });


    if (btn) { btn.textContent = "Enviando…"; btn.disabled = true; }
  /* === Confirmación previa y manejo de botón === */
      const btn = document.querySelector(".wiz__actions .btn-primary");
      const old = btn?.textContent;
     const ok = await previewEnvio({ categoria, data, imagenes: form.imagenes });
      if (!ok) {
        // Usuario canceló, aún no cambiamos el texto del botón
        return;
      }
      if (btn) { btn.textContent = "Enviando…"; btn.disabled = true; }
    try {
      const docRef = await addDoc(collection(db, `novedades/${categoria}/eventos`), data);
      if (form.imagenes?.length) {
        const urls = await subirImagenes(form.imagenes, categoria, docRef.id);
        if (urls.length) await updateDoc(docRef, { imagenes: urls });
      }

      if (categoria === "vtv") {
        const planta = normalizar(data["planta-vtv"]);
        const evento = normalizar(data["evento-vtv"]);
        const plantasCrit = ["la plata", "olmos", "lanus", "berisso", "llavallol"];
        const eventosCrit = ["corte de energia electrica", "evento confirmado"];
        if (plantasCrit.some((k) => planta?.includes(k)) && eventosCrit.some((ev) => evento?.includes(ev))) {
          await Swal.fire({
            icon: "warning",
            title: "⚠️ AVISO INMEDIATO AL JEFE DE PLANTA",
            html: `<p style="text-align:left;margin:0">Debe informar <b>YA</b> al jefe de planta.</p>`,
            confirmButtonText: "Confirmar",
            confirmButtonColor: "#1e3c72",
            allowOutsideClick: false,
          });
        }
      }

      const portalBase = "https://reportesg3t.web.app/portal.html";
      const urlPend = `${portalBase}?estado=pendiente&categoria=${encodeURIComponent(categoria)}`;
      await Swal.fire({
        icon: "success",
        title: "Enviado",
        html: `
          <p style="margin:0 0 10px">
            Ticket <b>${(categoria || "").toUpperCase()}</b> enviado.<br>
            Estado: <b>${(data.estado || "pendiente").toUpperCase()}</b>
          </p>
          <a href="${urlPend}" target="_blank" rel="noopener" style="display:inline-block;padding:8px 12px;border-radius:6px;background:#2563eb;color:#fff;text-decoration:none;">🔗 Ver pendientes</a>
        `,
      });

      // Reset
      setStep(0);
      setCategoria(null);
      setEstado("pendiente");
      setSearch("");
      setForm({
        operador: "",
        lugar: "",
        evento: "",
        fechaHoraEvento: "",
        unidad: "",
        zona: "",
        linkDrive: "",
        observaciones: "",
        imagenes: null,
        extras: {},
        requiereGrabacion: "",
      });
      setSopCheck({});
      lastAutoRef.current = "";
      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Hubo un problema al enviar los datos.", "error");
    } finally {
      if (btn) { btn.textContent = old || "Enviar ✔"; btn.disabled = false; }
    }
  };

  const StepsNav = () => {
    const labels = ["Categoría", "Lugar", "Evento", "Detalles", "Resumen"];
    return (
      <nav className="wiz__steps" aria-label="Pasos">
        {labels.map((l, i) => (
          <button
            key={l}
            type="button"
            className={`step ${i === step ? "active" : i < step ? "done" : ""}`}
            onClick={() => setStep(i)}
            aria-current={i === step ? "step" : undefined}
          >
            <span className="dot" />
            <span className="txt">{l}</span>
          </button>
        ))}
      </nav>
    );
  };

  const CategoriaStep = () => (
    <section className="wiz__section" aria-labelledby="st-cat">
      <h2 className="wiz__h2" id="st-cat">Seleccioná la categoría</h2>
      <div className="wiz__pillgrid">
        {["tgs", "vtv", "edificios", "barrios", "otros"].map((c) => (
          <button
            type="button"
            key={c}
            className={`pill ${categoria === c ? "is-selected" : ""}`}
            onClick={() => {
              setCategoria(c);
              setForm((f) => ({ ...f, operador: "", lugar: "", evento: "", fechaHoraEvento: "", unidad: "", extras: {} }));
              setSopCheck({});
            }}
            aria-pressed={categoria === c}
          >
            {labelFor(c)}
          </button>
        ))}
      </div>
    </section>
  );

  const LugarStep = () => (
    <section className="wiz__section" aria-labelledby="st-lugar">
      <h2 className="wiz__h2" id="st-lugar">Datos básicos</h2>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <Label>Operador</Label>
          <select
            value={form.operador}
            onChange={(e) => setForm((f) => ({ ...f, operador: e.target.value }))}
            required
            className="inp form-select"
          >
            <option value="" disabled hidden>Seleccioná un operador…</option>
            {OPERADORES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="col-12 col-md-6">
          <Label>{LUGAR_LABEL[categoria]}</Label>
          <input
            type="text"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="inp inp--search form-control"
            aria-label="Buscar lugar"
          />
          <select
            value={form.lugar}
            onChange={(e) => setForm((f) => ({ ...f, lugar: e.target.value }))}
            required
            className="inp form-select mt-2"
          >
            <option value="" disabled hidden>Seleccioná un lugar…</option>
            {opcionesLugar.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    </section>
  );

  const EventoStep = () => {
    const extrasDef = (EXTRA_FIELDS[categoria] || {})[form.evento] || [];
    const sugeridas = plantillasEvento();
    return (
      <section className="wiz__section" aria-labelledby="st-ev">
        <h2 className="wiz__h2" id="st-ev">Tipo de evento</h2>

        <div className="wiz__chips" role="group" aria-label="Eventos sugeridos">
          {(EVENTOS[categoria] || []).slice(0, 6).map((ev) => (
            <button
              key={ev}
              type="button"
              className={`chip ${form.evento === ev ? "is-on" : ""}`}
              onClick={() => onSelectEvento(ev)}
              aria-pressed={form.evento === ev}
            >
              {ev}
            </button>
          ))}
        </div>

        <div className="row g-3 align-items-end">
          <div className="col-12 col-lg-6">
            <Label>Seleccioná el evento</Label>
            <select
              value={form.evento}
              onChange={(e) => onSelectEvento(e.target.value)}
              required
              className="inp form-select"
            >
              <option value="" disabled hidden>Seleccioná un evento…</option>
              {(EVENTOS[categoria] || []).map((ev) => <option key={ev} value={ev}>{ev}</option>)}
            </select>
            <small className="muted d-block mt-1">Tip: también podés usar <b>Ctrl+Enter</b>.</small>
          </div>

          {form.evento && form.evento !== "Puerta Mantenida Abierta (PMA)" && (
            <div className="col-12 col-lg-6">
              <Label>¿Requiere grabación?</Label>
              <div className="btn-group d-flex" role="group" aria-label="Requiere grabación">
                <button
                  type="button"
                  className={`btn ${form.requiereGrabacion === "si" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setForm((f) => ({ ...f, requiereGrabacion: "si" }))}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`btn ${form.requiereGrabacion === "no" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setForm((f) => ({ ...f, requiereGrabacion: "no" }))}
                >
                  No
                </button>
              </div>
              <small className="muted d-block mt-1">Sí ⇒ <b>Pendiente</b> · No ⇒ <b>Procesado</b></small>
            </div>
          )}
        </div>

        {categoria === "edificios" && (
          <div className="row g-3 mt-1">
            <div className="col-12 col-md-6">
              <Label>Fecha y hora reales del evento</Label>
              <input
                type="datetime-local"
                name="fechaHoraEvento"
                data-fld="fechaHoraEvento"
                value={form.fechaHoraEvento}
                onChange={(e) => setForm((f) => ({ ...f, fechaHoraEvento: e.target.value }))}
                required
                className="inp form-control"
              />
              <small className="muted">Es el momento real del evento (no el envío).</small>
            </div>
            <div className="col-12 col-md-6">
              <Label>Unidad involucrada (opcional)</Label>
              <select
                name="unidad"
                data-fld="unidad"
                value={form.unidad}
                onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                className="inp form-select"
              >
                <option value="">Seleccioná una unidad…</option>
                {generateUnidadOptions().map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        )}

        {extrasDef.length > 0 && (
          <div className="dyn card card-body mt-3">
            <h3 className="dyn__title">Datos específicos del evento</h3>
            <div className="row g-3">
              {extrasDef.map((fld) => {
                const v = form.extras?.[fld.name] ?? "";
                if (fld.name === "quien-contactado" && fld.type === "select") {
                  const opts = getFieldOptions({ categoria, evento: form.evento, name: fld.name, form });
                  const sel = v || "";
                  const showOtro = sel === "Otro…";
                  return (
                    <div key={fld.name} className="col-12 col-md-6">
                      <Label>{fld.label}{fld.required ? " *" : ""}</Label>
                      <select
                        name={fld.name}
                        data-fld={fld.name}
                        className="inp form-select"
                        value={sel}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, extras: { ...f.extras, [fld.name]: e.target.value } }))
                        }
                        required={fld.required}
                      >
                        <option value="" disabled hidden>Seleccioná una opción…</option>
                        {opts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>

                      {showOtro && (
                        <div className="mt-2">
                          <Label>Especificá a quién *</Label>
                          <input
                            name="quien-contactado-otro"
                            data-fld="quien-contactado-otro"
                            className="inp form-control"
                            type="text"
                            placeholder="Ej: Guardia nocturna de edificio"
                            value={form.extras?.["quien-contactado-otro"] ?? ""}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, extras: { ...f.extras, ["quien-contactado-otro"]: e.target.value } }))
                            }
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                const opts = fld.type === "select"
                  ? getFieldOptions({ categoria, evento: form.evento, name: fld.name, form })
                  : null;

                return (
                  <div key={fld.name} className="col-12 col-md-6">
                    <Label>{fld.label}{fld.required ? " *" : ""}</Label>
                    {fld.type === "select" ? (
                      <select
                        name={fld.name}
                        data-fld={fld.name}
                        className="inp form-select"
                        value={v}
                        onChange={(e) => setForm((f) => ({ ...f, extras: { ...f.extras, [fld.name]: e.target.value } }))}
                        required={fld.required}
                      >
                        <option value="" disabled hidden>Seleccioná una opción…</option>
                        {opts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        name={fld.name}
                        data-fld={fld.name}
                        className="inp form-control"
                        type="text"
                        placeholder={fld.placeholder || ""}
                        value={v}
                        onChange={(e) => setForm((f) => ({ ...f, extras: { ...f.extras, [fld.name]: e.target.value } }))}
                        required={fld.required}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="op-panel card card-body mt-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h3 className="m-0">Respuestas del operador</h3>

            {/* Toggle de autocompletado */}
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="autoObsSwitch"
                checked={autoObsOn}
                onChange={(e) => {
                  setAutoObsOn(e.target.checked);
                  if (e.target.checked) {
                    const text = makeAutoObs({ categoria, form });
                    lastAutoRef.current = text;
                    setForm((f) => ({ ...f, observaciones: text }));
                  }
                }}
              />
              <label className="form-check-label" htmlFor="autoObsSwitch">
                Completar automáticamente
              </label>
            </div>
          </div>

          <div className="op-chips mt-3" role="group" aria-label="Respuestas sugeridas">
            {sugeridas.map((t, i) => (
              <button
                key={i}
                type="button"
                className="chip -ghost"
                title="Agregar a Observaciones"
                onClick={() => appendObservacion(t)}
              >
                + {t}
              </button>
            ))}
          </div>

          <div className="row g-3 mt-2 op-onecol">
            <div className="col-12 col-lg-8">
              <Label>Observaciones</Label>
              <textarea
                ref={taRef}
                className="inp form-control op-textarea"
                placeholder="Agregá un resumen claro y profesional…"
                value={form.observaciones}
                onInput={(e) => autoGrow(e.target)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.trim() !== (lastAutoRef.current || "").trim()) {
                    lastAutoRef.current = "";
                  }
                  setForm((f) => ({ ...f, observaciones: v }));
                }}
                rows={10}
                spellCheck
                autoCorrect="on"
                autoCapitalize="sentences"
              />

              <div className="d-flex flex-wrap gap-2 mt-3 op-quickbar">
                <button type="button" className="btn btn-outline-secondary btn-sm"
                        onClick={() => appendObservacion("Se informa a contacto primario y se documenta el caso.")}>
                  Insertar: informar contacto
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm"
                        onClick={() => appendObservacion("Se adjuntan imágenes como respaldo de la intervención.")}>
                  Insertar: adjunto imágenes
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm"
                        onClick={() => appendObservacion("Se realiza seguimiento hasta normalización.")}>
                  Insertar: seguimiento
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm"
                        onClick={() => setEditorFull(true)}>
                  Ampliar editor ⤢
                </button>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="card op-preview">
                <div className="card-header">Previsualización</div>
                <div className="card-body">
                  <div className="preview-box">
                    {form.observaciones?.trim()
                      ? form.observaciones
                      : "Lo que escribas/selecciones aparecerá aquí para validar tono y claridad."}
                  </div>
                  <div className="d-grid gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => {
                        setForm((f) => ({ ...f, observaciones: "" }));
                        lastAutoRef.current = "";
                      }}
                    >
                      Limpiar observaciones
                    </button>
                  </div>
                </div>
              </div>
              <small className="muted d-block mt-2">
                Consejo: mantené frases cortas y accionables. Evitá jerga interna.
              </small>
            </div>
          </div>
        </div>

        {editorFull && (
          <div className="op-editor--full" role="dialog" aria-modal="true">
            <div className="op-toolbar">
              <strong>Editar observaciones</strong>
              <div className="d-flex align-items-center gap-2">
                <small className="muted">Caracteres: {form.observaciones?.length || 0}</small>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditorFull(false)}>
                  Cerrar
                </button>
              </div>
            </div>

            <textarea
              className="inp form-control op-textarea"
              style={{flex: "1 1 auto"}}
              value={form.observaciones}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              onInput={(e)=> autoGrow(e.target)}
              spellCheck
              rows={20}
            />
          </div>
        )}
      </section>
    );
  };

  const DetallesStep = () => (
    <section className="wiz__section" aria-labelledby="st-det">
      <h2 className="wiz__h2" id="st-det">Detalles</h2>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <Label>Zona / Canal CCTV</Label>
          <input
            type="text"
            name="zona"
            data-fld="zona"
            placeholder="Ej: ZONA 5 · CANAL 18"
            value={form.zona}
            onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
            className="inp form-control"
          />
        </div>

        <div className="col-12 col-md-6">
          <Label>Enlace a Imágenes (Drive)</Label>
          <input
            type="url"
            name="linkDrive"
            data-fld="linkDrive"
            placeholder="https://..."
            value={form.linkDrive}
            onChange={(e) => setForm((f) => ({ ...f, linkDrive: e.target.value }))}
            className="inp form-control"
          />
        </div>
      </div>

      <div className="mt-3">
        <Label>Subir Imágenes (máx. 10)</Label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setForm((f) => ({ ...f, imagenes: e.target.files }))}
          className="inp-file form-control"
        />
        <small className="muted">JPG/PNG. Hasta 10 archivos.</small>
      </div>
    </section>
  );

  const ResumenStep = () => {
    const extrasDef = (EXTRA_FIELDS[categoria] || {})[form.evento] || [];
    return (
      <section className="wiz__section" aria-labelledby="st-res">
        <h2 className="wiz__h2" id="st-res">Resumen</h2>
        <dl className="wiz__kv">
          <KV k="Categoría" v={labelFor(categoria)} />
          <KV k="Operador" v={form.operador || "-"} />
          <KV k="Lugar" v={form.lugar || "-"} />
          <KV k="Evento" v={form.evento || "-"} />
          {categoria === "edificios" && (
            <>
              <KV k="Fecha/Hora Evento" v={form.fechaHoraEvento || "-"} />
              <KV k="Unidad" v={form.unidad || "-"} />
            </>
          )}
          {extrasDef.map((fld) => (<KV key={fld.name} k={fld.label} v={form.extras?.[fld.name] || "-"} />))}
          <KV k="Zona/Canal" v={form.zona || "-"} />
          <KV k="Link Drive" v={form.linkDrive || "-"} />
          <KV k="Observaciones" v={form.observaciones || "-"} />
          <KV k="Estado (manual)" v={estado.toUpperCase()} />
          <KV k="Estado (calculado)" v={estadoCalculado(form.evento, form.requiereGrabacion).toUpperCase()} />
          <KV k="Imágenes" v={form.imagenes?.length ? `${form.imagenes.length} archivo(s)` : "—"} />
        </dl>
      </section>
    );
  };

  const progress = (step / 4) * 100;

  useEffect(() => {
    function setNavHeightVar() {
      const nav =
        document.querySelector(".MuiAppBar-root") ||
        document.querySelector("header.appbar") ||
        document.querySelector("header[role='banner']") ||
        document.querySelector("nav") || null;
      const h = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty("--nav-h", `${h}px`);
    }
    setNavHeightVar();
    const ro = new ResizeObserver(setNavHeightVar);
    ro.observe(document.documentElement);
    window.addEventListener("resize", setNavHeightVar);
    return () => {
      window.removeEventListener("resize", setNavHeightVar);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey) {
        const k = Number(e.key);
        if (k >= 1 && k <= 6) {
          const lista = plantillasEvento();
          const item = lista[k - 1];
          if (item) {
            e.preventDefault();
            appendObservacion(item);
          }
        }
      }
      if (e.ctrlKey && e.key === "Enter") {
        if (step === 2 && categoria) {
          e.preventDefault();
          if (!wizardRunning.current) {
            wizardRunning.current = true;
            (async () => {
              try { await runEventoWizard(); }
              finally { wizardRunning.current = false; }
            })();
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, categoria, runEventoWizard]);

  return (
    <div className={`wiz ${isMobile ? "is-mobile" : ""}`} onKeyDown={handleKeyDown}>
      <header className="wiz__header" role="banner">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h1 className="m-0">Novedades · Centro de Monitoreo</h1>
          <div className="wiz__progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div><div className="d-flex gap-2">
      <button type="button" className="btn btn-light btn-sm"
        onClick={() => window.__G3T_BRIDGES?.global1?.openNotificaciones?.()}>
       📬 Notificaciones
     </button>
     <button type="button" className="btn btn-light btn-sm"
        onClick={() => window.__G3T_BRIDGES?.global1?.openAlertas?.()}>
       ⚠️ Alertas
     </button>
     <button type="button" className="btn btn-light btn-sm"
       onClick={() => window.__G3T_BRIDGES?.global1?.openHistorico?.()}>
       ⏱ Histórico
     </button>
    </div>
        </div>
      </header>

      <div className="wiz__grid">
        <aside className="wiz__sidebar">
          <StepsNav />
          <div className="sidebar-hint">
            <small className="muted">Guardá evidencias y mantené un tono claro y profesional.</small>
          </div>
        </aside>

        <main className="wiz__main" ref={mainRef} tabIndex={-1}>
          {step === 0 && <CategoriaStep />}
          {step === 1 && categoria && <LugarStep />}
          {step === 2 && categoria && <EventoStep />}
          {step === 3 && categoria && <DetallesStep />}
          {step === 4 && categoria && <ResumenStep />}

          <div className="wiz__actions sticky-actions">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>
              ← Atrás
            </button>
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={() => validarPaso() && setStep((s) => Math.min(s + 1, 4))}>
                Siguiente →
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                Enviar ✔
              </button>
            )}
          </div>
        </main>

        <SOPPanel
          evento={form.evento}
          sop={currentSOP}
          check={sopCheck[form.evento]}
          onCheckChange={(idx, type) => {
            setSopCheck((prev) => {
              const cur = prev[form.evento] || { pasos: [], registro: [] };
              const arr = [...cur[type]];
              arr[idx] = !arr[idx];
              return { ...prev, [form.evento]: { ...cur, [type]: arr } };
            });
          }}
        />
      </div>

      <NotificationsBridge
   db={db}
   notificaciones={notificaciones}
   alertas={alertas}
   onAfterOpenInfo={markAllRead}
   filtrarPorCategoria={categoria || null}
   mostrarBotonHistorico={true}   // ⏱ botón flotante 15m
 />

    </div>
  );
}
