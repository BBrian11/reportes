import React from 'react';

export default function Filters() {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4 flex flex-wrap gap-2">
      <select className="border p-2 rounded w-full md:w-auto">
        <option>Cliente</option>
      </select>
      <select className="border p-2 rounded w-full md:w-auto">
        <option>Evento</option>
      </select>
      <select className="border p-2 rounded w-full md:w-auto">
        <option>Ubicación</option>
      </select>
      <input type="date" className="border p-2 rounded w-full md:w-auto" />
      <input type="date" className="border p-2 rounded w-full md:w-auto" />
    </div>
  );
}