// src/components/EventsTable.jsx
import React, { useState, useMemo } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { FiSearch, FiRotateCcw, FiCalendar } from "react-icons/fi";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase"; // ajustá la ruta si hace falta
import "../../styles/eventstable.css";        // opcional

const MySwal = withReactContent(Swal);

// ✅ Tema
createTheme("g3tTheme", {
  text: { primary: "#1f2937", secondary: "#6b7280" },
  background: { default: "#ffffff" },
  context: { background: "#2563eb", text: "#FFFFFF" },
  divider: { default: "#e5e7eb" },
});

export default function EventsTable({ eventos }) {
  const [filterText, setFilterText] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // ======================
  // Getters robustos
  // ======================
  const getClienteLower = (row) =>
    (row?.cliente || (row?.edificio ? "Edificios" : "otros"))
      .toString()
      .toLowerCase();

  const getObservacion = (row) =>
    row?.observacion ??
    row?.["observaciones-edificios"] ??
    row?.[`observaciones-${getClienteLower(row)}`] ??
    "";

  const getResolucion = (row) =>
    row?.["resolusion-evento"] ?? // typo original
    row?.["resolucion-evento"] ??
    row?.resolucion ??
    row?.resolucionEvento ??
    row?.resolusionEvento ??
    "";

  const getRespuestaResidente = (row) =>
    row?.["respuesta-residente"] ??
    row?.respuesta ??
    "";

  const getRazones = (row) =>
    row?.["razones-pma"] ??
    row?.["razones_pma"] ??
    row?.["razonesPma"] ??
    row?.razones ??
    "";

  const getUbicacionDisplay = (row) =>
    row?.ubicacion || row?.edificio || "";

  // ¿Es una fila de EDIFICIO(S)?
  const isEdificioRow = (row) => {
    const cl = (row?.cliente || "").toString().trim().toUpperCase();
    if (cl.includes("EDIFICIO")) return true; // "EDIFICIO"/"EDIFICIOS"
    if (row?.edificio) return true;           // tiene campo 'edificio'
    return getClienteLower(row) === "edificios";
  };

  // ======================
  // Handlers de edición
  // ======================

  // Observación
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

  // Resolución (solo sentido para EDIFICIO)
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
        ["resolusion-evento"]: value, // espejo
        resolucion: value,            // clave normalizada
      });
      MySwal.fire("✅ Guardado", "Resolución actualizada", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo actualizar la resolución", "error");
    }
  };

  // Respuesta del residente (solo EDIFICIO)
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
        ["respuesta-residente"]: value, // original
        respuesta: value,               // normalizada
      });
      MySwal.fire("✅ Guardado", "Respuesta actualizada", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo actualizar la respuesta", "error");
    }
  };

  // Ubicación
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
        await updateDoc(doc(db, path), {
          edificio: formVals.edificio,
          unidad: formVals.unidad || null,
        });
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

  // Eliminar
  const handleDeleteEvent = async (event) => {
    const confirm = await MySwal.fire({
      title: "¿Eliminar este evento?",
      text: `Se eliminará el evento: "${event.evento}" en "${event.ubicacion || event.edificio || ""}"`,
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

  // ======================
  // Filtro + orden por fecha (desc)
  // ======================
  const filteredData = useMemo(() => {
    const base = (eventos || [])
      .slice()
      .sort((a, b) => {
        const da = a?.fechaObj?.getTime?.() || 0;
        const db = b?.fechaObj?.getTime?.() || 0;
        return db - da; // más nuevos primero
      });

    return base.filter((item) => {
      const texto = (filterText || "").toLowerCase();
      const textMatch =
        (item?.cliente || "").toLowerCase().includes(texto) ||
        (item?.evento || "").toLowerCase().includes(texto) ||
        (getUbicacionDisplay(item) || "").toLowerCase().includes(texto) ||
        (getObservacion(item) || "").toLowerCase().includes(texto) ||
        (getResolucion(item) || "").toLowerCase().includes(texto) ||
        (getRespuestaResidente(item) || "").toLowerCase().includes(texto) ||
        (getRazones(item) || "").toLowerCase().includes(texto);

      const fechaEvento =
        item?.fechaObj ||
        (item?.fecha instanceof Date ? item.fecha : new Date(item?.fecha ?? item?.fechaHoraEnvio));
      const desde = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null;
      const hasta = fechaFin ? new Date(`${fechaFin}T23:59:59`) : null;

      return (
        textMatch &&
        (!desde || (fechaEvento && fechaEvento >= desde)) &&
        (!hasta || (fechaEvento && fechaEvento <= hasta))
      );
    });
  }, [eventos, filterText, fechaInicio, fechaFin]);

  // ======================
  // Columnas dinámicas
  // ======================

  // ¿La vista actual contiene SOLO edificios?
  const onlyEdificio = useMemo(
    () => filteredData.length > 0 && filteredData.every(isEdificioRow),
    [filteredData]
  );

  // Base (común)
  const baseColumns = useMemo(() => ([
    { name: "Cliente", selector: (row) => row.cliente, sortable: true },
    { name: "Evento", selector: (row) => row.evento || row["evento-edificio"], sortable: true },
    { name: "Ubicación", selector: (row) => row.ubicacion || row.edificio },
    { name: "Fecha", selector: (row) => row.fecha || row.fechaHoraEnvio, sortable: true },
    { name: "Observación", selector: (row) => getObservacion(row) || "-", wrap: true },
  ]), []);

  // Extras (solo EDIFICIO)
  const edificioOnlyColumns = useMemo(() => ([
    { name: "Razones", selector: (row) => getRazones(row) || "-", wrap: true },
    { name: "Resolución", selector: (row) => getResolucion(row) || "-", wrap: true },
    { name: "Respuesta Residente", selector: (row) => getRespuestaResidente(row) || "-", wrap: true },
  ]), []);

  const columns = useMemo(() => {
    const cols = [...baseColumns];
    if (onlyEdificio) cols.push(...edificioOnlyColumns);

    // Acciones al final (Resolv/Resp solo si la fila es de edificio)
    cols.push({
      name: "Acciones",
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleEditObservation(row)}
            className="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition"
          >
            Obs
          </button>

          {isEdificioRow(row) && (
            <>
              <button
                onClick={() => handleEditResolucion(row)}
                className="bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition"
              >
                Resolv
              </button>
              <button
                onClick={() => handleEditRespuesta(row)}
                className="bg-sky-600 text-white px-3 py-1 rounded-lg hover:bg-sky-700 transition"
              >
                Resp
              </button>
            </>
          )}

          <button
            onClick={() => handleEditUbicacion(row)}
            className="bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 transition"
          >
            Ubic
          </button>
          <button
            onClick={() => handleDeleteEvent(row)}
            className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition"
          >
            🗑
          </button>
        </div>
      ),
      ignoreRowClick: true,
    });

    return cols;
  }, [baseColumns, edificioOnlyColumns, onlyEdificio]);

  // ======================
  // Estilos tabla
  // ======================
  const customStyles = {
    headCells: {
      style: {
        fontWeight: "700",
        fontSize: "14px",
        backgroundColor: "#f9fafb",
        color: "#111827",
        borderBottom: "1px solid #e5e7eb",
      },
    },
    rows: {
      style: {
        "&:hover": { backgroundColor: "#f3f4f6", transition: "0.2s" },
      },
    },
  };

  // ======================
  // Render
  // ======================
  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Filtros de búsqueda</h2>

      <div className="filters-container">
        <div className="icon-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Buscar cliente, evento, observación, resolución, respuesta, razones..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>

        <div className="icon-wrapper">
          <FiCalendar />
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>

        <div className="icon-wrapper">
          <FiCalendar />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>

        <div className="reset-wrapper">
          <button onClick={() => { setFilterText(""); setFechaInicio(""); setFechaFin(""); }}>
            <FiRotateCcw /> Reset
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        pagination
        highlightOnHover
        responsive
        striped
        theme="g3tTheme"
        customStyles={customStyles}
        paginationPerPage={50}
        paginationRowsPerPageOptions={[10, 20, 50, 100, 150]}
        fixedHeader
        fixedHeaderScrollHeight="600px"
      />
    </div>
  );
}
