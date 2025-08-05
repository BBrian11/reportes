import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import Filters from "./Filters.jsx";
import Charts from "./Charts.jsx";
import EventsTable from "./EventsTable.jsx";
import TgsStats from "./TgsStats.jsx";
import EdificioStats from "./EdificioStats.jsx";
import VtvStats from "./VtvStats.jsx";
import GlobalStats from "./GlobalStats.jsx";
import ExportPDF from "./ExportPDF.jsx";
import MiniCharts from "./MiniCharts.jsx";
import OtrosStats from "./OtrosStats.jsx";
import AlertasEventos from "./AlertasEventos.jsx";

import LineAnalytics from "./LineAnalytics.jsx";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import "../../styles/dashboard.css";

export default function Dashboard() {
  const [eventos, setEventos] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente: "",
    ubicacion: "",
    grupo: "",
    fechaInicio: "",
    fechaFin: "",
  });
  

  // ✅ Sidebar handlers
  const handleSelectCliente = (cliente) => {
    setFiltros({ ...filtros, cliente: cliente === "Todos" ? "" : cliente, ubicacion: "" });
  };

  const handleSelectUbicacion = (cliente, ubicacion) => {
    setFiltros({ ...filtros, cliente, ubicacion });
  };

  // ✅ Firestore listener
  useEffect(() => {
    const collections = [
      { path: "novedades/tgs/eventos", cliente: "TGS", eventoKey: "evento-tgs", ubicacionKey: "locaciones-tgs" },
      { path: "novedades/edificios/eventos", cliente: "Edificios", eventoKey: "evento-edificio" },
      { path: "novedades/vtv/eventos", cliente: "VTV", eventoKey: "evento-vtv", ubicacionKey: "planta-vtv" },
      { path: "novedades/barrios/eventos", cliente: "Barrios", eventoKey: "evento-barrios", ubicacionKey: "barrio" },
      { path: "novedades/otros/eventos", cliente: "Otros", eventoKey: "evento-otros", ubicacionKey: "otro" },
    ];

    const unsubscribes = collections.map(({ path, cliente, eventoKey, ubicacionKey }) =>
      onSnapshot(collection(db, path), (snapshot) => {
        const nuevos = snapshot.docs.map((doc) => {
          const d = doc.data();
          let ubicacion = "Sin Ubicación";

          if (cliente === "Edificios") {
            const edificio = d["edificio"] || "";
            const unidad = d["unidad"] ? ` - ${d["unidad"]}` : "";
            ubicacion = edificio ? edificio + unidad : "Sin Ubicación";
          } else {
            ubicacion = d[ubicacionKey] || "Sin Ubicación";
          }

          return {
            id: doc.id,
            cliente,
            grupo: cliente === "Edificios" ? d["edificio"] || "General" : d[ubicacionKey]?.split(" ")[0] || "General", // ✅ AGREGA ESTO
            evento: d[eventoKey] || "Sin Evento",
            ubicacion,
            fecha: d.fechaHoraEnvio
            ? new Date(d.fechaHoraEnvio.seconds * 1000).toLocaleString("es-AR", {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              })
            : "Sin Fecha",
          fechaObj: d.fechaHoraEnvio ? new Date(d.fechaHoraEnvio.seconds * 1000) : null,
            observacion: d[`observaciones-${cliente.toLowerCase()}`] || "Sin Observación",
          };
        });

        setEventos((prev) => [...prev.filter((e) => e.cliente !== cliente), ...nuevos]);
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);
  const handleSelectGrupo = (cliente, grupo) => {
    setFiltros({ ...filtros, cliente, grupo }); // ✅ Filtra todo el edificio
  };
  
  const procesarEventoAlerta = (evento) => {
    const clave = `${evento.ubicacion}`;
    if (evento.evento === "Corte de energía eléctrica") {
      if (!timersRef.current[clave]) {
        timersRef.current[clave] = setTimeout(() => {
          generarAlerta(clave, `No se detectó restauración tras 1 hora del corte en ${clave}`);
        }, 60 * 60 * 1000); // 1 hora
      }
    }

    if (evento.evento === "Restauración de energía eléctrica") {
      if (timersRef.current[clave]) {
        clearTimeout(timersRef.current[clave]);
        delete timersRef.current[clave];
        eliminarAlerta(clave);
      }
    }
  };

  const generarAlerta = (clave, mensaje) => {
    setAlertas((prev) => [...prev, { clave, mensaje, timestamp: new Date() }]);
    const audio = new Audio("/alerta.mp3");
    audio.play();
    if (Notification.permission === "granted") {
      new Notification("⚠️ Alerta en edificio", { body: mensaje });
    }
  };

  const eliminarAlerta = (clave) => {
    setAlertas((prev) => prev.filter((a) => a.clave !== clave));
  };

  // ✅ Filtrado dinámico
  const eventosFiltrados = eventos.filter((e) => {
    const fechaEvento = e.fechaObj || new Date(e.fecha);
    const fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
    const fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;
  
    return (
      (!filtros.cliente || filtros.cliente === "Todos" || e.cliente === filtros.cliente) &&
      (!filtros.grupo || e.grupo === filtros.grupo) && // ✅ Filtra por grupo
      (!filtros.ubicacion || e.ubicacion === filtros.ubicacion) &&
      (!fechaInicio || fechaEvento >= fechaInicio) &&
      (!fechaFin || fechaEvento <= fechaFin)
    );
  });
  
  

  return (
    <div className="dashboard-layout">
<Sidebar
  eventos={eventos}
  onSelectCliente={(cliente) =>
    setFiltros({ cliente: cliente === "Todos" ? "" : cliente, ubicacion: "", grupo: "" })
  }
  onSelectUbicacion={(cliente, ubicacion) =>
    setFiltros({ cliente, ubicacion, grupo: "" })
  }
  onSelectGrupo={(cliente, grupo) =>
    setFiltros({ cliente, grupo, ubicacion: "" }) // ✅ Filtra todo el grupo
  }
/>


  
      <main className="dashboard-main">
        <Header />
         {/* ✅ Botón flotante con badge */}
         <button className="alerta-btn" onClick={() => setMostrarModal(true)}>
          🔔 {alertas.length > 0 && <span className="badge">{alertas.length}</span>}
        </button>

        {/* ✅ Modal de alertas */}
        {mostrarModal && (
          <div className="modal-alertas">
            <div className="modal-content">
              <h3>Alertas pendientes</h3>
              {alertas.length === 0 ? (
                <p>No hay alertas activas</p>
              ) : (
                alertas.map((a, idx) => (
                  <div key={idx} className="alerta-item">
                    <strong>{a.mensaje}</strong>
                    <span>{a.timestamp.toLocaleTimeString()}</span>
                    <button onClick={() => eliminarAlerta(a.clave)}>❌</button>
                  </div>
                ))
              )}
              <button onClick={() => setMostrarModal(false)}>Cerrar</button>
            </div>
          </div>
        )}

        <div className="dashboard-content">
          <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />
  
          {!filtros.cliente ? (
            <>
              <div className="grid-layout">
                <GlobalStats eventos={eventosFiltrados} />
                <Charts eventos={eventosFiltrados} />
              </div>
  
              {/* ✅ Tabla FULL WIDTH */}
              <div className="table-section">
              <EventsTable eventos={eventosFiltrados} filtros={filtros} />

              </div>
            </>
          ) : (
            <>
              <div className="grid-layout">
                <MiniCharts eventos={eventosFiltrados} />
                <LineAnalytics
                  eventos={eventosFiltrados}
                  cliente={filtros.cliente}
                  fechaInicio={filtros.fechaInicio}
                  fechaFin={filtros.fechaFin}
                />
  
                {/* ✅ Estadísticas específicas */}
                {filtros.cliente === "TGS" && <TgsStats eventos={eventosFiltrados} />}
                {filtros.cliente === "Edificios" && <EdificioStats eventos={eventosFiltrados} />}
                {filtros.cliente === "VTV" && <VtvStats eventos={eventosFiltrados} />}
                {filtros.cliente === "Otros" && <OtrosStats eventos={eventosFiltrados} />}
              </div>
  
              {/* ✅ Tabla FULL WIDTH */}
              <div className="table-section">
              <ExportPDF eventos={eventosFiltrados} />
              <EventsTable eventos={eventosFiltrados} filtros={filtros} />

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
  
}
