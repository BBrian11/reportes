import React, { useMemo, useState, useEffect, useCallback } from "react";
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

/* ========= Helpers de fecha (fuera del componente) ========= */
function toDate(value) {
  if (!value) return null;

  // Date nativa
  if (value instanceof Date) return isNaN(value) ? null : value;

  // Firestore Timestamp
  if (typeof value === "object" && typeof value.toDate === "function") {
    const d = value.toDate();
    return isNaN(d) ? null : d;
  }

  // Epoch (segundos o ms)
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }

  // Strings
  if (typeof value === "string") {
    // "YYYY-MM-DD" -> local
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    // "DD/MM/YYYY"
    const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m.map(Number);
      return new Date(yyyy, (mm || 1) - 1, dd || 1);
    }
    // ISO u otros
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }

  return null;
}

function startOfDayLocal(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDayLocal(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
/* ========= fin helpers ========= */

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
  // ======== Fuente de datos segura ========
  const lista = Array.isArray(eventos) ? eventos : [];

  // ======== Estado controlado o interno ========
  const [internalFiltros, setInternalFiltros] = useState({
    cliente: "",
    grupo: "",
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

  // ======== UI local ========
  const [expanded, setExpanded] = useState(null);
  const [openSection, setOpenSection] = useState("clientes");
  const [searchTermUbic, setSearchTermUbic] = useState("");
  const [searchTermEvento, setSearchTermEvento] = useState("");

  const toggleSection = (section) =>
    setOpenSection(openSection === section ? null : section);

  // ======== Estructura Cliente → Grupo → Set(Ubicaciones) ========
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

  // ======== Filtros activos ========
  const effectiveCliente = F?.cliente || "";
  const effectiveGrupo = F?.grupo || "";
  const effectiveUbicacion = F?.ubicacion || "";

  // ======== Fechas normalizadas (memo) ========
  const fechaInicioNorm = useMemo(
    () => (F?.fechaInicio ? startOfDayLocal(toDate(F.fechaInicio)) : null),
    [F?.fechaInicio]
  );
  const fechaFinNorm = useMemo(
    () => (F?.fechaFin ? endOfDayLocal(toDate(F.fechaFin)) : null),
    [F?.fechaFin]
  );

  // ======== Filtrado por fechas robusto ========
  const dentroDeRango = useCallback(
    (e) => {
      // Ajustá estos nombres si tu campo de fecha es distinto
      const raw = e?.fecha ?? e?.fechaHora ?? e?.ts ?? e?.createdAt;
      const d = toDate(raw);

      if (!d) return true; // si el evento no trae fecha legible, no lo excluimos

      if (fechaInicioNorm && d < fechaInicioNorm) return false;
      if (fechaFinNorm && d > fechaFinNorm) return false;
      return true;
    },
    [fechaInicioNorm, fechaFinNorm]
  );

  // === helper: lista de ubicaciones del grupo seleccionado ===
  const ubicacionesDelGrupo = useMemo(() => {
    if (!effectiveCliente || !effectiveGrupo) return null;
    const setUb = estructura[effectiveCliente]?.[effectiveGrupo];
    return setUb ? new Set([...setUb]) : null;
  }, [estructura, effectiveCliente, effectiveGrupo]);

  // Eventos disponibles para el contexto (cliente + (ubicación | grupo) + fechas)
  const eventosDisponibles = useMemo(() => {
    let base = lista.filter(dentroDeRango);
    if (effectiveCliente) base = base.filter((e) => e?.cliente === effectiveCliente);

    if (effectiveUbicacion) {
      base = base.filter((e) => e?.ubicacion === effectiveUbicacion);
    } else if (ubicacionesDelGrupo && ubicacionesDelGrupo.size) {
      base = base.filter((e) => ubicacionesDelGrupo.has(e?.ubicacion));
    }

    return base;
  }, [lista, dentroDeRango, effectiveCliente, effectiveUbicacion, ubicacionesDelGrupo]);

  const eventosUnicos = useMemo(
    () => [...new Set(eventosDisponibles.map((e) => e?.evento).filter(Boolean))].sort(),
    [eventosDisponibles]
  );

  // Selección segura: intersección con los eventos disponibles
  const selectedEventosSafe = useMemo(() => {
    const sel = new Set(F?.eventosSeleccionados || []);
    return eventosUnicos.filter((ev) => sel.has(ev));
  }, [F?.eventosSeleccionados, eventosUnicos]);

  // ======== SANITIZADOR GLOBAL ========
  useEffect(() => {
    const current = new Set(F?.eventosSeleccionados || []);
    const saneados = eventosUnicos.filter((ev) => current.has(ev));
    if (saneados.length !== (F?.eventosSeleccionados?.length || 0)) {
      setF((prev) => ({ ...prev, eventosSeleccionados: saneados }));
    }
  }, [eventosUnicos, F?.eventosSeleccionados, setF]);

  // ======== Helpers clear chips ========
  const clearCliente = () =>
    setF((prev) => ({
      ...prev,
      cliente: "",
      grupo: "",
      ubicacion: "",
      eventosSeleccionados: [],
    }));
  const clearGrupo = () =>
    setF((prev) => ({
      ...prev,
      grupo: "",
      eventosSeleccionados: [],
    }));
  const clearUbicacion = () =>
    setF((prev) => ({
      ...prev,
      ubicacion: "",
      eventosSeleccionados: [],
    }));
  const clearFechaInicio = () => setF((prev) => ({ ...prev, fechaInicio: "" }));
  const clearFechaFin = () => setF((prev) => ({ ...prev, fechaFin: "" }));
  const clearEvento = (ev) =>
    setF((prev) => ({
      ...prev,
      eventosSeleccionados: (prev.eventosSeleccionados || []).filter((e) => e !== ev),
    }));
  const clearAll = () =>
    setF((prev) => ({
      ...prev,
      cliente: "",
      grupo: "",
      ubicacion: "",
      fechaInicio: "",
      fechaFin: "",
      eventosSeleccionados: [],
    }));

  // ======== Handlers con saneo inmediato ========
  const selectCliente = (clienteUI, { close = false } = {}) => {
    const value = clienteUI === "Todos" ? "" : clienteUI;

    const nextEventosUnicos = [
      ...new Set(
        lista
          .filter(dentroDeRango)
          .filter((e) => (value ? e?.cliente === value : true))
          .map((e) => e?.evento)
          .filter(Boolean)
      ),
    ].sort();

    const currentSel = new Set(F?.eventosSeleccionados || []);
    const nextSelected = nextEventosUnicos.filter((ev) => currentSel.has(ev));

    setF((prev) => ({
      ...prev,
      cliente: value,
      grupo: "",
      ubicacion: "",
      eventosSeleccionados: nextSelected,
    }));

    onSelectCliente?.(value);
    setExpanded(value || null);
    setSearchTermUbic("");
    setOpenSection("filters");
    if (close) onClose?.();
  };

  const selectGrupo = (cliente, grupo) => {
    const clienteValue = cliente === "Todos" ? "" : cliente;

    // Eventos válidos para cliente + grupo
    const ubicSet = estructura[clienteValue]?.[grupo] || new Set();
    const nextEventosUnicos = [
      ...new Set(
        lista
          .filter(dentroDeRango)
          .filter((e) => (clienteValue ? e?.cliente === clienteValue : true))
          .filter((e) => (ubicSet.size ? ubicSet.has(e?.ubicacion) : true))
          .map((e) => e?.evento)
          .filter(Boolean)
      ),
    ].sort();

    const currentSel = new Set(F?.eventosSeleccionados || []);
    const nextSelected = nextEventosUnicos.filter((ev) => currentSel.has(ev));

    setF((prev) => ({
      ...prev,
      cliente: clienteValue,
      grupo: grupo,
      ubicacion: "",
      eventosSeleccionados: nextSelected,
    }));

    onSelectGrupo?.(clienteValue, grupo);
    setOpenSection("filters");
  };

  const selectUbicacion = (cliente, ubic) => {
    const clienteValue = cliente === "Todos" ? "" : cliente;

    // Eventos válidos para cliente + ubicación (override grupo)
    const nextEventosUnicos = [
      ...new Set(
        lista
          .filter(dentroDeRango)
          .filter((e) => (clienteValue ? e?.cliente === clienteValue : true))
          .filter((e) => (ubic ? e?.ubicacion === ubic : true))
          .map((e) => e?.evento)
          .filter(Boolean)
      ),
    ].sort();

    const currentSel = new Set(F?.eventosSeleccionados || []);
    const nextSelected = nextEventosUnicos.filter((ev) => currentSel.has(ev));

    setF((prev) => ({
      ...prev,
      cliente: clienteValue,
      grupo: "",
      ubicacion: ubic || "",
      eventosSeleccionados: nextSelected,
    }));

    onSelectUbicacion?.(clienteValue, ubic);
  };

  const toggleExpand = (cliente) => {
    const open = expanded !== cliente;
    setExpanded(open ? cliente : null);
    setSearchTermUbic("");
    if (open) selectCliente(cliente, { close: false });
  };

  const toggleEvento = (evName) => {
    if (!evName) return;
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

  // ======== Render ========
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "active" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? "active" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <span className="logo-text">G3T Dashboard</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* =========== 1) CLIENTES Y UBICACIONES =========== */}
        <div className="section">
          <button className="section-header" onClick={() => toggleSection("clientes")}>
            <span>Clientes y ubicaciones</span>
            {openSection === "clientes" ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          <div className={`section-content ${openSection === "clientes" ? "open" : ""}`}>
            {/* Resumen de filtros activos */}
            <div className="filters-summary">
              <div className="fs-row">
                {effectiveCliente && (
                  <button className="fs-chip" onClick={clearCliente} title="Quitar cliente">
                    Cliente: <strong>{effectiveCliente}</strong> <span className="fs-x">✕</span>
                  </button>
                )}
                {effectiveGrupo && (
                  <button className="fs-chip" onClick={clearGrupo} title="Quitar grupo">
                    Grupo: <strong>{effectiveGrupo}</strong> <span className="fs-x">✕</span>
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
                {selectedEventosSafe.slice(0, 4).map((ev) => (
                  <button key={ev} className="fs-chip" onClick={() => clearEvento(ev)} title="Quitar evento">
                    {ev} <span className="fs-x">✕</span>
                  </button>
                ))}
                {selectedEventosSafe.length > 4 && (
                  <span className="fs-more">+{selectedEventosSafe.length - 4} más</span>
                )}
                {(effectiveCliente || effectiveGrupo || effectiveUbicacion || F?.fechaInicio || F?.fechaFin || selectedEventosSafe.length) ? (
                  <button className="fs-clear" onClick={clearAll} title="Limpiar todos los filtros">
                    Limpiar todo
                  </button>
                ) : (
                  <span className="fs-hint">Sin filtros activos</span>
                )}
              </div>
            </div>

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
                                onClick={() => selectGrupo(cliente, grupo)}
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
                                    className={`sub-item ${effectiveUbicacion === ubicacion ? "active" : ""}`}
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

        {/* =========== 2) FILTROS Y EVENTOS (contextual) =========== */}
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
                    const v = e.target.value || "";
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
                    const v = e.target.value || "";
                    onChangeFechaFin?.(v);
                    setF((prev) => ({ ...prev, fechaFin: v }));
                  }}
                />
              </div>
            </div>

            {/* Eventos */}
            {!effectiveCliente ? (
              <div className="events-panel">
                <label className="sf-label">Eventos</label>
                <div className="events-empty">
                  Elegí un cliente en el panel de arriba para ver sus eventos.
                </div>
              </div>
            ) : (
              <>
                <div className="sidebar-search">
                  <input
                    type="text"
                    className="sidebar-search-input"
                    placeholder={`Buscar evento de ${effectiveCliente}${
                      effectiveUbicacion ? ` / ${effectiveUbicacion}` : effectiveGrupo ? ` / ${effectiveGrupo}` : ""
                    }…`}
                    value={searchTermEvento}
                    onChange={(e) => setSearchTermEvento(e.target.value)}
                  />
                </div>

                <div className="events-panel">
                  <div className="panel-head">
                    <label className="sf-label">
                      Eventos
                      {effectiveUbicacion ? ` / ${effectiveUbicacion}` : effectiveGrupo ? ` / ${effectiveGrupo}` : ""}
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
                        .filter((ev) => (ev || "").toLowerCase().includes(searchTermEvento.toLowerCase()))
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
                        {effectiveUbicacion || effectiveGrupo
                          ? "Sin eventos para esta selección."
                          : "Sin eventos para este cliente."}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* =========== 3) CONFIG (si aplica) =========== */}
      </aside>
    </>
  );
}
