// src/components/common/Modal.jsx
import { createPortal } from "react-dom";
import { useEffect } from "react";

export default function Modal({ open, onClose, children, ariaTitle = "Modal" }) {
  if (!open) return null;

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation" aria-hidden="true">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={ariaTitle}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
