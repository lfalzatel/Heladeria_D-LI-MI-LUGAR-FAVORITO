import React, { useState, useRef } from 'react';

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
      // Comprimir antes de subir
      const compressed = await compressImage(file, 800);
      
      // Subir a Firebase Storage
      const { getStorage, ref, uploadBytes, getDownloadURL } = 
        await import('firebase/storage');
      const storage = getStorage();
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      
      onUpload(url);
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert("Error al subir la imagen. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  // Comprimir imagen antes de subir (evita gastar quota de Storage)
  const compressImage = (file: File, maxWidth: number): Promise<Blob> => {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(blob!), 'image/webp', 0.82);
      };
      img.src = URL.createObjectURL(file);
    });
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
