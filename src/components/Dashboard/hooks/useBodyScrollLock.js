// src/hooks/useBodyScrollLock.js
import { useEffect } from "react";

export default function useBodyScrollLock(isOpen) {
  useEffect(() => {
    const body = document.body;

    const lock = () => {
      const count = +(body.dataset.modalCount || 0) + 1;
      body.dataset.modalCount = String(count);

      if (count === 1) {
        const sw = window.innerWidth - document.documentElement.clientWidth;
        body.classList.add("modal-open");
        if (sw > 0) body.style.paddingRight = `${sw}px`; // evita “salto” del layout
      }
    };

    const unlock = () => {
      const count = Math.max(+(body.dataset.modalCount || 1) - 1, 0);
      body.dataset.modalCount = String(count);

      if (count === 0) {
        body.classList.remove("modal-open");
        body.style.paddingRight = "";
      }
    };

    if (isOpen) lock();
    else unlock();

    // limpieza por si el componente se desmonta abierto
    return () => {
      if (isOpen) unlock();
    };
  }, [isOpen]);
}
