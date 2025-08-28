import { useEffect, useState } from "react";
import {
  collection, onSnapshot, orderBy, query, limit as qlimit, where
} from "firebase/firestore";
import { db } from "../../../services/firebase";

// util: intenta extraer número de cámara desde un texto
const parseCamFromText = (txt) => {
  if (!txt) return null;
  const s = String(txt);
  const m = s.match(/(?:cam(?:ara)?|canal|ch(?:annel)?)[^\d]*(\d{1,3})/i) || s.match(/(\d{1,3})/);
  return m ? Number(m[1]) : null;
};

// fecha segura
const toJSDate = (d) => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "number") return new Date(d);
  if (typeof d === "string") { const nd = new Date(d); return isNaN(nd) ? null : nd; }
  if (typeof d === "object" && d.seconds) return new Date(d.seconds * 1000);
  return null;
};

export default function useNovedadesCliente(clienteKey, limit = 6) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(clienteKey));
  const [error, setError] = useState(null);
  const [partialError, setPartialError] = useState(false);

  useEffect(() => {
    if (!clienteKey) {
      setItems([]);
      setLoading(false);
      setError(null);
      setPartialError(false);
      return;
    }

    let unsubNovedades = null;
    let unsubIndex = null;
    let unsubResp = null;

    let novedadesArr = [];
    let indexArr = [];
    let respuestasArr = [];

    let novedadesReady = false;
    let indexReady = false;
    let respuestasReady = false;

    let novedadesErr = null;
    let indexErr = null;
    let respuestasErr = null;

    const finish = () => {
      if (!(novedadesReady && indexReady && respuestasReady)) return;

      // PRIORIDAD (por cámara): respuestas > novedades manuales > índice
      const byCam = new Map();

      for (const r of respuestasArr) {
        const cam = Number(r.cam ?? r.canal ?? 0);
        if (cam && !byCam.has(cam)) byCam.set(cam, { ...r, cam, source: "respuestas" });
      }

      for (const n of novedadesArr) {
        const cam = Number(n.cam ?? n.canal ?? 0);
        if (cam && !byCam.has(cam)) byCam.set(cam, { ...n, cam, source: "novedad" });
      }

      for (const i of indexArr) {
        const cam = Number(i.cam ?? i.canal ?? 0);
        if (cam && !byCam.has(cam)) byCam.set(cam, { ...i, cam, source: "index" });
      }

      const merged = Array.from(byCam.values()).sort((a, b) => {
        const da = toJSDate(a.createdAt) || toJSDate(a.updatedAt) || 0;
        const db = toJSDate(b.createdAt) || toJSDate(b.updatedAt) || 0;
        return (db ? +new Date(db) : 0) - (da ? +new Date(da) : 0);
      });

      setItems(merged.slice(0, limit));

      // Manejo fino de errores:
      const errors = [novedadesErr, indexErr, respuestasErr].filter(Boolean);
      if (errors.length === 0) {
        setError(null);
        setPartialError(false);
      } else {
        // Si hubo datos de AL MENOS una fuente, marcamos partialError en lugar de error hard
        const haveData = (novedadesArr.length + indexArr.length + respuestasArr.length) > 0;
        setPartialError(haveData);
        setError(haveData ? null : errors[0]);
      }

      setLoading(false);
    };

    try {
      // --- novedades manuales
      const colN = collection(db, "novedades", clienteKey, "items");
      const qN = query(colN, orderBy("createdAt", "desc"), qlimit(Math.max(limit, 12)));
      unsubNovedades = onSnapshot(
        qN,
        (snap) => {
          const arr = [];
          snap.forEach((d) => {
            const data = d.data() || {};
            const equipoEstadoNota = data.EquipoEstadoNota ?? data.equipoEstadoNota ?? null;
            const camExp = Number(data.cam ?? data.canal ?? 0);
            const camFromText = parseCamFromText(
              equipoEstadoNota ||
              data.observacion || data.nota || data.descripcion || data.detalle || data.texto || data.msg
            ) || 0;

            arr.push({
              id: `nvd-${d.id}`,
              cam: camExp || camFromText || 0,
              evento: data.evento || data.estado || "novedad",
              observacion:
                data.observacion ?? data.Observacion ?? data.nota ?? data.descripcion ?? data.detalle ?? "",
              createdAt: data.createdAt || null,
              equipoEstadoNota,
              nota: data.nota ?? null,
              source: "novedad",
            });
          });
          novedadesArr = arr;
          novedadesReady = true;
          finish();
        },
        (err) => {
          console.error("useNovedadesCliente novedades error", err);
          novedadesErr = err;
          novedadesReady = true;
          finish();
        }
      );

      // --- índice por cámaras (estados actuales)
      const colI = collection(db, "rondin-index", clienteKey, "camaras");
      unsubIndex = onSnapshot(
        colI,
        (snap) => {
          const arr = [];
          snap.forEach((d) => {
            const data = d.data() || {};
            const estado = data.estado ?? null; // "ok" | "medio" | "grave" | null
            if (!estado || estado === "ok") return; // mostramos solo problemas
            arr.push({
              id: `idx-${d.id}`,
              cam: Number(d.id),
              evento: estado,
              updatedAt: data.updatedAt || null,
              source: "index",
            });
          });
          indexArr = arr;
          indexReady = true;
          finish();
        },
        (err) => {
          console.error("useNovedadesCliente index error", err);
          indexErr = err;
          indexReady = true;
          finish();
        }
      );

      // --- ÚLTIMA respuesta con ese cliente (para recuperar notas de la ronda anterior)
      const colR = collection(db, "respuestas-tareas");
      const qR = query(colR, where("clientesKeys", "array-contains", clienteKey));
      unsubResp = onSnapshot(
        qR,
        (snap) => {
          let best = null;
          let bestTs = -1;

          snap.forEach((d) => {
            const data = d.data() || {};
            const ts =
              toJSDate(data.updatedAt)?.getTime() ||
              toJSDate(data.fechaEnvio)?.getTime() ||
              toJSDate(data?.controlRonda?.endTime)?.getTime() ||
              toJSDate(data?.controlRonda?.startTime)?.getTime() ||
              0;

            if (ts > bestTs) { bestTs = ts; best = { id: d.id, ...data }; }
          });

          const arr = [];
          if (best && Array.isArray(best?.respuestas?.tandas)) {
            const wantedName = clienteKey;
            best.respuestas.tandas.forEach((t) => {
              const tName = (t?.cliente || "").toString().toUpperCase();
              if (tName !== wantedName) return;

              (t?.camaras || []).forEach((c) => {
                const canal = Number(c?.canal) || 0;
                const nota  = (c?.nota ?? "").toString().trim();
                const evento = c?.estado ?? null;
                if (!canal) return;
                if (!nota && (!evento || evento === "ok")) return;

                arr.push({
                  id: `rt-${best.id}-${canal}`,
                  cam: canal,
                  evento,
                  observacion: nota,
                  nota,
                  updatedAt: best.updatedAt || best.fechaEnvio || best.controlRonda?.endTime || best.controlRonda?.startTime || null,
                  source: "respuestas",
                });
              });
            });
          }

          respuestasArr = arr;
          respuestasReady = true;
          finish();
        },
        (err) => {
          console.error("useNovedadesCliente respuestas error", err);
          respuestasErr = err;
          respuestasReady = true;
          finish();
        }
      );
    } catch (e) {
      console.error("useNovedadesCliente init error", e);
      setItems([]);
      setPartialError(false);
      setError(e);
      setLoading(false);
    }

    return () => {
      try { unsubNovedades && unsubNovedades(); } catch {}
      try { unsubIndex && unsubIndex(); } catch {}
      try { unsubResp && unsubResp(); } catch {}
    };
  }, [clienteKey, limit]);

  return { items, loading, error, partialError };
}
