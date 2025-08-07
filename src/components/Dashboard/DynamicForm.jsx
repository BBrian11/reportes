import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../services/firebase";
import "../../styles/dynamicform.css";

export default function DynamicForm() {
  const { id } = useParams(); // ID del formulario en Firestore
  const [formConfig, setFormConfig] = useState(null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({}); // estado para manejar carga de archivos
  const storage = getStorage();

  // ✅ Cargar el formulario desde Firestore
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const docRef = doc(db, "formularios-tareas", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormConfig(docSnap.data());
        } else {
          console.error("Formulario no encontrado");
        }
      } catch (error) {
        console.error("Error cargando formulario:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [id]);

  const handleChange = (fieldLabel, value) => {
    setResponses((prev) => ({ ...prev, [fieldLabel]: value }));
  };
  
  const handleFileChange = async (fieldLabel, file) => {
    if (!file) return;
    try {
      setUploadingFiles((prev) => ({ ...prev, [fieldLabel]: true }));
      const storageRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setResponses((prev) => ({ ...prev, [fieldLabel]: downloadURL }));
    } catch (error) {
      console.error("Error subiendo archivo:", error);
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [fieldLabel]: false }));
    }
  };
  
 
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validación: si hay archivos en proceso
    const stillUploading = Object.values(uploadingFiles).some(Boolean);
    if (stillUploading) {
      alert("Espera a que se terminen de subir los archivos antes de enviar.");
      return;
    }
  
    // ✅ Normalizamos las respuestas para evaluar estado
    const respuestasArray = Object.values(responses)
      .flat()
      .map((resp) => (typeof resp === "string" ? resp.toLowerCase().trim() : ""));
  
    // ✅ Definir reglas
    const isCompletada = respuestasArray.some((r) =>
      ["resuelto", "completada", "finalizado"].includes(r)
    );
  
    const isEnProceso = respuestasArray.some((r) =>
      ["en proceso", "procesando", "trabajando"].includes(r)
    );
  
    let nuevoEstado = "Pendiente";
    if (isCompletada) nuevoEstado = "Completada";
    else if (isEnProceso) nuevoEstado = "En Proceso";
  
    try {
      await addDoc(collection(db, "respuestas-tareas"), {
        formId: id,
        nombreFormulario: formConfig.nombreFormulario || "Formulario",
        cliente: formConfig.cliente?.nombre || "Sin cliente",
        operador: formConfig.operadorAsignado?.nombre || "Sin operador",
        respuestas: responses,
        estado: nuevoEstado,
        fechaEnvio: serverTimestamp(),
        fechaRespuesta: nuevoEstado === "Resuelto" ? serverTimestamp() : null
      });
  
      setSubmitted(true);
    } catch (error) {
      console.error("Error guardando respuesta:", error);
    }
  };
  
  
  
  if (loading) return <p className="loading-text">Cargando formulario...</p>;
  if (!formConfig) return <p className="error-text">Formulario no encontrado</p>;

  return (
    <div className="dynamic-form-container">
      <h2 className="form-title">{formConfig.nombreFormulario || "Formulario"}</h2>
  
      {submitted ? (
        <div className="success-message">✅ ¡Respuestas enviadas con éxito!</div>
      ) : (
        <form onSubmit={handleSubmit} className="dynamic-form">
          {formConfig.campos.map((field) => (
            <div key={field.id} className="form-field">
              <label className="field-label">
                {field.label} {field.requerido && <span className="required">*</span>}
              </label>
  
              {/* ✅ Campo de texto */}
              {field.tipo === "text" && (
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Ingrese ${field.label}`}
                  required={field.requerido}
                  onChange={(e) => handleChange(field.label, e.target.value)}
                />
              )}
  
              {/* ✅ Área de texto */}
              {field.tipo === "textarea" && (
                <textarea
                  className="form-textarea"
                  placeholder={`Escriba ${field.label}`}
                  required={field.requerido}
                  onChange={(e) => handleChange(field.label, e.target.value)}
                />
              )}
  
              {/* ✅ Lista desplegable */}
              {field.tipo === "select" && (
                <select
                  className="form-select"
                  required={field.requerido}
                  onChange={(e) => handleChange(field.label, e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {field.opciones.map((opt, idx) => (
                    <option key={idx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
  
              {/* ✅ Checkboxes (múltiple selección) */}
              {field.tipo === "checkbox" && (
                <div className="checkbox-group">
                  {field.opciones.map((opt, idx) => (
                    <label key={idx} className="checkbox-item">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          const prevValues = responses[field.label] || [];
                          if (e.target.checked) {
                            handleChange(field.label, [...prevValues, opt]);
                          } else {
                            handleChange(
                              field.label,
                              prevValues.filter((v) => v !== opt)
                            );
                          }
                        }}
                      />{" "}
                      {opt}
                    </label>
                  ))}
                </div>
              )}
  
              {/* ✅ Botones de radio */}
              {field.tipo === "radio" && (
                <div className="radio-group">
                  {field.opciones.map((opt, idx) => (
                    <label key={idx} className="radio-item">
                      <input
                        type="radio"
                        name={field.label}
                        value={opt}
                        onChange={(e) => handleChange(field.label, e.target.value)}
                      />{" "}
                      {opt}
                    </label>
                  ))}
                </div>
              )}
  
              {/* ✅ Fecha */}
              {field.tipo === "date" && (
                <input
                  type="date"
                  className="form-input"
                  required={field.requerido}
                  onChange={(e) => handleChange(field.label, e.target.value)}
                />
              )}
  
              {/* ✅ Número */}
              {field.tipo === "number" && (
                <input
                  type="number"
                  className="form-input"
                  placeholder={`Ingrese ${field.label}`}
                  required={field.requerido}
                  onChange={(e) => handleChange(field.label, e.target.value)}
                />
              )}
  
              {/* ✅ Subida de archivo */}
              {field.tipo === "file" && (
                <div className="file-upload">
                  <input
                    type="file"
                    className="form-input"
                    required={field.requerido}
                    onChange={(e) => handleFileChange(field.label, e.target.files[0])}
                  />
                  {uploadingFiles[field.label] && (
                    <p className="uploading-text">Subiendo archivo...</p>
                  )}
                  {responses[field.label] && (
                    <a
                      href={responses[field.label]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="uploaded-link"
                    >
                      Archivo subido (ver)
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
  
          {/* ✅ Botón de envío */}
          <button type="submit" className="submit-btn">
            Enviar Respuestas
          </button>
        </form>
      )}
    </div>
  );
  
     
}
