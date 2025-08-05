import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function TareasPanel() {
  const [tareas, setTareas] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tareas-operadores"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTareas(data);
    });
    return () => unsub();
  }, []);

  return (
    <div className="tareas-panel">
      <h2>✅ Control de Tareas</h2>
      {tareas.length === 0 ? (
        <p>No hay tareas pendientes</p>
      ) : (
        <ul>
          {tareas.map((t) => (
            <li key={t.id}>
              <strong>{t.titulo}</strong> - {t.estado} <br />
              <small>{t.operador} | {t.fecha}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
