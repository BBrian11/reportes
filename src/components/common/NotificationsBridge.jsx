import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../common/Modal.jsx";

/* Firestore */
import {
  collectionGroup, collection, getDocs, getDoc, doc,
  query, where, orderBy, limit as qLimit, Timestamp, getFirestore, onSnapshot
} from "firebase/firestore";

/* ===== Helpers ===== */
function stop(e){ if(!e) return; e.preventDefault(); e.stopPropagation(); }

function categoriaFromPath(path) {
  const parts = (path || "").split("/");
  return parts.length >= 2 ? parts[1] : "";
}
function labelFor(k) {
  switch (k) {
    case "tgs": return "TGS";
    case "vtv": return "VTV";
    case "edificios": return "Edificios";
    case "barrios": return "Barrios";
    case "otros": return "Otros";
    default: return k || "-";
  }
}
function pickField(data, keys) {
  for (const k of keys) if (data && data[k]) return data[k];
  return "";
}
function resumenHistoricoFromDoc(docSnap) {
  const data = docSnap.data() || {};
  const path = docSnap.ref.path || "";
  const cat = categoriaFromPath(path);

  const operador = pickField(data, [
    "operador","operador-edificios","operador-tgs","operador-vtv",
    "operador-barrios","operador-otros","operador-edificio",
  ]) || "-";

  const lugar = pickField(data, [
    "lugar","edificio","planta-vtv","locaciones-tgs","barrio","otro",
  ]) || "-";

  const evento = pickField(data, [
    "evento","evento-edificio","evento-vtv","evento-tgs","evento-barrios","evento-otros",
  ]) || "-";

  const tsEnv = data.fechaHoraEnvio || null;
  const tsEv  = data.fechaHoraEvento || null;

  const msEnv = tsEnv?.seconds ? tsEnv.seconds * 1000 : null;
  const msEv  = tsEv?.seconds ? tsEv.seconds * 1000 : null;

  const whenEnv = msEnv ? new Date(msEnv) : null;
  const whenEv  = msEv ? new Date(msEv) : null;

  return {
    id: docSnap.id,
    path, cat, operador, lugar, evento,
    estado: (data.estado || "").toUpperCase(),
    fechaEnvio: whenEnv ? whenEnv.toLocaleString("es-AR") : "—",
    fechaEvento: data.fechaHoraEventoLocal || (whenEv ? whenEv.toLocaleString("es-AR") : "—"),
    msEnvio: msEnv ?? 0,
    msEvento: msEv ?? 0,
  };
}
function pickObservaciones(data, cat) {
  const keys = [
    "observaciones","observaciones-edificios","observaciones-tgs",
    "observaciones-vtv","observaciones-barrios","observaciones-otros",
  ];
  for (const k of keys) if (data?.[k]) return { key: k, value: data[k] };
  const fallbackKey = cat ? `observaciones-${cat}` : null;
  if (fallbackKey && data?.[fallbackKey]) return { key: fallbackKey, value: data[fallbackKey] };
  return { key: null, value: "" };
}
const CAMPOS_BASICOS = new Set([
  "estado","fechaHoraEnvio","fechaHoraEvento","fechaHoraEventoLocal","fechaHoraEventoISO",
  "imagenes","linkDrive","enlace-imagenes-drive",
  "operador","operador-edificios","operador-tgs","operador-vtv","operador-barrios","operador-otros","operador-edificio",
  "lugar","edificio","planta-vtv","locaciones-tgs","barrio","otro",
  "evento","evento-edificio","evento-vtv","evento-tgs","evento-barrios","evento-otros",
  "unidad","zona","zona-otros","requiereGrabacion","resolucion-evento","resolusion-evento",
  "razones-pma","razonesPma","respuesta-residente","respuestaResidente","resolucionEvento",
]);
function inferExtras(data = {}) {
  const out = [];
  for (const [k, v] of Object.entries(data)) {
    if (CAMPOS_BASICOS.has(k)) continue;
    if (v == null || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) continue;
    out.push({ k, v });
  }
  return out.sort((a,b) => a.k.localeCompare(b.k));
}
function docRefFromPath(db, path = "") {
  const parts = path.split("/").filter(Boolean);
  return doc(db, ...parts);
}
function resolveDb(dbProp) {
  try { return dbProp || getFirestore(); } catch { return null; }
}

/* ===== Componente ===== */
export default function NotificationsBridge({
  bridgeName = "global1",      // ⬅️ nombre del bridge global
  notificaciones = [],
  alertas = [],
  db,

  /* callbacks */
  onAfterOpenInfo,
  onExpose,

  /* toggles (para evitar duplicados si hay varios Bridges montados) */
  enableInfo = true,
  enableAlertas = true,
  enableHistorico = true,
  mostrarBotonHistorico = false,
  listenToGlobalEvents = true,

  /* filtros / límites */
  historicoLimit = 100,
  filtrarPorCategoria = null,

  /* realtime */
  realtimeWindowMinutes = 60,
}) {
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);

  const [historicoItems, setHistoricoItems] = useState([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoError, setHistoricoError] = useState("");
  const historicoUnsubRef = useRef(null);

  const [showDetalle, setShowDetalle] = useState(false);
  const [detalleRow, setDetalleRow] = useState(null);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState("");

  // ===== Registro global de bridge (API pública) =====
  useEffect(() => {
    const api = {
      openNotificaciones: () => enableInfo && setShowNotifModal(true),
      openAlertas: () => enableAlertas && setShowAlertModal(true),
      openHistorico: () => enableHistorico && openHistorico15min(true),
      closeAll: () => {
        setShowNotifModal(false);
        setShowAlertModal(false);
        setShowHistorico(false);
        setShowDetalle(false);
      },
    };
    window.__G3T_BRIDGES = window.__G3T_BRIDGES || {};
    window.__G3T_BRIDGES[bridgeName] = api;
    onExpose?.(api);
    return () => {
      if (window.__G3T_BRIDGES?.[bridgeName] === api) {
        delete window.__G3T_BRIDGES[bridgeName];
      }
      onExpose?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeName, enableInfo, enableAlertas, enableHistorico]);

  // Eventos globales (fallback a CustomEvent)
  useEffect(() => {
    if (!listenToGlobalEvents) return;
    const onInfo = () => enableInfo && setShowNotifModal(true);
    const onAlert = () => enableAlertas && setShowAlertModal(true);
    const onHistorico = () => enableHistorico && openHistorico15min(true);

    window.addEventListener("g3t:openInfo", onInfo);
    window.addEventListener("g3t:openAlert", onAlert);
    window.addEventListener("g3t:openHistorico", onHistorico);
    return () => {
      window.removeEventListener("g3t:openInfo", onInfo);
      window.removeEventListener("g3t:openAlert", onAlert);
      window.removeEventListener("g3t:openHistorico", onHistorico);
    };
  }, [listenToGlobalEvents, enableInfo, enableAlertas, enableHistorico]);

  const handleMarkAllRead = () => {
    try { onAfterOpenInfo?.(); } catch(e){ console.warn(e); }
  };

  async function openDetalle(row) {
    const dbRef = resolveDb(db);
    if (!dbRef || !row?.path) return;
    setDetalleRow(row);
    setShowDetalle(true);
    setDetalleLoading(true);
    setDetalleError("");
    setDetalleData(null);
    try {
      const ref = docRefFromPath(dbRef, row.path);
      const snap = await getDoc(ref);
      if (!snap.exists()) setDetalleError("El documento ya no existe.");
      else setDetalleData(snap.data() || {});
    } catch (e) {
      console.error("Detalle error:", e);
      setDetalleError("No se pudo cargar el detalle.");
    } finally {
      setDetalleLoading(false);
    }
  }

  // ===== Histórico 15 min — en tiempo real con onSnapshot =====
  function startHistoricoRealtime(dbRef, cutoffMs) {
    // Limpio subs previa
    try { historicoUnsubRef.current?.(); } catch {}
    historicoUnsubRef.current = null;

    const take = Math.max(20, historicoLimit);
    const cutoffTs = Timestamp.fromDate(new Date(cutoffMs));
    const mapRow = (d) => resumenHistoricoFromDoc(d);

    try {
      // Intento con collectionGroup (requiere índice)
      const q1 = query(
        collectionGroup(dbRef, "eventos"),
        where("fechaHoraEnvio", ">=", cutoffTs),
        orderBy("fechaHoraEnvio", "desc"),
        qLimit(take)
      );
      const unsub = onSnapshot(q1, (snap) => {
        const rows = [];
        snap.forEach((d) => {
          const data = d.data() || {};
          const ts = data?.fechaHoraEnvio?.seconds ? data.fechaHoraEnvio.seconds * 1000 : 0;
          if (ts >= cutoffMs) {
            const r = mapRow(d);
            if (!filtrarPorCategoria || r.cat === filtrarPorCategoria) rows.push(r);
          }
        });
        rows.sort((a, b) => b.msEnvio - a.msEnvio);
        setHistoricoItems(rows.slice(0, historicoLimit));
      }, (err) => {
        console.warn("Snapshot CG error, voy fallback:", err);
        // Fallback multi-path en vivo
        startHistoricoRealtimeFallback(dbRef, cutoffMs, take, mapRow);
      });
      historicoUnsubRef.current = unsub;
    } catch (err) {
      console.warn("CG query fallo, fallback:", err);
      startHistoricoRealtimeFallback(dbRef, cutoffMs, take, mapRow);
    }
  }

  function startHistoricoRealtimeFallback(dbRef, cutoffMs, take, mapRow) {
    const cats = ["tgs", "vtv", "edificios", "barrios", "otros"];
    const targets = filtrarPorCategoria ? [filtrarPorCategoria] : cats;

    // múltiples onSnapshot y merge
    const unsubs = [];
    const latestById = new Map();

    targets.forEach((cat) => {
      try {
        const qCat = query(
          collection(dbRef, `novedades/${cat}/eventos`),
          orderBy("fechaHoraEnvio", "desc"),
          qLimit(take)
        );
        const unsub = onSnapshot(qCat, (snap) => {
          snap.docChanges().forEach((chg) => {
            const d = chg.doc;
            const data = d.data() || {};
            const ts = data?.fechaHoraEnvio?.seconds ? data.fechaHoraEnvio.seconds * 1000 : 0;
            if (ts >= cutoffMs) {
              latestById.set(`${cat}/${d.id}`, mapRow(d));
            } else {
              latestById.delete(`${cat}/${d.id}`);
            }
          });
          const merged = Array.from(latestById.values());
          merged.sort((a,b) => b.msEnvio - a.msEnvio);
          setHistoricoItems(merged.slice(0, historicoLimit));
        });
        unsubs.push(unsub);
      } catch {}
    });

    historicoUnsubRef.current = () => unsubs.forEach(u => { try { u(); } catch {} });
  }

  function stopHistoricoRealtime() {
    try { historicoUnsubRef.current?.(); } catch {}
    historicoUnsubRef.current = null;
  }

  async function openHistorico15min(fromGlobal = false) {
    if (!enableHistorico) return;
    setShowHistorico(true);
    const dbRef = resolveDb(db);
    if (!dbRef) {
      setHistoricoError("No se recibió una instancia de Firestore (prop db).");
      return;
    }
    setHistoricoLoading(true);
    setHistoricoError("");

    const cutoffMs = Date.now() - realtimeWindowMinutes * 60 * 1000;

    // arranca realtime
    startHistoricoRealtime(dbRef, cutoffMs);

    // primera carga “rápida” (por si tarda el snapshot)
    try {
      const take = Math.max(20, historicoLimit);
      const cutoffTs = Timestamp.fromDate(new Date(cutoffMs));
      const mapRow = (d) => resumenHistoricoFromDoc(d);

      try {
        const q1 = query(
          collectionGroup(dbRef, "eventos"),
          where("fechaHoraEnvio", ">=", cutoffTs),
          orderBy("fechaHoraEnvio", "desc"),
          qLimit(take)
        );
        const snap = await getDocs(q1);
        const rows = [];
        snap.forEach((d) => {
          const data = d.data() || {};
          const ts = data?.fechaHoraEnvio?.seconds ? data.fechaHoraEnvio.seconds * 1000 : 0;
          if (ts >= cutoffMs) {
            const r = mapRow(d);
            if (!filtrarPorCategoria || r.cat === filtrarPorCategoria) rows.push(r);
          }
        });
        rows.sort((a, b) => b.msEnvio - a.msEnvio);
        setHistoricoItems(rows.slice(0, historicoLimit));
      } catch (err) {
        // fallback one-shot
        const cats = ["tgs", "vtv", "edificios", "barrios", "otros"];
        const targets = filtrarPorCategoria ? [filtrarPorCategoria] : cats;
        const perCatPromises = targets.map(async (cat) => {
          try {
            const qCat = query(
              collection(dbRef, `novedades/${cat}/eventos`),
              orderBy("fechaHoraEnvio", "desc"),
              qLimit(take)
            );
            const snap = await getDocs(qCat);
            const rows = [];
            snap.forEach((d) => {
              const data = d.data() || {};
              const ts = data?.fechaHoraEnvio?.seconds ? data.fechaHoraEnvio.seconds * 1000 : 0;
              if (ts >= cutoffMs) rows.push(mapRow(d));
            });
            return rows;
          } catch {
            return [];
          }
        });
        const merged = (await Promise.all(perCatPromises)).flat();
        merged.sort((a, b) => b.msEnvio - a.msEnvio);
        setHistoricoItems(merged.slice(0, historicoLimit));
      }
    } catch (e) {
      setHistoricoError("No se pudo cargar el histórico.");
    } finally {
      setHistoricoLoading(false);
    }
  }

  // cortar realtime al cerrar modal
  useEffect(() => {
    if (!showHistorico) {
      stopHistoricoRealtime();
    }
    return () => stopHistoricoRealtime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistorico]);

  return (
    <>
      {/* FAB del histórico (opcional si no hay botón en header) */}
      {enableHistorico && mostrarBotonHistorico && (
        <button
          type="button"
          className="g3t-fab-historico"
          onClick={() => openHistorico15min(true)}
          title="Ver últimas novedades (15 min)"
          aria-label="Ver histórico de los últimos 15 minutos"
        >
          ⏱ 15m
        </button>
      )}

      {/* NOTIFICACIONES */}
      {enableInfo && (
        <Modal open={showNotifModal} onClose={() => setShowNotifModal(false)} ariaTitle="Notificaciones">
          <div onMouseDown={stop} onClick={stop}>
            <h3>📬 Notificaciones</h3>
            {notificaciones.length === 0 ? (
              <p>No hay notificaciones nuevas</p>
            ) : (
              <ul className="notif-list">
                {notificaciones.map((n) => (
                  <li key={n.id || n._id || `${n.evento}-${n.fecha}`} className={`notif-item ${n.read ? "read" : "unread"}`}>
                    <span className="evento">{n.evento}</span>
                    <small>{n.cliente} · {n.ubicacion}</small>
                    <small>{n.fecha}</small>
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-actions" style={{ display:"flex", gap:8 }}>
              {notificaciones.length > 0 && (
                <button className="btn" onClick={(e)=>{ stop(e); handleMarkAllRead(); }}>
                  Marcar todo como leído
                </button>
              )}
              <button className="btn primary" onClick={(e)=>{ stop(e); setShowNotifModal(false); }}>
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ALERTAS */}
      {enableAlertas && (
        <Modal open={showAlertModal} onClose={() => setShowAlertModal(false)} ariaTitle="Alertas">
          <div onMouseDown={stop} onClick={stop}>
            <h3>⚠️ Alertas críticas</h3>
            {alertas.length === 0 ? (
              <p>No hay alertas activas</p>
            ) : (
              alertas.map((a, idx) => (
                <div key={idx} className="alerta-item">
                  <strong>{a.mensaje}</strong>
                  <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            )}
            <div className="modal-actions">
              <button className="btn primary" onClick={(e)=>{ stop(e); setShowAlertModal(false); }}>
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* HISTÓRICO */}
      {enableHistorico && (
        <Modal open={showHistorico} onClose={() => setShowHistorico(false)} ariaTitle="Histórico 15 minutos">
          <div onMouseDown={stop} onClick={stop}>
            <div className="modal-head">
              <h3 className="m-0">⏱ Últimos {realtimeWindowMinutes} minutos {filtrarPorCategoria ? `· ${labelFor(filtrarPorCategoria)}` : ""}</h3>
              <div className="d-flex gap-2">
                <button className="btn" onClick={(e)=>{ stop(e); openHistorico15min(); }}>Actualizar</button>
                <button className="btn primary" onClick={(e)=>{ stop(e); setShowHistorico(false); }}>Cerrar</button>
              </div>
            </div>

            {historicoLoading ? (
              <p>Cargando…</p>
            ) : historicoError ? (
              <div className="alert alert-warning" role="alert">{historicoError}</div>
            ) : historicoItems.length === 0 ? (
              <p>No hay novedades en los últimos {realtimeWindowMinutes} minutos.</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: "60vh", overflow: "auto" }}>
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Hora envío</th>
                      <th>Hora evento</th>
                      <th>Categoría</th>
                      <th>Lugar</th>
                      <th>Evento</th>
                      <th>Operador</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoItems.map((r) => (
                      <tr key={r.id} className="row-click" onClick={(e)=>{ stop(e); openDetalle(r); }} title="Ver detalle">
                        <td><small>{r.fechaEnvio}</small></td>
                        <td><small>{r.fechaEvento}</small></td>
                        <td>{labelFor(r.cat)}</td>
                        <td>{r.lugar || "—"}</td>
                        <td>{r.evento || "—"}</td>
                        <td>{r.operador || "—"}</td>
                        <td><span className="badge text-bg-light">{r.estado || "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* DETALLE */}
      <Modal open={showDetalle} onClose={() => setShowDetalle(false)} ariaTitle="Detalle del evento">
        <div onMouseDown={stop} onClick={stop}>
          <div className="modal-head">
            <h3 className="m-0">
              {detalleRow ? `${detalleRow.evento || "Evento"} · ${labelFor(detalleRow.cat)} · ${detalleRow.lugar || "-"}` : "Detalle"}
            </h3>
            <div className="d-flex gap-2">
              <button
                className="btn"
                onClick={(e) => {
                  stop(e);
                  if (!detalleRow) return;
                  const resumen = [
                    `Categoría: ${labelFor(detalleRow.cat)}`,
                    `Lugar: ${detalleRow.lugar || "-"}`,
                    `Evento: ${detalleRow.evento || "-"}`,
                    `Operador: ${detalleRow.operador || "-"}`,
                    `Estado: ${detalleRow.estado || "-"}`,
                    `Hora evento: ${detalleRow.fechaEvento || "-"}`,
                    `Hora envío: ${detalleRow.fechaEnvio || "-"}`,
                  ].join("\n");
                  navigator.clipboard?.writeText(resumen);
                }}
              >
                Copiar resumen
              </button>
              <button className="btn primary" onClick={(e)=>{ stop(e); setShowDetalle(false); }}>Cerrar</button>
            </div>
          </div>

          {detalleLoading ? (
            <p>Cargando…</p>
          ) : detalleError ? (
            <div className="alert alert-warning" role="alert">{detalleError}</div>
          ) : !detalleData ? (
            <p>Sin datos.</p>
          ) : (
            <>
              <div className="kv-grid">
                <div><b>Categoría</b><div>{labelFor(detalleRow.cat)}</div></div>
                <div><b>Lugar</b><div>{detalleRow.lugar || "—"}</div></div>
                <div><b>Evento</b><div>{detalleRow.evento || "—"}</div></div>
                <div><b>Operador</b><div>{detalleRow.operador || "—"}</div></div>
                <div><b>Estado</b><div>{detalleRow.estado || "—"}</div></div>
                <div><b>Hora evento</b><div>{detalleRow.fechaEvento || "—"}</div></div>
                <div><b>Hora envío</b><div>{detalleRow.fechaEnvio || "—"}</div></div>
                <div><b>Unidad</b><div>{detalleData.unidad || "—"}</div></div>
                <div><b>Zona / Canal</b><div>{detalleData["zona-otros"] || detalleData.zona || "—"}</div></div>
              </div>

              {(() => {
                const { value, key } = pickObservaciones(detalleData, detalleRow.cat);
                return (
                  <div className="block">
                    <div className="block-title">
                      <b>Observaciones</b>
                      {key ? <small className="muted"> · {key}</small> : null}
                    </div>
                    {value ? <pre className="obs-box">{value}</pre> : <div className="muted">—</div>}
                    {value ? (
                      <div className="d-flex gap-2 mt-2">
                        <button className="btn" onClick={(e)=>{ stop(e); navigator.clipboard?.writeText(value); }}>
                          Copiar texto
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })()}

              <div className="block">
                <div className="block-title"><b>Adjuntos</b></div>
                <div className="d-flex flex-column gap-2">
                  {(() => {
                    const drive = detalleData.linkDrive || detalleData["enlace-imagenes-drive"];
                    return drive ? (
                      <a href={drive} target="_blank" rel="noopener" className="lnk">🔗 Link de imágenes (Drive)</a>
                    ) : <span className="muted">Sin enlace</span>;
                  })()}
                  {Array.isArray(detalleData.imagenes) && detalleData.imagenes.length > 0 ? (
                    <div className="img-grid">
                      {detalleData.imagenes.map((url, i) => (
                        <a className="img-item" href={url} key={i} target="_blank" rel="noopener" title={`Imagen ${i+1}`}>
                          <img src={url} alt={`Imagen ${i+1}`} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="muted">Sin imágenes subidas</span>
                  )}
                </div>
              </div>

              {(() => {
                const extras = inferExtras(detalleData);
                if (!extras.length) return null;
                return (
                  <div className="block">
                    <div className="block-title"><b>Campos adicionales</b></div>
                    <div className="extras-grid">
                      {extras.map(({k, v}) => (
                        <div key={k} className="extra-item">
                          <div className="k">{k}</div>
                          <div className="v">{Array.isArray(v) ? v.join(", ") : String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </Modal>

      {/* Estilos mínimos */}
      <style>{`
        .g3t-fab-historico {
          position: fixed; right: 16px; bottom: 16px; z-index: 999;
          border: 1px solid #d1d5db; background: #fff; color: #111827;
          padding: 10px 12px; border-radius: 999px; font-weight: 600;
          box-shadow: 0 6px 20px rgba(0,0,0,.12); cursor: pointer;
        }
        .g3t-fab-historico:hover { box-shadow: 0 8px 26px rgba(0,0,0,.16); transform: translateY(-1px); }

        .modal-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
        .table-sm th, .table-sm td { padding: .35rem .5rem; }
        .badge { display:inline-block; padding:.15rem .4rem; border-radius:.35rem; border:1px solid #e5e7eb; }
        .row-click { cursor: pointer; } .row-click:hover { background: #f8fafc; }
        .kv-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin: 6px 0 14px; }
        .kv-grid > div { background:#fafafa; border:1px solid #eee; border-radius:8px; padding:8px 10px; }
        .kv-grid b { display:block; font-size:12px; color:#64748b; }
        .block { margin-top:14px; } .block-title { margin-bottom:6px; }
        .muted { color:#6b7280; } .lnk { text-decoration:none; color:#2563eb; font-weight:600; }
        .img-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:10px; margin-top:6px; }
        .img-item { display:block; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
        .img-item img { display:block; width:100%; height:100%; object-fit:cover; }
        .obs-box { white-space: pre-wrap; word-break: break-word; padding:12px; background:#0f172a0a; border:1px solid #e5e7eb; border-radius:8px; }
        .extras-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap:8px; }
        .extra-item { border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; }
        .extra-item .k { font-size:12px; color:#6b7280; margin-bottom:4px; }
      `}</style>
    </>
  );
}
