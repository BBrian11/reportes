import React, { useMemo, useEffect, useRef, useState } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/eventstable.css";

const MySwal = withReactContent(Swal);

// ===== Tema =====
createTheme("g3tTheme", {
  text: { primary: "#0f172a", secondary: "#475569" },
  background: { default: "#ffffff" },
  context: { background: "#2563eb", text: "#FFFFFF" },
  divider: { default: "#e5e7eb" },
});

// ===== Helpers =====
const getClienteLower = (row) =>
  (row?.cliente || (row?.edificio ? "Edificios" : "otros")).toString().toLowerCase();

const getEventoTitulo = (row) => row?.evento ?? row?.["evento-edificio"] ?? "";
const getUbicacionDisplay = (row) => row?.ubicacion || row?.edificio || "";

const getObservacion = (row) =>
  row?.observacion ??
  row?.["observaciones-edificios"] ??
  row?.[`observaciones-${getClienteLower(row)}`] ??
  "";

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

const getProveedorTGS = (row) =>
  row?.["proveedor-personal"] ??
  row?.proveedor_personal ??
  row?.proveedorPersonal ??
  row?.proveedor ??
  row?.personal ??
  "";

const isEdificioRow = (row) => {
  const cl = (row?.cliente || "").toString().trim().toUpperCase();
  if (cl.includes("EDIFICIO")) return true;
  if (row?.edificio) return true;
  return getClienteLower(row) === "edificios";
};

const isTGSRow = (row) => {
  const tipo = (row?.tipoCliente || "").toString().trim().toUpperCase();
  if (tipo === "TGS") return true;
  const cl = (row?.cliente || "").toString().trim().toUpperCase();
  return cl.includes("TGS");
};

const fmt = (d) =>
  d instanceof Date && !isNaN(d)
    ? d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
    : "—";

const formatFechaEnvio = (row) => fmt(row?.fechaObj);
const formatFechaEvento = (row) => fmt(row?.fechaEventoObj);

// --- Sanitizar URL segura http/https
const safeUrl = (u) => {
  if (!u || typeof u !== "string") return null;
  try {
    const url = new URL(u);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    return null;
  } catch {
    return null;
  }
};

// ===== Panel expandible =====
const ExpandedRow = ({ data }) => {
  const link = safeUrl(data?.linkDrive);
  return (
    <div className="expanded-panel">
      <div className="expanded-grid">
        <div>
          <h4>Observación</h4>
          <p style={{ marginBottom: 8 }}>{getObservacion(data) || "—"}</p>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="obs-link"
            >
              Enlace a imágenes (Drive)
            </a>
          )}
        </div>

        {isEdificioRow(data) && (
          <>
            <div>
              <h4>Razones</h4>
              <p>{getRazones(data) || "—"}</p>
            </div>
            <div>
              <h4>Resolución</h4>
              <p>{getResolucion(data) || "—"}</p>
            </div>
            <div>
              <h4>Respuesta Residente</h4>
              <p>{getRespuestaResidente(data) || "—"}</p>
            </div>
          </>
        )}

        {isTGSRow(data) && (
          <div>
            <h4>Proveedor</h4>
            <p>{getProveedorTGS(data) || "—"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function EventsTable({
  eventos = [],
  filtros = { cliente: "", evento: "", ubicacion: "", fechaInicio: "", fechaFin: "" },
  onFilteredChange,
}) {
  // ===== UI controls (diseño) =====
  const [dense, setDense] = useState(true);
  const [wrapCells, setWrapCells] = useState(true);
  const [freezeFirst, setFreezeFirst] = useState(true);
  const [isFull, setIsFull] = useState(false);
  const fullRef = useRef(null);

  // Column visibility
  const [visible, setVisible] = useState({
    cliente: true,
    evento: true,
    ubicacion: true,
    fechaEnvio: true,
    fechaEvento: true, // solo cuando todo es Edificios
    observacion: true,
    razones: true,
    resolucion: true,
    respuesta: true,
    proveedor: true,
    acciones: true,
  });

  // Fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await fullRef.current?.requestFullscreen();
        setIsFull(true);
      } else {
        await document.exitFullscreen();
        setIsFull(false);
      }
    } catch {
      setIsFull((v) => !v);
    }
  };

  // ===== Handlers edición =====
  const handleEditObservation = async (event) => {
    const { value } = await MySwal.fire({
      title: "Editar Observación",
      html: `<textarea id="swal-obs" class="swal2-textarea" style="width:100%;padding:10px;">${getObservacion(event) || ""}</textarea>`,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "560px",
      preConfirm: () => document.getElementById("swal-obs").value ?? "",
    });
    if (value === undefined) return;
    try {
      const clienteLower = getClienteLower(event);
      const path = `novedades/${clienteLower}/eventos/${event.id}`;
      const fieldName =
        clienteLower === "edificios" ? "observaciones-edificios" : `observaciones-${clienteLower}`;
      await updateDoc(doc(db, path), { [fieldName]: value });
      MySwal.fire("✅ Guardado", "Observación actualizada", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo actualizar la observación", "error");
    }
  };

  const handleEditResolucion = async (event) => {
    const { value } = await MySwal.fire({
      title: "Editar Resolución",
      html: `<textarea id="swal-res" class="swal2-textarea" style="width:100%;padding:10px;">${getResolucion(event) || ""}</textarea>`,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "560px",
      preConfirm: () => document.getElementById("swal-res").value ?? "",
    });
    if (value === undefined) return;
    try {
      const clienteLower = getClienteLower(event);
      const path = `novedades/${clienteLower}/eventos/${event.id}`;
      await updateDoc(doc(db, path), { ["resolusion-evento"]: value, resolucion: value });
      MySwal.fire("✅ Guardado", "Resolución actualizada", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo actualizar la resolución", "error");
    }
  };

  const handleEditRespuesta = async (event) => {
    const { value } = await MySwal.fire({
      title: "Editar Respuesta del Residente",
      html: `<textarea id="swal-resp" class="swal2-textarea" style="width:100%;padding:10px;">${getRespuestaResidente(event) || ""}</textarea>`,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "560px",
      preConfirm: () => document.getElementById("swal-resp").value ?? "",
    });
    if (value === undefined) return;
    try {
      const clienteLower = getClienteLower(event);
      const path = `novedades/${clienteLower}/eventos/${event.id}`;
      await updateDoc(doc(db, path), { ["respuesta-residente"]: value, respuesta: value });
      MySwal.fire("✅ Guardado", "Respuesta actualizada", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo actualizar la respuesta", "error");
    }
  };

  const handleEditFechaHora = async (event) => {
    const baseDate = isEdificioRow(event) ? (event?.fechaEventoObj || event?.fechaObj) : (event?.fechaObj);
    const pad = (n) => String(n).padStart(2, "0");
    const initial =
      baseDate instanceof Date && !isNaN(baseDate)
        ? `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}T${pad(
            baseDate.getHours()
          )}:${pad(baseDate.getMinutes())}`
        : "";

    const { value } = await MySwal.fire({
      title: isEdificioRow(event) ? "Editar FECHA DEL EVENTO" : "Editar fecha de envío",
      html: `
        <div style="text-align:left">
          <label style="font-size:12px;color:#374151">Fecha y hora</label>
          <input id="swal-dt" type="datetime-local" class="swal2-input" style="width:100%" value="${initial}" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "440px",
      focusConfirm: false,
      preConfirm: () => document.getElementById("swal-dt").value || "",
    });
    if (!value) return;

    const newDate = new Date(value);
    if (Number.isNaN(newDate.getTime())) {
      MySwal.fire("❌ Error", "Fecha/hora inválida.", "error");
      return;
    }
    try {
      const clienteLower = getClienteLower(event);
      const path = `novedades/${clienteLower}/eventos/${event.id}`;
      if (isEdificioRow(event)) {
        await updateDoc(doc(db, path), { fechaHoraEvento: Timestamp.fromDate(newDate) });
      } else {
        await updateDoc(doc(db, path), { fechaHoraEnvio: Timestamp.fromDate(newDate) });
      }
      MySwal.fire("✅ Guardado", "Fecha y hora actualizadas", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo actualizar la fecha y hora", "error");
    }
  };

  const handleEditUbicacion = async (event) => {
    const clienteLower = getClienteLower(event);
    if (clienteLower === "edificios") {
      const edificioActual = event.edificio || "";
      const unidadActual = event.unidad || "";
      const { value: formVals } = await MySwal.fire({
        title: "Editar Ubicación (Edificios)",
        html: `
          <div style="text-align:left">
            <label>Edificio</label>
            <input id="swal-edificio" class="swal2-input" style="width:100%" value="${edificioActual}"/>
            <label>Unidad (opcional)</label>
            <input id="swal-unidad" class="swal2-input" style="width:100%" value="${unidadActual}"/>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
        width: "560px",
        preConfirm: () => ({
          edificio: document.getElementById("swal-edificio").value ?? "",
          unidad: document.getElementById("swal-unidad").value ?? "",
        }),
      });
      if (!formVals) return;
      try {
        const path = `novedades/${clienteLower}/eventos/${event.id}`;
        await updateDoc(doc(db, path), { edificio: formVals.edificio, unidad: formVals.unidad || null });
        MySwal.fire("✅ Guardado", "Ubicación actualizada", "success");
      } catch {
        MySwal.fire("❌ Error", "No se pudo actualizar la ubicación", "error");
      }
    } else {
      const { value } = await MySwal.fire({
        title: "Editar Ubicación",
        input: "text",
        inputValue: getUbicacionDisplay(event) || "",
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
        width: "520px",
        inputAttributes: { spellcheck: "false" },
      });
      if (value === undefined) return;
      try {
        const path = `novedades/${clienteLower}/eventos/${event.id}`;
        await updateDoc(doc(db, path), { ubicacion: value });
        MySwal.fire("✅ Guardado", "Ubicación actualizada", "success");
      } catch {
        MySwal.fire("❌ Error", "No se pudo actualizar la ubicación", "error");
      }
    }
  };

  const handleDeleteEvent = async (event) => {
    const confirm = await MySwal.fire({
      title: "¿Eliminar este evento?",
      text: `Se eliminará el evento: "${getEventoTitulo(event)}" en "${event.ubicacion || event.edificio || ""}"`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;
    try {
      const path = `novedades/${getClienteLower(event)}/eventos/${event.id}`;
      await deleteDoc(doc(db, path));
      MySwal.fire("✅ Eliminado", "El evento fue eliminado", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo eliminar el evento", "error");
    }
  };

  // ===== Filtrado/orden =====
  const filteredData = useMemo(() => {
    const getSortDate = (row) =>
      isEdificioRow(row)
        ? (row?.fechaEventoObj || row?.fechaObj)
        : (row?.fechaObj || row?.fechaEventoObj);

    const base = (eventos || [])
      .slice()
      .sort((a, b) => {
        const da = getSortDate(a)?.getTime?.() || 0;
        const db = getSortDate(b)?.getTime?.() || 0;
        return db - da; // desc
      });

    const desde = filtros.fechaInicio ? new Date(`${filtros.fechaInicio}T00:00:00`) : null;
    const hasta = filtros.fechaFin ? new Date(`${filtros.fechaFin}T23:59:59`) : null;

    return base.filter((item) => {
      const clienteOk   = !filtros.cliente   || item?.cliente === filtros.cliente;
      const eventoOk    = !filtros.evento    || getEventoTitulo(item) === filtros.evento;
      const ubicacionOk = !filtros.ubicacion || getUbicacionDisplay(item) === filtros.ubicacion;

      const fechaBase =
        isEdificioRow(item)
          ? (item?.fechaEventoObj || item?.fechaObj)
          : (item?.fechaObj);

      const fechaOk =
        (!desde || (fechaBase && fechaBase >= desde)) &&
        (!hasta || (fechaBase && fechaBase <= hasta));

      return clienteOk && eventoOk && ubicacionOk && fechaOk;
    });
  }, [eventos, filtros]);

  // ===== Notificar al padre =====
  const lastSigRef = useRef("");
  useEffect(() => {
    const sig = `${filteredData.length}:${filteredData
      .map((e) => e.id ?? `${e.cliente}|${getEventoTitulo(e)}|${e.fecha || ""}`)
      .join("|")}`;
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      onFilteredChange?.(filteredData);
      window.__FILTERED_EVENTOS__ = filteredData;
    }
  }, [filteredData, onFilteredChange]);

  // ===== Estilos de celdas =====
  const cellTextStyle = useMemo(
    () => ({
      display: "block",
      minWidth: 0,
      whiteSpace: wrapCells ? "normal" : "nowrap",
      wordBreak: wrapCells ? "break-word" : "normal",
      overflowWrap: wrapCells ? "anywhere" : "normal",
      overflow: "hidden",
      textOverflow: "ellipsis",
      lineHeight: 1.35,
    }),
    [wrapCells]
  );

  const cellNowrapMono = {
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  // ===== Estilos DataTable =====
  const customStyles = useMemo(
    () => ({
      // ⚠️ Forzamos scroll horizontal visible abajo
      tableWrapper: { style: { display: "block", width: "100%", overflowX: "auto", overflowY: "hidden" } },
      table: {
        style: {
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          overflow: "auto", // asegura barras internas si hace falta
          tableLayout: "fixed",
          backgroundColor: "#ffffff",
          minWidth: "980px", // evita que colapse y desaparezca el scroll
        },
      },
      headRow: {
        style: {
          minHeight: 44,
          backgroundColor: "#f8fafc",
          position: "sticky",
          top: 0,
          zIndex: 2,
        },
      },
      headCells: {
        style: {
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: ".02em",
          textTransform: "uppercase",
          color: "#0f172a",
          paddingTop: dense ? 6 : 10,
          paddingBottom: dense ? 6 : 10,
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f8fafc",
        },
      },
      rows: {
        style: {
          minHeight: "auto",
          backgroundColor: "#ffffff",
          "&:hover": { backgroundColor: "#f3f4f6", transition: "0.15s" },
        },
      },
      cells: {
        style: {
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          alignItems: "flex-start",
          fontSize: dense ? 13 : 14.5,
          color: "#111827",
          lineHeight: dense ? 1.25 : 1.4,
          paddingTop: dense ? 6 : 10,
          paddingBottom: dense ? 6 : 10,
          paddingLeft: 12,
          paddingRight: 12,
          backgroundColor: "#ffffff",
        },
      },
      pagination: { style: { borderTop: "1px solid #e5e7eb" } },
    }),
    [dense]
  );

  // ===== Cell renderers =====
  const ObservacionCell = (row) => {
    const text = getObservacion(row) || "—";
    const link = safeUrl(row?.linkDrive);
    return (
      <div className="obs-cell" title={text}>
        <span style={cellTextStyle}>{text}</span>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="obs-link"
            title="Abrir imágenes en Drive"
          >
            Enlace a imágenes
          </a>
        )}
      </div>
    );
  };

  // ===== Columnas =====
  const baseColumns = useMemo(() => {
    const cols = [];

    if (visible.cliente) {
      cols.push({
        name: "Cliente",
        selector: (row) => row.cliente || "",
        sortable: true,
        minWidth: "140px",
        grow: 1,
        wrap: wrapCells,
        cell: (row) => <span style={cellTextStyle} title={row.cliente || ""}>{row.cliente || "—"}</span>,
      });
    }

    if (visible.evento) {
      cols.push({
        name: "Evento",
        selector: (row) => getEventoTitulo(row) || "",
        sortable: true,
        minWidth: "220px",
        grow: 2,
        wrap: wrapCells,
        cell: (row) => {
          const text = getEventoTitulo(row) || "—";
          return <span style={cellTextStyle} title={text}>{text}</span>;
        },
      });
    }

    if (visible.ubicacion) {
      cols.push({
        name: "Ubicación",
        selector: (row) => getUbicacionDisplay(row) || "",
        minWidth: "180px",
        grow: 1,
        wrap: wrapCells,
        cell: (row) => {
          const text = getUbicacionDisplay(row) || "—";
          return <span style={cellTextStyle} title={text}>{text}</span>;
        },
      });
    }

    if (visible.fechaEnvio) {
      cols.push({
        name: "Fecha envío",
        selector: (row) => row?.fechaObj?.getTime?.() || 0,
        sortable: true,
        minWidth: "150px",
        right: true,
        cell: (row) => (
          <span className="dt-cell-mono" title={formatFechaEnvio(row)} style={cellNowrapMono}>
            {formatFechaEnvio(row)}
          </span>
        ),
      });
    }

    if (visible.observacion) {
      cols.push({
        name: "Observación",
        selector: (row) => getObservacion(row) || "",
        grow: 2,
        minWidth: "280px",
        wrap: wrapCells,
        cell: ObservacionCell,
      });
    }

    return cols;
  }, [visible, wrapCells, cellTextStyle]);

  const edificioOnlyColumns = useMemo(() => {
    const cols = [];

    if (visible.fechaEvento) {
      cols.push({
        name: "Fecha evento",
        selector: (r) => r?.fechaEventoObj?.getTime?.() || 0,
        sortable: true,
        minWidth: "150px",
        right: true,
        cell: (r) => (
          <span className="dt-cell-mono" title={formatFechaEvento(r)} style={cellNowrapMono}>
            {formatFechaEvento(r)}
          </span>
        ),
      });
    }
    if (visible.razones) {
      cols.push({
        name: "Razones",
        selector: (r) => getRazones(r) || "—",
        minWidth: "220px",
        wrap: wrapCells,
        cell: (r) => {
          const text = getRazones(r) || "—";
          return <span style={cellTextStyle} title={text}>{text}</span>;
        },
      });
    }
    if (visible.resolucion) {
      cols.push({
        name: "Resolución",
        selector: (r) => getResolucion(r) || "—",
        minWidth: "220px",
        wrap: wrapCells,
        cell: (r) => {
          const text = getResolucion(r) || "—";
          return <span style={cellTextStyle} title={text}>{text}</span>;
        },
      });
    }
    if (visible.respuesta) {
      cols.push({
        name: "Respuesta Residente",
        selector: (r) => getRespuestaResidente(r) || "—",
        minWidth: "220px",
        wrap: wrapCells,
        cell: (r) => {
          const text = getRespuestaResidente(r) || "—";
          return <span style={cellTextStyle} title={text}>{text}</span>;
        },
      });
    }
    return cols;
  }, [visible, wrapCells, cellTextStyle]);

  const tgsOnlyColumns = useMemo(() => {
    if (!visible.proveedor) return [];
    return [
      {
        name: "Proveedor",
        selector: (r) => getProveedorTGS(r) || "—",
        minWidth: "180px",
        wrap: wrapCells,
        cell: (r) => {
          const text = getProveedorTGS(r) || "—";
          return <span style={cellTextStyle} title={text}>{text}</span>;
        },
      },
    ];
  }, [visible, wrapCells, cellTextStyle]);

  const columns = useMemo(() => {
    const cols = [...baseColumns];
    if (filteredData.length > 0 && filteredData.every(isEdificioRow)) {
      if (visible.fechaEvento) {
        const idxUbic = cols.findIndex((c) => c.name === "Ubicación");
        const fechaCol = edificioOnlyColumns.find((c) => c.name === "Fecha evento");
        if (idxUbic >= 0 && fechaCol) cols.splice(idxUbic + 1, 0, fechaCol);
      }
      edificioOnlyColumns
        .filter((c) => c.name !== "Fecha evento")
        .forEach((c) => cols.push(c));
    } else if (filteredData.length > 0 && filteredData.every(isTGSRow)) {
      cols.push(...tgsOnlyColumns);
    }

    if (visible.acciones) {
      cols.push({
        name: "Acciones",
        minWidth: "220px",
        maxWidth: "280px",
        grow: 0,
        center: false,
        cell: (row) => (
          <div className="dt-actions">
            <button onClick={() => handleEditObservation(row)} className="btn -indigo">
              Obs
            </button>
            <button onClick={() => handleEditFechaHora(row)} className="btn -violet">
              {isEdificioRow(row) ? "Fecha evento" : "Fecha envío"}
            </button>
            {isEdificioRow(row) && (
              <>
                <button onClick={() => handleEditResolucion(row)} className="btn -emerald">
                  Resolv
                </button>
                <button onClick={() => handleEditRespuesta(row)} className="btn -sky">
                  Resp
                </button>
              </>
            )}
            <button onClick={() => handleEditUbicacion(row)} className="btn -amber">
              Ubic
            </button>
            <button onClick={() => handleDeleteEvent(row)} className="btn -red">
              🗑
            </button>
          </div>
        ),
      });
    }
    return cols;
  }, [baseColumns, edificioOnlyColumns, tgsOnlyColumns, filteredData, visible]);

  // ===== Render =====
  const onlyEdificios = filteredData.length > 0 && filteredData.every(isEdificioRow);
  const onlyTgs = filteredData.length > 0 && filteredData.every(isTGSRow);

  return (
    <div
      ref={fullRef}
      className={`event-table-card ${isFull ? "is-fullscreen" : ""} ${freezeFirst ? "freeze-first-col" : ""}`}
    >
      <div className="table-header">
        <div>
          <div className="table-title">Eventos</div>
          <div className="table-subtitle">
            {filteredData.length} resultados · {onlyEdificios ? "Edificios" : onlyTgs ? "TGS" : "Mixto"}
          </div>
        </div>

        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="toolbar-group">
            <label className="switch">
              <input type="checkbox" checked={dense} onChange={(e) => setDense(e.target.checked)} />
              <span>Denso</span>
            </label>
            <label className="switch">
              <input type="checkbox" checked={wrapCells} onChange={(e) => setWrapCells(e.target.checked)} />
              <span>Multilínea</span>
            </label>
            <label className="switch">
              <input type="checkbox" checked={freezeFirst} onChange={(e) => setFreezeFirst(e.target.checked)} />
              <span>Fijar 1ª columna</span>
            </label>
            <button className="toolbar-btn" onClick={toggleFullscreen}>
              {isFull ? "Salir pantalla completa" : "Pantalla completa"}
            </button>
          </div>

          {/* Selector de columnas */}
          <details className="columns-picker">
            <summary>Columnas</summary>
            <div className="columns-list">
              {[
                ["cliente", "Cliente"],
                ["evento", "Evento"],
                ["ubicacion", "Ubicación"],
                ["fechaEnvio", "Fecha envío"],
                ...(onlyEdificios ? [["fechaEvento", "Fecha evento"]] : []),
                ["observacion", "Observación"],
                ...(onlyEdificios
                  ? [
                      ["razones", "Razones"],
                      ["resolucion", "Resolución"],
                      ["respuesta", "Respuesta"],
                    ]
                  : []),
                ...(onlyTgs ? [["proveedor", "Proveedor"]] : []),
                ["acciones", "Acciones"],
              ].map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={!!visible[key]}
                    onChange={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* WRAPPER EXTERNO con scroll horizontal visible abajo */}
      <div className="dt-outer-scroll">
        <DataTable
          columns={columns}
          data={filteredData}
          theme="g3tTheme"
          customStyles={customStyles}
          dense={dense}
          striped
          highlightOnHover
          responsive
          pagination
          paginationPerPage={50}
          paginationRowsPerPageOptions={[20, 50, 100, 200]}
          fixedHeader
          fixedHeaderScrollHeight="70vh"
          persistTableHead
          noDataComponent={<div style={{ padding: 16 }}>Sin eventos para los filtros seleccionados.</div>}
          expandableRows
          expandableRowsComponent={ExpandedRow}
          expandOnRowClicked
          expandableRowsHideExpander
        />
      </div>
    </div>
  );
}
