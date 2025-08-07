import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function FormBuilder() {
  const [formName, setFormName] = useState("Nuevo Formulario");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [clientes, setClientes] = useState([]);
  const [tareasGenerales, setTareasGenerales] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [fields, setFields] = useState([]);
  const [draggingField, setDraggingField] = useState(null);
  const [generatedLink, setGeneratedLink] = useState("");
  const navigate = useNavigate();

  // ✅ Tipos de campos disponibles (mejorados)
  const fieldTypes = [
    { type: "text", label: "Campo de Texto" },
    { type: "textarea", label: "Área de Texto" },
    { type: "select", label: "Lista Desplegable" },
    { type: "checkbox", label: "Casilla de Verificación (Múltiples opciones)" },
    { type: "radio", label: "Botones de Opción Única" },
    { type: "date", label: "Fecha" },
    { type: "number", label: "Número" },
    { type: "file", label: "Subir Archivo" }
  ];

  // ✅ Cargar datos reales desde Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Clientes
        const clientesSnap = await getDocs(collection(db, "clients"));
        setClientes(clientesSnap.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().razon_social || "Sin nombre"
        })));

        // ✅ Tareas generales
        const tareasSnap = await getDocs(collection(db, "tareas-generales"));
        setTareasGenerales(tareasSnap.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre || "Sin nombre"
        })));

        // ✅ Operadores
        const operadoresSnap = await getDocs(collection(db, "operadores"));
        setOperadores(operadoresSnap.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre || "Operador"
        })));
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };

    fetchData();
  }, []);

  // ✅ Arrastrar y soltar
  const handleDragStart = (field) => setDraggingField(field);

  const handleDrop = () => {
    if (draggingField) {
      const newField = {
        id: uuidv4(),
        tipo: draggingField.type,
        label: draggingField.label,
        opciones: ["select", "checkbox", "radio"].includes(draggingField.type)
          ? ["Opción 1", "Opción 2"]
          : [],
        requerido: false
      };
      setFields([...fields, newField]);
      setDraggingField(null);
    }
  };

  // ✅ Configuración dinámica
  const handleRemoveField = (id) => setFields(fields.filter((f) => f.id !== id));
  const handleLabelChange = (id, value) => setFields(fields.map((f) => (f.id === id ? { ...f, label: value } : f)));
  const handleRequiredToggle = (id) => setFields(fields.map((f) => (f.id === id ? { ...f, requerido: !f.requerido } : f)));
  const handleOptionChange = (id, index, value) => {
    setFields(fields.map((f) =>
      f.id === id ? { ...f, opciones: f.opciones.map((o, i) => (i === index ? value : o)) } : f
    ));
  };
  const addOption = (id) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, opciones: [...f.opciones, `Opción ${f.opciones.length + 1}`] } : f)));
  };

  // ✅ Guardar en Firestore
  const handleSaveForm = async () => {
    if (!selectedClient) return alert("Selecciona un cliente");
    if (!selectedTask) return alert("Selecciona una tarea general");
    if (!selectedOperator) return alert("Selecciona un operador");
    if (fields.length === 0) return alert("Agrega al menos un campo antes de guardar");

    try {
      const clienteObj = clientes.find(c => c.id === selectedClient);
      const tareaObj = tareasGenerales.find(t => t.id === selectedTask);
      const operadorObj = operadores.find(o => o.id === selectedOperator);

      const docRef = await addDoc(collection(db, "formularios-tareas"), {
        nombreFormulario: formName,
        cliente: clienteObj,
        tarea: tareaObj,
        operadorAsignado: operadorObj,
        campos: fields,
        fechaCreacion: serverTimestamp(),
        fechaRespuesta: null
        
      });

      setGeneratedLink(`${window.location.origin}/formularios/${docRef.id}`);
    } catch (error) {
      console.error("Error guardando formulario:", error);
    }
  };

  return (
    <div style={{ maxWidth: "1300px", margin: "auto", padding: "20px" }}>
      {/* ✅ Header */}
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2>🛠 Crear Formulario</h2>
        <button onClick={() => navigate("/")} style={{ background: "#2563eb", color: "#fff", padding: "10px 16px", borderRadius: "6px", border: "none" }}>⬅ Volver</button>
      </header>

      {/* ✅ Selectores */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} style={{ flex: 1, padding: "10px" }}>
          <option value="">Selecciona Cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} style={{ flex: 1, padding: "10px" }}>
          <option value="">Selecciona Tarea</option>
          {tareasGenerales.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>

        <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)} style={{ flex: 1, padding: "10px" }}>
          <option value="">Selecciona Operador</option>
          {operadores.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </div>

      {/* Nombre del formulario */}
      <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre del formulario" style={{ width: "100%", padding: "10px", marginBottom: "15px" }} />

      {/* Layout principal */}
      <div style={{ display: "flex", gap: "20px" }}>
        {/* Campos disponibles */}
        <div style={{ width: "250px", background: "#f9fafb", padding: "15px", borderRadius: "8px" }}>
          <h3>Campos</h3>
          {fieldTypes.map((field) => (
            <div key={field.type} draggable onDragStart={() => handleDragStart(field)} style={{ padding: "10px", marginBottom: "8px", background: "#fff", borderRadius: "6px", cursor: "grab" }}>
              {field.label}
            </div>
          ))}
        </div>

        {/* Área de construcción */}
        <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} style={{ flex: 1, padding: "20px", border: "2px dashed #ccc", borderRadius: "8px" }}>
          <h3>Formulario</h3>
          {fields.length === 0 ? <p style={{ color: "#888" }}>Arrastra aquí los campos</p> : fields.map((field) => (
            <div key={field.id} style={{ background: "#fff", padding: "12px", marginBottom: "10px", borderRadius: "6px" }}>
              <input type="text" value={field.label} onChange={(e) => handleLabelChange(field.id, e.target.value)} style={{ width: "100%", marginBottom: "8px" }} />
              <label><input type="checkbox" checked={field.requerido} onChange={() => handleRequiredToggle(field.id)} /> Requerido</label>
              {["select", "checkbox", "radio"].includes(field.tipo) && (
                <div>
                  {field.opciones.map((opt, i) => (
                    <input key={i} type="text" value={opt} onChange={(e) => handleOptionChange(field.id, i, e.target.value)} style={{ display: "block", marginTop: "5px" }} />
                  ))}
                  <button onClick={() => addOption(field.id)}>+ Opción</button>
                </div>
              )}
              <button onClick={() => handleRemoveField(field.id)} style={{ background: "#f44336", color: "#fff", padding: "6px", borderRadius: "4px", marginTop: "8px" }}>🗑 Eliminar</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSaveForm} style={{ marginTop: "20px", background: "#4caf50", color: "#fff", padding: "12px 20px", borderRadius: "8px" }}>💾 Guardar Formulario</button>

      {generatedLink && (
        <div style={{ marginTop: "15px" }}>
          <p>✅ Formulario guardado. Link:</p>
          <a href={generatedLink} target="_blank" rel="noopener noreferrer">{generatedLink}</a>
        </div>
      )}
    </div>
  );
}
