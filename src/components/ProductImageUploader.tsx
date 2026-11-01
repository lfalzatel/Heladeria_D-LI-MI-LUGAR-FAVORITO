import React, { useState, useRef } from 'react';
import { compressImage } from '../utils/imageCompressor';

// El catálogo se descarga completo (también desde el QR de las mesas): cada foto debe quedar liviana
const MAX_IMAGE_CHARS = 120_000;

export function ProductImageUploader({ 
  currentUrl, 
  onUpload 
}: { 
  currentUrl: string, 
  onUpload: (url: string) => void 
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      // Se guarda como texto (Base64) dentro del producto: no requiere Firebase Storage (plan de pago)
      let dataUrl = await compressImage(file, 600, 600, 0.6);
      if (dataUrl.length > MAX_IMAGE_CHARS) {
        dataUrl = await compressImage(file, 480, 480, 0.5);
      }

      onUpload(dataUrl);
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert("Error al subir la imagen. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Imagen actual o placeholder */}
      <div 
        onClick={() => fileRef.current?.click()}
        className="relative w-full h-48 rounded-2xl overflow-hidden cursor-pointer"
      >
        {currentUrl 
          ? <img src={currentUrl} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-surface-container flex items-center justify-center">
              <span className="text-secondary text-sm">Toca para agregar imagen</span>
            </div>
        }
        {/* Overlay de editar */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
          {uploading ? 'Subiendo...' : '📷 Cambiar'}
        </div>
      </div>

      {/* Input oculto — acepta cámara y galería en móvil */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"  // ← abre cámara directamente en móvil
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
