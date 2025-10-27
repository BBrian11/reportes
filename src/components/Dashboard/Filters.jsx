import React, { useMemo } from "react";
import "../../styles/filters.css";

export default function Filters({ filtros, setFiltros, eventos }) {
  const lista = Array.isArray(eventos) ? eventos : [];

  const isTodos = !filtros?.cliente || filtros?.cliente === "Todos";
  const eventosPorCliente = isTodos
    ? lista
    : lista.filter((e) => e?.cliente === filtros?.cliente);

  const clientes = useMemo(() => (
    [...new Set(lista.map((e) => e?.cliente).filter(Boolean))].sort()
  ), [lista]);

  const eventosUnicos = useMemo(() => (
    [...new Set(eventosPorCliente.map((e) => e?.evento).filter(Boolean))].sort()
  ), [eventosPorCliente]);

  const ubicaciones = useMemo(() => (
    [...new Set(eventosPorCliente.map((e) => e?.ubicacion).filter(Boolean))].sort()
  ), [eventosPorCliente]);

  // ✅ Intersección: solo consideramos seleccionados válidos para el cliente/ubicación actual
  const selectedValid = useMemo(() => {
    const sel = new Set(filtros?.eventosSeleccionados || []);
    return eventosUnicos.filter((ev) => sel.has(ev));
  }, [filtros?.eventosSeleccionados, eventosUnicos]);

  const toggleEvento = (evName) => {
    if (!evName) return;
    // ❌ Si el evento no existe en el contexto actual, no hacemos nada
    if (!eventosUnicos.includes(evName)) return;

    const current = new Set(filtros?.eventosSeleccionados || []);
    current.has(evName) ? current.delete(evName) : current.add(evName);
    setFiltros({ ...filtros, eventosSeleccionados: Array.from(current) });
  };

  const selectAllEventos = () => {
    setFiltros({ ...filtros, eventosSeleccionados: [...eventosUnicos] });
  };

  const clearEventos = () => {
    setFiltros({ ...filtros, eventosSeleccionados: [] });
  };

  const onChangeCliente = (value) => {
    // Al cambiar cliente, NO tocamos eventosSeleccionados aquí.
    // Dejamos que la UI simplemente ignore los no válidos con selectedValid.
    setFiltros({
      ...filtros,
      cliente: value,
      ubicacion: "",
      evento: "",
      // eventosSeleccionados: filtros.eventosSeleccionados  // (se mantiene tal cual)
    });
  };

  return (
    <div className="filters-box">
      {/* Cliente */}
      <div className="filter-item">
        <label className="filter-label">Cliente</label>
        <select
          className="filter-select"
          value={filtros?.cliente ?? ""}
          onChange={(e) => onChangeCliente(e.target.value)}
        >
          <option value="">Todos</option>
          {clientes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Ubicación */}
      <div className="filter-item">
        <label className="filter-label">Ubicación</label>
        <select
          className="filter-select"
          value={filtros?.ubicacion ?? ""}
          onChange={(e) => setFiltros({ ...filtros, ubicacion: e.target.value })}
          disabled={!filtros?.cliente}
        >
          <option value="">Todas</option>
          {ubicaciones.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {/* Fechas */}
      <div className="filter-item">
        <label className="filter-label">Desde</label>
        <input
          type="date"
          className="filter-input"
          value={filtros?.fechaInicio ?? ""}
          onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
        />
      </div>
      <div className="filter-item">
        <label className="filter-label">Hasta</label>
        <input
          type="date"
          className="filter-input"
          value={filtros?.fechaFin ?? ""}
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
            disabled={!selectedValid.length}
            title="Limpiar selección"
          >
            Limpiar
          </button>
          {!!selectedValid.length && (
            <span className="filter-hint">
              {selectedValid.length} seleccionado(s)
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
            eventosUnicos.map((ev) => (
              <label
                key={ev}
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
                  checked={selectedValid.includes(ev)}
                  onChange={() => toggleEvento(ev)}
                />
                <span>{ev}</span>
              </label>
            ))
          ) : (
            <span style={{ color: "#64748b" }}>
              {filtros?.cliente ? "Sin eventos para este cliente." : "Elegí un cliente para ver eventos."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
