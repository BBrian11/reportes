import React, { useState } from "react";
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

export default function Sidebar({ onSelectCliente }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCliente, setActiveCliente] = useState("Todos");
  const [expanded, setExpanded] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Clientes y ubicaciones (simulación, reemplazar con datos reales)
  const clientes = [
    {
      name: "Todos",
      icon: <FaTh />,
      ubicaciones: [],
    },
    {
      name: "TGS",
      icon: <FaTools />,
      ubicaciones: ["Planta Norte", "Planta Sur", "Planta Este"],
    },
    {
      name: "Edificios",
      icon: <FaBuilding />,
      ubicaciones: ["Edificio Central", "Edificio Conesa", "Torre Norte"],
    },
    {
      name: "VTV",
      icon: <FaCar />,
      ubicaciones: ["Planta Moreno", "Planta Liniers", "Planta Pilar"],
    },
    {
      name: "Barrios",
      icon: <FaHome />,
      ubicaciones: ["Barrio Norte", "Barrio Oeste", "Barrio Sur"],
    },
  ];

  const handleSelectCliente = (cliente) => {
    setActiveCliente(cliente);
    onSelectCliente(cliente);
  };

  const toggleExpand = (cliente) => {
    setExpanded(expanded === cliente ? null : cliente);
    setSearchTerm(""); // reset buscador al abrir/cerrar
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

              {/* Submenú Ubicaciones */}
              {expanded === c.name && !collapsed && c.ubicaciones.length > 0 && (
                <div className="sub-menu">
                  <input
                    type="text"
                    placeholder="Buscar..."
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
                          onClick={() => alert(`Seleccionaste ${ubicacion}`)}
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
