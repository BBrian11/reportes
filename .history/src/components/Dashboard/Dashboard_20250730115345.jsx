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
import "../../styles/dashboard.css";

export default function Dashboard() {
  const [eventos, setEventos] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente: "",
    evento: "",
    ubicacion: "",
    fechaInicio: "",
    fechaFin: "",
  });

  const handleSelectCliente = (cliente) => {
    setFiltros({ ...filtros, cliente: cliente === "Todos" ? "" : cliente });
  };

  return (
    <div className="dashboard-layout">
      <Sidebar onSelectCliente={handleSelectCliente} />
      <main className="dashboard-main">
        <Header />
        <div className="dashboard-content">
          <Filters filtros={filtros} setFiltros={setFiltros} eventos={eventos} />
          {!filtros.cliente && (
            <>
              <GlobalStats eventos={eventos} />
              <Charts eventos={eventos} />
            </>
          )}
          {filtros.cliente === "TGS" && <TgsStats eventos={eventos} />}
          {filtros.cliente === "Edificios" && <EdificioStats eventos={eventos} />}
          {filtros.cliente === "VTV" && <VtvStats eventos={eventos} />}
          <EventsTable eventos={eventos} />
        </div>
      </main>
    </div>
  );
}
