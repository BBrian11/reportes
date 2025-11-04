// src/components/common/Modal.jsx
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open = false,
  onClose = () => {},
  ariaTitle = "Diálogo",
  children,
  closeOnBackdrop = true, // clic fuera cierra
}) {
  const dialogRef = useRef(null);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  // Evitar scroll del fondo
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBackdrop = (e) => {
    // Bloquea “click-through”
    stop(e);
    if (closeOnBackdrop) onClose?.();
  };

  const dialog = (
    <div
      className="g3t-modal-backdrop"
      onMouseDown={handleBackdrop}
      onClick={handleBackdrop}
      aria-hidden="true"
    >
      <div
        className="g3t-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={ariaTitle}
        ref={dialogRef}
        // Bloquea propagación DENTRO del diálogo
        onMouseDown={stop}
        onClick={stop}
      >
        {children}
      </div>

      <style>{`
        .g3t-modal-backdrop {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(15,23,42,.45);
          display: grid; place-items: center;
          /* Anti click-through real: el backdrop captura todos los punteros */
          pointer-events: auto;
        }
        .g3t-modal-dialog {
          background: #fff; color: #111827;
          border-radius: 12px;
          width: min(960px, 92vw);
          max-height: 88vh; overflow: auto;
          box-shadow: 0 18px 60px rgba(0,0,0,.25);
          border: 1px solid #e5e7eb;
          padding: 16px;
          pointer-events: auto; /* recibe eventos, el fondo NO */
        }
      `}</style>
    </div>
  );

  // Portal para asegurarnos que esté por encima de todo
  return createPortal(dialog, document.body);
}
