import React, { useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import notificationSound from "../../styles/sonido.mp3";

export default function Header() {
  useEffect(() => {
    const audio = new Audio(notificationSound);
    const startTime = Date.now(); // ✅ Marca el tiempo actual (en ms)

    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS" },
      { path: "novedades/edificios/eventos", cliente: "Edificios" },
      { path: "novedades/vtv/eventos", cliente: "VTV" },
      { path: "novedades/barrios/eventos", cliente: "Barrios" },
      { path: "novedades/otros/eventos", cliente: "Otros" },
    ];

    const unsubscribes = collections.map(({ path, cliente }) =>
      onSnapshot(collection(db, path), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();

            const eventTimestamp = data.fechaHoraEnvio?.seconds
              ? data.fechaHoraEnvio.seconds * 1000
              : 0;

            // ✅ Solo mostrar si es posterior al startTime
            if (eventTimestamp > startTime) {
              const fecha = eventTimestamp
                ? new Date(eventTimestamp).toLocaleString("es-AR")
                : "Sin Fecha";

              const evento = data[`evento-${cliente.toLowerCase()}`] || "Sin Evento";
              const ubicacion =
                cliente === "Edificios"
                  ? `${data["edificio"] || "Sin ubicación"}${data["unidad"] ? ` - ${data["unidad"]}` : ""}`
                  : data["locaciones-tgs"] ||
                    data["planta-vtv"] ||
                    data["barrio"] ||
                    data["otro"] ||
                    "Sin ubicación";

              // ✅ Mostrar toast SOLO si es nuevo
              toast.info(
                <div>
                  <strong>{evento}</strong>
                  <div style={{ fontSize: "0.85rem", color: "#555" }}>
                    {cliente} · {ubicacion}
                  </div>
                  <small>{fecha}</small>
                </div>,
                {
                  position: "bottom-right",
                  autoClose: false,
                  closeOnClick: true,
                  draggable: true,
                }
              );

              // ✅ Sonido
              audio.play().catch(() => console.log("Sonido bloqueado por el navegador"));
            }
          }
        });
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  return (
    <div className="dashboard-header">
      <div>
        <h1>📡 Dashboard G3T</h1>
        <p>Monitoreo avanzado y reportes en tiempo real</p>
      </div>
      <ToastContainer />
    </div>
  );
}
