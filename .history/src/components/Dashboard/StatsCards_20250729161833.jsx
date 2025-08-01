import React from 'react';

export default function StatsCards() {
  const stats = [
    { title: 'Evento más recurrente', value: 'Puerta Mantenida Abierta' },
    { title: 'Ubicación con más eventos', value: 'Edificio Guemes' },
    { title: 'Evento crítico', value: 'Falla de Red' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-gray-600">{stat.title}</p>
          <h3 className="text-xl font-bold">{stat.value}</h3>
        </div>
      ))}
    </div>
  );
}