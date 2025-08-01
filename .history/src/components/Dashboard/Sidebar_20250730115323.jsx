import React from "react";
import { FaBuilding, FaTools, FaCar, FaHome, FaTh } from "react-icons/fa";
import "../../styles/sidebar.css";

export default function Sidebar({ onSelectCliente }) {
  const clientes = [
    { name: "Todos", icon: <FaTh /> },
    { name: "TGS", icon: <FaTools /> },
    { name: "Edificios", icon: <FaBuilding /> },
    { name: "VTV", icon: <FaCar /> },
    { name: "Barrios", icon: <FaHome /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Dashboard</div>
      <nav>
        <ul>
          {clientes.map((c, idx) => (
            <li key={idx} onClick={() => onSelectCliente(c.name)}>
              {c.icon} <span>{c.name}</span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
