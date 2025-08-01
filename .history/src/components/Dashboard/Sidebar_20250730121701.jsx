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

  // ✅ Generamos lista dinámica de clientes y ubicaciones desde `eventos`
  const clientes = useMemo(() => {
    const clientesMap = {};

    eventos.forEach((e) => {
      if (!clientesMap[e.cliente]) {
        clientesMap[e.cliente] = new Set();
      }
      if (e.ubicacion) {
        clientesMap[e.cliente].add(e.ubicacion);
      }
    });

    return [
      { name: "Todos", icon: <FaTh />, ubicaciones: [] },
      { name: "TGS", icon: <FaTools />, ubicaciones: [...(clientesMap["TGS"] || [])] },
      { name: "Edificios", icon: <FaBuilding />, ubicaciones: [...(clientesMap["Edificios"] || [])] },
      { name: "VTV", icon: <FaCar />, ubicaciones: [...(clientesMap["VTV"] || [])] },
      { name: "Barrios", icon: <FaHome />, ubicaciones: [...(clientesMap["Barrios"] || [])] },
    ];
  }, [eventos]);

  const handleSelectCliente = (cliente) => {
    setActiveCliente(cliente);
    onSelectCliente(cliente);
  };

  const toggleExpand = (cliente) => {
    setExpanded(expanded === cliente ? null : cliente);
    setSearchTerm(""); // ✅ Limpiamos el buscador al abrir/cerrar
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && <span className="logo-text">G3T</span>}
        <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          <FaBars />
        </button>
      </div>
      <nav>
        <ul>
          {clientes.map((c, idx) => (
            <li key={idx} className="sidebar-item">
              <div
                className={`sidebar-link ${activeCliente === c.name ? "active" : ""}`}
                onClick={() => handleSelectCliente(c.name)}
              >
                {c.icon}
                {!collapsed && (
                  <>
                    <span>{c.name}</span>
                    {c.ubicaciones.length > 0 && (
                      <button
                        className="expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(c.name);
                        }}
                      >
                        {expanded === c.name ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* ✅ Submenú dinámico con búsqueda */}
              {expanded === c.name && !collapsed && c.ubicaciones.length > 0 && (
                <div className="sub-menu">
                  <input
                    type="text"
                    placeholder="Buscar ubicación..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <ul>
                    {c.ubicaciones
                      .filter((u) => u.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((ubicacion, i) => (
                        <li
                          key={i}
                          onClick={() => onSelectUbicacion(c.name, ubicacion)}
                          className="sub-item"
                        >
                          {ubicacion}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
