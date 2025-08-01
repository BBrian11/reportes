import React from "react";
import DataTable from "react-data-table-component";

export default function EventsTable({ eventos }) {
  const columns = [
    { name: "Cliente", selector: (row) => row.cliente || "N/A", sortable: true },
    { name: "Evento", selector: (row) => row.evento || "N/A", sortable: true },
    { name: "Ubicación", selector: (row) => row.ubicacion || "N/A" },
    {
      name: "Fecha",
      selector: (row) =>
        row.fechaHoraEnvio
          ? new Date(row.fechaHoraEnvio.seconds * 1000).toLocaleString("es-AR")
          : "N/A",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-bold mb-2">Registro de Eventos</h3>
      <DataTable
        columns={columns}
        data={eventos}
        pagination
        highlightOnHover
        responsive
      />
    </div>
  );
}
