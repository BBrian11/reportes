import React, { useEffect, useState } from "react";
import Header from "./Header.jsx";
import StatsCards from "./StatsCards.jsx";
import Filters from "./Filters.jsx";
import Charts from "./Charts.jsx";
import EventsTable from "./EventsTable.jsx";
import ExportPDF from "./ExportPDF.jsx";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function Dashboard() {
  const [eventos, setEventos] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente: "",
    evento: "",
    ubicacion: "",
    fechaInicio: "",
    fechaFin: "",
  });

  // 🔹 Traer datos en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "novedades/edificios/eventos"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEventos(data);
    });
    return () => unsub();
  }, []);

  // 🔍 Filtrar
  const eventosFiltrados = eventos.filter((e) => {
    const fecha = e.fechaHoraEnvio?.seconds
      ? new Date(e.fechaHoraEnvio.seconds * 1000)
      : null;

    const fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
    const fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;

    return (
      (!filtros.cliente || e.cliente === filtros.cliente) &&
      (!filtros.evento || e.evento === filtros.evento) &&
      (!filtros.ubicacion || e.ubicacion === filtros.ubicacion) &&
      (!fechaInicio || (fecha && fecha >= fechaInicio)) &&
      (!fechaFin || (fecha && fecha <= fechaFin))
    );
  });

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <Header />
      <StatsCards eventos={eventosFiltrados} />
      <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />
      <Charts eventos={eventosFiltrados} />
      <EventsTable eventos={eventosFiltrados} />
      <ExportPDF eventos={eventosFiltrados} />
    </div>
  );
}
