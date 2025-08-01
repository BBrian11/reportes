import React, { useState } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/eventstable.css";

const MySwal = withReactContent(Swal);

createTheme("g3tTheme", {
  text: { primary: "#1f2937", secondary: "#6b7280" },
  background: { default: "#ffffff" },
  context: { background: "#2563eb", text: "#FFFFFF" },
  divider: { default: "#e5e7eb" },
  action: { button: "rgba(0,0,0,.54)", hover: "rgba(0,0,0,.08)", disabled: "rgba(0,0,0,.12)" },
});

export default function EventsTable({ eventos, filtros }) {
  const [filterText, setFilterText] = useState("");

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
    },
  ];

  const customStyles = {
    headCells: {
      style: {
        fontWeight: "700",
        fontSize: "14px",
        backgroundColor: "#111827",
        color: "#fff",
        paddingTop: "12px",
        paddingBottom: "12px",
      },
    },
    cells: { style: { fontSize: "13px", padding: "8px" } },
    rows: { style: { "&:hover": { backgroundColor: "#f9fafb", cursor: "pointer" } } },
  };

  const filteredData = eventos.filter((item) => {
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
  
    return matchesText && matchesGlobalFilters;
  });
  
  
  

  const handleEditObservation = async (event) => {
    const { value: newObservation } = await MySwal.fire({
      title: "Editar Observación",
      html: `
        <div style="text-align:left">
          <p><strong>Evento:</strong> ${event.evento}</p>
          <p><strong>Ubicación:</strong> ${event.ubicacion}</p>
          <textarea id="swal-observation" class="swal2-textarea" placeholder="Escribe la nueva observación" style="width:100%;border-radius:8px;padding:10px;">${event.observacion || ""}</textarea>
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

        const docRef = doc(db, path);
        await updateDoc(docRef, { [`observaciones-${event.cliente.toLowerCase()}`]: newObservation });

        MySwal.fire("✅ Guardado", "La observación fue actualizada correctamente", "success");
      } catch (error) {
        console.error("Error al actualizar:", error);
        MySwal.fire("❌ Error", "No se pudo actualizar la observación", "error");
      }
    }
  };

  return (
    <div className="event-table-card">
      {/* ✅ Header con buscador */}
      <div className="table-header">
        <div className="table-title-container">
          <h3 className="table-title">📋 Registro de Eventos</h3>
          <span className="table-subtitle">Listado actualizado en tiempo real</span>
        </div>
        <div className="table-search">
          <input
            type="text"
            placeholder="🔍 Buscar evento, cliente, ubicación..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      </div>

    
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
  paginationPerPage={50} // ✅ default
  paginationRowsPerPageOptions={[10, 20, 50, 100, 150]} // ✅ incluye 150
  fixedHeader
  fixedHeaderScrollHeight="600px"
/>


    </div>
  );
}
