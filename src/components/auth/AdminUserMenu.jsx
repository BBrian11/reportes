import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminUserMenu() {
  const { admin, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, right: null, width: 260 });
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
    const width = Math.max(240, Math.min(360, r.width + 160));
    const margin = 12;
    const spaceRight = window.innerWidth - (r.left + width);
    const willOverflowRight = spaceRight < margin;

    setPos({
      top: r.bottom + 10,
      left: willOverflowRight ? null : Math.max(margin, r.left),
      right: willOverflowRight ? Math.max(margin, window.innerWidth - (r.right)) : null,
      width,
    });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]);

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

    const t = setTimeout(() => setMounted(true), 10);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onRelayout, true);
      window.removeEventListener("resize", onRelayout);
      clearTimeout(t);
      setMounted(false);
    };
  }, [open]);

  const handleLogout = () => {
    // Cierra sesión y navega en la pestaña actual
    logout?.();
    setOpen(false);
    navigate("/login-admin", { replace: true });
  };

  // Link SPA con soporte nativo a nueva pestaña (Ctrl/⌘ + click o click medio)
  const MenuLink = ({ label, path, danger }) => {
    const href = new URL(path, window.location.origin).toString();

    const onClick = (e) => {
      // Si el usuario intenta nueva pestaña (Ctrl/⌘ o botón distinto del izquierdo), dejamos el default
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      // Click izquierdo normal -> navegación SPA
      e.preventDefault();
      setOpen(false);
      navigate(path);
    };

    const onMouseEnter = (e) => {
      e.currentTarget.style.background = "linear-gradient(180deg, rgba(37,99,235,.06), rgba(6,182,212,.06))";
      e.currentTarget.style.borderColor = "rgba(37,99,235,.25)";
      e.currentTarget.style.boxShadow = "0 4px 14px rgba(2,8,23,.06) inset";
    };
    const onMouseLeave = (e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = "transparent";
      e.currentTarget.style.boxShadow = "none";
    };

    return (
      <a
        href={href}
        role="menuitem"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          ...menuItemStyle,
          color: danger ? "#ef4444" : "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          textDecoration: "none",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden
            style={{
              width: 18, height: 18, borderRadius: 6,
              background: danger
                ? "linear-gradient(180deg,#fee2e2,#fecaca)"
                : "linear-gradient(180deg,#e0e7ff,#cffafe)",
              boxShadow: "inset 0 0 0 1px rgba(15,23,42,.08)",
            }}
          />
          {label}
        </span>

        {!danger && (
          <button
            type="button"
            title="Abrir en pestaña nueva"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              window.open(href, "_blank", "noopener,noreferrer");
            }}
            style={{
              width: 28, height: 28, borderRadius: 8,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(15,23,42,.08)",
              background: "transparent",
              cursor: "pointer",
              transition: "background .15s ease, border-color .15s ease, transform .04s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(2,6,23,.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path d="M14 5h5v5M19 5l-9 9" stroke="currentColor" strokeWidth="1.8" fill="none" />
              <path d="M5 19l0-6a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.5"/>
            </svg>
          </button>
        )}
      </a>
    );
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen(v => !v)}
        title={displayName}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          height: 40,
          padding: "0 12px 0 8px",
          borderRadius: 14,
          border: "1px solid rgba(17,24,39,0.10)",
          background: open
            ? "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.25))"
            : "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.15))",
          cursor: "pointer",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
          transition: "box-shadow .15s ease, transform .06s ease, background .15s ease",
          outline: "none"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.5), 0 0 0 4px rgba(37,99,235,.18)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.35)"; }}
      >
        <span
          aria-hidden
          style={{
            width: 28, height: 28, borderRadius: 10,
            background: "radial-gradient(120% 120% at 10% 10%, #6366f1 0%, #8b5cf6 40%, #06b6d4 100%)",
            color: "#fff", fontWeight: 800, fontSize: 12,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            letterSpacing: 0.3, boxShadow: "0 1px 0 rgba(255,255,255,.35) inset"
          }}
        >
          {initials}
        </span>
        <span
          style={{
            maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontSize: 13, color: "#0f172a", fontWeight: 600
          }}
        >
          {displayName}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden
          style={{ transition: "transform .15s ease", transform: open ? "rotate(180deg)" : "none", opacity: .8 }}
        >
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: pos.top,
            ...(pos.left != null ? { left: pos.left } : {}),
            ...(pos.right != null ? { right: pos.right } : {}),
            minWidth: pos.width,
            background: "rgba(255,255,255,0.94)",
            backdropFilter: "saturate(160%) blur(10px)",
            WebkitBackdropFilter: "saturate(160%) blur(10px)",
            border: "1px solid rgba(17,24,39,0.08)",
            borderRadius: 16,
            boxShadow: "0 16px 44px rgba(2,8,23,.14), 0 2px 6px rgba(2,8,23,.06)",
            padding: 10,
            zIndex: 100000, // por encima del sidebar sí o sí
            transform: mounted ? "scale(1)" : "scale(.98)",
            opacity: mounted ? 1 : 0,
            transformOrigin: "top left",
            transition: "opacity .16s ease, transform .16s ease"
          }}
        >
          <div
            style={{
              padding: "8px 12px", fontSize: 12, color: "#64748b",
              borderBottom: "1px solid rgba(17,24,39,0.06)", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 10
            }}
          >
            <span aria-hidden
              style={{
                width: 8, height: 8, borderRadius: 4,
                background: "radial-gradient(circle at 30% 30%, #22c55e 0%, #16a34a 70%)",
                boxShadow: "0 0 0 3px rgba(34,197,94,.15)"
              }}
            />
            Sesión de administrador
          </div>

          <MenuLink label="Panel de Administración" path="/admin" />
          <MenuLink label="Monitor" path="/monitor" />
          <MenuLink label="Rondín" path="/rondin2" />
          <MenuLink label="Novedades" path="/novedades" />
          <MenuLink label="Clientes Críticos" path="/clientes" />

          <div style={{ height: 8 }} />
          <MenuLink label="Cerrar sesión" path="/login-admin" danger />
          {/* Logout real en la pestaña actual */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              ...menuItemStyle,
              color: "#ef4444",
              marginTop: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(180deg, rgba(239,68,68,.06), rgba(239,68,68,.04))";
              e.currentTarget.style.borderColor = "rgba(239,68,68,.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            Cerrar sesión (actual)
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
  padding: "11px 12px",
  borderRadius: 12,
  border: "1px solid transparent",
  background: "transparent",
  cursor: "pointer",
  fontSize: 14,
  transition: "background .15s ease, border-color .15s ease, transform .04s ease, box-shadow .15s ease",
  outline: "none",
};
