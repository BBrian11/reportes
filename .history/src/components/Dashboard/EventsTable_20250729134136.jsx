// src/components/Dashboard/EventsTable.jsx
import React from "react";
import DataTable from "react-data-table-component";

export default function EventsTable({ eventos }) {
  const columns = [
    { name: "Cliente", selector: (row) => row.cliente, sortable: true },
    { name: "Evento", selector: (row) => row.evento, sortable: true },
    { name: "Ubicación", selector: (row) => row.ubicacion },
    { name: "Fecha", selector: (row) => row.fecha },
    { name: "Observación", selector: (row) => row.observacion },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        📋 Registro de Eventos
      </h3>
      <DataTable
        columns={columns}
        data={eventos}
        pagination
        highlightOnHover
        responsive
        persistTableHead
        striped
        noDataComponent="No hay eventos para mostrar."
      />
    </div>
  );
}
