// src/components/Dashboard/Filters.jsx
import React from "react";

export default function Filters({ filtros, setFiltros, eventos }) {
  // ✅ Filtrar solo los eventos del cliente seleccionado
  const eventosPorCliente = filtros.cliente
    ? eventos.filter((e) => e.cliente === filtros.cliente)
    : eventos;

  const clientes = [...new Set(eventos.map((e) => e.cliente))];
  const eventosUnicos = [...new Set(eventosPorCliente.map((e) => e.evento))];
  const ubicaciones = [...new Set(eventosPorCliente.map((e) => e.ubicacion))];

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
      {/* Cliente */}
      <select
        className="border border-gray-300 p-2 rounded"
        value={filtros.cliente}
        onChange={(e) =>
          setFiltros({ ...filtros, cliente: e.target.value, evento: "", ubicacion: "" })
        }
      >
        <option value="">Todos los clientes</option>
        {clientes.map((c, idx) => (
          <option key={idx} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Evento */}
      <select
        className="border border-gray-300 p-2 rounded"
        value={filtros.evento}
        onChange={(e) => setFiltros({ ...filtros, evento: e.target.value })}
        disabled={!filtros.cliente}
      >
        <option value="">Todos los eventos</option>
        {eventosUnicos.map((ev, idx) => (
          <option key={idx} value={ev}>
            {ev}
          </option>
        ))}
      </select>

      {/* Ubicación */}
      <select
        className="border border-gray-300 p-2 rounded"
        value={filtros.ubicacion}
        onChange={(e) => setFiltros({ ...filtros, ubicacion: e.target.value })}
        disabled={!filtros.cliente}
      >
        <option value="">Todas las ubicaciones</option>
        {ubicaciones.map((u, idx) => (
          <option key={idx} value={u}>
            {u}
          </option>
        ))}
      </select>

      {/* Fechas */}
      <input
        type="date"
        className="border border-gray-300 p-2 rounded"
        value={filtros.fechaInicio}
        onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
      />
      <input
        type="date"
        className="border border-gray-300 p-2 rounded"
        value={filtros.fechaFin}
        onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
      />
    </div>
  );
}
