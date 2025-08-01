import React from 'react';

export default function EventsTable() {
  const eventos = [
    { cliente: 'TGS', evento: 'Puerta Mantenida Abierta', ubicacion: 'Guemes', fecha: '01/08/2025' },
    { cliente: 'Edificio', evento: 'Falla de Red', ubicacion: 'Av. Rivadavia', fecha: '02/08/2025' }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-bold mb-2">Registro de Eventos</h3>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Cliente</th>
            <th className="border-b p-2">Evento</th>
            <th className="border-b p-2">Ubicación</th>
            <th className="border-b p-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e, idx) => (
            <tr key={idx}>
              <td className="border-b p-2">{e.cliente}</td>
              <td className="border-b p-2">{e.evento}</td>
              <td className="border-b p-2">{e.ubicacion}</td>
              <td className="border-b p-2">{e.fecha}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}