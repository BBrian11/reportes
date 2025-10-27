// src/pages/NovedadesWizardPro.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "../../styles/novedades-form.css";

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

/* ============ Catálogos ============ */
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

/* ============ SOP: guías operativas por evento ============ */
const SOP = {
  "Puerta Mantenida Abierta (PMA)": {
    def: "Puerta de acceso abierta más tiempo del permitido.",
    pasos: [
      "Fijar cámara del acceso en la pantalla principal.",
      "Observar si hay ingreso de personas o actitud sospechosa.",
      "Contactar residente/encargado del último ingreso.",
      "Enviar WhatsApp solicitando cierre (si está habilitado).",
      "Si no responde en 5 min, llamar: residente → encargado → supervisor.",
      "Confirmar visualmente el cierre. Mantener cámara hasta cerrar.",
    ],
    registro: [
      "Hora de señal recibida",
      "Persona contactada o intentos",
      "Resolución (cerró / no se ubicó / escalado)",
    ],
    quick: { timers: [{ label: "Esperar respuesta (5 min)", sec: 300 }] },
  },
  "Portón Mantenido Abierto (PMA)": {
    def: "Portón vehicular permanece abierto más del tiempo permitido.",
    pasos: [
      "Fijar cámara del portón.",
      "Verificar tránsito/cola y riesgos de intrusión.",
      "Contactar encargado y solicitar cierre inmediato.",
      "Si no responde en 5 min, escalar a supervisor.",
      "Confirmar cierre visualmente.",
    ],
    registro: ["Hora", "Contacto realizado", "Cierre confirmado / Escalamiento"],
    quick: { timers: [{ label: "Esperar respuesta (5 min)", sec: 300 }] },
  },
  "Puerta Forzada (Intrusión)": {
    def: "Apertura no autorizada con fuerza o sabotaje de sensor.",
    pasos: [
      "Verificar alerta en control de accesos.",
      "Fijar cámara y analizar: ingreso/daños/actitud.",
      "Si hay indicios de intrusión: activar protocolo.",
      "Notificar supervisor y llamar a 911/seguridad.",
      "Capturar evidencia (fotos/clip).",
      "Contactar residente responsable si se identifica.",
    ],
    registro: ["Hora exacta", "Identificación posible", "Acciones (911, supervisor)", "Evidencia cargada"],
    quick: { warn: "⚠️ Intrusión: avisar fuerzas y supervisor de inmediato." },
  },
  "Ingreso de Personal (Apertura de Alarma)": {
    def: "Entrada de personal autorizado con apertura del sistema.",
    pasos: [
      "Validar contra cronograma de visitas/trabajos.",
      "Verificar en video identidad/indumentaria.",
      "Confirmar apertura normal (sin coacción).",
      "Registrar hora, nombre y motivo.",
    ],
    registro: ["Hora", "Nombre", "Motivo", "Observaciones"],
  },
  "Salida de Personal (Cierre de Alarma)": {
    def: "Desarme/cierre tras finalizar tareas.",
    pasos: ["Confirmar cierre sin anomalías.", "Verificar retiro del personal.", "Puertas cerradas.", "Registrar salida."],
    registro: ["Hora exacta", "Nombre del personal", "Cierre OK"],
  },
  "Corte de energía eléctrica": {
    def: "Interrupción del suministro eléctrico.",
    pasos: [
      "Confirmar señal de corte.",
      "Verificar UPS y autonomía estimada.",
      "Corroborar cámaras/NVR/sensores afectados.",
      "Informar al supervisor si impacta múltiples equipos.",
    ],
    registro: ["Hora del corte", "Zona/equipos afectados", "Medidas tomadas", "Duración (si aplica)"],
  },
  "Restauración de energía eléctrica": {
    def: "Vuelve el suministro tras un corte.",
    pasos: [
      "Confirmar restauración en sistema.",
      "Verificar funcionamiento de todos los dispositivos.",
      "Escalar a técnica si hay anomalías.",
      "Registrar normalización y continuidad de grabación.",
    ],
    registro: ["Hora de restablecimiento", "Estado de sistemas", "Anomalías"],
  },
  "Alarma de incendio": {
    def: "Señal de humo/gas/fuego.",
    pasos: [
      "Ubicar sensor exacto.",
      "Verificar cámaras del sector.",
      "Si hay indicios: activar evacuación y llamar bomberos.",
      "Notificar supervisor.",
      "Si no hay indicios: contactar responsable y verificar sensor.",
    ],
    registro: ["Ubicación y sensor", "Observación visual", "Acciones (bomberos/supervisor)", "Confirmado o descartado"],
    quick: { warn: "🔥 Indicaciones reales → activar protocolo y bomberos." },
  },
  "Alarma Tamper": {
    def: "Manipulación física de equipo (cámara/panel/sensor).",
    pasos: [
      "Identificar dispositivo y ubicación.",
      "Verificar en video manipulación.",
      "Si hay sabotaje: capturar imagen, escalar a supervisor y responsable.",
      "Si es técnico: registrar y derivar a soporte.",
    ],
    registro: ["Dispositivo", "Imagen adjunta", "Resolución (saboteo/técnica/descartado)"],
  },
  "Evento Confirmado": {
    def: "Validado visual o telefónicamente como real.",
    pasos: [
      "Reunir evidencia visual clara.",
      "Confirmar testimonio (llamada/app).",
      "Notificar supervisor y fuerzas si aplica.",
      "Registrar todos los pasos con detalle.",
    ],
    registro: ["Evidencia", "Hora/tipo", "Actuaciones realizadas"],
  },
  "Evento NO confirmado (Falso positivo)": {
    def: "Sin evidencia visual ni testimonio que confirme.",
    pasos: [
      "Revisar cámara/sensor.",
      "Confirmar que no hay actividad.",
      "Contactar responsable si aplica.",
      "Registrar falso positivo con detalles.",
    ],
    registro: ["Hora", "Elemento disparado", "Resultado de verificación"],
  },
  "Descarga de grabaciones": {
    def: "Solicitud formal de registro audiovisual.",
    pasos: [
      "Validar autorización.",
      "Identificar cámara/fecha/hora exacta.",
      "Extraer desde DVR/NVR.",
      "Subir a Drive del cliente con etiqueta (fecha/hora/solicitante/sector).",
      "Entregar link.",
    ],
    registro: ["Autorizante", "Detalles del evento", "Medio de entrega", "Confirmación de entrega"],
  },
  "Dispositivo CCTV fuera de línea": {
    def: "Cámara sin transmisión.",
    pasos: [
      "Confirmar pérdida en el sistema.",
      "Identificar cámara/ubicación.",
      "Verificar si el resto del sistema funciona.",
      "Si punto crítico: avisar supervisor y técnica.",
      "Si no: monitorear 10 min; si persiste, escalar a técnico.",
    ],
    registro: ["Hora", "Ubicación", "Estado del sistema", "Notificaciones"],
  },
  "Botón de pánico": {
    def: "Activación de pulsador físico.",
    pasos: [
      "Confirmar dispositivo activado.",
      "Visualizar zona por cámara.",
      "Contactar de inmediato al usuario (si está permitido).",
      "Si no responde o hay sospecha: fuerzas y supervisor.",
      "Guardar evidencia visual.",
    ],
    registro: ["Hora", "Usuario (si se identifica)", "Acción tomada", "Fuerza notificada"],
  },
  "Pánico de App": {
    def: "Pánico desde aplicación móvil.",
    pasos: [
      "Confirmar geolocalización y emisor.",
      "Verificar cámara si es domicilio o contactar usuario.",
      "Si hay duda/sin respuesta: supervisor y fuerzas locales.",
      "Registrar secuencia exacta.",
    ],
    registro: ["Hora", "Ubicación", "Usuario", "Medios de contacto", "Resultado final"],
  },
  "Código de coacción": {
    def: "Código bajo amenaza: alerta silenciosa.",
    pasos: [
      "No contactar a la persona.",
      "Observar cámaras de forma discreta.",
      "Notificar inmediatamente a fuerzas y supervisor.",
      "Mantener evidencia visual hasta cierre del caso.",
    ],
    registro: ["Hora", "Ubicación", "Fuerzas contactadas", "Resultado"],
    quick: { warn: "🔕 Alerta silenciosa. NO contactar a la víctima." },
  },
  "Evento Interno - Centro de Monitoreo": {
    def: "Situación operativa interna (cambio guardia/incidente).",
    pasos: [
      "Documentar qué ocurrió con hora/personas involucradas.",
      "Informar al supervisor si corresponde.",
      "Guardar registro si es grave.",
    ],
    registro: ["Detalle completo", "Firma operador", "Firma supervisor (si aplica)"],
  },
  "Puerta cerrada con llave": {
    def: "Puerta queda cerrada desde el interior.",
    pasos: [
      "Confirmar en cámara o por aviso.",
      "Verificar si es acción habitual/horario.",
      "Si no está autorizado: contactar responsable.",
      "Descartar emergencia y registrar resultado.",
    ],
    registro: ["Hora", "Quién reporta/responde", "Resultado"],
  },
  "Persona sospechosa detectada": {
    def: "Individuo con actitud inusual.",
    pasos: [
      "Ubicar cámara y hacer seguimiento.",
      "Tomar capturas/clip.",
      "Notificar supervisor y seguridad.",
      "Informar al responsable del sitio.",
    ],
    registro: ["Hora", "Ubicación", "Descripción", "Medidas adoptadas"],
  },
  "Vehículo sospechoso detectado": {
    def: "Vehículo en zona no autorizada o actitud inusual.",
    pasos: [
      "Identificar ubicación/dirección.",
      "Seguir en cámaras cercanas.",
      "Capturar patente/conductor si es posible.",
      "Informar a supervisor y encargado; fuerzas si corresponde.",
    ],
    registro: ["Hora/lugar", "Tipo/color", "Patente", "Acciones realizadas"],
  },
  "Objeto sospechoso detectado": {
    def: "Elemento abandonado en zona sensible.",
    pasos: [
      "Ver origen en cámaras.",
      "Notificar supervisor de inmediato.",
      "Registrar y escalar; fuerzas especializadas si aplica.",
    ],
    registro: ["Hora/descripcion", "Lugar", "Persona relacionada", "Acciones"],
  },
  "Ingreso NO autorizado en zona restringida": {
    def: "Acceso a sector prohibido o con permiso especial.",
    pasos: [
      "Confirmar por cámara.",
      "Ver si usó tarjeta/código o fuerza.",
      "Notificar supervisor y seguridad física.",
      "Registrar evidencia y descripción.",
    ],
    registro: ["Hora", "Identidad (si se detecta)", "Medio de acceso", "Acciones tomadas"],
  },
  "Falla de red o comunicación": {
    def: "Pérdida de conectividad (servidores/cámaras/paneles).",
    pasos: [
      "Confirmar pérdida en gestor de red.",
      "Definir si es total/parcial.",
      "Escalar a redes.",
      "Evaluar impacto sobre monitoreo/gravación.",
      "Informar al supervisor.",
    ],
    registro: ["Hora", "Elementos afectados", "Causa (si se sabe)", "Tiempo de recuperación"],
  },
  "Falla en servidor de video": {
    def: "Interrupción en unidad central de grabación/gestión.",
    pasos: [
      "Confirmar falla (sin acceso/errores).",
      "Notificar soporte técnico.",
      "Verificar cámaras en vivo: continuar monitoreo.",
      "Evaluar pérdida de grabaciones.",
      "Registrar urgente al supervisor.",
    ],
    registro: ["Hora", "Estado general", "Cámaras afectadas", "Escalamiento técnico"],
  },
  "Intento de sabotaje a la cámara": {
    def: "Desenfoque/giro/bloqueo/vandalismo.",
    pasos: [
      "Detectar manipulación visual o por Tamper.",
      "Capturar imagen de momento exacto.",
      "Notificar supervisor y seguridad.",
      "Registrar cámara y acciones.",
    ],
    registro: ["Ubicación", "Tipo de sabotaje", "Evidencia", "Acciones"],
  },
  "Intento de sabotaje a la alarma": {
    def: "Corte/apertura/anulación de sensor/sirena/central.",
    pasos: [
      "Confirmar señal de Tamper o interrupción.",
      "Verificar si el sistema sigue operativo.",
      "Visualizar cámaras por actividad sospechosa.",
      "Notificar supervisor y técnico de turno.",
    ],
    registro: ["Elemento/ Zona", "Hora/Observación", "Resolución técnica"],
  },
  "Intento de sabotaje a cerradura electrónica": {
    def: "Manipulación forzada de cerradura motorizada/electrónica.",
    pasos: [
      "Confirmar error/señal de apertura forzada.",
      "Visualizar cámara del acceso.",
      "Si hay sabotaje: supervisor + seguridad + evidencia.",
      "Si no hay actividad: derivar a mantenimiento.",
    ],
    registro: ["Hora", "Tipo/ubicación", "Identificado (si aplica)", "Acciones y resolución"],
  },
};

/* ========= Utiles ========= */
const getArgentinaTimestamp = () => Timestamp.fromDate(new Date());
const normalizar = (txt) =>
  (txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/* ========= Componente ========= */
export default function NovedadesWizardPro() {
  const [step, setStep] = useState(0);
  const [categoria, setCategoria] = useState(null);
  const [estado, setEstado] = useState("pendiente");

  const [clientes, setClientes] = useState({
    tgs: [],
    vtv: [],
    edificios: [],
    barrios: [],
    otros: [],
  });

  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    operador: "-",
    lugar: "-",
    evento: "-",
    fechaHoraEvento: "",
    unidad: "",
    zona: "",
    proveedorPersonal: "",
    linkDrive: "",
    observaciones: "",
    imagenes: null,
  });

  /* Checklist de SOP tildado por evento (se resetea al cambiar de evento) */
  const [sopCheck, setSopCheck] = useState({}); // { [evento]: { pasos:[bool], registro:[bool] } }
  const currentSOP = SOP[form.evento] || null;

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

  /* Opciones filtradas para “lugar” */
  const opcionesLugar = useMemo(() => {
    if (!categoria) return [];
    const pool =
      categoria === "barrios"
        ? clientes.barrios
        : categoria === "edificios"
        ? clientes.edificios
        : categoria === "vtv"
        ? clientes.vtv
        : categoria === "tgs"
        ? clientes.tgs
        : clientes.otros;
    return (pool || []).filter((n) => n.toLowerCase().includes(search.toLowerCase()));
  }, [categoria, clientes, search]);

  /* Validaciones por paso */
  const validarPaso = () => {
    if (step === 0 && !categoria) return warn("Elegí una categoría para continuar.");
    if (step === 1) {
      if (!form.operador || form.operador === "-") return warn("Seleccioná el operador.");
      if (!form.lugar || form.lugar === "-") return warn("Seleccioná el lugar.");
    }
    if (step === 2) {
      if (!form.evento || form.evento === "-") return warn("Seleccioná el tipo de evento.");
      if (categoria === "edificios" && !form.fechaHoraEvento)
        return warn("Indicá fecha y hora reales del evento.");
    }
    return true;
  };
  const warn = (m) => {
    Swal.fire("Faltan datos", m, "warning");
    return false;
  };

  const handleNext = () => {
    if (!validarPaso()) return;
    setStep((s) => Math.min(s + 1, 4));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  /* Guardado */
  const eventoTimestampFromLocal = (value) => {
    if (!value) return null;
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return null;
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    const localDate = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (isNaN(localDate.getTime())) return null;
    return {
      ts: Timestamp.fromDate(localDate),
      local: value,
      iso: localDate.toISOString(),
    };
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

  const handleSubmit = async () => {
    if (!categoria) return;
    const data = {};
    data[OPERADOR_NAME[categoria]] = form.operador;
    data[LUGAR_NAME[categoria]] = form.lugar;
    data[EVENTO_NAME[categoria]] = form.evento;
    data.estado = (estado || "pendiente").toLowerCase();
    if (form.zona) data["zona-otros"] = form.zona;
    if (form.linkDrive) data["linkDrive"] = form.linkDrive;
    if (categoria === "tgs" && form.proveedorPersonal) data["proveedor-personal"] = form.proveedorPersonal;

    if (categoria === "edificios") {
      if (form.unidad) data["unidad"] = form.unidad;
      const eventoTime = eventoTimestampFromLocal(form.fechaHoraEvento);
      if (!eventoTime) return warn("Seleccioná la fecha y hora del evento.");
      data.fechaHoraEvento = eventoTime.ts;
      data.fechaHoraEventoLocal = eventoTime.local;
      data.fechaHoraEventoISO = eventoTime.iso;
    }
    data.fechaHoraEnvio = getArgentinaTimestamp();

    // ✅ Guardar Observaciones en su campo específico (sin insertar SOP)
    const obsField =
      "observaciones-" + (categoria === "edificios" ? "edificios" : categoria);
    if (form.observaciones?.trim()) {
      data[obsField] = form.observaciones.trim();
    }

    const btn = document.querySelector(".nf__footer .nf__btn-primary");
    const old = btn?.textContent;
    if (btn) {
      btn.textContent = "Enviando...";
      btn.disabled = true;
    }

    try {
      const docRef = await addDoc(collection(db, `novedades/${categoria}/eventos`), data);
      if (form.imagenes?.length) {
        const urls = await subirImagenes(form.imagenes, categoria, docRef.id);
        if (urls.length) await updateDoc(docRef, { imagenes: urls });
      }

      // Alerta crítica VTV
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

      // Reset mínimo
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
        proveedorPersonal: "",
        linkDrive: "",
        observaciones: "",
        imagenes: null,
      });
      setSopCheck({});
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Hubo un problema al enviar los datos.", "error");
    } finally {
      if (btn) {
        btn.textContent = old || "Enviar";
        btn.disabled = false;
      }
    }
  };

  /* ====== UI ====== */

  const Progress = () => {
    const pct = (step / 4) * 100;
    const labels = ["Categoría", "Lugar", "Evento", "Detalles", "Resumen"];
    return (
      <div className="nf__progress">
        <div className="nf__progress-bar" style={{ width: `${pct}%` }} />
        <div className="nf__progress-steps">
          {labels.map((l, i) => (
            <span key={l} className={`nf__progress-step ${i <= step ? "active" : ""}`}>{l}</span>
          ))}
        </div>
      </div>
    );
  };

  const CategoriaStep = () => (
    <section>
      <h3>Seleccioná la categoría</h3>
      <div className="nf__grid-cats">
        {["tgs", "vtv", "edificios", "barrios", "otros"].map((c) => (
          <button
            type="button"
            key={c}
            className={`nf__cat ${categoria === c ? "active" : ""}`}
            onClick={() => {
              setCategoria(c);
              setForm((f) => ({ ...f, operador: "-", lugar: "-", evento: "-", fechaHoraEvento: "", unidad: "" }));
              setSopCheck({});
            }}
          >
            {labelFor(c)}
          </button>
        ))}
      </div>
    </section>
  );

  const LugarStep = () => (
    <section>
      <h3>Datos básicos</h3>
      <Label>Operador</Label>
      <select value={form.operador} onChange={(e) => setForm((f) => ({ ...f, operador: e.target.value }))}>
        <option>-</option>
        {OPERADORES.map((o) => <option key={o}>{o}</option>)}
      </select>

      <Label>{LUGAR_LABEL[categoria]}</Label>
      <input
        type="text"
        placeholder="Buscar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="nf__search"
      />
      <select value={form.lugar} onChange={(e) => setForm((f) => ({ ...f, lugar: e.target.value }))}>
        <option>-</option>
        {opcionesLugar.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </section>
  );

  const EventoStep = () => (
    <section>
      <h3>Tipo de evento</h3>
      <div className="nf__chips">
        {EVENTOS[categoria].slice(0, 4).map((ev) => (
          <button
            type="button"
            key={ev}
            className={`nf__chip ${form.evento === ev ? "active" : ""}`}
            onClick={() => onSelectEvento(ev)}
          >
            {ev}
          </button>
        ))}
      </div>

      <Label>Seleccioná el evento</Label>
      <select value={form.evento} onChange={(e) => onSelectEvento(e.target.value)}>
        <option>-</option>
        {EVENTOS[categoria].map((ev) => <option key={ev}>{ev}</option>)}
      </select>

      {categoria === "edificios" && (
        <>
          <Label>Fecha y hora reales del evento</Label>
          <input
            type="datetime-local"
            value={form.fechaHoraEvento}
            onChange={(e) => setForm((f) => ({ ...f, fechaHoraEvento: e.target.value }))}
          />
          <small className="nf__muted">Este dato corresponde al momento real del evento.</small>

          <Label>Unidad involucrada (opcional)</Label>
          <select value={form.unidad} onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}>
            <option value="">Seleccione una unidad</option>
            {generateUnidadOptions().map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </>
      )}
    </section>
  );

  const onSelectEvento = (ev) => {
    setForm((f) => ({ ...f, evento: ev }));
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

  const DetallesStep = () => (
    <section>
      <h3>Detalles (opcionales)</h3>

      <div className="grid-2">
        <div>
          <Label>Zona / Canal CCTV</Label>
          <input
            type="text"
            placeholder="Ej: ZONA 5 PERSIANA 4 PB — o CANAL 18"
            value={form.zona}
            onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
          />
        </div>

        <div>
          <Label>Enlace a Imágenes (Drive)</Label>
          <input
            type="url"
            placeholder="https://..."
            value={form.linkDrive}
            onChange={(e) => setForm((f) => ({ ...f, linkDrive: e.target.value }))}
          />
        </div>
      </div>

      {categoria === "tgs" && (
        <>
          <Label>Proveedor / Personal (si aplica)</Label>
          <input
            type="text"
            placeholder="Ej: Juan Pérez"
            value={form.proveedorPersonal}
            onChange={(e) => setForm((f) => ({ ...f, proveedorPersonal: e.target.value }))}
          />
        </>
      )}

      <Label>Observaciones</Label>
      <textarea
        placeholder="Agregá un resumen breve de lo sucedido…"
        value={form.observaciones}
        onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
      />

      <Label>Subir Imágenes (máx. 10)</Label>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setForm((f) => ({ ...f, imagenes: e.target.files }))}
      />
    </section>
  );

  const ResumenStep = () => (
    <section>
      <h3>Resumen</h3>
      <div className="nf__summary">
        <Row k="Categoría" v={labelFor(categoria)} />
        <Row k="Operador" v={form.operador} />
        <Row k="Lugar" v={form.lugar} />
        <Row k="Evento" v={form.evento} />
        {categoria === "edificios" && (
          <>
            <Row k="Fecha/Hora Evento" v={form.fechaHoraEvento || "-"} />
            <Row k="Unidad" v={form.unidad || "-"} />
          </>
        )}
        <Row k="Zona/Canal" v={form.zona || "-"} />
        <Row k="Link Drive" v={form.linkDrive || "-"} />
        {categoria === "tgs" && <Row k="Proveedor/Personal" v={form.proveedorPersonal || "-"} />}
        <Row k="Observaciones" v={form.observaciones || "-"} />
        <Row k="Estado" v={estado.toUpperCase()} />
        <Row k="Imágenes" v={form.imagenes?.length ? `${form.imagenes.length} archivos` : "—"} />
      </div>

      <div style={{ marginTop: 12 }}>
        <Label>Estado</Label>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="pendiente">Pendiente</option>
          <option value="procesado">Procesado</option>
        </select>
        <small className="nf__muted">
          Dejalo en <b>Pendiente</b> si lo querés retomar más tarde desde el portal.
        </small>
      </div>
    </section>
  );

  return (
    <div className="nf">
      <div className="nf__container">
        <h2 className="nf__title">Novedades / Reportes de Monitoreo</h2>
        <Progress />

        {/* Layout: formulario + SOP */}
        <div className="nf__layout">
          <form onSubmit={(e) => e.preventDefault()} className="nf__form">
            {step === 0 && <CategoriaStep />}
            {step === 1 && categoria && <LugarStep />}
            {step === 2 && categoria && <EventoStep />}
            {step === 3 && categoria && <DetallesStep />}
            {step === 4 && categoria && <ResumenStep />}

            <div className="nf__footer">
              <div className="nf__footer-hint">
                <span>↩︎ Enter = Siguiente · ⇧ Enter / Esc = Atrás</span>
              </div>
              <div className="nf__footer-actions">
                <button type="button" className="nf__btn" onClick={handleBack} disabled={step === 0}>
                  ⬅ Atrás
                </button>
                {step < 4 && (
                  <button type="button" className="nf__btn-primary" onClick={handleNext}>
                    Siguiente ➜
                  </button>
                )}
                {step === 4 && (
                  <button type="button" className="nf__btn-primary" onClick={handleSubmit}>
                    Enviar ✔
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Panel SOP (sin botones de copiar/insertar) */}
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
      </div>
    </div>
  );
}

/* ====== SOP Panel ====== */
function SOPPanel({ evento, sop, check, onCheckChange }) {
  const [timer, setTimer] = useState(null); // {secLeft, label}
  useEffect(() => { setTimer(null); }, [evento]);

  if (!evento || !sop) {
    return (
      <aside className="sop">
        <div className="sop__empty">
          <div className="sop__emoji">👈</div>
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
          Swal.fire("Tiempo cumplido", label, "info");
          return null;
        }
        return { ...t, secLeft: t.secLeft - 1 };
      });
    }, 1000);
  };

  return (
    <aside className="sop">
      <div className="sop__header">
        <div>
          <h4>{evento}</h4>
          <p className="sop__def">{sop.def}</p>
          {sop?.quick?.warn && <div className="sop__warn">{sop.quick.warn}</div>}
        </div>
      </div>

      <div className="sop__content">
        <div className="sop__block">
          <div className="sop__title">Pasos sugeridos</div>
          <ul className="sop__list">
            {sop.pasos.map((p, i) => (
              <li key={i} className={`sop__step ${check?.pasos?.[i] ? "done" : ""}`}>
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

        <div className="sop__block">
          <div className="sop__title">Registrar</div>
          <ul className="sop__list">
            {sop.registro.map((r, i) => (
              <li key={i} className={`sop__step ${check?.registro?.[i] ? "done" : ""}`}>
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
  <div className="sop__block">
    <div className="sop__title sop__title--strong">Temporizadores</div>
    <div className="sop__timers">
      {sop.quick.timers.map(({ sec, label }, i) => {
        const pretty =
          sec >= 60 ? `${Math.round(sec / 60)} min` : `${sec}s`;
        const text = (label && label.trim()) ? label : pretty;
        return (
          <button
            key={i}
            type="button"
            className="sop__btn sop__btn--hc"
            title={`${text} • ${pretty}`}
            onClick={() => startTimer(sec, label)}
            aria-label={`Iniciar temporizador: ${text}`}
          >
            <span className="sop__btn-ico">⏱</span>
            <span className="sop__btn-txt">{text}</span>
            <span className="sop__btn-sub">({pretty})</span>
          </button>
        );
      })}
      {timer && (
        <div className="sop__timer sop__timer--hc">
          ⏳ <span className="sop__timer-label">{timer.label}</span>:
          <b className="sop__timer-digits">{fmt(timer.secLeft)}</b>
        </div>
      )}
    </div>
  </div>
) : (
  <div className="sop__no-timers sop__no-timers--hc">
    <p>⚙️ No hay temporizadores disponibles en este procedimiento.</p>
  </div>
)}


      </div>
    </aside>
  );
}

/* ====== Helpers UI ====== */
function Label({ children }) { return <label>{children}</label>; }
function Row({ k, v }) { return (<div className="nf__row"><span className="nf__row-k">{k}</span><span className="nf__row-v">{v}</span></div>); }
function labelFor(k) {
  switch (k) { case "tgs": return "TGS"; case "vtv": return "VTV"; case "edificios": return "Edificios"; case "barrios": return "Barrios"; case "otros": return "Otros"; default: return k || "-"; }
}
function generateUnidadOptions() {
  const out = [], pisos = 12, unidadesPorPiso = 5, letras = ["A","B","C","D","E","F","G"], prefNum = ["Cochera","Local","Portón","Piso"], esp = 20, únicos = ["Encargado","Sala de Maquinas","SUM","Bunker"];
  for (let p=1;p<=pisos;p++) for (let u=1;u<=unidadesPorPiso;u++) out.push(`${p}${String(u).padStart(2,"0")}`);
  for (let p=1;p<=pisos;p++) letras.forEach(L=>out.push(`${p}${L}`));
  for (let p=1;p<=pisos;p++) for (let u=1;u<=unidadesPorPiso;u++) out.push(`${p}-${u}`);
  prefNum.forEach(pre=>{ for (let n=1;n<=esp;n++) out.push(`${pre} ${n}`);});
  únicos.forEach(x=>out.push(x));
  return out;
}
function fmt(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
