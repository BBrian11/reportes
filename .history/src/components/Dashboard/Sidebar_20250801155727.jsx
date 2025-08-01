import React, { useState, useMemo } from "react";
import {
  FaBars,
  FaBuilding,
  FaTools,
  FaCar,
  FaHome,
  FaTh,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import "../../styles/sidebar.css";

export default function Sidebar({ eventos, onSelectCliente, onSelectUbicacion }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCliente, setActiveCliente] = useState("Todos");
  const [expanded, setExpanded] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [active, setActive] = useState(false); // ✅ Para mostrar/ocultar sidebar en mobile

  const estructura = useMemo(() => {
    const map = {};
    eventos.forEach((e) => {
      const cliente = e.cliente || "Otros";
      const grupo = e.grupo || e.ubicacion?.split(" ")[0] || "General";
      const ubicacion = e.ubicacion || "Sin ubicación";

      if (!map[cliente]) map[cliente] = {};
      if (!map[cliente][grupo]) map[cliente][grupo] = new Set();
      map[cliente][grupo].add(ubicacion);
    });
    return map;
  }, [eventos]);

  const iconos = {
    TGS: <FaTools />,
    Edificios: <FaBuilding />,
    VTV: <FaCar />,
    Barrios: <FaHome />,
    Todos: <FaTh />,
  };

  const handleSelectCliente = (cliente) => {
    setActiveCliente(cliente);
    onSelectCliente(cliente);
  };

  const toggleExpand = (cliente) => {
    setExpanded(expanded === cliente ? null : cliente);
    setSearchTerm("");
  };

  // ✅ NUEVO RETURN
  return (
    <>
      {/* Overlay (oscurece fondo en mobile) */}
      <div
        className={`sidebar-overlay ${active ? "active" : ""}`}
        onClick={() => setActive(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${active ? "active" : ""}`}>
        <div className="sidebar-header">
          <span className="logo-text">G3T</span>
          <button className="toggle-btn" onClick={() => setActive(false)}>
            ✕
          </button>
        </div>

        <nav>
          <ul>
            {/* Todos */}
            <li
              className={`sidebar-link ${activeCliente === "Todos" ? "active" : ""}`}
              onClick={() => handleSelectCliente("Todos")}
            >
              {iconos.Todos} <span>Todos</span>
            </li>

            {/* Clientes */}
            {Object.keys(estructura).map((cliente, idx) => (
              <li key={idx} className="sidebar-item">
                <div
                  className={`sidebar-link ${activeCliente === cliente ? "active" : ""}`}
                  onClick={() => handleSelectCliente(cliente)}
                >
                  {iconos[cliente] || <FaBuilding />}
                  <span>{cliente}</span>
                  <button
                    className="expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(cliente);
                    }}
                  >
                    {expanded === cliente ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>

                {expanded === cliente && (
                  <div className="sub-menu">
                    <input
                      type="text"
                      placeholder="Buscar ubicación..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />

                    <div className="scrollable-list">
                      {Object.keys(estructura[cliente]).map((grupo, gIdx) => (
                        <div key={gIdx} className="grupo">
                          <strong>{grupo}</strong>
                          <ul>
                            {[...estructura[cliente][grupo]]
                              .filter((u) =>
                                u.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((ubicacion, i) => (
                                <li
                                  key={i}
                                  onClick={() => onSelectUbicacion(cliente, ubicacion)}
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
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Botón hamburguesa (visible solo en mobile) */}
      <button className="floating-toggle" onClick={() => setActive(true)}>
        <FaBars />
      </button>
    </>
  );
}
