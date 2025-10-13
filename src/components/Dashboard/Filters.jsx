import React, { useEffect, useMemo } from "react";
import "../../styles/filters.css";

export default function Filters({ filtros, setFiltros, eventos }) {
  // Filtrar dinámicamente por cliente
  const eventosPorCliente = filtros.cliente
    ? eventos.filter((e) => e.cliente === filtros.cliente)
    : eventos;

  const clientes = [...new Set(eventos.map((e) => e.cliente))];

  // 🔒 Lista de eventos del cliente/ubicación actual, limpia de vacíos
  const eventosUnicos = useMemo(() => {
    return [...new Set(eventosPorCliente.map((e) => e?.evento).filter(Boolean))].sort();
  }, [eventosPorCliente]);

  const ubicaciones = useMemo(() => {
    return [...new Set(eventosPorCliente.map((e) => e.ubicacion).filter(Boolean))].sort();
  }, [eventosPorCliente]);

  const selected = new Set(filtros.eventosSeleccionados || []);

  // 🧹 Podar selección inválida cuando cambia el universo de eventos
  useEffect(() => {
    if (!filtros.eventosSeleccionados?.length) return;
    const valid = filtros.eventosSeleccionados.filter((ev) => eventosUnicos.includes(ev));
    if (valid.length !== filtros.eventosSeleccionados.length) {
      setFiltros({ ...filtros, eventosSeleccionados: valid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.cliente, filtros.ubicacion, JSON.stringify(eventosUnicos)]);

  const toggleEvento = (evName) => {
    if (!evName) return; // evita meter undefined/"" en la selección
    const next = new Set(selected);
    if (next.has(evName)) next.delete(evName);
    else next.add(evName);
    setFiltros({ ...filtros, eventosSeleccionados: Array.from(next) });
  };

  const selectAllEventos = () => {
    setFiltros({ ...filtros, eventosSeleccionados: [...eventosUnicos] });
  };

  const clearEventos = () => {
    setFiltros({ ...filtros, eventosSeleccionados: [] });
  };

  const onChangeCliente = (value) => {
    // Al cambiar cliente: reseteo ubicación y checks de eventos
    setFiltros({
      ...filtros,
      cliente: value,
      evento: "", // compat
      ubicacion: "",
      eventosSeleccionados: [],
    });
  };

  return (
    <div className="filters-box">
      {/* Cliente */}
      <div className="filter-item">
        <label className="filter-label">Cliente</label>
        <select
          className="filter-select"
          value={filtros.cliente}
          onChange={(e) => onChangeCliente(e.target.value)}
        >
          <option value="">Todos</option>
          {clientes.map((c, idx) => (
            <option key={idx} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Ubicación */}
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
            <option key={idx} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Fechas */}
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

      {/* Eventos (checkbox múltiple) */}
      <div className="filter-item" style={{ gridColumn: "1 / -1" }}>
        <label className="filter-label">Eventos (múltiple)</label>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            className="filter-chip"
            onClick={selectAllEventos}
            disabled={!eventosUnicos.length}
            title="Seleccionar todos los eventos visibles"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            className="filter-chip"
            onClick={clearEventos}
            disabled={!filtros.eventosSeleccionados?.length}
            title="Limpiar selección"
          >
            Limpiar
          </button>
          {!!filtros.eventosSeleccionados?.length && (
            <span className="filter-hint">
              {filtros.eventosSeleccionados.length} seleccionado(s)
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 6,
            maxHeight: 200,
            overflow: "auto",
            padding: 8,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          {eventosUnicos.length ? (
            eventosUnicos.map((ev, idx) => (
              <label
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid #f1f5f9",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(ev)}
                  onChange={() => toggleEvento(ev)}
                />
                <span>{ev}</span>
              </label>
            ))
          ) : (
            <span style={{ color: "#64748b" }}>
              {filtros.cliente ? "Sin eventos para este cliente." : "Elegí un cliente para ver eventos."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
