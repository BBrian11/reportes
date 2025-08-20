// useCamarasHistoricas.js
import { useEffect, useState } from "react";
import {
  collection, onSnapshot, doc, getDocs, query, where, orderBy, limit
} from "firebase/firestore";
import { db } from "../../../services/firebase";
import { norm } from "./helpers";

export default function useCamarasHistoricas(clienteKey) {
  const [mapa, setMapa] = useState({}); // { canalNum: "ok|medio|grave" }

  useEffect(() => {
    if (!clienteKey) { setMapa({}); return; }

    const colRef = collection(db, "rondin-index", clienteKey, "camaras");
    const unsub = onSnapshot(colRef, async (snap) => {
      const next = {};
      snap.forEach((d) => {
        const canal = Number(d.id);
        const est = d.data()?.estado;
        if (!Number.isNaN(canal) && est) next[canal] = est;
      });
      setMapa(next);

      // fallback si no hay índice
      if (snap.empty) {
        try {
          const q = query(
            collection(db, "respuestas-tareas"),
            where("estado", "==", "Completada"),
            orderBy("fechaEnvio", "desc"),
            limit(1)
          );
          const s = await getDocs(q);
          const fallback = {};
          s.forEach(docSnap => {
            const tandas = docSnap.data()?.respuestas?.tandas || [];
            tandas
              .filter(t => norm(t.cliente || "") === clienteKey)
              .forEach(t => (t.camaras || []).forEach(c => {
                const canal = Number(c.canal);
                if (!Number.isNaN(canal) && c.estado) fallback[canal] = c.estado;
              }));
          });
          if (Object.keys(fallback).length) setMapa(fallback);
        } catch (e) {
          console.error("fallback historicos failed:", e);
        }
      }
    });

    return () => unsub();
  }, [clienteKey]);

  return mapa;
}
