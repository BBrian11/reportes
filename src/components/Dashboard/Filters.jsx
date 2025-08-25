// src/components/Filters.jsx
import React from "react";
import "../../styles/filters.css";

// 👇 toma el nombre del evento, sin cambiar tu UI
const getEventoTitulo = (row) => row?.evento ?? row?.["evento-edificio"] ?? "";

export default function Filters({ filtros, setFiltros, eventos }) {
  // Filtrar dinámicamente por cliente (igual que antes)
  const eventosPorCliente = filtros.cliente
    ? eventos.filter((e) => e.cliente === filtros.cliente)
    : eventos;

  const clientes = [...new Set(eventos.map((e) => e.cliente).filter(Boolean))];

  // 👇 eventos desde evento || evento-edificio
  const eventosUnicos = [
    ...new Set(eventosPorCliente.map(getEventoTitulo).filter(Boolean)),
  ];

  // 👇 ubicación desde ubicacion || edificio
  const ubicaciones = [
    ...new Set(eventosPorCliente.map((e) => e.ubicacion || e.edificio).filter(Boolean)),
  ];

  return (
    <div className="filters-box">
      {/* Cliente */}
      <div className="filter-item">
        <label className="filter-label">Cliente</label>
        <select
          className="filter-select"
          value={filtros.cliente}
          onChange={(e) =>
            setFiltros({ ...filtros, cliente: e.target.value, evento: "", ubicacion: "" })
          }
        >
          <option value="">Todos</option>
          {clientes.map((c, idx) => (
            <option key={idx} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Evento (igual UI; lista más robusta) */}
      <div className="filter-item">
        <label className="filter-label">Evento</label>
        <select
          className="filter-select"
          value={filtros.evento}
          onChange={(e) => setFiltros({ ...filtros, evento: e.target.value })}
          disabled={!filtros.cliente}  // si querés que funcione global, quitá este disabled
        >
          <option value="">Todos</option>
          {eventosUnicos.map((ev, idx) => (
            <option key={idx} value={ev}>{ev}</option>
          ))}
        </select>
      </div>

      {/* Ubicación (ya lo tenías) */}
      <div className="filter-item">
        <label className="filter-label">Ubicación</label>
        <select
          className="filter-select"
          value={filtros.ubicacion}
          onChange={(e) => setFiltros({ ...filtros, ubicacion: e.target.value })}
          disabled={!filtros.cliente}
        >
          <option value="">Todas</option>
          {ubicaciones.map((u, idx) => (
            <option key={idx} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {/* Fechas (sin cambios) */}
      <div className="filter-item">
        <label className="filter-label">Desde</label>
        <input
          type="date"
          className="filter-input"
          value={filtros.fechaInicio}
          onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
        />
      </div>
      <div className="filter-item">
        <label className="filter-label">Hasta</label>
        <input
          type="date"
          className="filter-input"
          value={filtros.fechaFin}
          onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
        />
      </div>
    </div>
  );
}
