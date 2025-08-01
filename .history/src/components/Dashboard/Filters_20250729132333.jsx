import React from 'react';

export default function Filters({ filtros, setFiltros, eventos }) {
  const clientes = [...new Set(eventos.map(e => e.cliente))];
  const eventosUnicos = [...new Set(eventos.map(e => e.evento))];
  const ubicaciones = [...new Set(eventos.map(e => e.ubicacion))];

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4 flex flex-wrap gap-4">
      <select
        className="border p-2 rounded"
        value={filtros.cliente}
        onChange={e => setFiltros({ ...filtros, cliente: e.target.value })}
      >
        <option value="">Todos los clientes</option>
        {clientes.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
      </select>

      <select
        className="border p-2 rounded"
        value={filtros.evento}
        onChange={e => setFiltros({ ...filtros, evento: e.target.value })}
      >
        <option value="">Todos los eventos</option>
        {eventosUnicos.map((ev, idx) => <option key={idx} value={ev}>{ev}</option>)}
      </select>

      <select
        className="border p-2 rounded"
        value={filtros.ubicacion}
        onChange={e => setFiltros({ ...filtros, ubicacion: e.target.value })}
      >
        <option value="">Todas las ubicaciones</option>
        {ubicaciones.map((u, idx) => <option key={idx} value={u}>{u}</option>)}
      </select>
    </div>
  );
}
