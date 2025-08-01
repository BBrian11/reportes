import React, { useEffect, useState } from 'react';
import Header from './Header.jsx';
import StatsCards from './StatsCards.jsx';
import Filters from './Filters.jsx';
import Charts from './Charts.jsx';
import EventsTable from './EventsTable.jsx';
import ExportPDF from './ExportPDF.jsx';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { db } from "../../services/firebase";


export default function Dashboard() {
  const db = getFirestore(app);
  const [eventos, setEventos] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente: '',
    evento: '',
    ubicacion: '',
    fechaInicio: '',
    fechaFin: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'novedades/edificios/eventos'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEventos(data);
    });
    return () => unsub();
  }, []);

  // Filtrar dinámicamente
  const eventosFiltrados = eventos.filter(e => {
    return (!filtros.cliente || e.cliente === filtros.cliente) &&
           (!filtros.evento || e.evento === filtros.evento) &&
           (!filtros.ubicacion || e.ubicacion === filtros.ubicacion);
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
