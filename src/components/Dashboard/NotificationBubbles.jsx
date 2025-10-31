// src/components/common/NotificationBubbles.jsx
import React from "react";
import { FiBell, FiAlertTriangle } from "react-icons/fi";

export default function NotificationBubbles({
  infoCount = 0,
  alertCount = 0,
  onOpenInfo,
  onOpenAlert,
  top = 104,      // 👈 92 del header + 12px de margen
  right = 16,
  zIndex = 9999,
}) {
  const commonBtn = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 16px rgba(0,0,0,.25)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    position: "relative",
  };
  const badge = {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    borderRadius: 999,
    background: "#111827",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 0 2px #fff",
  };

  const openInfo = () => {
    onOpenInfo?.();
    // evento global para que cualquier página abra su modal
    try { window.dispatchEvent(new CustomEvent("g3t:openInfo")); } catch {}
  };
  const openAlert = () => {
    onOpenAlert?.();
    try { window.dispatchEvent(new CustomEvent("g3t:openAlert")); } catch {}
  };

  return (
    <div
      style={{
        position: "fixed",
        top,
        right,
        zIndex,
        display: "flex",
        gap: 10,
        pointerEvents: "auto",
      }}
    >
      <button
        type="button"
        onClick={openInfo}
        title="Notificaciones"
        style={{ ...commonBtn, background: "#2563eb" }}
      >
        <FiBell size={18} />
        {infoCount > 0 && <span style={badge}>{Math.min(infoCount, 99)}</span>}
      </button>

      <button
        type="button"
        onClick={openAlert}
        title="Alertas"
        style={{ ...commonBtn, background: "#dc2626" }}
      >
        <FiAlertTriangle size={18} />
        {alertCount > 0 && <span style={badge}>{Math.min(alertCount, 99)}</span>}
      </button>
    </div>
  );
}
