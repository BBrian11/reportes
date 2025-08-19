// useCamarasHistoricas.js
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../services/firebase"; // ajustá la ruta a tu db

export default function useCamarasHistoricas(clienteKey) {
  const [mapa, setMapa] = useState({}); // { canalNum: "ok|medio|grave" }

  useEffect(() => {
    if (!clienteKey) {
      setMapa({});
      return;
    }
    const colRef = collection(db, "rondin-index", clienteKey, "camaras");
    const unsub = onSnapshot(colRef, (snap) => {
      const next = {};
      snap.forEach((doc) => {
        const data = doc.data();
        const canal = Number(doc.id);
        if (!Number.isNaN(canal) && data?.estado) {
          next[canal] = data.estado; // ok|medio|grave
        }
      });
      setMapa(next);
    });

    return () => unsub();
  }, [clienteKey]);

  return mapa;
}
