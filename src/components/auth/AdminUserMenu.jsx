import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminUserMenu() {
  const { admin, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const displayName = admin?.nombre || admin?.email || "Administrador";
  const initials = useMemo(() => {
    const parts = (displayName || "").trim().split(/\s+/);
    const first = (parts[0]?.[0] || "").toUpperCase();
    const last = (parts.length > 1 ? parts[parts.length - 1][0] : "").toUpperCase();
    return (first + last || "AD").slice(0, 2);
  }, [displayName]);

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      left: r.left,
      width: Math.max(220, Math.min(320, r.width + 120)),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    const onRelayout = () => place();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onRelayout, true);
    window.addEventListener("resize", onRelayout);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onRelayout, true);
      window.removeEventListener("resize", onRelayout);
    };
  }, [open]);

  const handleLogout = () => {
    logout?.();
    setOpen(false);
    navigate("/login-admin", { replace: true });
  };

  const goAdminPanel = (path = "/admin") => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="user-chip"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        title={displayName}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          height: 38,
          padding: "0 10px 0 6px",
          borderRadius: 12,
          border: "1px solid rgba(17,24,39,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.15))",
          cursor: "pointer",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "radial-gradient(120% 120% at 10% 10%, #6366f1 0%, #8b5cf6 40%, #06b6d4 100%)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            letterSpacing: 0.3,
          }}
        >
          {initials}
        </span>
        <span
          style={{
            maxWidth: 160,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: 13,
            color: "#0f172a",
          }}
        >
          {displayName}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="user-menu__dropdown"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "saturate(180%) blur(8px)",
              WebkitBackdropFilter: "saturate(180%) blur(8px)",
              border: "1px solid rgba(17,24,39,0.08)",
              borderRadius: 14,
              boxShadow: "0 12px 32px rgba(2, 8, 23, 0.12)",
              padding: 8,
              zIndex: 4000,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                fontSize: 12,
                color: "#64748b",
                borderBottom: "1px solid rgba(17,24,39,0.06)",
                marginBottom: 6,
              }}
            >
              Sesión de administrador
            </div>

            <button role="menuitem" onClick={() => goAdminPanel("/admin")} style={menuItemStyle}>
              Panel de Administración
            </button>

            <button role="menuitem" onClick={() => goAdminPanel("/monitor")} style={menuItemStyle}>
              Monitor
            </button>

            <button role="menuitem" onClick={() => goAdminPanel("/rondin2")} style={menuItemStyle}>
              Rondín
            </button>

            <button role="menuitem" onClick={() => goAdminPanel("/novedades")} style={menuItemStyle}>
              Novedades
            </button>

            <button role="menuitem" onClick={() => goAdminPanel("/clientes")} style={menuItemStyle}>
              Clientes Críticos
            </button>

            <button role="menuitem" onClick={handleLogout} style={{ ...menuItemStyle, color: "#ef4444" }}>
              Cerrar sesión
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

const menuItemStyle = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid transparent",
  background: "transparent",
  cursor: "pointer",
  fontSize: 14,
  color: "#0f172a",
  transition: "background .15s ease, border-color .15s ease, transform .04s ease",
};
