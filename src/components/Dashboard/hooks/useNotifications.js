import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../../services/firebase";
import { toast } from "react-toastify";
import notificationSound from "../../../styles/sonido.mp3";

export default function useNotifications() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const startTimeRef = useRef(Date.now());
  const audioRef = useRef(null);

  // eventos críticos
  const CRITICOS = ["Corte de energía eléctrica", "Intrusión detectada"];
  const eventoKeyMap = {
    TGS: "evento-tgs",
    Edificios: "evento-edificio",
    VTV: "evento-vtv",
    Barrios: "evento-barrios",
    Otros: "evento-otros",
  };

  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    if (Notification.permission !== "granted") {
      Notification.requestPermission().catch(() => {});
    }

    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS" },
      { path: "novedades/edificios/eventos", cliente: "Edificios" },
      { path: "novedades/vtv/eventos", cliente: "VTV" },
      { path: "novedades/barrios/eventos", cliente: "Barrios" },
      { path: "novedades/otros/eventos", cliente: "Otros" },
    ];

    const unsubs = collections.map(({ path, cliente }) => {
      const q = query(collection(db, path), orderBy("fechaHoraEnvio", "desc"));
      return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return;

          const data = change.doc.data() || {};
          const ts = data.fechaHoraEnvio?.seconds ? data.fechaHoraEnvio.seconds * 1000 : 0;
          if (ts <= startTimeRef.current) return;

          const evento = data[eventoKeyMap[cliente]] || "Evento no disponible";
          const fecha = new Date(ts).toLocaleString("es-AR");
          const ubicacion =
            cliente === "Edificios"
              ? `${data["edificio"] || "Sin ubicación"}${data["unidad"] ? ` - ${data["unidad"]}` : ""}`
              : data["locaciones-tgs"] ||
                data["planta-vtv"] ||
                data["barrio"] ||
                data["otro"] ||
                "Sin ubicación";

          const info = { id: change.doc.id, evento, cliente, ubicacion, fecha, read: false };

          // notificación normal
          if (!CRITICOS.includes(evento)) {
            setNotificaciones((prev) => [info, ...prev].slice(0, 20));
            toast.info(`${evento} | ${ubicacion}`, { position: "bottom-right", autoClose: 6000 });
          } else {
            // crítica
            const clave = `${cliente}-${ubicacion}-${ts}`;
            setAlertas((prev) => [...prev, { clave, mensaje: `⚠️ ${evento} en ${ubicacion}`, timestamp: new Date() }]);
            if (Notification.permission === "granted") {
              try {
                new Notification("⚠️ Alerta crítica", { body: `⚠️ ${evento} en ${ubicacion}` });
              } catch {}
            }
          }

          // sonido
          audioRef.current?.play().catch(() => {});
        });
      });
    });

    return () => unsubs.forEach((u) => u && u());
  }, []);

  const markAllRead = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeAlert = (clave) => {
    setAlertas((prev) => prev.filter((a) => a.clave !== clave));
  };

  const unreadCount = useMemo(() => notificaciones.filter((n) => !n.read).length, [notificaciones]);

  return {
    notificaciones,
    alertas,
    unreadCount,
    alertCount: alertas.length,
    markAllRead,
    removeAlert,
  };
}
