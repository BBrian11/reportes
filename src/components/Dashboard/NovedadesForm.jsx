// src/pages/NovedadesWizardPro.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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

// Contactos frecuentes para eventos de intrusión
const CONTACTOS_INTRUSION = [
  "-",
  "Supervisor",
  "Encargado",
  "Residente",
  "Administración",
  "Seguridad privada",
  "Policía / 911",
  "Bomberos",
  "Emergencias médicas",
  "Vecino de referencia",
  "Otro…",
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

/* ===== SOP (recortado a lo clave) ===== */
const SOP = {
  "Puerta Mantenida Abierta (PMA)": {
    def: "Puerta de acceso abierta más tiempo del permitido.",
    pasos: [
      "Fijar cámara del acceso.",
      "Observar si hay riesgo de intrusión.",
      "Contactar residente/encargado.",
      "Esperar 5 min y escalar si no responde.",
      "Confirmar cierre visualmente.",
    ],
    registro: ["Hora señal", "Persona contactada", "Resolución"],
    quick: { timers: [{ label: "Esperar respuesta (5 min)", sec: 300 }] },
  },
  "Portón Mantenido Abierto (PMA)": {
    def: "Portón vehicular permanece abierto más del tiempo permitido.",
    pasos: ["Fijar cámara", "Verificar riesgos", "Contactar encargado", "Escalar si no responde", "Confirmar cierre"],
    registro: ["Hora", "Contacto", "Cierre/Escalamiento"],
    quick: { timers: [{ label: "Esperar respuesta (5 min)", sec: 300 }] },
  },
  "Puerta Forzada (Intrusión)": {
    def: "Apertura no autorizada o sabotaje de sensor.",
    pasos: ["Verificar control de accesos", "Analizar cámaras", "Activar protocolo si hay indicios", "Notificar 911/supervisor"],
    registro: ["Hora exacta", "Identificación posible", "Acciones", "Evidencia"],
    quick: { warn: "⚠️ Intrusión: avisar fuerzas y supervisor de inmediato." },
  },
  "Corte de energía eléctrica": {
    def: "Interrupción del suministro eléctrico.",
    pasos: ["Confirmar señal", "Verificar UPS", "Corroborar CCTV/NVR", "Informar si hay impacto general"],
    registro: ["Hora", "Equipos afectados", "Duración/Medidas"],
  },
  "Restauración de energía eléctrica": {
    def: "Vuelve el suministro tras un corte.",
    pasos: ["Confirmar restauración", "Verificar sistemas", "Registrar normalización"],
    registro: ["Hora restablecimiento", "Estado", "Anomalías"],
  },
};

/* ===== Campos extra por evento (dinámicos) ===== */
const EXTRA_FIELDS = {
  edificios: {
    "Puerta Mantenida Abierta (PMA)": [
      { type: "select", name: "razones-pma", label: "Razones de PMA", required: true, options: [
        "-", "Paquetería", "Delivery", "No verifica cierre", "Vecinos conversando", "Visitas", "Mudanza", "Dificultad motora", "Tiempo insuficiente",
      ]},
      { type: "select", name: "respuesta-residente", label: "Respuesta del residente", required: true, options: [
        "-", "No atendió el teléfono ni contestó mensajes", "Expresó que no volvería a cerrar la puerta", "Dijo que NO fue intencional, que NO le alcanzó el tiempo", "Cerró con llave y se negó a revertir la situación",
      ]},
      { type: "select", name: "resolusion-evento", label: "¿Cómo se resolvió?", required: true, options: [
        "-", "Se ocupó de volver y cerrar la puerta", "Resuelto por Encargado", "Resuelto por otro residente", "Se enviaron las fuerzas policiales",
      ]},
    ],
    "Portón Mantenido Abierto (PMA)": [
      { type: "text", name: "vehiculos-en-cola", label: "¿Hay vehículos en cola? (detalle opcional)", required: false, placeholder: "Ej: 3 vehículos esperando" },
      { type: "select", name: "resolusion-evento", label: "¿Cómo se resolvió?", required: true, options: [
        "-", "Se cerró el portón", "Resuelto por Encargado", "Escalado a supervisor", "Se enviaron las fuerzas policiales",
      ]},
    ],
    "Puerta Forzada (Intrusión)": [
      { type: "select", name: "evidencia-visual", label: "¿Evidencia visual de intrusión?", required: true, options: ["-", "Sí", "No"] },
      { type: "select", name: "quien-contactado", label: "¿A quién se contactó?", required: true, options: CONTACTOS_INTRUSION },
      { type: "text", name: "quien-contactado-otro", label: "Especificá a quién", required: true, placeholder: "Ej: Guardia nocturna de edificio" },
      { type: "select", name: "fuerzas-notificadas", label: "¿Se notificó a fuerzas?", required: true, options: ["-", "Sí", "No"] },
    ],
  },
  tgs: {
    "Ingreso de Personal (Apertura de Alarma)": [
      { type: "text", name: "proveedor-personal", label: "Nombre del proveedor/personal", required: true, placeholder: "Ej: Juan Pérez" },
      { type: "text", name: "motivo-ingreso", label: "Motivo del ingreso", required: true, placeholder: "Mantenimiento / Entrega / Auditoría" },
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

/* Utils */
const getArgentinaTimestamp = () => Timestamp.fromDate(new Date());
const normalizar = (txt) => (txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/* ===== Componente principal ===== */
export default function NovedadesWizardPro() {
  const [step, setStep] = useState(0); // 0..4
  const [categoria, setCategoria] = useState(null);
  const [estado, setEstado] = useState("pendiente");
  const [clientes, setClientes] = useState({ tgs: [], vtv: [], edificios: [], barrios: [], otros: [] });
  const [search, setSearch] = useState("");
  
  const [form, setForm] = useState({
    operador: "-",
    lugar: "-",
    evento: "-",
    fechaHoraEvento: "",
    unidad: "",
    zona: "",
    linkDrive: "",
    observaciones: "",
    imagenes: null,
    extras: {},
    requiereGrabacion: "",   // ⬅️ nuevo ("" | "si" | "no")
  });
  
  function estadoCalculado(evento, requiereGrabacion) {
    if (evento === "Puerta Mantenida Abierta (PMA)") return "pendiente";
    if (requiereGrabacion === "si") return "pendiente";
    if (requiereGrabacion === "no") return "procesado";
    // default mientras no eligieron nada
    return "pendiente";
  }
  
  const [sopCheck, setSopCheck] = useState({});
  const currentSOP = SOP[form.evento] || null;
  const [notificaciones, setNotificaciones] = useState([]);
  const [alertas, setAlertas] = useState([]);
  // Fuerza lienzo claro y quita paddings superiores del layout
  useEffect(() => {
    document.body.classList.add("page-light");
    return () => document.body.classList.remove("page-light");
  }, []);

  /* Cargar clientes */
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

  /* Opciones filtradas */
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

  /* Validación por paso */
  const warn = (m) => (Swal.fire("Faltan datos", m, "warning"), false);
  const validarPaso = useCallback(() => {
    if (step === 0 && !categoria) return warn("Elegí una categoría para continuar.");
    if (step === 1) {
      if (!form.operador || form.operador === "-") return warn("Seleccioná el operador.");
      if (!form.lugar || form.lugar === "-") return warn("Seleccioná el lugar.");
    }
    if (step === 2) {
      if (!form.evento || form.evento === "-") return warn("Seleccioná el tipo de evento.");
      if (!form.requiereGrabacion) return warn("Indicá si requiere grabación (Sí/No).");
      if (categoria === "edificios" && !form.fechaHoraEvento) return warn("Indicá fecha y hora reales del evento.");

      const extrasDef = (EXTRA_FIELDS[categoria] || {})[form.evento] || [];
      for (const fld of extrasDef) {
        if (fld.required) {
          const v = form.extras?.[fld.name];
          if (!v || v === "-") return warn(`Completá: ${fld.label}`);
        }
      }

      // ✅ Regla extra: si eligen "Otro…" en ¿A quién se contactó? exigir el detalle
      if (categoria === "edificios" && form.evento === "Puerta Forzada (Intrusión)") {
        const qc = form.extras?.["quien-contactado"];
        if (qc === "Otro…" && !((form.extras?.["quien-contactado-otro"] || "").trim())) {
          return warn("Indicá a quién se contactó (campo 'Especificá a quién').");
        }
      }
    }
    return true;
  }, [step, categoria, form]);

  /* Navegación por teclado */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (validarPaso()) setStep((s) => Math.min(s + 1, 4)); }
    if ((e.key === "Enter" && e.shiftKey) || e.key === "Escape") { e.preventDefault(); setStep((s) => Math.max(s - 1, 0)); }
  };

  const onSelectEvento = (ev) => {
    setForm((f) => ({ ...f, evento: ev, requiereGrabacion: "", extras: { ...f.extras } }));
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

  /* Timestamps */
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

  /* Upload imágenes */
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

  /* Submit */
  const handleSubmit = async () => {
    if (!categoria) return;
    const data = {};
    data[OPERADOR_NAME[categoria]] = form.operador;
    data[LUGAR_NAME[categoria]] = form.lugar;
    data[EVENTO_NAME[categoria]] = form.evento;
    data.estado = (estado || "pendiente").toLowerCase();

    if (form.zona) data["zona-otros"] = form.zona;
    if (form.linkDrive) data["linkDrive"] = form.linkDrive;

    if (categoria === "edificios") {
      if (form.unidad) data["unidad"] = form.unidad;
      const eventoTime = eventoTimestampFromLocal(form.fechaHoraEvento);
      if (!eventoTime) return warn("Seleccioná la fecha y hora del evento.");
      data.fechaHoraEvento = eventoTime.ts;
      data.fechaHoraEventoLocal = eventoTime.local;
      data.fechaHoraEventoISO = eventoTime.iso;

      // ✅ Mapeo "Otro…" -> texto libre
      const extrasDef = (EXTRA_FIELDS.edificios || {})[form.evento] || [];
      extrasDef.forEach((fdef) => {
        let v = form.extras?.[fdef.name];
        if (fdef.name === "quien-contactado" && v === "Otro…") {
          const otro = (form.extras?.["quien-contactado-otro"] || "").trim();
          if (otro) v = otro;
        }
        if (v && v !== "-") data[fdef.name] = v;
      });
    }

    if (categoria === "tgs") {
      const extrasDef = (EXTRA_FIELDS.tgs || {})[form.evento] || [];
      extrasDef.forEach((fdef) => {
        const v = form.extras?.[fdef.name];
        if (v && v !== "-") data[fdef.name] = v;
      });
    }

    if (categoria === "vtv") {
      const extrasDef = (EXTRA_FIELDS.vtv || {})[form.evento] || [];
      extrasDef.forEach((fdef) => {
        const v = form.extras?.[fdef.name];
        if (v && v !== "-") data[fdef.name] = v;
      });
    }

    const obsField = "observaciones-" + (categoria === "edificios" ? "edificios" : categoria);
    if (form.observaciones?.trim()) data[obsField] = form.observaciones.trim();

    data.fechaHoraEnvio = getArgentinaTimestamp();

    const btn = document.querySelector(".wiz__actions .btn-primary");
    const old = btn?.textContent;
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
        operador: "-",
        lugar: "-",
        evento: "-",
        fechaHoraEvento: "",
        unidad: "",
        zona: "",
        linkDrive: "",
        observaciones: "",
        imagenes: null,
        extras: {},
      });
      setSopCheck({});
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Hubo un problema al enviar los datos.", "error");
    } finally {
      if (btn) { btn.textContent = old || "Enviar ✔"; btn.disabled = false; }
    }
  };

  /* ===== UI ===== */
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
              setForm((f) => ({ ...f, operador: "-", lugar: "-", evento: "-", fechaHoraEvento: "", unidad: "", extras: {} }));
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

      <Label>Operador</Label>
      <select value={form.operador} onChange={(e) => setForm((f) => ({ ...f, operador: e.target.value }))} required className="inp">
        <option>-</option>
        {OPERADORES.map((o) => <option key={o}>{o}</option>)}
      </select>

      <Label>{LUGAR_LABEL[categoria]}</Label>
      <input
        type="text"
        placeholder="Buscar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="inp inp--search"
        aria-label="Buscar lugar"
      />
      <select value={form.lugar} onChange={(e) => setForm((f) => ({ ...f, lugar: e.target.value }))} required className="inp">
        <option>-</option>
        {opcionesLugar.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </section>
  );

  const EventoStep = () => {
    const extrasDef = (EXTRA_FIELDS[categoria] || {})[form.evento] || [];
    return (
      <section className="wiz__section" aria-labelledby="st-ev">
        <h2 className="wiz__h2" id="st-ev">Tipo de evento</h2>
  
        <div className="wiz__chips" role="group" aria-label="Eventos sugeridos">
          {EVENTOS[categoria].slice(0, 6).map((ev) => (
            <button
              type="button"
              key={ev}
              className={`chip ${form.evento === ev ? "is-on" : ""}`}
              onClick={() => onSelectEvento(ev)}
              aria-pressed={form.evento === ev}
            >
              {ev}
            </button>
          ))}
        </div>
  
        <Label>Seleccioná el evento</Label>
        <select
          value={form.evento}
          onChange={(e) => onSelectEvento(e.target.value)}
          required
          className="inp"
        >
          <option>-</option>
          {EVENTOS[categoria].map((ev) => <option key={ev}>{ev}</option>)}
        </select>
  
        {/* Si la categoría es edificios, mostramos fecha/hora y unidad */}
        {categoria === "edificios" && (
          <>
            <Label>Fecha y hora reales del evento</Label>
            <input
              type="datetime-local"
              value={form.fechaHoraEvento}
              onChange={(e) => setForm((f) => ({ ...f, fechaHoraEvento: e.target.value }))}
              required
              className="inp"
            />
            <small className="muted">Corresponde al momento real del evento (no al envío).</small>
  
            <Label>Unidad involucrada (opcional)</Label>
            <select
              value={form.unidad}
              onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
              className="inp"
            >
              <option value="">Seleccione una unidad</option>
              {generateUnidadOptions().map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </>
        )}
  
        {/* ⬇️ Bloque "¿Requiere grabación?" (solo si NO es PMA) */}
        {form.evento && form.evento !== "Puerta Mantenida Abierta (PMA)" && (
          <>
            <Label>¿Requiere grabación?</Label>
            <select
              className="inp"
              required
              value={form.requiereGrabacion}
              onChange={(e) => setForm((f) => ({ ...f, requiereGrabacion: e.target.value }))}
            >
              <option value="">-</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
            <small className="muted">
              Si es <b>Sí</b>, el ticket se envía <b>Pendiente</b>. Si es <b>No</b>, se envía <b>Procesado</b>.
            </small>
          </>
        )}
  
        {/* Campos extra específicos del evento */}
        {extrasDef.length > 0 && (
          <div className="dyn">
            <h3 className="dyn__title">Datos específicos del evento</h3>
            {extrasDef.map((fld) => {
              const v = form.extras?.[fld.name] ?? "";
  
              // Lógica especial para "quien-contactado" + "Otro…"
              if (fld.name === "quien-contactado" && fld.type === "select") {
                const sel = v || "-";
                const showOtro = sel === "Otro…";
                return (
                  <div key={fld.name} className="dyn__field">
                    <Label>{fld.label}{fld.required ? " *" : ""}</Label>
                    <select
                      className="inp"
                      value={sel}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, extras: { ...f.extras, [fld.name]: e.target.value } }))
                      }
                      required={fld.required}
                    >
                      {fld.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
  
                    {showOtro && (
                      <div className="mt12">
                        <Label>Especificá a quién *</Label>
                        <input
                          className="inp"
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
  
              // Render genérico (select/text) para el resto
              if (fld.type === "select") {
                return (
                  <div key={fld.name} className="dyn__field">
                    <Label>{fld.label}{fld.required ? " *" : ""}</Label>
                    <select
                      className="inp"
                      value={v || "-"}
                      onChange={(e) => setForm((f) => ({ ...f, extras: { ...f.extras, [fld.name]: e.target.value } }))}
                      required={fld.required}
                    >
                      {fld.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                );
              }
  
              return (
                <div key={fld.name} className="dyn__field">
                  <Label>{fld.label}{fld.required ? " *" : ""}</Label>
                  <input
                    className="inp"
                    type="text"
                    placeholder={fld.placeholder || ""}
                    value={v}
                    onChange={(e) => setForm((f) => ({ ...f, extras: { ...f.extras, [fld.name]: e.target.value } }))}
                    required={fld.required}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };
  

  const DetallesStep = () => (
    <section className="wiz__section" aria-labelledby="st-det">
      <h2 className="wiz__h2" id="st-det">Detalles</h2>

      <div className="cols2">
        <div>
          <Label>Zona / Canal CCTV</Label>
          <input
            type="text"
            placeholder="Ej: ZONA 5 · CANAL 18"
            value={form.zona}
            onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
            className="inp"
          />
        </div>

        <div>
          <Label>Enlace a Imágenes (Drive)</Label>
          <input
            type="url"
            placeholder="https://..."
            value={form.linkDrive}
            onChange={(e) => setForm((f) => ({ ...f, linkDrive: e.target.value }))}
            className="inp"
          />
        </div>
      </div>

      <Label>Observaciones</Label>
      <textarea
        placeholder="Agregá un resumen breve de lo sucedido…"
        value={form.observaciones}
        onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
        className="inp"
      />

      <div className="cols2">
        <div>
          <Label>Subir Imágenes (máx. 10)</Label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setForm((f) => ({ ...f, imagenes: e.target.files }))}
            className="inp-file"
          />
          <small className="muted">JPG/PNG. Hasta 10 archivos.</small>
        </div>
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
          <KV k="Operador" v={form.operador} />
          <KV k="Lugar" v={form.lugar} />
          <KV k="Evento" v={form.evento} />
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
          <KV k="Estado" v={estado.toUpperCase()} />
          <KV k="Imágenes" v={form.imagenes?.length ? `${form.imagenes.length} archivo(s)` : "—"} />
        </dl>

        <div className="mt12">
          <Label>Estado</Label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="inp">
            <option value="pendiente">Pendiente</option>
            <option value="procesado">Procesado</option>
          </select>
          <small className="muted">Dejalo en <b>Pendiente</b> para retomarlo desde el portal.</small>
        </div>
      </section>
    );
  };

  // % de progreso (5 pasos: 0..4)
  const progress = (step / 4) * 100;

  // === Hotfix: medir altura real del navbar y eliminar gap ===
  useEffect(() => {
    function setNavHeightVar() {
      const nav =
        document.querySelector(".MuiAppBar-root") ||
        document.querySelector("header.appbar") ||
        document.querySelector("header[role='banner']") ||
        document.querySelector("nav") ||
        null;

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

  return (
    <div className="wiz wiz--flush wiz--no-gap" onKeyDown={handleKeyDown}>
      <header className="wiz__header" role="banner">
        <h1>Novedades · Centro de Monitoreo</h1>
        <div className="wiz__progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="wiz__grid">
        {/* Sidebar de pasos */}
        <aside className="wiz__sidebar">
          <StepsNav />
        </aside>

        {/* Formulario principal */}
        <main className="wiz__main">
          {step === 0 && <CategoriaStep />}
          {step === 1 && categoria && <LugarStep />}
          {step === 2 && categoria && <EventoStep />}
          {step === 3 && categoria && <DetallesStep />}
          {step === 4 && categoria && <ResumenStep />}

          <div className="wiz__actions">
            <button type="button" className="btn" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>
              ← Atrás
            </button>
            {step < 4 ? (
              <button type="button" className="btn-primary" onClick={() => validarPaso() && setStep((s) => Math.min(s + 1, 4))}>
                Siguiente →
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={handleSubmit}>
                Enviar ✔
              </button>
            )}
          </div>
        </main>

        {/* SOP contextual */}
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
      </div> <NotificationsBridge
        notificaciones={notificaciones}
        alertas={alertas}
      />
    </div>
  );
}

/* ===== SOP Panel ===== */
function SOPPanel({ evento, sop, check, onCheckChange }) {
  const [timer, setTimer] = useState(null); // {secLeft, label}

  useEffect(() => { setTimer(null); }, [evento]);

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

/* ===== Helpers UI ===== */
function Label({ children }) { return <label className="lbl">{children}</label>; }
function KV({ k, v }) { return (<><dt>{k}</dt><dd>{v}</dd></>); }
function labelFor(k) {
  switch (k) {
    case "tgs": return "TGS";
    case "vtv": return "VTV";
    case "edificios": return "Edificios";
    case "barrios": return "Barrios";
    case "otros": return "Otros";
    default: return k || "-";
  }
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
