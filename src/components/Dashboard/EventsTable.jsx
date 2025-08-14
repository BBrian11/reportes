import React, { useState, useMemo } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { FiSearch, FiRotateCcw, FiCalendar } from "react-icons/fi";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/eventstable.css";

const MySwal = withReactContent(Swal);

// ✅ Tema DataTable
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

  // ✅ Getters robustos
  // ✅ Getters simples y robustos (sin depender de cliente)
const getObservacion = (row) =>
row?.observacion ??
row?.["observaciones-edificios"] ??
"";

const getResolucion = (row) =>
row?.["resolusion-evento"] ??        // nombre con guion y typo (el de tu DB)
row?.["resolucion-evento"] ??        // por si en algún lado lo guardaste bien
row?.resolucion ??                   // variantes comunes
row?.resolucionEvento ??
row?.resolusionEvento ??
"";
const getRespuestaResidente = (row) =>
  row?.["respuesta-residente"] ??
  row?.respuesta ??
  "";
  // ✅ Columnas (solo agrego Resolución)
  const columns = [
    { name: "Cliente", selector: (row) => row.cliente, sortable: true },
    { name: "Evento", selector: (row) => row.evento || row["evento-edificio"], sortable: true },
    { name: "Ubicación", selector: (row) => row.ubicacion || row.edificio },
    { name: "Fecha", selector: (row) => row.fecha || row.fechaHoraEnvio, sortable: true },
  
    // ✅ Observación: toma la que exista (normal y/o de Edificios)
    { name: "Observación", selector: (row) => getObservacion(row) || "-", wrap: true },
  
    // ✅ Resolución: se muestra si el doc trae cualquiera de las variantes; si no, “-”
    { name: "Resolución", selector: (row) => getResolucion(row) || "-", wrap: true },
    { name: "Respuesta Residente", selector: (row) => getRespuestaResidente(row) || "-", wrap: true },
    {
      name: "Acciones",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditObservation(row)}
            className="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => handleDeleteEvent(row)}
            className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition"
          >
            🗑 Eliminar
          </button>
        </div>
      ),
      ignoreRowClick: true,
    },
  ];
  
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

  // ✅ Filtrado: busca también en la observación correcta y en resolución
  const filteredData = useMemo(() => {
    return (eventos || []).filter((item) => {
      const texto = (filterText || "").toLowerCase();
      const textMatch =
        item?.cliente?.toLowerCase().includes(texto) ||
        item?.evento?.toLowerCase().includes(texto) ||
        item?.ubicacion?.toLowerCase().includes(texto) ||
        (getObservacion(item) || "").toLowerCase().includes(texto) ||   // ✅
        (getResolucion(item) || "").toLowerCase().includes(texto);      // ✅
  
      const fechaEvento =
        item?.fechaObj || (item?.fecha instanceof Date ? item.fecha : new Date(item?.fecha ?? item?.fechaHoraEnvio));
      const desde = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null;
      const hasta = fechaFin ? new Date(`${fechaFin}T23:59:59`) : null;
  
      return (
        textMatch &&
        (!desde || (fechaEvento && fechaEvento >= desde)) &&
        (!hasta || (fechaEvento && fechaEvento <= hasta))
      );
    });
  }, [eventos, filterText, fechaInicio, fechaFin]);
  
  // ✅ Editar Observación (escribe en el campo correcto)
  const handleEditObservation = async (event) => {
    const { value: newObservation } = await MySwal.fire({
      title: "Editar Observación",
      html: `
        <textarea id="swal-observation" class="swal2-textarea" style="width:100%;padding:10px;">${getObservacion(event) || ""}</textarea>
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "500px",
      preConfirm: () => document.getElementById("swal-observation").value,
    });
    if (newObservation === undefined) return;

    try {
      // decidir colección
      const clienteLower = (event?.cliente || (event?.edificio ? "Edificios" : "otros")).toLowerCase();
      const path = `novedades/${clienteLower}/eventos/${event.id}`;

      // decidir campo de observación
      const fieldName =
        clienteLower === "edificios"
          ? "observaciones-edificios"
          : `observaciones-${clienteLower}`;

      await updateDoc(doc(db, path), { [fieldName]: newObservation });
      MySwal.fire("✅ Guardado", "Observación actualizada", "success");
    } catch {
      MySwal.fire("❌ Error", "No se pudo actualizar", "error");
    }
  };

  // ✅ Eliminar Evento
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

    if (confirm.isConfirmed) {
      try {
        const clienteLower = (event?.cliente || (event?.edificio ? "Edificios" : "otros")).toLowerCase();
        const path = `novedades/${clienteLower}/eventos/${event.id}`;
        await deleteDoc(doc(db, path));
        MySwal.fire("✅ Eliminado", "El evento fue eliminado", "success");
      } catch {
        MySwal.fire("❌ Error", "No se pudo eliminar el evento", "error");
      }
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Filtros de búsqueda</h2>

      <div className="filters-container">
        <div className="icon-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Buscar cliente, evento, observación o resolución..."
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
