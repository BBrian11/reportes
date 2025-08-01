import React, { useState } from "react";
import DataTable, { createTheme } from "react-data-table-component";
import "../../styles/eventstable.css";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase"; // ✅ Asegúrate que tu conexión Firebase está configurada

// ✅ Tema personalizado
createTheme("g3tTheme", {
  text: { primary: "#1f2937", secondary: "#6b7280" },
  background: { default: "#ffffff" },
  context: { background: "#2563eb", text: "#FFFFFF" },
  divider: { default: "#e5e7eb" },
  action: { button: "rgba(0,0,0,.54)", hover: "rgba(0,0,0,.08)", disabled: "rgba(0,0,0,.12)" },
});

export default function EventsTable({ eventos }) {
  const [filterText, setFilterText] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newObservation, setNewObservation] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Columnas con botón de editar
  const columns = [
    { name: "Cliente", selector: row => row.cliente, sortable: true, grow: 1.2 },
    { name: "Evento", selector: row => row.evento, sortable: true, grow: 1.5 },
    { name: "Ubicación", selector: row => row.ubicacion, grow: 1.3 },
    { name: "Fecha", selector: row => row.fecha, sortable: true, right: true, grow: 1.2 },
    { name: "Observación", selector: row => row.observacion, grow: 2, wrap: true },
    {
      name: "Acciones",
      cell: (row) => (
        <button
          className="btn-edit"
          onClick={() => {
            setSelectedEvent(row);
            setNewObservation(row.observacion || "");
          }}
        >
          ✏️ Editar
        </button>
      ),
    },
  ];

  const customStyles = {
    headCells: {
      style: { fontWeight: "700", fontSize: "14px", backgroundColor: "#111827", color: "#fff", paddingTop: "12px", paddingBottom: "12px" },
    },
    cells: { style: { fontSize: "13px", paddingTop: "8px", paddingBottom: "8px" } },
    rows: { style: { "&:hover": { backgroundColor: "#f3f4f6", cursor: "pointer" } } },
  };

  // ✅ Filtrar datos
  const filteredData = eventos.filter(item =>
    (item.cliente && item.cliente.toLowerCase().includes(filterText.toLowerCase())) ||
    (item.evento && item.evento.toLowerCase().includes(filterText.toLowerCase())) ||
    (item.ubicacion && item.ubicacion.toLowerCase().includes(filterText.toLowerCase())) ||
    (item.observacion && item.observacion.toLowerCase().includes(filterText.toLowerCase()))
  );

  // ✅ Guardar nueva observación en Firestore
  const handleSaveObservation = async () => {
    if (!selectedEvent) return;
    try {
      setLoading(true);

      // ✅ Path dinámico según cliente
      let path = "";
      switch (selectedEvent.cliente) {
        case "TGS":
          path = `novedades/tgs/eventos/${selectedEvent.id}`;
          break;
        case "Edificios":
          path = `novedades/edificios/eventos/${selectedEvent.id}`;
          break;
        case "VTV":
          path = `novedades/vtv/eventos/${selectedEvent.id}`;
          break;
        case "Barrios":
          path = `novedades/barrios/eventos/${selectedEvent.id}`;
          break;
        default:
          path = `novedades/otros/eventos/${selectedEvent.id}`;
      }

      const docRef = doc(db, path);
      await updateDoc(docRef, { [`observaciones-${selectedEvent.cliente.toLowerCase()}`]: newObservation });

      alert("✅ Observación actualizada correctamente");
      setSelectedEvent(null);
      setNewObservation("");
    } catch (error) {
      console.error("❌ Error al actualizar la observación:", error);
      alert("Error al actualizar la observación");
    } finally {
      setLoading(false);
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

      {/* ✅ Tabla */}
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
        paginationPerPage={10}
        paginationRowsPerPageOptions={[10, 20, 50]}
        fixedHeader
        fixedHeaderScrollHeight="400px"
      />

      {/* ✅ Modal de edición */}
      {selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h3>Editar Observación</h3>
            <p><strong>Evento:</strong> {selectedEvent.evento}</p>
            <textarea
              rows={5}
              value={newObservation}
              onChange={(e) => setNewObservation(e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSelectedEvent(null)}>Cancelar</button>
              <button className="btn-save" onClick={handleSaveObservation} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
