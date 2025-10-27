import React, { useMemo, useState, useEffect } from "react";
import {
  FaBuilding,
  FaTools,
  FaCar,
  FaHome,
  FaTh,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import "../../styles/sidebar.css";

export default function Sidebar({
  eventos,
  isOpen,
  onClose,
  onSelectCliente,
  onSelectUbicacion,
  onSelectGrupo,
  filtros,
  setFiltros,
  onChangeFechaInicio,
  onChangeFechaFin,
}) {
  const lista = Array.isArray(eventos) ? eventos : [];

  // -------- Estado controlado o interno (control fallback) ----------
  const [internalFiltros, setInternalFiltros] = useState({
    cliente: "",
    ubicacion: "",
    fechaInicio: "",
    fechaFin: "",
    eventosSeleccionados: [],
    ...(filtros || {}),
  });

  useEffect(() => {
    if (filtros) setInternalFiltros((prev) => ({ ...prev, ...filtros }));
  }, [filtros]);

  const F = filtros ?? internalFiltros;
  const setF = setFiltros ?? setInternalFiltros;

  // -------- UI local ----------
  const [expanded, setExpanded] = useState(null); // cliente expandido en árbol
  const [openSection, setOpenSection] = useState("clientes"); // abre primero Clientes
  const [searchTermUbic, setSearchTermUbic] = useState("");   // buscador de ubicaciones
  const [searchTermEvento, setSearchTermEvento] = useState(""); // buscador de eventos

  const toggleSection = (section) =>
    setOpenSection(openSection === section ? null : section);

  // -------- Estructura Cliente → Grupo → Set(Ubicaciones) ----------
  const estructura = useMemo(() => {
    const map = {};
    for (const e of lista) {
      const cliente = e?.cliente || "Otros";
      const grupo = e?.grupo || e?.ubicacion?.split(" ")?.[0] || "General";
      const ubicacion = e?.ubicacion || "Sin ubicación";
      if (!map[cliente]) map[cliente] = {};
      if (!map[cliente][grupo]) map[cliente][grupo] = new Set();
      map[cliente][grupo].add(ubicacion);
    }
    return map;
  }, [lista]);

  // -------- Cálculos de eventos según cliente/ubicación seleccionados ----------
  const effectiveCliente = F?.cliente || "";
  const effectiveUbicacion = F?.ubicacion || "";

  const eventosDelCliente = useMemo(() => {
    let base = lista;
    if (effectiveCliente) base = base.filter((e) => e?.cliente === effectiveCliente);
    if (effectiveUbicacion) base = base.filter((e) => e?.ubicacion === effectiveUbicacion);
    return base;
  }, [lista, effectiveCliente, effectiveUbicacion]);

  const eventosUnicos = useMemo(
    () => [...new Set(eventosDelCliente.map((e) => e?.evento).filter(Boolean))].sort(),
    [eventosDelCliente]
  );

  // selectedEvents seguros (ignora lo que no exista en el cliente actual)
  const selectedEventosSafe = useMemo(() => {
    const sel = new Set(F?.eventosSeleccionados || []);
    return eventosUnicos.filter((ev) => sel.has(ev));
  }, [F?.eventosSeleccionados, eventosUnicos]);
// --- Helpers para limpiar filtros individuales / todos ---
const clearCliente = () => setF(prev => ({ ...prev, cliente: "", ubicacion: "" }));
const clearUbicacion = () => setF(prev => ({ ...prev, ubicacion: "" }));
const clearFechaInicio = () => setF(prev => ({ ...prev, fechaInicio: "" }));
const clearFechaFin = () => setF(prev => ({ ...prev, fechaFin: "" }));
const clearEvento = (ev) => setF(prev => ({
  ...prev,
  eventosSeleccionados: (prev.eventosSeleccionados || []).filter(e => e !== ev)
}));
const clearAll = () => setF(prev => ({
  ...prev,
  cliente: "", ubicacion: "", fechaInicio: "", fechaFin: "", eventosSeleccionados: []
}));

  // -------- Handlers ----------
  const selectCliente = (clienteUI, { close = false } = {}) => {
    const value = clienteUI === "Todos" ? "" : clienteUI;
    setF((prev) => ({
      ...prev,
      cliente: value,
      ubicacion: "",
      // Mantenemos eventosSeleccionados: la UI ignora los que no apliquen
      // eventosSeleccionados: prev.eventosSeleccionados,
    }));
    onSelectCliente?.(value);
    setExpanded(value || null);
    setSearchTermUbic("");
    // Al elegir cliente, abrimos automáticamente la sección de filtros (eventos)
    setOpenSection("filters");
    if (close) onClose?.();
  };

  const selectUbicacion = (cliente, ubic) => {
    setF((prev) => ({
      ...prev,
      cliente: cliente === "Todos" ? "" : cliente,
      ubicacion: ubic || "",
      // eventosSeleccionados: prev.eventosSeleccionados,
    }));
    onSelectUbicacion?.(cliente, ubic);
  };

  const toggleExpand = (cliente) => {
    const open = expanded !== cliente;
    setExpanded(open ? cliente : null);
    setSearchTermUbic("");
    if (open) selectCliente(cliente, { close: false });
  };

  const toggleEvento = (evName) => {
    if (!evName) return;
    // Seguridad: solo permitimos togglear eventos que existan en el cliente/ubicación actual
    if (!eventosUnicos.includes(evName)) return;
    setF((prev) => {
      const current = new Set(prev.eventosSeleccionados || []);
      current.has(evName) ? current.delete(evName) : current.add(evName);
      return { ...prev, eventosSeleccionados: [...current] };
    });
  };

  const selectAllEventos = () => {
    setF((prev) => ({ ...prev, eventosSeleccionados: [...eventosUnicos] }));
  };

  const clearEventos = () => {
    setF((prev) => ({ ...prev, eventosSeleccionados: [] }));
  };

  const iconos = {
    TGS: <FaTools />,
    Edificios: <FaBuilding />,
    VTV: <FaCar />,
    Barrios: <FaHome />,
    Todos: <FaTh />,
  };

  // -------- Render ----------
  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "active" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? "active" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <span className="logo-text">G3T Dashboard</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* =========== 1) CLIENTES Y UBICACIONES (primero) =========== */}
        <div className="section">
          <button className="section-header" onClick={() => toggleSection("clientes")}>
            {/* ===== Resumen de filtros activos ===== */}
<div className="filters-summary">
  <div className="fs-row">
    {effectiveCliente && (
      <button className="fs-chip" onClick={clearCliente} title="Quitar cliente">
        Cliente: <strong>{effectiveCliente}</strong> <span className="fs-x">✕</span>
      </button>
    )}

    {effectiveUbicacion && (
      <button className="fs-chip" onClick={clearUbicacion} title="Quitar ubicación">
        Ubicación: <strong>{effectiveUbicacion}</strong> <span className="fs-x">✕</span>
      </button>
    )}

    {F?.fechaInicio && (
      <button className="fs-chip" onClick={clearFechaInicio} title="Quitar fecha desde">
        Desde: <strong>{F.fechaInicio}</strong> <span className="fs-x">✕</span>
      </button>
    )}

    {F?.fechaFin && (
      <button className="fs-chip" onClick={clearFechaFin} title="Quitar fecha hasta">
        Hasta: <strong>{F.fechaFin}</strong> <span className="fs-x">✕</span>
      </button>
    )}

    {selectedEventosSafe.slice(0, 4).map(ev => (
      <button key={ev} className="fs-chip" onClick={() => clearEvento(ev)} title="Quitar evento">
        {ev} <span className="fs-x">✕</span>
      </button>
    ))}

    {selectedEventosSafe.length > 4 && (
      <span className="fs-more">+{selectedEventosSafe.length - 4} más</span>
    )}

    {(effectiveCliente || effectiveUbicacion || F?.fechaInicio || F?.fechaFin || selectedEventosSafe.length) ? (
      <button className="fs-clear" onClick={clearAll} title="Limpiar todos los filtros">Limpiar todo</button>
    ) : (
      <span className="fs-hint">Sin filtros activos</span>
    )}
  </div>
</div>

            <span>Clientes y ubicaciones</span>
            {openSection === "clientes" ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          <div className={`section-content ${openSection === "clientes" ? "open" : ""}`}>
            <nav>
              <ul className="nav-list">
                <li
                  className={`sidebar-link ${!F?.cliente ? "active" : ""}`}
                  onClick={() => selectCliente("Todos")}
                >
                  {iconos.Todos} <span>Todos</span>
                </li>

                {Object.keys(estructura).sort().map((cliente, idx) => (
                  <li key={idx} className="sidebar-item">
                    <div
                      className={`sidebar-link ${(F?.cliente || "") === cliente ? "active" : ""}`}
                      onClick={() => selectCliente(cliente)}
                    >
                      {iconos[cliente] || <FaBuilding />}
                      <span>{cliente}</span>
                      <button
                        className="expand-btn"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(cliente); }}
                        aria-label={`Expandir ${cliente}`}
                      >
                        {expanded === cliente ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </div>

                    <div className={`sub-menu ${expanded === cliente ? "open" : ""}`}>
                      <input
                        type="text"
                        placeholder="Buscar ubicación…"
                        value={searchTermUbic}
                        onChange={(e) => setSearchTermUbic(e.target.value)}
                        className="search-input"
                      />
                      <div className="scrollable-list">
                        {Object.keys(estructura[cliente] || {}).map((grupo, gIdx) => (
                          <div key={gIdx} className="grupo">
                            <strong>{grupo}</strong>
                            <ul>
                              <li
                                className="sub-item all-edificio"
                                onClick={() => onSelectGrupo?.(cliente, grupo)}
                              >
                                ➤ Ver todo {grupo}
                              </li>
                              {[...(estructura[cliente]?.[grupo] || new Set())]
                                .filter((u) =>
                                  String(u).toLowerCase().includes(searchTermUbic.toLowerCase())
                                )
                                .map((ubicacion, i) => (
                                  <li
                                    key={i}
                                    onClick={() => selectUbicacion(cliente, ubicacion)}
                                    className="sub-item"
                                  >
                                    {ubicacion}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* =========== 2) FILTROS Y EVENTOS (solo tras elegir cliente) =========== */}
        <div className="section">
          <button className="section-header" onClick={() => toggleSection("filters")}>
            <span>Filtros y eventos</span>
            {openSection === "filters" ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          <div className={`section-content ${openSection === "filters" ? "open" : ""}`}>
            {/* Fechas */}
            <div className="sf-dates">
              <div>
                <label className="sf-label">Desde</label>
                <input
                  type="date"
                  className="sf-input"
                  value={F?.fechaInicio || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChangeFechaInicio?.(v);
                    setF((prev) => ({ ...prev, fechaInicio: v }));
                  }}
                />
              </div>
              <div>
                <label className="sf-label">Hasta</label>
                <input
                  type="date"
                  className="sf-input"
                  value={F?.fechaFin || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChangeFechaFin?.(v);
                    setF((prev) => ({ ...prev, fechaFin: v }));
                  }}
                />
              </div>
            </div>

            {/* Si no hay cliente elegido, mostramos hint y no renderizamos lista de eventos */}
            {!effectiveCliente ? (
              <div className="events-panel">
                <label className="sf-label">Eventos</label>
                <div className="events-empty">
                  Elegí un cliente en el panel de arriba para ver sus eventos.
                </div>
              </div>
            ) : (
              <>
                {/* Buscar evento (solo contextuales al cliente/ubicación actual) */}
                <div className="sidebar-search">
                  <input
                    type="text"
                    className="sidebar-search-input"
                    placeholder={`Buscar evento de ${effectiveCliente}…`}
                    value={searchTermEvento}
                    onChange={(e) => setSearchTermEvento(e.target.value)}
                  />
                </div>

                <div className="events-panel">
                  <div className="panel-head">
                    <label className="sf-label">
                      Eventos {effectiveUbicacion ? ` / ${effectiveUbicacion}` : ""}
                    </label>
                    {!!selectedEventosSafe.length && (
                      <span className="badge">{selectedEventosSafe.length}</span>
                    )}
                  </div>

                  <div className="events-actions">
                    <button
                      type="button"
                      className="chip"
                      onClick={selectAllEventos}
                      disabled={!eventosUnicos.length}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={clearEventos}
                      disabled={!selectedEventosSafe.length}
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="events-list">
                    {eventosUnicos.length ? (
                      eventosUnicos
                        .filter((ev) =>
                          ev.toLowerCase().includes(searchTermEvento.toLowerCase())
                        )
                        .map((ev) => (
                          <label key={ev} className="event-item">
                            <input
                              type="checkbox"
                              checked={selectedEventosSafe.includes(ev)}
                              onChange={() => toggleEvento(ev)}
                            />
                            <span>{ev}</span>
                          </label>
                        ))
                    ) : (
                      <span className="events-empty">
                        {effectiveUbicacion
                          ? "Sin eventos para esta ubicación."
                          : "Sin eventos para este cliente."}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* =========== 3) CONFIG =========== */}
      
      </aside>
    </>
  );
}
