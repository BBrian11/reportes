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

  const clientes = [
    { name: "Todos", icon: <FaTh /> },
    { name: "TGS", icon: <FaTools /> },
    { name: "Edificios", icon: <FaBuilding /> },
    { name: "VTV", icon: <FaCar /> },
    { name: "Barrios", icon: <FaHome /> },
  ];

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && <span className="logo-text">Dashboard</span>}
        <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          <FaBars />
        </button>
      </div>
      <nav>
        <ul>
          {clientes.map((c, idx) => (
            <li key={idx} onClick={() => onSelectCliente(c.name)}>
              {c.icon}
              {!collapsed && <span>{c.name}</span>}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
