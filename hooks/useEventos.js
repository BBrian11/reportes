// src/hooks/useEventos.js
import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase"; // ajustá la ruta si hace falta

const parseFecha = (data) => {
  const ts = data?.fecha || data?.fechaHoraEnvio || data?.fechaObj;
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate(); // Firestore Timestamp
  const d = new Date(ts);
  return isNaN(d) ? null : d;
};

export default function useEventos() {
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    // Lee todas las subcolecciones llamadas "eventos" (novedades/{cliente}/eventos/{id})
    // Cambiá el orderBy si tu campo de fecha es otro.
    const q = query(collectionGroup(db, "eventos"), orderBy("fecha", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((doc) => {
        const data = doc.data() || {};
        // path: novedades/{clienteLower}/eventos/{id}
        const parts = doc.ref.path.split("/"); // ["novedades","{clienteLower}","eventos","{id}"]
        const clienteLower = parts[1] || "";
        const cliente =
          clienteLower === "edificios"
            ? "Edificios"
            : clienteLower.charAt(0).toUpperCase() + clienteLower.slice(1);

        return {
          id: doc.id,
          cliente,
          clienteLower,
          ...data,
          fechaObj: parseFecha(data),
        };
      });

      setEventos(rows);
    });

    return () => unsub();
  }, []);

  return eventos;
}
