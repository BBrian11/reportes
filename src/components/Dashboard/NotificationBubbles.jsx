import { createPortal } from "react-dom";
import { FaBell, FaExclamationTriangle } from "react-icons/fa";

export default function NotificationBubbles({
  onOpenInfo,
  onOpenAlert,
  infoCount = 0,
  alertCount = 0,
}) {
  const el = (
    <div className="notif-bubbles-portal" aria-label="Acciones de notificación">
      <button type="button" className="icon-btn notif blue" onClick={onOpenInfo}>
        <FaBell size={18} />
        {!!infoCount && <span className="badge">{infoCount}</span>}
      </button>

      <button type="button" className="icon-btn notif red" onClick={onOpenAlert}>
        <FaExclamationTriangle size={18} />
        {!!alertCount && <span className="badge">{alertCount}</span>}
      </button>
    </div>
  );
  return createPortal(el, document.body);
}
