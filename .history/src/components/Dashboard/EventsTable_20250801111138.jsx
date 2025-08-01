import React, { useState, useMemo } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/eventstable.css";

const MySwal = withReactContent(Swal);

// ✅ Tema moderno
createTheme("g3tTheme", {
  text: { primary: "#1f2937", secondary: "#6b7280" },
  background: { default: "#ffffff" },
  context: { background: "#2563eb", text: "#FFFFFF" },
  divider: { default: "#e5e7eb" },
});

export default function EventsTable({ eventos, filtros }) {
  const [filterText, setFilterText] = useState("");

  // ✅ Columnas sin props inválidas
  const columns = [
    { name: "Cliente", selector: (row) => row.cliente, sortable: true },
    { name: "Evento", selector: (row) => row.evento, sortable: true },
    { name: "Ubicación", selector: (row) => row.ubicacion },
    { name: "Fecha", selector: (row) => row.fecha, sortable: true },
    { name: "Observación", selector: (row) => row.observacion, wrap: true },
    {
      name: "Acciones",
      cell: (row) => (
        <button
          onClick={() => handleEditObservation(row)}
          className="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition"
        >
          ✏️ Editar
        </button>
      ),
      ignoreRowClick: true, // ✅ OK para evitar abrir fila al hacer click
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
        "&:hover": {
          backgroundColor: "#f3f4f6",
          transition: "0.2s",
        },
      },
    },
  };

  // ✅ Filtrado avanzado
  const filteredData = useMemo(() => {
    return eventos.filter((item) => {
      const matchesText =
        item.cliente?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.evento?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.ubicacion?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.observacion?.toLowerCase().includes(filterText.toLowerCase());

      const fechaEvento = item.fechaObj;
      const fechaInicio = filtros?.fechaInicio ? new Date(`${filtros.fechaInicio}T00:00:00`) : null;
      const fechaFin = filtros?.fechaFin ? new Date(`${filtros.fechaFin}T23:59:59`) : null;

      const matchesFilters =
        (!filtros?.cliente || item.cliente === filtros.cliente) &&
        (!filtros?.evento || item.evento === filtros.evento) &&
        (!filtros?.ubicacion || item.ubicacion === filtros.ubicacion) &&
        (!fechaInicio || (fechaEvento && fechaEvento >= fechaInicio)) &&
        (!fechaFin || (fechaEvento && fechaEvento <= fechaFin));

      return matchesText && matchesFilters;
    });
  }, [eventos, filterText, filtros]);

  // ✅ Editar con SweetAlert
  const handleEditObservation = async (event) => {
    const { value: newObservation } = await MySwal.fire({
      title: "Editar Observación",
      html: `<textarea id="swal-observation" class="swal2-textarea" style="width:100%;padding:10px;">${event.observacion || ""}</textarea>`,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "500px",
      preConfirm: () => document.getElementById("swal-observation").value,
    });

    if (newObservation !== undefined) {
      try {
        const path = `novedades/${event.cliente.toLowerCase()}/eventos/${event.id}`;
        await updateDoc(doc(db, path), { [`observaciones-${event.cliente.toLowerCase()}`]: newObservation });
        MySwal.fire("✅ Guardado", "Observación actualizada", "success");
      } catch {
        MySwal.fire("❌ Error", "No se pudo actualizar", "error");
      }
    }
  };

  return (
    <div className="bg-white shadow-md rounded-xl p-4">
      {/* ✅ Barra de búsqueda */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full"
        />
      </div>

      {/* ✅ Tabla moderna */}
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
