// src/components/Rondin/ChecklistPanel.jsx
import React from "react";
import {
  Grid, Paper, Typography, FormLabel, RadioGroup, FormControlLabel, Radio,
  TextField, Stack, Divider, Chip
} from "@mui/material";
import { toast } from "./swal";
import Swal from "sweetalert2";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../services/firebase";

/* ============ Helpers de UI ============ */
const Section = ({ title, children, right }) => (
  <Paper
    variant="outlined"
    sx={{ p: 2, borderRadius: 2, height: "100%", display: "flex", flexDirection: "column" }}
  >
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      {right || null}
    </Stack>
    {children}
  </Paper>
);

const SubCard = ({ title, children, color = "divider" }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      mt: 1.5,
      position: "relative",
      bgcolor: "action.hover",
      "&::before": {
        content: '""',
        position: "absolute",
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        borderRadius: 3,
        bgcolor: color,
      },
      pl: 1.75,
    }}
  >
    {title && <Typography variant="subtitle2" gutterBottom>{title}</Typography>}
    {children}
  </Paper>
);

const FieldLabel = ({ children, sx }) => (
  <FormLabel component="legend" sx={{ fontSize: 13, mb: .5, ...sx }}>
    {children}
  </FormLabel>
);

/* ================== Indicaciones automáticas ================== */
const INDICACIONES = {
  grabacionesOK: (val) => val
    ? {
        titulo: "Grabación OK",
        comunicar: ["Informar: el sistema está grabando con normalidad."],
        pedirEnSitio: ["Solicitar una captura de pantalla como respaldo (opcional)."],
        tips: ["Anotar en observaciones cualquier incidencia reciente."]
      }
    : {
        titulo: "Sin grabación",
        comunicar: ["Informar al cliente: no se están guardando los videos."],
        pedirEnSitio: [
          "Revisar si aparece aviso de ‘disco’ o ‘almacenamiento’.",
          "Confirmar si el equipo estuvo apagado/reiniciado recientemente."
        ],
        tips: ["Si confirman problema con el disco, sugerir asistencia técnica."]
      },

  hddDetectado: (val) => val
    ? {
        titulo: "Disco detectado",
        comunicar: ["Informar: el disco es reconocido por el equipo."],
        pedirEnSitio: ["Verificar que el espacio libre no esté al 0%."],
        tips: ["Si hay mensajes de error, sugerir revisión técnica."]
      }
    : {
        titulo: "Disco no detectado",
        comunicar: ["El equipo no reconoce el disco de grabación."],
        pedirEnSitio: [
          "Intentar reiniciar el equipo si es posible.",
          "Enviar foto/captura del mensaje que aparece."
        ],
        tips: ["Probable visita técnica (conexiones/disco)."]
      },

  equipoOffline: (val) => val
    ? {
        titulo: "Equipo sin conexión",
        comunicar: ["No podemos ver el equipo de forma remota."],
        pedirEnSitio: [
          "Confirmar que esté encendido.",
          "Verificar cable/red (luz de puerto).",
          "Comprobar que haya internet en el lugar."
        ],
        tips: ["Si no lo resuelven, coordinar visita."]
      }
    : {
        titulo: "Equipo con conexión",
        comunicar: ["El equipo volvió a estar en línea."],
        pedirEnSitio: ["Preguntar si hicieron algún cambio o reinicio (para registrar)."],
        tips: ["Registrar hora de restablecimiento."]
      },

  cortes220v: (val) => val
    ? {
        titulo: "Cortes de energía",
        comunicar: ["Se detectaron cortes de energía eléctrica."],
        pedirEnSitio: ["Confirmar si hay estabilizador/UPS y si está encendido."],
        tips: ["Registrar hora de restablecimiento."]
      }
    : {
        titulo: "Sin cortes de energía",
        comunicar: ["No se registran cortes de energía."],
        pedirEnSitio: [],
        tips: []
      },

  alarmaComunicacionOK: (val) => val
    ? {
        titulo: "Alarma comunicando",
        comunicar: ["La alarma reporta correctamente."],
        pedirEnSitio: [],
        tips: []
      }
    : {
        titulo: "Alarma sin comunicación",
        comunicar: ["La alarma no está reportando eventos."],
        pedirEnSitio: ["Confirmar si el panel está encendido.", "Verificar si la ven en la app."],
        tips: ["Si no se recupera, proponer visita técnica."]
      }
};

/* ========= color de severidad (alarma) ======== */
const getAlarmSeverityColor = (cl) => {
  const grave = cl?.alarmaTamper === true;
  const medio =
    cl?.alarmaBateriaBaja === true ||
    cl?.alarmaComunicacionOK === false ||
    cl?.alarmaZonasAbiertas === true;
  return grave ? "error.main" : medio ? "warning.main" : "success.main";
};

/* ========================= Resolver docId ========================= */
function resolveDocId(t, propDocId) {
  return (
    propDocId ||
    t?.docId ||
    t?.parentDocId ||
    (typeof window !== "undefined" ? window.__RONDIN_DOC_ID__ : null)
  );
}

/* ============== Guardar acción del Swal en respuestas.tandas[].log ============== */
/* Crea el doc si no existe, y crea/agrega la tanda si no estuviera. */
async function appendAccionToTanda({ docId, payload }) {
  if (!docId) throw new Error("Falta docId");
  const ref = doc(db, "respuestas-tareas", String(docId));

  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() || {}) : {};

  const respuestas = data.respuestas || {};
  const tandas = Array.isArray(respuestas.tandas) ? [...respuestas.tandas] : [];

  let idx = tandas.findIndex(
    (tt) => tt?.id === payload.tandaId || (tt?.cliente || "") === (payload.cliente || "")
  );

  const tClone = idx >= 0
    ? { ...(tandas[idx] || {}) }
    : { id: payload.tandaId, cliente: payload.cliente };

  const entry = {
    at: new Date(payload.at || Date.now()),
    accion: String(payload.accion || ""),
    nota: String(payload.nota || ""),
    field: String(payload.field || ""),
    value: payload.value ?? null,
  };

  tClone.log = Array.isArray(tClone.log) ? [...tClone.log, entry] : [entry];

  if (idx >= 0) {
    tandas[idx] = tClone;
  } else {
    tandas.push(tClone);
    idx = tandas.length - 1;
  }

  await setDoc(
    ref,
    { respuestas: { ...respuestas, tandas } },
    { merge: true }
  );

  return { index: idx };
}

/* ========================== Modal de confirmación ========================== */
async function confirmAccionCritica({ t, field, newValue, extra, indicaciones }) {
  const info = indicaciones || { titulo: "Acción requerida", comunicar: [], pedirEnSitio: [], tips: [] };

  const { value, isConfirmed } = await Swal.fire({
    title: "¿Avisaste al cliente?",
    html: `
      <div class="swop-body">
        <div class="swop-col">
          <div class="swop-block">
            <div class="swop-kv"><span>Cliente:</span><b>${t.cliente || "—"}</b></div>
            <div class="swop-kv"><span>Evento:</span><b>${info.titulo}</b></div>
          </div>

          <div class="swop-block">
            <label class="swop-label">Acción tomada</label>
            <div class="swop-field">
              <select id="acc" class="swal2-select swop-input swop-select">
                <option value="">Seleccionar...</option>
                <option value="llamo_avisa">Llamé y avisé</option>
                <option value="whatsapp_avisa">Avisé por WhatsApp</option>
                <option value="no_corresponde">No correspondía avisar</option>
                <option value="no_contacto">No pude contactar</option>
              </select>
            </div>
          </div>

          <div class="swop-block">
            <label class="swop-label">Detalle (opcional)</label>
            <div class="swop-field">
              <textarea id="nota" class="swal2-textarea swop-input swop-textarea"
                placeholder="Ej: se deja aviso, volver a intentar en 30 min"></textarea>
            </div>
          </div>
        </div>

        <div class="swop-col">
          <div class="swop-block">
            <label class="swop-label">Qué comunicar al cliente</label>
            ${info.comunicar?.length
              ? `<ul class="swop-list">${info.comunicar.map(p => `<li>${p}</li>`).join("")}</ul>`
              : `<p class="swop-muted">Sin indicaciones.</p>`}
          </div>

          <div class="swop-block">
            <label class="swop-label">Qué pedir al contacto en sitio</label>
            ${info.pedirEnSitio?.length
              ? `<ul class="swop-list">${info.pedirEnSitio.map(p => `<li>${p}</li>`).join("")}</ul>`
              : `<p class="swop-muted">Sin pasos para solicitar.</p>`}
          </div>

          ${info.tips?.length
            ? `<div class="swop-block"><label class="swop-label">Tips</label><ul class="swop-list tips">${info.tips.map(p => `<li>${p}</li>`).join("")}</ul></div>`
            : ""
          }
        </div>
      </div>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    focusConfirm: false,
    allowOutsideClick: false,
    width: 980,
    customClass: {
      popup: "swop-wide",
      confirmButton: "swop-btn-confirm",
      cancelButton: "swop-btn-cancel",
    },
    didOpen: () => {
      const styleId = "swop-style-compact";
      if (!document.getElementById(styleId)) {
        const st = document.createElement("style");
        st.id = styleId;
        st.textContent = `
          .swal2-popup.swop-wide{ width: clamp(860px, 92vw, 1100px) !important; max-width: none !important; padding: 20px 22px 26px !important; border-radius: 12px !important; }
          .swal2-html-container{ overflow:auto !important; max-height:74vh; }
          .swop-body{ display:grid; grid-template-columns:1.55fr 1fr; gap:18px; text-align:left; align-items:start; }
          @media (max-width: 900px){ .swop-body{ grid-template-columns:1fr; } }
          .swop-col{ display:flex; flex-direction:column; gap:12px; min-width:0; }
          .swop-block{ background:#f7f7f9; border:1px solid #e6e6ef; border-radius:12px; padding:10px 12px; min-width:0; }
          .swop-kv{ display:flex; gap:8px; font-size:14px; margin-bottom:6px; }
          .swop-kv span{ color:#666; min-width:96px; }
          .swop-label{ font-weight:700; font-size:13px; margin-bottom:6px; display:block; }
          .swop-field{ min-width:0; display:flex; align-items:center; }
          .swop-input{ box-sizing:border-box; background:#fff; border-radius:6px; border:1px solid #ccc; }
          .swal2-select.swop-select{ min-width:200px !important; width:auto !important; max-width:280px !important; height:34px !important; padding:4px 8px !important; font-size:13px !important; }
          @media (max-width: 520px){ .swal2-select.swop-select{ width:100% !important; max-width:100% !important; } }
          .swop-textarea{ width:100% !important; min-height:72px; resize:vertical; padding:6px 8px; font-size:13px; }
          .swop-list{ margin:0; padding-left:18px; font-size:13.5px; }
          .swop-list.tips{ list-style:disc; padding-left:18px; }
          .swop-muted{ color:#777; font-size:13px; margin:0; }
          .swop-btn-confirm{ font-weight:700; padding:8px 18px; border-radius:6px; }
          .swop-btn-cancel{ font-weight:500; padding:8px 16px; border-radius:6px; }
        `;
        document.head.appendChild(st);
      }
      const acc = document.getElementById("acc");
      if (acc) acc.focus();
    },
    preConfirm: () => {
      const acc = document.getElementById("acc")?.value || "";
      const nota = document.getElementById("nota")?.value || "";
      if (!acc) {
        Swal.showValidationMessage("Elegí una acción");
        return;
      }
      return { accion: acc, nota };
    },
  });

  if (!isConfirmed || !value) return null;

  return {
    tandaId: t.id,
    cliente: t.cliente || "",
    field,
    value: newValue,
    accion: value.accion,
    nota: value.nota,
    extra,
    at: Date.now(),
  };
}

/* ========================= Componente principal ========================= */
export default function ChecklistPanel({ t, setChecklistVal, resetFallan, onAccionConfirm, docIdActual }) {
  const cl = t.checklist || {};
  const alarmaEnabled = cl.alarmaMonitoreada === true;
  const alarmColor = alarmaEnabled ? getAlarmSeverityColor(cl) : "divider";

  // Determina si pide acción + guarda
  const askAccion = async ({ field, newValue, extra = {} }) => {
    const isCritical =
      (field === "grabacionesOK" && newValue === false) ||
      (field === "equipoOffline" && newValue === true) ||
      (field === "cortes220v" && newValue === true) ||
      (field === "hddDetectado" && newValue === false);

    if (!isCritical) return;

    const indicaciones = INDICACIONES[field] ? INDICACIONES[field](newValue) : null;
    const payload = await confirmAccionCritica({ t, field, newValue, extra, indicaciones });
    if (!payload) return;

    onAccionConfirm?.(payload);

    const finalDocId = resolveDocId(t, docIdActual);
    if (!finalDocId) {
      console.warn("[ChecklistPanel] docId no disponible, no se persiste en Firestore.");
      toast.fire({ icon: "warning", title: "No se pudo asociar la acción a la ronda" });
      return;
    }

    try {
      await appendAccionToTanda({ docId: String(finalDocId), payload });
      toast.fire({ icon: "success", title: "Acción guardada" });
    } catch (e) {
      console.error("[ChecklistPanel] appendAccionToTanda error:", e);
      toast.fire({ icon: "error", title: "No se pudo guardar la acción" });
    }
  };

  // chips resumen a la derecha del header de ALARMA
  const rightAlarm = (
    <Stack direction="row" spacing={1}>
      {alarmaEnabled ? (
        <>
          <Chip
            size="small"
            variant="outlined"
            label={cl.alarmaComunicacionOK === false ? "SIN COM." : "COM. OK"}
            color={cl.alarmaComunicacionOK === false ? "warning" : "success"}
          />
          {cl.alarmaBateriaBaja && <Chip size="small" color="warning" label="BATERÍA" />}
          {cl.alarmaZonasAbiertas && <Chip size="small" color="warning" label="ZONAS" />}
          {cl.alarmaTamper && <Chip size="small" color="error" label="TAMPER" />}
        </>
      ) : (
        <Chip size="small" variant="outlined" label="SIN ALARMA" />
      )}
    </Stack>
  );

  return (
    <Grid container spacing={2}>
      {/* ===== CARD 1: ALARMA ===== */}
      <Grid item xs={12} md={6}>
        <Section title="ALARMA" right={rightAlarm}>
          <FieldLabel>INFORME ESTADO ALARMA MONITOREADA</FieldLabel>
          <RadioGroup
            row
            value={cl.alarmaMonitoreada == null ? "" : String(cl.alarmaMonitoreada)}
            onChange={(e) => {
              const val = e.target.value === "true";
              setChecklistVal(t.id, "alarmaMonitoreada", val);
              if (val) {
                toast.fire({ icon: "info", title: "Completá el checklist de alarma" });
              } else {
                setChecklistVal(t.id, "alarmaComunicacionOK", null);
                setChecklistVal(t.id, "alarmaPanelArmado", null);
                setChecklistVal(t.id, "alarmaZonasAbiertas", null);
                setChecklistVal(t.id, "alarmaBateriaBaja", null);
                setChecklistVal(t.id, "alarmaTamper", null);
                setChecklistVal(t.id, "alarmaUltimoEventoMin", "");
                setChecklistVal(t.id, "alarmaObs", "");
              }
            }}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
          </RadioGroup>

          {alarmaEnabled && (
            <SubCard title="ESTADO DE LA ALARMA" color={alarmColor}>
              <FieldLabel>¿COMUNICACIÓN OK?</FieldLabel>
              <RadioGroup
                row
                value={cl.alarmaComunicacionOK == null ? "" : String(cl.alarmaComunicacionOK)}
                onChange={(e) => setChecklistVal(t.id, "alarmaComunicacionOK", e.target.value === "true")}
              >
                <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
              </RadioGroup>

              <FieldLabel sx={{ mt: 1 }}>¿PANEL ARMADO?</FieldLabel>
              <RadioGroup
                row
                value={cl.alarmaPanelArmado == null ? "" : String(cl.alarmaPanelArmado)}
                onChange={(e) => setChecklistVal(t.id, "alarmaPanelArmado", e.target.value === "true")}
              >
                <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
              </RadioGroup>

              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <FieldLabel>¿ZONAS ABIERTAS?</FieldLabel>
                  <RadioGroup
                    row
                    value={cl.alarmaZonasAbiertas == null ? "" : String(cl.alarmaZonasAbiertas)}
                    onChange={(e) => setChecklistVal(t.id, "alarmaZonasAbiertas", e.target.value === "true")}
                  >
                    <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                    <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
                  </RadioGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FieldLabel>¿BATERÍA BAJA?</FieldLabel>
                  <RadioGroup
                    row
                    value={cl.alarmaBateriaBaja == null ? "" : String(cl.alarmaBateriaBaja)}
                    onChange={(e) => setChecklistVal(t.id, "alarmaBateriaBaja", e.target.value === "true")}
                  >
                    <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                    <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
                  </RadioGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FieldLabel>¿TAMPER / TAPA ABIERTA?</FieldLabel>
                  <RadioGroup
                    row
                    value={cl.alarmaTamper == null ? "" : String(cl.alarmaTamper)}
                    onChange={(e) => setChecklistVal(t.id, "alarmaTamper", e.target.value === "true")}
                  >
                    <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                    <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
                  </RadioGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Último evento (min.)"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={cl.alarmaUltimoEventoMin ?? ""}
                    onChange={(e) => setChecklistVal(t.id, "alarmaUltimoEventoMin", e.target.value)}
                  />
                </Grid>
              </Grid>

              <TextField
                size="small"
                fullWidth
                label="Observaciones alarma"
                multiline
                rows={2}
                sx={{ mt: 1 }}
                value={cl.alarmaObs ?? ""}
                onChange={(e) => setChecklistVal(t.id, "alarmaObs", e.target.value)}
              />
            </SubCard>
          )}
        </Section>
      </Grid>

      {/* ===== CARD 2: SISTEMA (Grabaciones / Energía / Conexión) ===== */}
      <Grid item xs={12} md={6}>
        <Section
          title="SISTEMA"
          right={
            <Stack direction="row" spacing={1}>
              {cl.grabacionesOK === true && (
                <Chip size="small" variant="outlined" color="success" label="Grabando" />
              )}
              {cl.grabacionesOK === false && <Chip size="small" color="error" label="No graba" />}
              {cl.equipoOffline === true && <Chip size="small" color="error" label="Offline" />}
              {cl.cortes220v === true && <Chip size="small" color="warning" label="Cortes 220V" />}
            </Stack>
          }
        >
          {/* GRABACIONES */}
          <Typography variant="subtitle2" gutterBottom>GRABACIONES</Typography>
          <FieldLabel>¿El equipo se encuentra grabando?</FieldLabel>
          <RadioGroup
            row
            value={cl.grabacionesOK == null ? "" : String(cl.grabacionesOK)}
            onChange={async (e) => {
              const val = e.target.value === "true";
              setChecklistVal(t.id, "grabacionesOK", val);
              if (val) {
                resetFallan && resetFallan(t.id);
                setChecklistVal(t.id, "hddDetectado", null);
              }
              await askAccion({ field: "grabacionesOK", newValue: val });
            }}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
          </RadioGroup>

          {/* Si NO graba, pedir estado del disco */}
          {cl.grabacionesOK === false && (
            <SubCard color="warning.main" title="VERIFICACIÓN DE DISCO">
              <FieldLabel>¿APARECE EL DISCO (HDD)?</FieldLabel>
              <RadioGroup
                row
                value={cl.hddDetectado == null ? "" : String(cl.hddDetectado)}
                onChange={async (e) => {
                  const v = e.target.value === "true";
                  setChecklistVal(t.id, "hddDetectado", v);
                  await askAccion({ field: "hddDetectado", newValue: v });
                }}
              >
                <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
                <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
              </RadioGroup>
            </SubCard>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* ENERGÍA */}
          <Typography variant="subtitle2" gutterBottom>ENERGÍA</Typography>
          <FieldLabel>¿TIENE CORTES 220V?</FieldLabel>
          <RadioGroup
            row
            value={cl.cortes220v == null ? "" : String(cl.cortes220v)}
            onChange={async (e) => {
              const v = e.target.value === "true";
              setChecklistVal(t.id, "cortes220v", v);
              await askAccion({ field: "cortes220v", newValue: v });
            }}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
          </RadioGroup>

          <FieldLabel>¿EQUIPO EN HORA?</FieldLabel>
          <RadioGroup
            row
            value={cl.equipoHora == null ? "" : String(cl.equipoHora)}
            onChange={(e) => setChecklistVal(t.id, "equipoHora", e.target.value === "true")}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
          </RadioGroup>

          <Divider sx={{ my: 1.5 }} />

          {/* CONEXIÓN */}
          <Typography variant="subtitle2" gutterBottom>CONEXIÓN</Typography>
          <FieldLabel>¿EQUIPO OFFLINE?</FieldLabel>
          <RadioGroup
            row
            value={cl.equipoOffline == null ? "" : String(cl.equipoOffline)}
            onChange={async (e) => {
              const v = e.target.value === "true";
              setChecklistVal(t.id, "equipoOffline", v);
              await askAccion({ field: "equipoOffline", newValue: v });
            }}
          >
            <FormControlLabel value="true" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
          </RadioGroup>
        </Section>
      </Grid>
    </Grid>
  );
}
