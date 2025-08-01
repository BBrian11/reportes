import React, { useEffect, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import notificationSound from "../../styles/sonido.mp3";

export default function Header() {
  const firstLoad = useRef(true); // ✅ Para controlar la primera carga

  useEffect(() => {
    const audio = new Audio(notificationSound);

    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS" },
      { path: "novedades/edificios/eventos", cliente: "Edificios" },
      { path: "novedades/vtv/eventos", cliente: "VTV" },
      { path: "novedades/barrios/eventos", cliente: "Barrios" },
      { path: "novedades/otros/eventos", cliente: "Otros" },
    ];

    const unsubscribes = collections.map(({ path, cliente }) =>
      onSnapshot(collection(db, path), (snapshot) => {
        // Si es la primera carga, ignoramos los docChanges
        if (firstLoad.current) {
          firstLoad.current = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const fecha = data.fechaHoraEnvio?.seconds
              ? new Date(data.fechaHoraEnvio.seconds * 1000).toLocaleString("es-AR")
              : "Sin Fecha";

            const evento = data[`evento-${cliente.toLowerCase()}`] || "Sin Evento";
            const ubicacion =
              cliente === "Edificios"
                ? `${data["edificio"] || "Sin ubicación"}${data["unidad"] ? ` - ${data["unidad"]}` : ""}`
                : data["locaciones-tgs"] || data["planta-vtv"] || data["barrio"] || data["otro"] || "Sin ubicación";

            // ✅ Mostrar toast SOLO para nuevos
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
                autoClose: false, // No se cierra solo
                closeOnClick: true,
                draggable: true,
              }
            );

            // ✅ Sonido
            audio.play().catch(() => console.log("Sonido bloqueado por el navegador"));
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
