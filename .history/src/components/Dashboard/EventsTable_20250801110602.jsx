import React, { useState, useMemo } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { motion } from "framer-motion";
import { Search, RefreshCw, Filter, Edit3 } from "lucide-react";
import "../../styles/eventstable.css";

const MySwal = withReactContent(Swal);

// ✅ Tema moderno para DataTable
createTheme("g3tTheme", {
  text: { primary: "#111827", secondary: "#6b7280" },
  background: { default: "#ffffff" },
  context: { background: "#2563eb", text: "#FFFFFF" },
  divider: { default: "#e5e7eb" },
  action: { button: "#2563eb", hover: "rgba(37,99,235,0.1)", disabled: "#ccc" },
});

export default function EventsTable({ eventos, filtros }) {
  const [filterText, setFilterText] = useState("");
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedEvento, setSelectedEvento] = useState("");
  const [selectedUbicacion, setSelectedUbicacion] = useState("");

  // ✅ Columnas
  const columns = [
    { name: "Cliente", selector: (row) => row.cliente, sortable: true },
    { name: "Evento", selector: (row) => row.evento, sortable: true },
    { name: "Ubicación", selector: (row) => row.ubicacion },
    { name: "Fecha", selector: (row) => row.fecha, sortable: true, right: true },
    { name: "Observación", selector: (row) => row.observacion, wrap: true },
    {
      name: "Acciones",
      cell: (row) => (
        <button
          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition"
          onClick={() => handleEditObservation(row)}
        >
          <Edit3 size={16} /> Editar
        </button>
      ),
      ignoreRowClick: true,
      button: true,
    },
  ];

  const customStyles = {
    headCells: {
      style: {
        fontWeight: "600",
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
          transition: "0.3s ease",
        },
      },
    },
  };

  // ✅ Filtros únicos dinámicos
  const uniqueClientes = useMemo(() => [...new Set(eventos.map((e) => e.cliente))], [eventos]);
  const uniqueEventos = useMemo(() => [...new Set(eventos.map((e) => e.evento))], [eventos]);
  const uniqueUbicaciones = useMemo(() => [...new Set(eventos.map((e) => e.ubicacion))], [eventos]);

  // ✅ Filtrado avanzado
  const filteredData = useMemo(() => {
    return eventos.filter((item) => {
      const matchesText =
        (item.cliente?.toLowerCase().includes(filterText.toLowerCase())) ||
        (item.evento?.toLowerCase().includes(filterText.toLowerCase())) ||
        (item.ubicacion?.toLowerCase().includes(filterText.toLowerCase())) ||
        (item.observacion?.toLowerCase().includes(filterText.toLowerCase()));

      const fechaEvento = item.fechaObj;
      const fechaInicio = filtros?.fechaInicio ? new Date(`${filtros.fechaInicio}T00:00:00`) : null;
      const fechaFin = filtros?.fechaFin ? new Date(`${filtros.fechaFin}T23:59:59`) : null;

      const matchesGlobalFilters =
        (!filtros?.cliente || item.cliente === filtros.cliente) &&
        (!filtros?.evento || item.evento === filtros.evento) &&
        (!filtros?.ubicacion || item.ubicacion === filtros.ubicacion) &&
        (!fechaInicio || (fechaEvento && fechaEvento >= fechaInicio)) &&
        (!fechaFin || (fechaEvento && fechaEvento <= fechaFin));

      const matchesSelectFilters =
        (!selectedCliente || item.cliente === selectedCliente) &&
        (!selectedEvento || item.evento === selectedEvento) &&
        (!selectedUbicacion || item.ubicacion === selectedUbicacion);

      return matchesText && matchesGlobalFilters && matchesSelectFilters;
    });
  }, [eventos, filterText, filtros, selectedCliente, selectedEvento, selectedUbicacion]);

  // ✅ Editar observación
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
        MySwal.fire("❌ Error", "No se pudo actualizar la observación", "error");
      }
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6">
      {/* ✅ Header Filtros */}
      <motion.div
        className="flex flex-wrap gap-3 mb-4 items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative flex items-center w-full md:w-1/3">
          <Search className="absolute left-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar evento, cliente..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-10 pr-3 py-2 border rounded-lg w-full focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select value={selectedCliente} onChange={(e) => setSelectedCliente(e.target.value)} className="filter-select">
          <option value="">Cliente</option>
          {uniqueClientes.map((c, i) => <option key={i}>{c}</option>)}
        </select>

        <select value={selectedEvento} onChange={(e) => setSelectedEvento(e.target.value)} className="filter-select">
          <option value="">Evento</option>
          {uniqueEventos.map((e, i) => <option key={i}>{e}</option>)}
        </select>

        <select value={selectedUbicacion} onChange={(e) => setSelectedUbicacion(e.target.value)} className="filter-select">
          <option value="">Ubicación</option>
          {uniqueUbicaciones.map((u, i) => <option key={i}>{u}</option>)}
        </select>

        <button
          onClick={() => { setSelectedCliente(""); setSelectedEvento(""); setSelectedUbicacion(""); setFilterText(""); }}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
        >
          <RefreshCw size={16} /> Reset
        </button>
      </motion.div>

      {/* ✅ Tabla */}
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
