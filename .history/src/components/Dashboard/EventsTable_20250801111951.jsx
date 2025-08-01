import React, { useState, useMemo } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { FiSearch, FiRotateCcw } from "react-icons/fi"; // ✅ Íconos modernos
import "../../styles/eventstable.css";

const MySwal = withReactContent(Swal);

// ✅ Tema moderno para la tabla
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

  // ✅ Columnas configuradas
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
      ignoreRowClick: true,
    },
  ];

  // ✅ Estilo visual de la tabla
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

  // ✅ Filtrado dinámico (texto + fechas)
  const filteredData = useMemo(() => {
    return eventos.filter((item) => {
      const textMatch =
        item.cliente?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.evento?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.ubicacion?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.observacion?.toLowerCase().includes(filterText.toLowerCase());

      const fechaEvento = item.fechaObj || new Date(item.fecha);
      const desde = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null;
      const hasta = fechaFin ? new Date(`${fechaFin}T23:59:59`) : null;

      const dateMatch =
        (!desde || fechaEvento >= desde) && (!hasta || fechaEvento <= hasta);

      return textMatch && dateMatch;
    });
  }, [eventos, filterText, fechaInicio, fechaFin]);

  // ✅ Editar observación (SweetAlert2)
  const handleEditObservation = async (event) => {
    const { value: newObservation } = await MySwal.fire({
      title: "Editar Observación",
      html: `
        <textarea id="swal-observation" class="swal2-textarea" style="width:100%;padding:10px;">
          ${event.observacion || ""}
        </textarea>`,
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
    <div className="bg-white shadow-lg rounded-xl p-5">
      {/* ✅ Barra de filtros profesional */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-gray-50 p-4 rounded-lg shadow-sm">
        {/* 🔍 Campo de búsqueda con ícono */}
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, evento o ubicación..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
        </div>

        {/* 📅 Filtro de fecha desde */}
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
        />

        {/* 📅 Filtro de fecha hasta */}
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
        />

        {/* 🔄 Botón Reset con ícono */}
        <button
          onClick={() => {
            setFilterText("");
            setFechaInicio("");
            setFechaFin("");
          }}
          className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
        >
          <FiRotateCcw /> Reset
        </button>
      </div>

      {/* ✅ Tabla moderna con DataTable */}
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
