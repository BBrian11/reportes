import React, { useState, useEffect } from 'react';
import { FaPlay, FaStop, FaCheckCircle, FaExclamationTriangle, FaWalking, FaChevronRight, FaPlusCircle, FaTrashAlt, FaVideo, FaTimesCircle } from 'react-icons/fa';
import Swal from 'sweetalert2';

// --- INTEGRACIÓN DE FIREBASE/FIRESTORE (Base de datos) ---
import { initializeApp, getApps } from "firebase/app";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    updateDoc,
    getDocs,
    query,
    where,
    Timestamp 
} from "firebase/firestore";

/* ⚠️ Configuración de Firebase - ¡Asegúrate de usar tus propias variables de entorno! */
const firebaseConfig = {
    apiKey: "AIzaSyCZcj7AOQoXHHn1vDiyoCQbDIQRMfvhOlA",
    authDomain: "reportesg3t.firebaseapp.com",
    projectId: "reportesg3t",
    storageBucket: "reportesg3t.firebasestorage.app",
    messagingSenderId: "571918948751",
    appId: "1:571918948751:web:055d012f4e1f3f8de5d3fa",
    measurementId: "G-P7T4BRND8L",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
// --------------------------------------------------------------------------

// --- Estilos Modernos y Modulares (Rediseño) ---
const PRIMARY_COLOR = '#1e3c72'; // Azul Oscuro
const ACCENT_COLOR = '#4CAF50';  // Verde Brillante (Para el botón de agregar)
const SUCCESS_COLOR = '#10b981';
const DANGER_COLOR = '#dc2626';

const styles = {
    container: { maxWidth: '1000px', margin: '30px auto', padding: '0 20px', fontFamily: 'Arial, sans-serif' },
    title: { color: PRIMARY_COLOR, borderBottom: `3px solid ${PRIMARY_COLOR}`, paddingBottom: '10px', marginBottom: '30px', display: 'flex', alignItems: 'center', fontSize: '24px' },
    headerBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eef2ff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '30px', borderLeft: `5px solid ${PRIMARY_COLOR}` },
    startButton: { padding: '12px 25px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease', border: 'none' },
    clientCard: { backgroundColor: '#ffffff', border: `1px solid #e0e7ff`, borderRadius: '12px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    clientHeader: (hasIssues) => ({
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px',
        backgroundColor: hasIssues ? '#fef2f2' : '#f0fdf4',
        borderLeft: `5px solid ${hasIssues ? DANGER_COLOR : SUCCESS_COLOR}`,
        cursor: 'pointer', transition: 'background-color 0.2s',
    }),
    checklistGrid: { display: 'flex', gap: '20px', padding: '15px 20px', borderTop: '1px solid #eee' },
    cameraSection: { padding: '15px 20px', borderTop: '1px solid #eee' },
    cameraItem: (isIssue) => ({
        marginBottom: '15px', padding: '15px', borderRadius: '8px',
        border: `2px solid ${isIssue ? DANGER_COLOR : SUCCESS_COLOR}`,
        backgroundColor: isIssue ? '#fff5f5' : '#f7fdf7',
    }),
    statusButton: (isActive, color) => ({
        margin: '0 5px', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
        fontWeight: 'bold', transition: 'all 0.2s',
        backgroundColor: isActive ? color : '#e5e7eb',
        color: isActive ? 'white' : '#6b7280',
        boxShadow: isActive ? `0 2px 4px ${color}80` : 'none',
    }),
    obsInput: { width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '6px', marginTop: '10px', resize: 'vertical' },
    addButton: { padding: '10px 15px', backgroundColor: ACCENT_COLOR, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center' },
    cameraInput: { padding: '10px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px', flexGrow: 1 }
};

// Generar una clave de día (YYYY-MM-DD) para Firestore
const getDayKey = () => new Date().toISOString().split('T')[0];
const FORM_ID = "rondin-cctv";
const COLLECTION_NAME = "respuestas-tareas";

// --------------------------------------------------------------------------
// --- FUNCIONES DE UTILIDAD Y FIREBASE ---

/**
 * Función auxiliar para barajar/mezclar un array (Algoritmo de Fisher-Yates).
 */
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

/**
 * Obtiene los clientes desde la colección 'clientes' de Firestore que tienen 'rondin' a true.
 */
const getDynamicClients = async () => {
    try {
        const clientsRef = collection(db, "clientes"); 
        const q = query(clientsRef, where("rondin", "==", true)); 
        const snapshot = await getDocs(q);

        const clients = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                name: data.nombre, 
                camaras: data.camaras || [], 
            };
        });
        return clients;
    } catch (error) {
        console.error("Error al obtener clientes dinámicos de Firestore:", error);
        return [];
    }
};


/**
 * Busca un rondín activo para el operador y el día actual.
 */
const getActiveRondin = async (operadorKey) => { 
    const dayKey = getDayKey();
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('operadorKey', '==', operadorKey),
            where('formId', '==', FORM_ID),
            where('diaKey', '==', dayKey),
            where('estado', '==', 'Iniciada')
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }
    } catch (error) {
        console.error("Error al buscar rondín activo en Firestore:", error);
    }
    return null;
};

/**
 * Crea e inicia un nuevo documento de rondín en Firestore.
 */
const startRondin = async (operadorKey, operadorNombre, dynamicClients) => {
    const dayKey = getDayKey();
    const now = Timestamp.now();
    
    if (!dynamicClients || dynamicClients.length === 0) {
        throw new Error("No se encontraron clientes con 'rondin: true' para iniciar el rondín.");
    }

    // LÓGICA DE SELECCIÓN ALEATORIA DE 6 CLIENTES
    const SHUFFLE_LIMIT = 6;
    const shuffledClients = shuffleArray(dynamicClients);
    const selectedClients = shuffledClients.slice(0, SHUFFLE_LIMIT);

    const initialData = {
        operadorKey,
        operador: operadorNombre,
        formId: FORM_ID,
        nombreFormulario: "Rondín de Video Verificación CCTV",
        diaKey: dayKey,
        estado: "Iniciada",
        
        // Control de Tiempo
        controlRonda: {
            startTime: now,
            endTime: null, 
            durationMs: 0,
            isPaused: false, 
            pauseStart: null, 
            totalPausedMs: 0,
            pausas: [],
        },
        
        respuestas: {
            tandas: selectedClients.map(client => ({ 
                cliente: client.name,
                id: `tanda-${Date.now()}-${client.name.replace(/\s/g, '')}`,
                hasCamaras: client.camaras && client.camaras.length > 0,
                camaras: client.camaras.map(cam => ({
                    ...cam,
                    estado: 'ok',
                    history: [],
                    nota: '',
                    touched: false,
                    preCargada: true,
                    tiempoDeRespuestaMs: 0, // Tiempo de respuesta
                })),
                estadoVerificacion: { ok: true, nota: '' },
                resumen: '',
                log: [],
            })),
            observaciones: '',
        },
        fechaCreacion: now,
    };

    try {
        const documentId = `${operadorKey}-${dayKey}-${FORM_ID}`;
        await setDoc(doc(db, COLLECTION_NAME, documentId), initialData);
        return { id: documentId, ...initialData };
    } catch (error) {
        console.error("Error al iniciar rondín en Firestore:", error);
        throw new Error("Fallo al iniciar el rondín.");
    }
};

/**
 * Registra una acción de pausa/reanudación en Firestore.
 */
const updateRondinPauseStatus = async (rondinId, controlRonda) => {
    try {
        const rondinRef = doc(db, COLLECTION_NAME, rondinId);
        await updateDoc(rondinRef, {
            'controlRonda': controlRonda,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Error al actualizar la pausa en Firestore:", error);
    }
};

/**
 * Guarda el progreso de las respuestas del rondín y la duración.
 */
const saveTandaResponse = async (rondinId, tandas, observaciones, durationMs) => { 
    const now = Timestamp.now();
    try {
        const rondinRef = doc(db, COLLECTION_NAME, rondinId);
        await updateDoc(rondinRef, {
            'respuestas.tandas': tandas,
            'respuestas.observaciones': observaciones,
            'controlRonda.durationMs': durationMs, 
            updatedAt: now,
        });
    } catch (error) {
        console.error("Error en el guardado automático de Firestore:", error);
    }
};

/**
 * Finaliza el rondín y calcula el tiempo final.
 */
const completeRondin = async (rondinId, finalData, finalControlRonda) => {
    const now = Timestamp.now();

    // Cálculo final del tiempo
    const startTimeMs = finalControlRonda.startTime.toMillis();
    const totalPausedMs = finalControlRonda.totalPausedMs;

    finalControlRonda.endTime = now;
    // Recalcula la duración total efectiva: (Ahora - Inicio) - Pausa Total
    finalControlRonda.durationMs = now.toMillis() - startTimeMs - totalPausedMs;
    
    try {
        const rondinRef = doc(db, COLLECTION_NAME, rondinId);
        await updateDoc(rondinRef, {
            estado: "Finalizada",
            'respuestas.tandas': finalData.tandas,
            'respuestas.observaciones': finalData.observaciones,
            controlRonda: finalControlRonda,
            updatedAt: now,
            fechaFinalizacion: now,
        });
    } catch (error) {
        console.error("Error al finalizar rondín en Firestore:", error);
        throw new Error("Fallo al finalizar el rondín.");
    }
};

// --- Componente de Tarjeta de Cliente/Tanda ---

const TandaCard = ({ tanda, updateTandaData, isRondinActive, getRondinTimeMs }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newCameraChannel, setNewCameraChannel] = useState('');
    const [newCameraDescription, setNewCameraDescription] = useState('');

    const estadoVerificacionSeguro = tanda.estadoVerificacion || { ok: true, nota: '' };

    const handleHasCamarasChange = (hasCamaras) => {
        if (!isRondinActive) return Swal.fire('Rondín Inactivo', 'Debes iniciar/reanudar el rondín para registrar novedades.', 'warning');
        
        const updatedCamaras = hasCamaras 
            ? tanda.camaras 
            : tanda.camaras.filter(cam => cam.preCargada);

        updateTandaData({ ...tanda, hasCamaras: hasCamaras, camaras: updatedCamaras });
    };

    const handleEstadoVerificacionChange = (ok, nota = '') => {
        if (!isRondinActive) return Swal.fire('Rondín Inactivo', 'Debes iniciar/reanudar el rondín para registrar novedades.', 'warning');
        
        const newNota = ok ? '' : nota;

        updateTandaData({ 
            ...tanda, 
            estadoVerificacion: { ok: ok, nota: newNota } 
        });
    };
    
    const handleCameraUpdate = (camId, updates) => {
        if (!isRondinActive) return Swal.fire('Rondín Inactivo', 'Debes iniciar/reanudar el rondín para registrar novedades.', 'warning');

        // Captura el tiempo de trabajo efectivo del rondín al momento de la respuesta
        const currentRondinTimeMs = getRondinTimeMs(); 

        const now = Date.now();
        const newCamaras = tanda.camaras.map(cam => {
            if (cam.id === camId) {
                let statusUpdates = {};
                
                if (updates.estado && updates.estado !== cam.estado) {
                    statusUpdates.history = [...cam.history, { at: now, from: cam.estado, to: updates.estado }];
                }
                
                return {
                    ...cam,
                    ...updates,
                    ...statusUpdates,
                    touched: true,
                    // Guarda el tiempo de respuesta
                    tiempoDeRespuestaMs: currentRondinTimeMs, 
                };
            }
            return cam;
        });

        const issuesExist = newCamaras.some(cam => cam.estado !== 'ok' && cam.estado !== null);
        
        updateTandaData({ 
            ...tanda, 
            camaras: newCamaras,
            estadoVerificacion: {
                ok: !issuesExist,
                nota: issuesExist ? 'Falla detectada en cámara individual.' : estadoVerificacionSeguro.nota 
            }
        });
    };
    
    const handleAddCamera = () => {
        if (!isRondinActive) return Swal.fire('Rondín Inactivo', 'Debes iniciar/reanudar el rondín.', 'warning');

        const channel = parseInt(newCameraChannel.trim());
        if (!channel || isNaN(channel) || channel <= 0) {
            return Swal.fire('Error', 'Debes ingresar un número de canal válido (ej: 3, 5).', 'error');
        }

        const existingCam = tanda.camaras.find(c => c.canal === channel);
        if (existingCam) {
            return Swal.fire('Error', `Ya existe una cámara con el Canal ${channel}.`, 'error');
        }

        const newCam = {
            canal: channel,
            id: `cam-dyn-${Date.now()}-${channel}`,
            descripcion: newCameraDescription.trim() || 'Cámara Añadida',
            estado: 'ok', 
            history: [],
            nota: '',
            touched: true, 
            preCargada: false, 
            tiempoDeRespuestaMs: getRondinTimeMs(), // Registra el tiempo de adición
        };
        
        const newCamaras = [...tanda.camaras, newCam].sort((a, b) => a.canal - b.canal); 

        updateTandaData({ ...tanda, camaras: newCamaras, hasCamaras: true }); 

        setNewCameraChannel('');
        setNewCameraDescription('');
        Swal.fire('Cámara Añadida', `Se agregó la Cámara **Canal ${channel}** a ${tanda.cliente}.`, 'success');
    };

    const handleRemoveCamera = (camId, camCanal) => {
        if (!isRondinActive) return Swal.fire('Rondín Inactivo', 'Debes iniciar/reanudar el rondín.', 'warning');

        Swal.fire({
            title: '¿Eliminar Cámara?',
            text: `¿Estás seguro de eliminar la Cámara Canal ${camCanal}? (Esto solo aplica a este rondín)`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: DANGER_COLOR,
            cancelButtonColor: PRIMARY_COLOR,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const newCamaras = tanda.camaras.filter(cam => cam.id !== camId);
                const hasCamaras = newCamaras.length > 0;
                
                const issuesExist = newCamaras.some(cam => cam.estado !== 'ok' && cam.estado !== null);
                
                updateTandaData({ 
                    ...tanda, 
                    camaras: newCamaras, 
                    hasCamaras,
                    estadoVerificacion: {
                        ok: !issuesExist,
                        nota: issuesExist ? 'Falla detectada en cámara individual.' : estadoVerificacionSeguro.nota
                    }
                });
                Swal.fire('Eliminada', `Cámara Canal ${camCanal} eliminada.`, 'success');
            }
        });
    };

    const hasIssues = !tanda.hasCamaras || !estadoVerificacionSeguro.ok || tanda.camaras.some(cam => cam.estado !== 'ok' && cam.estado !== null);

    const switchStyles = {    
        container: { display: 'flex', alignItems: 'center', margin: '10px 0', paddingBottom: '10px' },
        label: { marginRight: '15px', fontWeight: 'bold', color: PRIMARY_COLOR },
        toggle: {
            position: 'relative',
            display: 'inline-block',
            width: '60px',
            height: '34px',
            cursor: isRondinActive ? 'pointer' : 'default',
        },
        slider: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: tanda.hasCamaras ? SUCCESS_COLOR : DANGER_COLOR,
            transition: '.4s',
            borderRadius: '34px',
            opacity: isRondinActive ? 1 : 0.6,
        },
        sliderBefore: {
            position: 'absolute',
            content: '""',
            height: '26px',
            width: '26px',
            left: tanda.hasCamaras ? '29px' : '4px',
            bottom: '4px',
            backgroundColor: 'white',
            transition: '.4s',
            borderRadius: '50%',
        },
        text: {
            position: 'absolute',
            top: '8px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px',
            left: tanda.hasCamaras ? '8px' : '32px',
            transition: '.4s',
            userSelect: 'none',
        }
    };

    return (
        <div style={styles.clientCard}>
            <div 
                style={styles.clientHeader(hasIssues)} 
                onClick={() => setIsOpen(!isOpen)}
            >
                <div style={{display: 'flex', alignItems: 'center'}}>
                    {hasIssues
                        ? <FaExclamationTriangle color={DANGER_COLOR} style={{marginRight: '10px'}} />
                        : <FaCheckCircle color={SUCCESS_COLOR} style={{marginRight: '10px'}} />
                    }
                    <span style={{fontWeight: '900', color: PRIMARY_COLOR, fontSize: '18px'}}>{tanda.cliente}</span>
                </div>
                <FaChevronRight style={{transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: PRIMARY_COLOR}} />
            </div>

            {isOpen && (
                <div>
                    {/* Control de Existencia de Cámaras */}
                    <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                        <div style={switchStyles.container}>
                            <span style={switchStyles.label}>
                                **¿El cliente tiene CCTV para verificar?**
                            </span>
                            <div 
                                style={switchStyles.toggle} 
                                onClick={isRondinActive ? () => handleHasCamarasChange(!tanda.hasCamaras) : undefined}
                            >
                                <div style={switchStyles.slider}>
                                    <span style={switchStyles.text}>
                                        {tanda.hasCamaras ? 'SÍ' : 'NO'}
                                    </span>
                                </div>
                                <div style={switchStyles.sliderBefore}></div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Reporte de Estado General del CCTV */}
                    {tanda.hasCamaras && (
                        <div style={styles.checklistGrid}>
                            <div style={{fontWeight: 'bold', color: PRIMARY_COLOR, display: 'flex', alignItems: 'center'}}>
                                Estado General del CCTV:
                            </div>
                            <div>
                                <button
                                    onClick={() => handleEstadoVerificacionChange(true)}
                                    style={styles.statusButton(estadoVerificacionSeguro.ok, SUCCESS_COLOR)} 
                                    disabled={!isRondinActive}
                                >
                                    <FaCheckCircle style={{marginRight: '5px'}}/> OK (Equipo, Grabaciones, 220V)
                                </button>
                                <button
                                    onClick={() => handleEstadoVerificacionChange(false, 'Indicar novedad...')}
                                    style={styles.statusButton(!estadoVerificacionSeguro.ok, DANGER_COLOR)}
                                    disabled={!isRondinActive}
                                >
                                    <FaTimesCircle style={{marginRight: '5px'}}/> FALLA/NOVEDAD GENERAL
                                </button>
                            </div>
                            
                            {!estadoVerificacionSeguro.ok && (
                                <textarea
                                    placeholder="Nota de Novedad General (Ej: Equipo Offline, Cortes 220V, No Graba...)"
                                    value={estadoVerificacionSeguro.nota}
                                    onChange={(e) => handleEstadoVerificacionChange(false, e.target.value)}
                                    style={{...styles.obsInput, minHeight: '50px', marginTop: '5px', gridColumn: '1 / -1'}}
                                    disabled={!isRondinActive}
                                />
                            )}
                        </div>
                    )}

                    {/* Verificación y Adición de Cámaras */}
                    {tanda.hasCamaras ? (
                        <div style={styles.cameraSection}>
                            <h3 style={{marginTop: 0, color: PRIMARY_COLOR, borderBottom: '1px dotted #ccc', paddingBottom: '10px'}}>
                                <FaVideo style={{marginRight: '8px'}}/> Verificación de Cámaras ({tanda.camaras.length})
                            </h3>

                            {/* Formulario de Adición de Cámara */}
                            <div style={{display: 'flex', gap: '10px', marginBottom: '20px', border: '1px dashed #ccc', padding: '15px', borderRadius: '8px', alignItems: 'center', backgroundColor: '#f9f9f9'}}>
                                <input
                                    type="number"
                                    placeholder="Canal (ej: 3)"
                                    value={newCameraChannel}
                                    onChange={(e) => setNewCameraChannel(e.target.value)}
                                    style={{...styles.cameraInput, maxWidth: '100px'}}
                                    disabled={!isRondinActive}
                                />
                                <input
                                    type="text"
                                    placeholder="Descripción o Ubicación (opcional)"
                                    value={newCameraDescription}
                                    onChange={(e) => setNewCameraDescription(e.target.value)}
                                    style={styles.cameraInput}
                                    disabled={!isRondinActive}
                                />
                                <button
                                    onClick={handleAddCamera}
                                    style={styles.addButton}
                                    disabled={!isRondinActive || !newCameraChannel}
                                >
                                    <FaPlusCircle style={{marginRight: '5px'}}/> Agregar Cámara
                                </button>
                            </div>

                            {/* Lista de Cámaras */}
                            {tanda.camaras.length === 0 ? (
                                <p style={{color: DANGER_COLOR, fontWeight: 'bold'}}>
                                    Marca SÍ, pero aún no hay cámaras. ¡Usa el botón **Agregar Cámara**!
                                </p>
                            ) : (
                                tanda.camaras.map(cam => {
                                    const isIssue = cam.estado !== 'ok' && cam.estado !== null;
                                    return (
                                    <div key={cam.id} style={styles.cameraItem(isIssue)}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                            <p style={{fontWeight: 'bold', margin: 0, color: PRIMARY_COLOR, fontSize: '16px'}}>
                                                Canal {cam.canal}: <span style={{fontWeight: 'normal', color: '#6b7280'}}>{cam.descripcion}</span>
                                                {!cam.preCargada && <span style={{marginLeft: '10px', backgroundColor: ACCENT_COLOR, color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px'}}>NUEVA</span>}
                                                {/* Muestra el tiempo de respuesta */}
                                                {cam.touched && cam.tiempoDeRespuestaMs > 0 && 
                                                    <span style={{marginLeft: '10px', fontSize: '12px', color: PRIMARY_COLOR}}>
                                                        (R: {formatDuration(cam.tiempoDeRespuestaMs)})
                                                    </span>
                                                }
                                            </p>
                                            <button 
                                                onClick={() => handleRemoveCamera(cam.id, cam.canal)} 
                                                style={{border: 'none', backgroundColor: 'transparent', color: DANGER_COLOR, cursor: isRondinActive ? 'pointer' : 'default'}}
                                                title="Eliminar solo para este rondín"
                                                disabled={!isRondinActive}
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </div>

                                        {/* Botones de Estado */}
                                        <div style={{marginBottom: '10px'}}>
                                            <button
                                                onClick={() => handleCameraUpdate(cam.id, { estado: 'ok', nota: '' })}
                                                style={styles.statusButton(cam.estado === 'ok', SUCCESS_COLOR)}
                                                disabled={!isRondinActive}
                                            >OK</button>
                                            <button
                                                onClick={() => handleCameraUpdate(cam.id, { estado: 'intermitente' })}
                                                style={styles.statusButton(cam.estado === 'intermitente', '#f59e0b')}
                                                disabled={!isRondinActive}
                                            >Intermitente</button>
                                            <button
                                                onClick={() => handleCameraUpdate(cam.id, { estado: 'grave' })}
                                                style={styles.statusButton(cam.estado === 'grave', DANGER_COLOR)}
                                                disabled={!isRondinActive}
                                            >Grave (Caída)</button>
                                        </div>

                                        {/* Nota/Observación */}
                                        <textarea
                                            placeholder={`Nota sobre la Cámara ${cam.canal} (obligatorio si el estado no es OK)`}
                                            value={cam.nota}
                                            onChange={(e) => handleCameraUpdate(cam.id, { nota: e.target.value })}
                                            style={styles.obsInput}
                                            disabled={!isRondinActive}
                                        />
                                    </div>
                                    )})
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '20px', borderTop: '1px solid #eee', backgroundColor: '#f0f4ff', color: PRIMARY_COLOR, fontWeight: 'bold', borderRadius: '0 0 12px 12px' }}>
                            ✅ Cliente marcado como **SIN CCTV** para verificación.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Componente Principal RondinCCTV ---

const useOperadorAuth = () => {
    const operadorKey = "TEST-OP-123";
    const operadorNombre = "Operador de Prueba";
    return { operadorKey, operadorNombre };
};

// Función de utilidad para formatear ms a HH:MM:SS
const formatDuration = (ms) => {
    if (!ms || ms < 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const RondinCCTV = () => {
    const { operadorKey, operadorNombre } = useOperadorAuth();
    const [rondin, setRondin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [observacionesGenerales, setObservacionesGenerales] = useState('');
    const [dynamicClients, setDynamicClients] = useState([]); 

    // ESTADOS PARA EL TEMPORIZADOR Y PAUSA
    const [durationMs, setDurationMs] = useState(0); 
    const [totalPausedMs, setTotalPausedMs] = useState(0); 
    const [isPaused, setIsPaused] = useState(false); 
    const [pauseStart, setPauseStart] = useState(null); 

    const isRondinActive = rondin && rondin.estado === 'Iniciada';
    const formattedDuration = formatDuration(durationMs);
    const formattedTotalPaused = formatDuration(totalPausedMs);

    // Función para devolver la duración de trabajo actual (para TandaCard)
    const getRondinTimeMs = () => durationMs; 

    // 1. Cargar clientes dinámicos y rondín activo al montar
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!operadorKey) {
                setLoading(false);
                return;
            }
            try {
                const clients = await getDynamicClients();
                setDynamicClients(clients);

                const activeRondin = await getActiveRondin(operadorKey);
                if (activeRondin) {
                    setRondin(activeRondin);
                    setObservacionesGenerales(activeRondin.respuestas.observaciones || '');
                    
                    // INICIALIZAR ESTADOS DEL TEMPORIZADOR
                    const control = activeRondin.controlRonda;
                    const nowMs = Date.now();
                    const startMs = control.startTime.toMillis();
                    
                    setTotalPausedMs(control.totalPausedMs);
                    
                    if (control.isPaused && control.pauseStart) {
                        setIsPaused(true);
                        setDurationMs(control.durationMs);
                        setPauseStart(control.pauseStart.toMillis());
                    } else {
                        setIsPaused(false);
                        setPauseStart(null);
                        // Recalcula la duración (tiempo transcurrido - tiempo total en pausa)
                        setDurationMs(control.durationMs + (nowMs - startMs - control.totalPausedMs));
                    }

                } else if (clients.length === 0) {
                    setError("No se encontraron clientes con 'rondin: true'. No se puede iniciar la verificación.");
                }

            } catch (err) {
                setError("Error al cargar datos iniciales: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [operadorKey]); 

    // 2. LÓGICA DEL TEMPORIZADOR (Actualiza durationMs cada segundo)
    useEffect(() => {
        let timerId;
        if (isRondinActive && !isPaused) {
            timerId = setInterval(() => {
                setDurationMs(prev => prev + 1000);
            }, 1000);
        }

        return () => {
            clearInterval(timerId);
        };
    }, [isRondinActive, isPaused]); 


    // 3. Guardado automático (Debounce)
    useEffect(() => {
        if (rondin && rondin.id && isRondinActive) {
            // No guardamos si está pausado, ya que la pausa ya guardó el estado de durationMs
            if (isPaused) return; 

            const handler = setTimeout(() => {
                saveTandaResponse(rondin.id, rondin.respuestas.tandas, observacionesGenerales, durationMs);
                console.log("Guardado automático completado. Duración: " + formatDuration(durationMs));
            }, 3000); 

            return () => {
                clearTimeout(handler);
            };
        }
    }, [rondin, observacionesGenerales, isRondinActive, durationMs, isPaused]);

    
    // Función de actualización de tandas
    const updateTandaData = (updatedTanda) => {
        setRondin(prevRondin => ({
            ...prevRondin,
            respuestas: {
                ...prevRondin.respuestas,
                tandas: prevRondin.respuestas.tandas.map(t => t.id === updatedTanda.id ? updatedTanda : t)
            }
        }));
    };

    // 4. Iniciar Rondín
    const handleStartRondin = async () => {
        if (!operadorKey || !operadorNombre) {
            Swal.fire('Error de Sesión', 'No se pudo obtener la clave del operador.', 'error');
            return;
        }

        if (dynamicClients.length === 0) {
              Swal.fire('Error', 'No hay clientes disponibles con rondín activo para iniciar.', 'error');
            return;
        }

        const activeRondin = await getActiveRondin(operadorKey);
        if (activeRondin) {
            Swal.fire('Atención', 'Ya existe un rondín activo para hoy. Se reanudará.', 'info');
            // La lógica de reanudación ya está en el useEffect inicial, pero la duplicamos aquí para la UX inmediata.
            const control = activeRondin.controlRonda;
            const nowMs = Date.now();
            const startMs = control.startTime.toMillis();

            setTotalPausedMs(control.totalPausedMs);
            if (control.isPaused) {
                setIsPaused(true);
                setDurationMs(control.durationMs); 
                setPauseStart(control.pauseStart ? control.pauseStart.toMillis() : nowMs); // Asegura pauseStart
            } else {
                setIsPaused(false);
                setPauseStart(null);
                setDurationMs(control.durationMs + (nowMs - startMs - control.totalPausedMs));
            }

            setRondin(activeRondin);
            setObservacionesGenerales(activeRondin.respuestas.observaciones || '');
            return;
        }

        setLoading(true);
        try {
            const newRondin = await startRondin(operadorKey, operadorNombre, dynamicClients); 
            setRondin(newRondin);
            setObservacionesGenerales(newRondin.respuestas.observaciones || '');
            
            // RESETEO/INICIO DE ESTADOS DE TIEMPO
            setDurationMs(0);
            setTotalPausedMs(0);
            setIsPaused(false);
            setPauseStart(null);

            Swal.fire('Rondín Iniciado', `El control de CCTV ha comenzado con **${newRondin.respuestas.tandas.length} clientes aleatorios**.`, 'success');
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // 5. LÓGICA DE PAUSA
    const handlePauseRondin = async () => {
        if (!isRondinActive || isPaused) return;

        const now = Timestamp.now();
        const nowMs = now.toMillis();
        
        // 1. Actualizar estado local
        setPauseStart(nowMs);
        setIsPaused(true);

        // 2. Actualizar rondín local (guarda la duración de trabajo acumulada)
        const updatedControlRonda = {
            ...rondin.controlRonda,
            isPaused: true,
            pauseStart: now,
            durationMs: durationMs, // Guarda la duración actual antes de la pausa
        };
        setRondin(prevRondin => ({
            ...prevRondin,
            controlRonda: updatedControlRonda
        }));

        // 3. Guardar en Firestore
        await updateRondinPauseStatus(rondin.id, updatedControlRonda);
        Swal.fire({
            title: 'Rondín Pausado ⏸️', 
            text: 'El tiempo de trabajo se ha detenido. Presiona REANUDAR para continuar.', 
            icon: 'info',
            showConfirmButton: false,
            timer: 2000
        });
    };

    // 6. LÓGICA DE REANUDACIÓN
    const handleResumeRondin = async () => {
        if (!isRondinActive || !isPaused || !pauseStart) return;

        const now = Timestamp.now();
        const nowMs = now.toMillis();
        const pauseDurationMs = nowMs - pauseStart; // Calcula la duración de la última pausa

        // 1. Actualizar estado local
        setTotalPausedMs(prev => prev + pauseDurationMs); // Agrega el tiempo de pausa al total
        setPauseStart(null);
        setIsPaused(false);

        // 2. Actualizar rondín local
        const updatedControlRonda = {
            ...rondin.controlRonda,
            isPaused: false,
            pauseStart: null,
            totalPausedMs: rondin.controlRonda.totalPausedMs + pauseDurationMs, // Suma al total ya guardado
            // durationMs se actualizó al pausar, se mantendrá y el timer lo aumentará
        };
        setRondin(prevRondin => ({
            ...prevRondin,
            controlRonda: updatedControlRonda
        }));
        
        // 3. Guardar en Firestore
        await updateRondinPauseStatus(rondin.id, updatedControlRonda);
        Swal.fire({
            title: 'Rondín Reanudado ▶️', 
            text: 'El tiempo de trabajo ha vuelto a correr.', 
            icon: 'success',
            showConfirmButton: false,
            timer: 1500
        });
    };
    
    // 7. Finalizar Rondín
    const handleStopRondin = async () => {
        if (!isRondinActive) return;

        // Validación de datos (permanece igual)
        const hasUnmarkedIssues = rondin.respuestas.tandas.some(tanda => {
            if (tanda.hasCamaras) {
                if (!tanda.estadoVerificacion?.ok && tanda.estadoVerificacion?.nota.trim() === '') return true; 
                return tanda.camaras.some(cam => (cam.estado !== 'ok' && cam.estado !== null) && cam.nota.trim() === '');
            }
            return false;
        });

        if (hasUnmarkedIssues) {
            Swal.fire('Alerta', 'Hay cámaras o estados generales marcados con FALLA/NOVEDAD sin nota/observación. Por favor, complétalas.', 'warning');
            return;
        }

        Swal.fire({
            title: 'Finalizar Rondín',
            text: '¿Estás seguro de finalizar el rondín? Esto enviará el informe final.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Finalizar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: SUCCESS_COLOR,
            cancelButtonColor: DANGER_COLOR,
        }).then(async (result) => {
            if (result.isConfirmed) {
                setLoading(true);
                try {
                    // Si estaba pausado, se debe finalizar la pausa para el cálculo
                    let finalControlRonda = { ...rondin.controlRonda };
                    let finalTotalPausedMs = totalPausedMs; 

                    if (isPaused && pauseStart) {
                        const nowMs = Date.now();
                        const pauseDurationMs = nowMs - pauseStart;
                        finalTotalPausedMs += pauseDurationMs;
                    }

                    // Se pasa la duración de trabajo final y el total de pausa.
                    finalControlRonda.totalPausedMs = finalTotalPausedMs;
                    finalControlRonda.durationMs = durationMs; // La última duración de trabajo

                    await completeRondin(rondin.id, rondin.respuestas, finalControlRonda);
                    
                    setRondin(prev => ({ ...prev, estado: 'Finalizada' }));
                    setIsPaused(false);
                    setPauseStart(null);
                    Swal.fire('Rondín Finalizado', `¡Informe enviado con éxito en **${formattedDuration}** de trabajo!`, 'success');
                } catch (err) {
                    Swal.fire('Error', err.message, 'error');
                } finally {
                    setLoading(false);
                }
            }
        });
    };
    
    // Renderizado
    if (loading) return <div style={styles.container}>Cargando datos...</div>;
    if (error) return <div style={{...styles.container, color: DANGER_COLOR}}>Error: {error}</div>;

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>
                <FaWalking style={{marginRight: '10px'}}/> 
                Rondín de Video Verificación CCTV
            </h1>
            
            <div style={styles.headerBox}>
                <div style={{fontSize: '16px'}}>
                    **Operador:** {operadorNombre} ({operadorKey})<br/>
                    **Estado:** <span style={{fontWeight: 'bold', color: isRondinActive ? SUCCESS_COLOR : DANGER_COLOR}}>
                        {rondin ? rondin.estado : 'Pendiente de Inicio'}
                    </span>
                </div>
                
                {/* Contadores de Tiempo */}
                <div style={{textAlign: 'center', backgroundColor: '#fff', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                    <p style={{margin: 0, fontWeight: 'bold', color: PRIMARY_COLOR}}>Tiempo de Trabajo:</p>
                    <p style={{margin: '5px 0 0', fontSize: '24px', fontWeight: '900', color: isPaused ? DANGER_COLOR : SUCCESS_COLOR}}>
                        {formattedDuration}
                        {isPaused && <span style={{fontSize: '12px', color: DANGER_COLOR, marginLeft: '5px'}}> (PAUSADO)</span>}
                    </p>
                    <p style={{margin: '5px 0 0', fontSize: '12px', color: '#6b7280'}}>
                         Tiempo Pausado Total: {formattedTotalPaused}
                    </p>
                </div>

                {/* Botones de Control */}
                <div>
                    {!rondin && dynamicClients.length > 0 && (
                        <button
                            onClick={handleStartRondin}
                            style={{...styles.startButton, backgroundColor: PRIMARY_COLOR, color: 'white'}}
                        >
                            <FaPlay style={{marginRight: '10px'}}/> INICIAR RONDÍN
                        </button>
                    )}

                    {isRondinActive && !isPaused && (
                        <button
                            onClick={handlePauseRondin}
                            style={{...styles.startButton, backgroundColor: '#f59e0b', color: 'white', marginLeft: '10px'}}
                        >
                            <FaStop style={{marginRight: '10px'}}/> PAUSAR
                        </button>
                    )}

                    {isRondinActive && isPaused && (
                        <button
                            onClick={handleResumeRondin}
                            style={{...styles.startButton, backgroundColor: SUCCESS_COLOR, color: 'white', marginLeft: '10px'}}
                        >
                            <FaPlay style={{marginRight: '10px'}}/> REANUDAR
                        </button>
                    )}

                    {isRondinActive && (
                        <button
                            onClick={handleStopRondin}
                            style={{...styles.startButton, backgroundColor: DANGER_COLOR, color: 'white', marginLeft: '10px'}}
                        >
                            <FaStop style={{marginRight: '10px'}}/> FINALIZAR
                        </button>
                    )}
                </div>
            </div>

            {rondin && rondin.respuestas.tandas.map((tanda, index) => (
                <TandaCard
                    key={index}
                    tanda={tanda}
                    updateTandaData={updateTandaData}
                    isRondinActive={isRondinActive && !isPaused} // Deshabilita la edición si está pausado
                    getRondinTimeMs={getRondinTimeMs} 
                />
            ))}

            {rondin && (
                <div style={{marginTop: '30px', padding: '20px', backgroundColor: '#eef2ff', borderRadius: '12px'}}>
                    <h3 style={{color: PRIMARY_COLOR, marginTop: 0}}>Observaciones Generales del Rondín:</h3>
                    <textarea
                        placeholder="Observaciones importantes del rondín completo..."
                        value={observacionesGenerales}
                        onChange={(e) => setObservacionesGenerales(e.target.value)}
                        style={{...styles.obsInput, minHeight: '100px'}}
                        disabled={!isRondinActive || isPaused} // Deshabilita si está pausado
                    />
                </div>
            )}
        </div>
    );
};

export default RondinCCTV;