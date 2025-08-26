import React, { useMemo, useEffect, useRef } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/eventstable.css";

const MySwal = withReactContent(Swal);

// ===== Tema (mejor contraste/legibilidad) =====
createTheme("g3tTheme", {
  text: { primary: "#111827", secondary: "#4b5563" },
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

const formatDate = (row) => {
  const value =
    row?.fechaObj ||
    (row?.fecha instanceof Date ? row.fecha : new Date(row?.fecha ?? row?.fechaHoraEnvio));
  if (!(value instanceof Date) || isNaN(value)) return "—";
  return value.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

// Ellipsis + tooltip
// ⚠️ QUITA Ellipsis de uso en columnas textuales
const Multi = ({ text }) => (
  <span className="cell-multiline">{text || "—"}</span>
);


// ===== Panel expandible =====
const ExpandedRow = ({ data }) => (
  <div className="expanded-panel">
    <div className="expanded-grid">
      <div>
        <h4>Observación</h4>
        <p>{getObservacion(data) || "—"}</p>
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

export default function EventsTable({
  eventos = [],
  filtros = { cliente: "", evento: "", ubicacion: "", fechaInicio: "", fechaFin: "" },
  onFilteredChange,
}) {
  // ===== Handlers edición =====
  const handleEditObservation = async (event) => {
    const { value } = await MySwal.fire({
      title: "Editar Observación",
      html: `<textarea id="swal-obs" class="swal2-textarea" style="width:100%;padding:10px;">${getObservacion(event) || ""}</textarea>`,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "520px",
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
      width: "520px",
      preConfirm: () => document.getElementById("swal-res").value ?? "",
    });
    if (value === undefined) return;
    try {
      const clienteLower = getClienteLower(event);
      const path = `novedades/${clienteLower}/eventos/${event.id}`;
      await updateDoc(doc(db, path), {
        ["resolusion-evento"]: value,
        resolucion: value,
      });
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
      width: "520px",
      preConfirm: () => document.getElementById("swal-resp").value ?? "",
    });
    if (value === undefined) return;
    try {
      const clienteLower = getClienteLower(event);
      const path = `novedades/${clienteLower}/eventos/${event.id}`;
      await updateDoc(doc(db, path), {
        ["respuesta-residente"]: value,
        respuesta: value,
      });
      MySwal.fire("✅ Guardado", "Respuesta actualizada", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo actualizar la respuesta", "error");
    }
  };

  const handleEditFechaHora = async (event) => {
    const d =
      event?.fechaObj ||
      (event?.fecha instanceof Date ? event.fecha : new Date(event?.fecha ?? event?.fechaHoraEnvio));
    const pad = (n) => String(n).padStart(2, "0");
    const initial =
      d instanceof Date && !isNaN(d)
        ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
            d.getMinutes()
          )}`
        : "";
    const { value } = await MySwal.fire({
      title: "Editar fecha y hora",
      html: `
        <div style="text-align:left">
          <label style="font-size:12px;color:#374151">Fecha y hora</label>
          <input id="swal-dt" type="datetime-local" class="swal2-input" style="width:100%" value="${initial}" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "420px",
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
      await updateDoc(doc(db, path), { fechaHoraEnvio: Timestamp.fromDate(newDate) });
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
        width: "520px",
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

  // ===== Filtrado/orden (usa SOLO props.filtros) =====
  const filteredData = useMemo(() => {
    const base = (eventos || [])
      .slice()
      .sort((a, b) => {
        const da = a?.fechaObj?.getTime?.() || 0;
        const db = b?.fechaObj?.getTime?.() || 0;
        return db - da;
      });

    const desde = filtros.fechaInicio ? new Date(`${filtros.fechaInicio}T00:00:00`) : null;
    const hasta = filtros.fechaFin ? new Date(`${filtros.fechaFin}T23:59:59`) : null;

    return base.filter((item) => {
      const clienteOk   = !filtros.cliente   || item?.cliente === filtros.cliente;
      const eventoOk    = !filtros.evento    || getEventoTitulo(item) === filtros.evento;
      const ubicacionOk = !filtros.ubicacion || getUbicacionDisplay(item) === filtros.ubicacion;

      const fechaEvento =
        item?.fechaObj ||
        (item?.fecha instanceof Date ? item.fecha : new Date(item?.fecha ?? item?.fechaHoraEnvio));
      const fechaOk =
        (!desde || (fechaEvento && fechaEvento >= desde)) &&
        (!hasta || (fechaEvento && fechaEvento <= hasta));

      return clienteOk && eventoOk && ubicacionOk && fechaOk;
    });
  }, [eventos, filtros]);

  // ===== Notificar al padre SOLO si cambia de verdad (anti-loop) =====
  const lastSigRef = useRef("");
  useEffect(() => {
    // Firma barata: largo + ids o combinación estable
    const sig = `${filteredData.length}:${filteredData
      .map((e) => e.id ?? `${e.cliente}|${getEventoTitulo(e)}|${e.fecha ?? e.fechaHoraEnvio ?? ""}`)
      .join("|")}`;

    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      onFilteredChange?.(filteredData);
      window.__FILTERED_EVENTOS__ = filteredData; // por si el export lo usa de backup
    }
  }, [filteredData, onFilteredChange]);

  // ===== Detectores de tipo (RESTABLECIDO) =====
  const onlyEdificio = useMemo(
    () => filteredData.length > 0 && filteredData.every(isEdificioRow),
    [filteredData]
  );
  const onlyTGS = useMemo(
    () => filteredData.length > 0 && filteredData.every(isTGSRow),
    [filteredData]
  );

  const baseColumns = useMemo(() => [
    {
      name: "Cliente",
      selector: (row) => row.cliente,
      sortable: true,
      minWidth: "120px",
      wrap: true,
      cell: (row) => <Multi text={row.cliente} />,
      style: { minWidth: 0 },
    },
    {
      name: "Evento",
      selector: (row) => getEventoTitulo(row),
      sortable: true,
      grow: 2,
      minWidth: "220px",
      wrap: true,
      cell: (row) => <Multi text={getEventoTitulo(row)} />,
      style: { minWidth: 0 },
    },
    {
      name: "Ubicación",
      selector: (row) => row.ubicacion || row.edificio,
      minWidth: "160px",
      wrap: true,
      cell: (row) => <Multi text={getUbicacionDisplay(row)} />,
      // clave para que NO invada Fecha
      style: { minWidth: 0, whiteSpace: "normal" },
    },
    {
      name: "Fecha",
      selector: (row) => row.fecha || row.fechaHoraEnvio,
      sortable: true,
      minWidth: "150px",
      right: true,
      // Fecha siempre en una sola línea
      cell: (row) => <span className="dt-cell-mono dt-nowrap">{formatDate(row)}</span>,
      style: { minWidth: 0, whiteSpace: "nowrap" },
    },
    {
      name: "Observación",
      selector: (row) => getObservacion(row),
      grow: 2,
      minWidth: "240px",
      wrap: true,
      cell: (row) => <Multi text={getObservacion(row)} />,
      style: { minWidth: 0 },
    },
  ], []);
  
  const edificioOnlyColumns = useMemo(() => [
    { name: "Razones", selector: (r) => getRazones(r) || "-",    minWidth: "220px", wrap: true, cell: (r) => <Multi text={getRazones(r)} />,    style:{ minWidth:0 } },
    { name: "Resolución", selector: (r) => getResolucion(r) || "-", minWidth: "220px", wrap: true, cell: (r) => <Multi text={getResolucion(r)} />, style:{ minWidth:0 } },
    { name: "Respuesta Residente", selector: (r) => getRespuestaResidente(r) || "-", minWidth: "220px", wrap: true, cell: (r) => <Multi text={getRespuestaResidente(r)} />, style:{ minWidth:0 } },
  ], []);
  
  const tgsOnlyColumns = useMemo(() => [
    { name: "Proveedor", selector: (r) => getProveedorTGS(r) || "-", minWidth: "180px", wrap: true, cell: (r) => <Multi text={getProveedorTGS(r)} />, style:{ minWidth:0 } },
  ], []);
  

  const columns = useMemo(() => {
    const cols = [...baseColumns];
    if (onlyEdificio) cols.push(...edificioOnlyColumns);
    else if (onlyTGS) cols.push(...tgsOnlyColumns);
    cols.push({
      name: "Acciones",
      minWidth: "230px",
      cell: (row) => (
        <div className="dt-actions">
          <button onClick={() => handleEditObservation(row)} className="btn -indigo">Obs</button>
          <button onClick={() => handleEditFechaHora(row)} className="btn -violet" title="Editar fecha y hora">Fecha</button>
          {isEdificioRow(row) && (
            <>
              <button onClick={() => handleEditResolucion(row)} className="btn -emerald">Resolv</button>
              <button onClick={() => handleEditRespuesta(row)} className="btn -sky">Resp</button>
            </>
          )}
          <button onClick={() => handleEditUbicacion(row)} className="btn -amber">Ubic</button>
          <button onClick={() => handleDeleteEvent(row)} className="btn -red">🗑</button>
        </div>
      ),
      ignoreRowClick: true,
    });
    return cols;
  }, [baseColumns, edificioOnlyColumns, tgsOnlyColumns, onlyEdificio, onlyTGS]);

  // ===== Estilos tabla =====
  const customStyles = {
    table: { style: { border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" } },
    headRow: { style: { minHeight: "44px", backgroundColor: "#f8fafc" } },
    headCells: { style: { fontWeight: 800, fontSize: "13.5px", letterSpacing: ".02em", textTransform: "uppercase", color: "#0f172a", paddingTop: "8px", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb" } },
    cells: {
      style: {
        minWidth: 0,
        whiteSpace: "normal",     // ← permite multiple líneas
        overflow: "visible",
        alignItems: "flex-start", // texto pega arriba
        fontSize: "13.5px",
        color: "#111827",
        lineHeight: 1.35,
        paddingTop: "6px",
        paddingBottom: "6px",
      },
    },
    rows: {
      style: {
        minHeight: "auto",        // ← alto según contenido
        "&:hover": { backgroundColor: "#f3f4f6", transition: "0.15s" },
      },
    },
    pagination: { style: { borderTop: "1px solid #e5e7eb" } },
  };
  
  
  return (
    <DataTable
  columns={columns}
  data={filteredData}
  theme="g3tTheme"
  customStyles={customStyles}
  dense                  // ← más compacto
  striped
  highlightOnHover
  responsive
  pagination
  paginationPerPage={50}
  paginationRowsPerPageOptions={[10, 20, 50, 100, 150]}
  fixedHeader
  fixedHeaderScrollHeight="600px"
  persistTableHead
  noDataComponent={<div style={{ padding: 16 }}>Sin eventos para los filtros seleccionados.</div>}
  expandableRows
  expandableRowsComponent={ExpandedRow}
  expandOnRowClicked
  expandableRowsHideExpander
/>

  );
}
