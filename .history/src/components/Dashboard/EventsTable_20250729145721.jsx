import React from "react";
import DataTable, { createTheme } from "react-data-table-component";

// ✅ Crear tema personalizado para DataTable
createTheme("g3tTheme", {
  text: {
    primary: "#1f2937",
    secondary: "#6b7280",
  },
  background: {
    default: "#ffffff",
  },
  context: {
    background: "#2563eb",
    text: "#FFFFFF",
  },
  divider: {
    default: "#e5e7eb",
  },
  action: {
    button: "rgba(0,0,0,.54)",
    hover: "rgba(0,0,0,.08)",
    disabled: "rgba(0,0,0,.12)",
  },
});

export default function EventsTable({ eventos }) {
  const columns = [
    {
      name: "Cliente",
      selector: (row) => row.cliente,
      sortable: true,
      grow: 1.2,
    },
    {
      name: "Evento",
      selector: (row) => row.evento,
      sortable: true,
      grow: 1.5,
    },
    { name: "Ubicación", selector: (row) => row.ubicacion, grow: 1.3 },
    {
      name: "Fecha",
      selector: (row) => row.fecha,
      sortable: true,
      right: true,
      grow: 1.2,
    },
    {
      name: "Observación",
      selector: (row) => row.observacion,
      grow: 2,
      wrap: true,
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
    cells: {
      style: {
        fontSize: "13px",
        paddingTop: "8px",
        paddingBottom: "8px",
      },
    },
    rows: {
      style: {
        "&:hover": {
          backgroundColor: "#f3f4f6",
          cursor: "pointer",
        },
      },
    },
  };

  return (
    <div className="table-wrapper">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
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
        theme="g3tTheme"
        customStyles={customStyles}
        paginationPerPage={10}
        paginationRowsPerPageOptions={[10, 20, 50]}
        fixedHeader
        fixedHeaderScrollHeight="400px"
      />
    </div>
  );
}
