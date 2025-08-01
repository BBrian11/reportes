import React, { useRef } from 'react';
import SignaturePad from 'signature_pad';

export default function SignatureModal({ isOpen, onClose, onSave }) {
  const canvasRef = useRef(null);
  let signaturePad;

  React.useEffect(() => {
    if (isOpen && canvasRef.current) {
      signaturePad = new SignaturePad(canvasRef.current);
    }
  }, [isOpen]);

  const handleClear = () => {
    signaturePad.clear();
  };

  const handleSave = () => {
    if (!signaturePad.isEmpty()) {
      const dataUrl = signaturePad.toDataURL();
      onSave(dataUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Firma Digital</h2>
        <canvas ref={canvasRef} className="border w-full h-40 mb-4"></canvas>
        <div className="flex justify-between">
          <button
            onClick={handleClear}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Limpiar
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}