// src/components/auth/AdminLogoutButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminLogoutButton() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  if (!admin) return null; // si no hay sesión admin, no mostramos nada

  const handleLogout = () => {
    logout();                 // limpia localStorage + contexto
    navigate("/login-admin", { replace: true });
  };

  return (
    <button
      onClick={handleLogout}
      className="btn danger"
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        background: "#ef4444",
        color: "white",
        border: "none",
        fontWeight: 600,
        cursor: "pointer"
      }}
      title={`Salir (${admin.email || "admin"})`}
    >
      Salir (admin)
    </button>
  );
}
