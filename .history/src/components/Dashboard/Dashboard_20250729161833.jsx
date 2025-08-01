import React from 'react';
import Header from './Header.jsx';
import StatsCards from './StatsCards.jsx';
import Filters from './Filters.jsx';
import Charts from './Charts.jsx';
import EventsTable from './EventsTable.jsx';
import ExportPDF from './ExportPDF.jsx';

export default function Dashboard() {
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <Header />
      <StatsCards />
      <Filters />
      <Charts />
      <EventsTable />
      <ExportPDF />
    </div>
  );
}