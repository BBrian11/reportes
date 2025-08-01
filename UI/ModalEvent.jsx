import React from 'react';

export default function ModalEvent({ isOpen, onClose, event }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 md:w-2/3">
        <h2 className="text-xl font-bold mb-4">Detalle del Evento</h2>
        {event ? (
          <>
            <p><strong>Cliente:</strong> {event.cliente}</p>
            <p><strong>Evento:</strong> {event.evento}</p>
            <p><strong>Ubicación:</strong> {event.ubicacion}</p>
            <p><strong>Fecha:</strong> {event.fecha}</p>
            <p><strong>Observación:</strong> {event.observacion || 'Sin observación'}</p>
          </>
        ) : (
          <p>No hay datos disponibles</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}