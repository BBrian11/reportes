import React, { useState } from "react";
import {
  FaBars,
  FaBuilding,
  FaTools,
  FaCar,
  FaHome,
  FaTh,
} from "react-icons/fa";
import "../../styles/sidebar.css";

export default function Sidebar({ onSelectCliente }) {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("Todos");

  const clientes = [
    { name: "Todos", icon: <FaTh /> },
    { name: "TGS", icon: <FaTools /> },
    { name: "Edificios", icon: <FaBuilding /> },
    { name: "VTV", icon: <FaCar /> },
    { name: "Barrios", icon: <FaHome /> },
  ];

  const handleSelect = (name) => {
    setActive(name);
    onSelectCliente(name);
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
            <li
              key={idx}
              className={active === c.name ? "active" : ""}
              onClick={() => handleSelect(c.name)}
            >
              {c.icon}
              {!collapsed && <span>{c.name}</span>}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
