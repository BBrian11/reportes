import React, { useState, useMemo } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/eventstable.css";

const MySwal = withReactContent(Swal);

// ✅ Tema personalizado
createTheme("g3tTheme", {
  text: { primary: "#1f2937", secondary: "#6b7280" },
  background: { default: "#ffffff" },
  context: { background: "#2563eb", text: "#FFFFFF" },
  divider: { default: "#e5e7eb" },
  action: { button: "rgba(0,0,0,.54)", hover: "rgba(0,0,0,.08)", disabled: "rgba(0,0,0,.12)" },
});

export default function EventsTable({ eventos, filtros }) {
  const [filterText, setFilterText] = useState("");
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedEvento, setSelectedEvento] = useState("");
  const [selectedUbicacion, setSelectedUbicacion] = useState("");

  // ✅ Columnas de la tabla
  const columns = [
    { name: "Cliente", selector: (row) => row.cliente, sortable: true, grow: 1.2 },
    { name: "Evento", selector: (row) => row.evento, sortable: true, grow: 1.5 },
    { name: "Ubicación", selector: (row) => row.ubicacion, grow: 1.3 },
    { name: "Fecha", selector: (row) => row.fecha, sortable: true, right: true, grow: 1.2 },
    { name: "Observación", selector: (row) => row.observacion, grow: 2, wrap: true },
    {
      name: "Acciones",
      cell: (row) => (
        <button className="btn-action" onClick={() => handleEditObservation(row)}>
          ✏️ Editar
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  // ✅ Estilos visuales
  const customStyles = {
    headCells: {
      style: {
        fontWeight: "700",
        fontSize: "14px",
        backgroundColor: "#111827",
        color: "#fff",
        padding: "12px",
      },
    },
    rows: {
      style: {
        "&:hover": {
          backgroundColor: "#f3f4f6",
          transform: "scale(1.01)",
          transition: "all 0.2s ease-in-out",
        },
      },
    },
  };

  // ✅ Datos únicos para filtros
  const uniqueClientes = useMemo(() => [...new Set(eventos.map((e) => e.cliente))], [eventos]);
  const uniqueEventos = useMemo(() => [...new Set(eventos.map((e) => e.evento))], [eventos]);
  const uniqueUbicaciones = useMemo(() => [...new Set(eventos.map((e) => e.ubicacion))], [eventos]);

  // ✅ Filtrado combinado
  const filteredData = useMemo(() => {
    return eventos.filter((item) => {
      const matchesText =
        (item.cliente && item.cliente.toLowerCase().includes(filterText.toLowerCase())) ||
        (item.evento && item.evento.toLowerCase().includes(filterText.toLowerCase())) ||
        (item.ubicacion && item.ubicacion.toLowerCase().includes(filterText.toLowerCase())) ||
        (item.observacion && item.observacion.toLowerCase().includes(filterText.toLowerCase()));

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

  // ✅ Editar observación con SweetAlert
  const handleEditObservation = async (event) => {
    const { value: newObservation } = await MySwal.fire({
      title: "Editar Observación",
      html: `
        <div style="text-align:left">
          <p><strong>Evento:</strong> ${event.evento}</p>
          <p><strong>Ubicación:</strong> ${event.ubicacion}</p>
          <textarea id="swal-observation" class="swal2-textarea" style="width:100%;padding:10px;">${event.observacion || ""}</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      width: "600px",
      preConfirm: () => document.getElementById("swal-observation").value,
    });

    if (newObservation !== undefined) {
      try {
        let path = "";
        switch (event.cliente) {
          case "TGS": path = `novedades/tgs/eventos/${event.id}`; break;
          case "Edificios": path = `novedades/edificios/eventos/${event.id}`; break;
          case "VTV": path = `novedades/vtv/eventos/${event.id}`; break;
          case "Barrios": path = `novedades/barrios/eventos/${event.id}`; break;
          default: path = `novedades/otros/eventos/${event.id}`;
        }

        await updateDoc(doc(db, path), { [`observaciones-${event.cliente.toLowerCase()}`]: newObservation });

        MySwal.fire("✅ Guardado", "Observación actualizada", "success");
      } catch (error) {
        MySwal.fire("❌ Error", "No se pudo actualizar la observación", "error");
      }
    }
  };

  return (
    <div className="event-table-card">
      {/* ✅ Controles de filtrado */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="filter-input"
        />
        <select value={selectedCliente} onChange={(e) => setSelectedCliente(e.target.value)} className="filter-select">
          <option value="">Cliente (Todos)</option>
          {uniqueClientes.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
        </select>
        <select value={selectedEvento} onChange={(e) => setSelectedEvento(e.target.value)} className="filter-select">
          <option value="">Evento (Todos)</option>
          {uniqueEventos.map((ev, idx) => <option key={idx} value={ev}>{ev}</option>)}
        </select>
        <select value={selectedUbicacion} onChange={(e) => setSelectedUbicacion(e.target.value)} className="filter-select">
          <option value="">Ubicación (Todas)</option>
          {uniqueUbicaciones.map((u, idx) => <option key={idx} value={u}>{u}</option>)}
        </select>
        <button className="btn-reset" onClick={() => { setSelectedCliente(""); setSelectedEvento(""); setSelectedUbicacion(""); setFilterText(""); }}>
          🔄 Reset
        </button>
      </div>

      {/* ✅ Tabla avanzada */}
      <DataTable
        columns={columns}
        data={filteredData}
        pagination
        highlightOnHover
        responsive
        persistTableHead
        striped
        noDataComponent="No hay eventos para mostrar."
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
