import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import "../../styles/portal-pendientes.css";

/* Firebase (modular) */
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

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

/* ===== Constantes ===== */
const CATS = ["tgs", "vtv", "edificios", "barrios", "otros"];
const OPERADORES = ["Operador 1", "Operador 2", "Operador 3", "Operador 4", "Operador 5", "Operador 6"];

/* ====== Utils ====== */
const $fmt = (ts) => {
  try {
    if (!ts) return "";
    if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString("es-AR");
    const d = new Date(ts);
    return isNaN(d) ? "" : d.toLocaleString("es-AR");
  } catch {
    return "";
  }
};
const safeUrl = (u) => {
  try {
    if (!u) return null;
    const x = new URL(u);
    return ["http:", "https:"].includes(x.protocol) ? x.href : null;
  } catch {
    return null;
  }
};
const pick = (obj, keys = []) => {
  for (const k of keys) if (obj?.[k]) return String(obj[k]);
  return "";
};
const badge = (t, c = "#3b82f6") => (
  <span className="badge" style={{ ["--bdg"]: c }}>{t}</span>
);
const getArgentinaTimestamp = () => Timestamp.fromDate(new Date());
const toMs = (v) => v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : new Date(v).getTime() || 0);

/* ========= Componente principal ========= */
export default function PortalPendientes() {
  const [categoria, setCategoria] = useState(""); // filtro
  const [buscar, setBuscar] = useState("");
  const [cache, setCache] = useState([]); // [{id, path, categoria, data}]
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const poller = useRef(null);

  // Notificaciones
  const knownIds = useRef(new Set());         // ids que ya vimos
  const [newIds, setNewIds] = useState(new Set()); // ids llegados en la última actualización

  // Estados del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const filtrados = useMemo(() => {
    const byCat = categoria ? cache.filter((x) => x.categoria === categoria) : cache;
    if (!buscar) return byCat.slice(0, limit);
    const needle = buscar.toLowerCase();
    return byCat
      .filter((x) => matchesText({ ...x.data, categoria: x.categoria, id: x.id }, needle))
      .slice(0, limit);
  }, [cache, categoria, buscar, limit]);

  // Atajo para foco del buscador
  useEffect(() => {
    const onSlash = (e) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const inp = document.querySelector('input[type="search"]');
        if (inp) { e.preventDefault(); inp.focus(); }
      }
    };
    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, []);

  // Intento de pedir permiso de notificaciones de forma educada
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      // No forzamos; se ofrece botón en la UI. De todas formas podemos precalentar audio.
      prewarmAudio();
    }
  }, []);

  useEffect(() => {
    startPoll();
    document.addEventListener("visibilitychange", onVisChange);
    reloadAll();
    return () => {
      stopPoll();
      document.removeEventListener("visibilitychange", onVisChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria]);

  const onVisChange = () => {
    if (!document.hidden) reloadAll();
  };
  const startPoll = () => {
    stopPoll();
    poller.current = setInterval(() => {
      if (!document.hidden) reloadAll();
    }, 15000); // un poco más frecuente
  };
  const stopPoll = () => poller.current && clearInterval(poller.current);

  async function reloadAll(force) {
    try {
      if (force) document.body.classList.add("is-refreshing");
      setLoading(true);
      setLimit(30);
      const cats = categoria ? [categoria] : CATS;
      const all = [];
      for (const cat of cats) {
        const colRef = collection(db, `novedades/${cat}/eventos`);
        const qy = query(colRef, where("estado", "==", "pendiente"));
        const snap = await getDocs(qy);
        snap.forEach((ds) => {
          all.push({ id: ds.id, path: ds.ref.path, categoria: cat, data: ds.data() || {} });
        });
      }
      all.sort((a, b) => toMs(b.data.fechaHoraEnvio) - toMs(a.data.fechaHoraEnvio));

      // Detectar nuevos
      const currentIds = new Set(all.map((x) => x.id + "|" + x.categoria));
      const newlyArrived = all.filter(
        (x) => !knownIds.current.has(x.id + "|" + x.categoria)
      );

      setCache(all);

      // Actualizar set conocido DESPUÉS de setCache
      knownIds.current = currentIds;

      if (newlyArrived.length) {
        // Marcar filas nuevas por 10s
        const idsSet = new Set(newlyArrived.map((x) => x.id + "|" + x.categoria));
        setNewIds(idsSet);
        setTimeout(() => setNewIds(new Set()), 10000);

        notifyNew(newlyArrived);
      }
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo cargar la lista.", "error");
    } finally {
      setLoading(false);
      document.body.classList.remove("is-refreshing");
    }
  }

  // ===== Notificaciones, sonido y toasts =====
  let audioCtxRef = useRef(null);
  function prewarmAudio() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch { /* nada */ }
  }
  function playChime() {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);         // La5
      o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.36);
      if (navigator.vibrate) navigator.vibrate(120);
    } catch { /* ignorar */ }
  }

  function notifyNew(items) {
    const count = items.length;
    const first = items[0];
    const d = first?.data || {};
    const ubic = pick(d, ["edificio","locaciones-tgs","planta-vtv","barrio","otro","ubicacion","lugar"]) || "—";
    const ev   = pick(d, ["evento-edificio","evento-tgs","evento-vtv","evento-barrios","evento-otros","evento"]) || "Nuevo evento";
    const title = count === 1 ? "Nuevo evento recibido" : `${count} nuevos eventos`;
    const body  = count === 1 ? `${first.categoria.toUpperCase()} · ${ev} · ${ubic}` : `Incluye: ${first.categoria.toUpperCase()} · ${ev} · ${ubic}`;

    // Sonido siempre
    playChime();

    // Toast visible
    Swal.mixin({
      toast: true,
      position: "bottom-end",
      showConfirmButton: false,
      timer: 8000,
      timerProgressBar: true,
      customClass: { popup: "nf-toast" },
    }).fire({
      icon: "info",
      title,
      text: body,
    });

    // Notificación del navegador si la pestaña no está enfocada o el permiso está dado
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission === "default" && document.hidden) {
        Notification.requestPermission().then((p) => {
          if (p === "granted") new Notification(title, { body });
        });
      }
    }
  }

  const onClickAcciones = async (e) => {
    const btn = e.target.closest("button[data-action]");
    const tr = e.target.closest("tr[data-id]");
    if (!btn || !tr) return;
    const id = tr.dataset.id;
    const cat = tr.dataset.cat;
    const item = cache.find((x) => x.id === id && x.categoria === cat);
    if (!item) return;

    const action = btn.dataset.action;
    if (action === "editar") {
      setEditItem(item);
      setModalOpen(true);
    }
    if (action === "procesar") {
      await marcarProcesado(item);
    }
  };

  async function marcarProcesado(item) {
    const confirm = await Swal.fire({
      icon: "question",
      title: "¿Procesar este pendiente?",
      text: "Pasará a estado PROCESADO y dejará de verse en esta lista.",
      showCancelButton: true,
      confirmButtonText: "Sí, procesar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;
    try {
      await updateDoc(doc(db, item.path), { estado: "procesado", editedAt: getArgentinaTimestamp() });
      await reloadAll(true);
      Swal.fire({ icon: "success", title: "Listo", text: "El pendiente fue marcado como procesado." });
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo actualizar el estado.", "error");
    }
  }

  const needNotifBtn = typeof Notification !== "undefined" && Notification.permission !== "granted";

  return (
    <div className="nf nf-portal">
      <div className="nf__container">
        <h2 className="nf__title">Portal de eventos</h2>

        {/* Filtros */}
        <div className="filters">
          <label>
            Categoría
            <br />
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Todas</option>
              <option value="tgs">TGS</option>
              <option value="vtv">VTV</option>
              <option value="edificios">Edificios</option>
              <option value="barrios">Barrios</option>
              <option value="otros">Otros</option>
            </select>
          </label>
          <label className="filters__search">
            Buscar (ubicación, evento, operador, etc.)
            <br />
            <input
              type="search"
              placeholder="Escribí para filtrar…  (atajo: /)"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setBuscar(""); }}
              onFocus={prewarmAudio}
            />
          </label>
          <div className="filters__actions">
            <button className="nf__btn" onClick={() => reloadAll(true)} disabled={loading}>
              {loading ? "Actualizando…" : "Actualizar ahora"}
            </button>
            <button className="nf__btn" onClick={() => setLimit((x) => x + 30)} disabled={filtrados.length < limit}>
              Cargar más
            </button>
            {needNotifBtn && (
              <button
                className="nf__btn"
                onClick={async () => {
                  prewarmAudio();
                  if ("Notification" in window) {
                    const res = await Notification.requestPermission();
                    if (res === "granted") {
                      Swal.fire({ icon: "success", title: "Notificaciones activadas", timer: 2000, showConfirmButton: false });
                    } else {
                      Swal.fire({ icon: "info", title: "Podés activarlas más tarde", timer: 2000, showConfirmButton: false });
                    }
                  }
                }}
              >
                🔔 Activar notificaciones
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="nf__table-wrap">
          <table className="nf__table">
            <thead>
              <tr>
                <th>Enviado</th>
                <th>Fecha evento</th>
                <th>Categoría</th>
                <th>Ubicación</th>
                <th>Evento</th>
                <th>Operador</th>
                <th className="center">Imgs</th>
                <th className="center">Estado</th>
                <th className="nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody onClick={onClickAcciones}>
              {filtrados.length ? (
                filtrados.map((item) => {
                  const d = item.data;
                  const ubicacion = pick(d, [
                    "edificio", "locaciones-tgs", "planta-vtv", "barrio", "otro", "ubicacion", "lugar",
                  ]);
                  const evento = pick(d, [
                    "evento-edificio", "evento-tgs", "evento-vtv", "evento-barrios", "evento-otros", "evento",
                  ]);
                  const operador = pick(d, [
                    "operador-edificios", "operador-tgs", "operador-vtv", "operador-barrios", "operador-otros", "operador",
                  ]);
                  const link = safeUrl(d.linkDrive);
                  const imgs = Array.isArray(d.imagenes) ? d.imagenes.length : 0;
                  const key = item.id + "|" + item.categoria;
                  const isNew = newIds.has(key);
                  return (
                    <tr
                      key={`${item.categoria}-${item.id}`}
                      data-id={item.id}
                      data-cat={item.categoria}
                      className={`row-pendiente ${isNew ? "row-new" : ""}`}
                    >
                      <td className="nowrap">{$fmt(d.fechaHoraEnvio) || "-"}</td>
                      <td className="nowrap">{$fmt(d.fechaHoraEvento) || "-"}</td>
                      <td className="nowrap">{item.categoria.toUpperCase()}</td>
                      <td>{ubicacion || "-"}</td>
                      <td>{evento || "-"}</td>
                      <td>{operador || "-"}</td>
                      <td className="center">{imgs ? badge(String(imgs), "#10b981") : badge("0", "#64748b")}</td>
                      <td className="center">{badge("Pendiente", "#f59e0b")}</td>
                      <td className="nowrap actions">
                        {link ? (
                          <a className="nf__btn" href={link} target="_blank" rel="noopener noreferrer">Imágenes</a>
                        ) : null}
                        <button className="nf__btn nf__btn-primary" data-action="editar">Completar / Editar</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={9} className="center muted">{loading ? "Cargando…" : "Sin resultados"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        item={editItem}
        onSaved={() => reloadAll(true)}
      />
    </div>
  );
}

/* ====== Helpers de filtro ====== */
function matchesText(row, needle) {
  if (!needle) return true;
  const blob = Object.entries(row)
    .filter(([k]) => k !== "imagenes")
    .map(([, v]) => (typeof v === "string" ? v : JSON.stringify(v)))
    .join(" ")
    .toLowerCase();
  return blob.includes(needle.toLowerCase());
}

/* ===== Modal de edición ===== */
function EditModal({ open, onClose, item, onSaved }) {
  const [clientes, setClientes] = useState({ tgs: [], vtv: [], edificios: [], barrios: [], otros: [] });
  const [tab, setTab] = useState("tgs");
  const [form, setForm] = useState({});
  const [estado, setEstado] = useState("pendiente");
  const [saving, setSaving] = useState(false);

  // Bloquear scroll mientras el modal está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (item?.categoria) setTab(item.categoria);
    if (item) preload(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  useEffect(() => {
    if (open && !clientes.__loaded) loadClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadClientes() {
    try {
      const qy = query(collection(db, "clientes"), orderBy("nombre", "asc"));
      const snap = await getDocs(qy);
      const next = { tgs: [], vtv: [], edificios: [], barrios: [], otros: [], __loaded: true };
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
    } catch (e) {
      console.warn("No se pudieron cargar clientes:", e);
    }
  }

  function preload(it) {
    const d = it.data || {};
    setEstado(d.estado || "pendiente");
    setForm({
      // Operadores
      "operador-tgs": d["operador-tgs"] || "-",
      "operador-vtv": d["operador-vtv"] || "-",
      "operador-edificios": d["operador-edificios"] || "-",
      "operador-barrios": d["operador-barrios"] || "-",
      "operador-otros": d["operador-otros"] || "-",
      // Ubicaciones
      "locaciones-tgs": d["locaciones-tgs"] || "-",
      "planta-vtv": d["planta-vtv"] || "-",
      edificio: d["edificio"] || "-",
      barrio: d["barrio"] || "-",
      otro: d["otro"] || "-",
      // Eventos
      "evento-tgs": d["evento-tgs"] || "-",
      "evento-vtv": d["evento-vtv"] || "-",
      "evento-edificio": d["evento-edificio"] || "-",
      "evento-barrios": d["evento-barrios"] || "-",
      "evento-otros": d["evento-otros"] || "-",
      // Extras
      "proveedor-personal": d["proveedor-personal"] || "",
      linkDrive: d["linkDrive"] || "",
      "zona-otros": d["zona-otros"] || "",
      unidad: d["unidad"] || "",
      "razones-pma": d["razones-pma"] || "-",
      "respuesta-residente": d["respuesta-residente"] || "-",
      "resolusion-evento": d["resolusion-evento"] || "-",
      // Observaciones
      "observaciones-tgs": d["observaciones-tgs"] || "",
      "observaciones-vtv": d["observaciones-vtv"] || "",
      "observaciones-edificios": d["observaciones-edificios"] || "",
      "observaciones-barrios": d["observaciones-barrios"] || "",
      "observaciones-otros": d["observaciones-otros"] || "",
      // Fecha/hora evento (edificios)
      fechaHoraEventoLocal: d.fechaHoraEventoLocal || "",
    });
  }

  function setF(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!item) return;

    try {
      setSaving(true);
      const data = {};

      // Mapear todos los campos del form (sin archivos)
      Object.entries(form).forEach(([k, v]) => {
        if (typeof v === "string") {
          const vv = v.trim();
          if (vv !== "" && vv !== "-") data[k] = vv;
        }
      });

      data.estado = (estado || "pendiente").toLowerCase();
      data.editedAt = getArgentinaTimestamp();

      if (item.categoria === "edificios") {
        const eventoTime = eventoTimestampFromLocal(form.fechaHoraEventoLocal);
        if (!eventoTime) {
          await Swal.fire({
            icon: "warning",
            title: "Fecha/Hora del evento",
            text: "Seleccioná la fecha y hora del evento antes de guardar.",
          });
          setSaving(false);
          return;
        }
        data.fechaHoraEvento = eventoTime.ts;
        data.fechaHoraEventoLocal = eventoTime.local;
        data.fechaHoraEventoISO = eventoTime.iso;
      }

      await updateDoc(doc(db, item.path), data);

      // Alerta crítica VTV (opcional)
      if (item.categoria === "vtv") {
        const planta = normalizar(form["planta-vtv"]);
        const evento = normalizar(form["evento-vtv"]);
        const plantasCrit = ["la plata", "olmos", "lanus", "berisso", "llavallol"];
        const eventosCrit = ["corte de energia electrica", "evento confirmado"];
        const esCrit = plantasCrit.some((k) => planta?.includes(k)) && eventosCrit.some((ev) => evento?.includes(ev));
        if (esCrit) {
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

      await Swal.fire({ icon: "success", title: "Guardado", text: "El pendiente fue actualizado." });
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      await Swal.fire("Error", "No se pudo guardar el pendiente.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="nf__drawer-backdrop"
      onClick={(e) => e.target.classList.contains("nf__drawer-backdrop") && onClose?.()}
    >
      <aside className="nf__drawer nf__drawer--ops" role="dialog" aria-modal="true">
        {/* Header */}
        <header className="nf__drawer__header">
          <strong>Completar / Editar pendiente</strong>
          <button className="nf__iconbtn" onClick={onClose} title="Cerrar" aria-label="Cerrar">✕</button>
        </header>
  
        {/* Body */}
        <div className="nf__drawer__body">
          <form id="edit-form" onSubmit={handleSubmit} className="w">
            <h2 className="nf__form-title">Novedades / Reportes</h2>
  
            <div className="tabs tabs--pills">

              {CATS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`tab ${tab === c ? "active" : ""}`}
                  onClick={() => setTab(c)}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
  
            {/* Secciones */}
            <Section show={tab === "tgs"}>
              <h3>Transportadora Gas del Sur (TGS)</h3>
              <L>Operador</L>
              <Select name="operador-tgs" value={form["operador-tgs"]} onChange={setF} options={["-", ...OPERADORES]} />
  
              <L>¿Punto de Medición o Planta?</L>
              <Select name="locaciones-tgs" value={form["locaciones-tgs"]} onChange={setF} options={["-", ...clientes.tgs]} />
  
              <L>Evento</L>
              <Select
                name="evento-tgs"
                value={form["evento-tgs"]}
                onChange={setF}
                options={[
                  "-",
                  "Ingreso de Personal (Apertura de Alarma)",
                  "Salida de Personal (Cierre de Alarma)",
                  "Corte de energía eléctrica",
                  "Restauración de energía eléctrica",
                  "Evento Confirmado",
                  "Evento NO confirmado (Falso positivo)",
                  "Dispositivo CCTV fuera de línea",
                ]}
              />
  
              <L>Zona / Canal</L>
              <Input name="zona-otros" value={form["zona-otros"]} onChange={setF} placeholder="ZONA 5 PERSIANA 4..." />
  
              <L>Proveedor / Personal</L>
              <Input name="proveedor-personal" value={form["proveedor-personal"]} onChange={setF} placeholder="Ej: Juan Pérez" />
  
              <L>Enlace a Imágenes en Drive</L>
              <Input name="linkDrive" value={form["linkDrive"]} onChange={setF} placeholder="https://..." />
  
              <L>Observaciones</L>
              <TextArea name="observaciones-tgs" value={form["observaciones-tgs"]} onChange={setF} />
            </Section>
  
            <Section show={tab === "vtv"}>
              <h3>Verificación Técnica Vehicular (VTV)</h3>
              <L>Operador</L>
              <Select name="operador-vtv" value={form["operador-vtv"]} onChange={setF} options={["-", ...OPERADORES]} />
  
              <L>Planta</L>
              <Select name="planta-vtv" value={form["planta-vtv"]} onChange={setF} options={["-", ...clientes.vtv]} />
  
              <L>Evento</L>
              <Select
                name="evento-vtv"
                value={form["evento-vtv"]}
                onChange={setF}
                options={[
                  "-",
                  "Corte de energía eléctrica",
                  "Restauración de energía eléctrica",
                  "Evento Confirmado",
                  "Evento NO confirmado (Falso positivo)",
                  "Dispositivo CCTV fuera de línea",
                  "Falla del servicio de internet",
                ]}
              />
  
              <L>Zona</L>
              <Input name="zona-otros" value={form["zona-otros"]} onChange={setF} placeholder="ZONA 5..." />
  
              <L>Enlace a Imágenes en Drive</L>
              <Input name="linkDrive" value={form["linkDrive"]} onChange={setF} placeholder="https://..." />
  
              <L>Observaciones</L>
              <TextArea name="observaciones-vtv" value={form["observaciones-vtv"]} onChange={setF} />
            </Section>
  
            <Section show={tab === "edificios"}>
              <h3>Edificios</h3>
              <L>Operador</L>
              <Select name="operador-edificios" value={form["operador-edificios"]} onChange={setF} options={["-", ...OPERADORES]} />
  
              <L>Edificio</L>
              <Select name="edificio" value={form["edificio"]} onChange={setF} options={["-", ...clientes.edificios]} />
  
              <L>Fecha y hora del evento</L>
              <input
                className="nf__input nf__datetime"
                type="datetime-local"
                value={form.fechaHoraEventoLocal || ""}
                onChange={(e) => setF("fechaHoraEventoLocal", e.target.value)}
              />
  
              <L>Evento</L>
              <Select
                name="evento-edificio"
                value={form["evento-edificio"]}
                onChange={setF}
                options={[
                  "-",
                  "Puerta Mantenida Abierta (PMA)",
                  "Evento - Encargado",
                  "Portón Mantenido Abierto (PMA)",
                  "Evento Confirmado",
                  "Evento NO confirmado (Falso positivo)",
                  "Puerta cerrada con llave",
                  "Dispositivo CCTV fuera de línea",
                  "Corte de energía eléctrica",
                  "Restauración de energía eléctrica",
                ]}
              />
  
              <L>Unidad</L>
              <Select name="unidad" value={form["unidad"]} onChange={setF} options={["", ...generateUnidadOptions()]} />
  
              <L>Razones de Puerta Mantenida abierta</L>
              <Select
                name="razones-pma"
                value={form["razones-pma"]}
                onChange={setF}
                options={[
                  "-",
                  "Paquetería",
                  "Delivery",
                  "No verifica cierre",
                  "Vecinos conversando",
                  "Visitas",
                  "Mudanza",
                  "Dificultad motora",
                  "Tiempo insuficiente",
                ]}
              />
  
              <L>Respuesta del residente</L>
              <Select
                name="respuesta-residente"
                value={form["respuesta-residente"]}
                onChange={setF}
                options={[
                  "-",
                  "No atendió el teléfono ni contestó mensajes",
                  "Expresó que no volvería a cerrar la puerta",
                  "Dijo que NO fue intencional, que NO le alcanzó el tiempo",
                  "Cerró con llave y se negó a revertir la situación",
                ]}
              />
  
              <L>Resolución</L>
              <Select
                name="resolusion-evento"
                value={form["resolusion-evento"]}
                onChange={setF}
                options={[
                  "-",
                  "Se ocupó de volver y cerrar la puerta",
                  "Resuelto por Encargado",
                  "Resuelto por otro residente",
                  "Se enviaron las fuerzas policiales",
                ]}
              />
  
              <L>Enlace a Imágenes en Drive</L>
              <Input name="linkDrive" value={form["linkDrive"]} onChange={setF} placeholder="https://..." />
  
              <L>Observaciones</L>
              <TextArea name="observaciones-edificios" value={form["observaciones-edificios"]} onChange={setF} />
            </Section>
  
            <Section show={tab === "barrios"}>
              <h3>Barrios</h3>
              <L>Operador</L>
              <Select name="operador-barrios" value={form["operador-barrios"]} onChange={setF} options={["-", ...OPERADORES]} />
  
              <L>Barrio</L>
              <Select name="barrio" value={form["barrio"]} onChange={setF} options={["-", ...clientes.barrios]} />
  
              <L>Evento</L>
              <Select
                name="evento-barrios"
                value={form["evento-barrios"]}
                onChange={setF}
                options={[
                  "-",
                  "Corte de energía eléctrica",
                  "Restauración de energía eléctrica",
                  "Evento Confirmado",
                  "Evento NO confirmado (Falso positivo)",
                  "Dispositivo CCTV fuera de línea",
                  "Apertura de Alarma",
                  "Falla del servicio de internet",
                ]}
              />
  
              <L>Zona</L>
              <Input name="zona-otros" value={form["zona-otros"]} onChange={setF} placeholder="ZONA 5..." />
  
              <L>Enlace a Imágenes en Drive</L>
              <Input name="linkDrive" value={form["linkDrive"]} onChange={setF} placeholder="https://..." />
  
              <L>Observaciones</L>
              <TextArea name="observaciones-barrios" value={form["observaciones-barrios"]} onChange={setF} />
            </Section>
  
            <Section show={tab === "otros"}>
              <h3>Otros</h3>
              <L>Operador</L>
              <Select name="operador-otros" value={form["operador-otros"]} onChange={setF} options={["-", ...OPERADORES]} />
  
              <L>Lugar</L>
              <Select name="otro" value={form["otro"]} onChange={setF} options={["-", ...clientes.otros]} />
  
              <L>Evento</L>
              <Select
                name="evento-otros"
                value={form["evento-otros"]}
                onChange={setF}
                options={[
                  "-",
                  "Corte de energía eléctrica",
                  "Restauración de energía eléctrica",
                  "Evento Confirmado",
                  "Evento NO confirmado (Falso positivo)",
                  "Dispositivo CCTV fuera de línea",
                  "Apertura de Alarma",
                  "Falla del servicio de internet",
                ]}
              />
  
              <L>Zona</L>
              <Input name="zona-otros" value={form["zona-otros"]} onChange={setF} placeholder="ZONA 5..." />
  
              <L>Enlace a Imágenes en Drive</L>
              <Input name="linkDrive" value={form["linkDrive"]} onChange={setF} placeholder="https://..." />
  
              <L>Observaciones</L>
              <TextArea name="observaciones-otros" value={form["observaciones-otros"]} onChange={setF} />
            </Section>
  
            <div className="nf__estado">
              <L>Estado</L>
              <select className="nf__input" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="pendiente">Pendiente</option>
                <option value="procesado">Procesado</option>
              </select>
              <small className="nf__muted">
                Dejalo en <b>Pendiente</b> si lo querés retomar más tarde desde el portal.
              </small>
            </div>
          </form>
        </div>
  
        {/* Footer acciones */}
        <footer className="nf__drawer__footer">
          <button
            type="submit"
            form="edit-form"
            className={`nf__btn-primary ${saving ? "is-loading" : ""}`}
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button className="nf__btn" onClick={onClose}>Cancelar</button>
        </footer>
      </aside>
    </div>,
    document.body
  );
  
}

/* ====== Subcomponentes UI ====== */
function Section({ show, children }) {
  if (!show) return null;
  return <section className="nf__section">{children}</section>;
}
function L({ children }) {
  return <label className="nf__label">{children}</label>;
}
function Select({ name, value, onChange, options }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(name, e.target.value)} className="nf__input">
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
function Input({ name, value, onChange, ...rest }) {
  return <input className="nf__input" value={value ?? ""} onChange={(e) => onChange(name, e.target.value)} {...rest} />;
}
function TextArea({ name, value, onChange }) {
  return <textarea className="nf__textarea" value={value ?? ""} onChange={(e) => onChange(name, e.target.value)} />;
}

/* ====== Helpers negocio ====== */
function eventoTimestampFromLocal(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const localDate = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (isNaN(localDate.getTime())) return null;
  return { ts: Timestamp.fromDate(localDate), local: value, iso: localDate.toISOString() };
}
function normalizar(txt) {
  return (txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function generateUnidadOptions() {
  const out = [], pisos = 12, unidadesPorPiso = 5,
    letras = ["A", "B", "C", "D", "E", "F", "G"],
    prefNum = ["Cochera", "Local", "Portón", "Piso"], esp = 20,
    unicos = ["Encargado", "Sala de Maquinas", "SUM", "Bunker"];
  for (let p = 1; p <= pisos; p++) for (let u = 1; u <= unidadesPorPiso; u++) out.push(`${p}${String(u).padStart(2, "0")}`);
  for (let p = 1; p <= pisos; p++) letras.forEach((L) => out.push(`${p}${L}`));
  for (let p = 1; p <= pisos; p++) for (let u = 1; u <= unidadesPorPiso; u++) out.push(`${p}-${u}`);
  prefNum.forEach((pre) => { for (let n = 1; n <= esp; n++) out.push(`${pre} ${n}`); });
  unicos.forEach((x) => out.push(x));
  return out;
}
