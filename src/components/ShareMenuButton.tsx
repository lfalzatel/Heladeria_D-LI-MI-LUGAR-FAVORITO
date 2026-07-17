import React, { useState, useRef, useEffect } from 'react';
import { Share2, FileText, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Botón "Compartir Menú" — D'LI Boutique
 *
 * SETUP:
 * 1. Copia `carta-dli.pdf` a /public/carta-dli.pdf
 * 2. Copia `QR_Heladería_D_Li.png` a /public/qr-dli.png
 * 3. Importa y usa <ShareMenuButton /> en el header
 */
export default function ShareMenuButton() {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState<'pdf' | 'qr' | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Cerrar al tocar fuera del modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  /**
   * Función principal de compartir
   * Descarga el archivo desde /public/, lo convierte a File y usa navigator.share()
   * Si no hay soporte, hace descarga directa como fallback
   */
  const handleShare = async (type: 'pdf' | 'qr') => {
    setSharing(type);
    setOpen(false);

    const config = {
      pdf: {
        url: '/carta-dli.pdf',
        filename: 'Carta_DLI.pdf',
        mimeType: 'application/pdf',
        title: "Carta D'LI — Mi Lugar Favorito",
        text: '🍦 Mira nuestra carta completa con todos los productos y precios de D\'LI Boutique',
      },
      qr: {
        url: '/qr-dli.png',
        filename: 'QR_DLI.png',
        mimeType: 'image/png',
        title: "Código QR — D'LI Boutique",
        text: '📱 Escanea este QR para ver la carta completa de D\'LI Boutique',
      },
    }[type];

    try {
      // Descargar el archivo desde /public/
      const response = await fetch(config.url);
      if (!response.ok) throw new Error(`Archivo no encontrado: ${config.url}`);
      const blob = await response.blob();
      const file = new File([blob], config.filename, { type: config.mimeType });

      // Intentar Web Share API (nativa del móvil)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: config.title,
          text: config.text,
        });
        toast.success('¡Compartido exitosamente!');
      } else {
        // Fallback: descarga directa
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = config.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.info('Comprobante descargado — ya puedes enviarlo por tus aplicaciones.');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return; // El usuario simplemente canceló
      }
      console.error('Error al compartir:', error);
      toast.error('No se pudo compartir el archivo.');
    } finally {
      setSharing(null);
    }
  };

  return (
    <div className="relative">
      {/* Botón principal */}
      <button
        onClick={() => setOpen(!open)}
        disabled={sharing !== null}
        className="
          flex items-center gap-1.5 p-2 rounded-full
          hover:bg-surface-container active:scale-95
          text-secondary hover:text-primary
          transition-all duration-150
          disabled:opacity-50 disabled:cursor-wait
        "
        title="Compartir menú o QR"
        aria-label="Compartir menú"
      >
        {sharing ? (
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        ) : (
          <Share2 className="w-5 h-5" />
        )}
      </button>

      {/* Mini modal de opciones */}
      {open && (
        <>
          {/* Overlay semitransparente */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            ref={modalRef}
            className="
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
              sm:absolute sm:left-auto sm:right-0 sm:top-full sm:translate-x-0 sm:translate-y-0 sm:mt-3
              w-[90%] max-w-[300px] sm:w-64 bg-white dark:bg-surface-container-lowest rounded-3xl
              shadow-2xl border border-outline/10
              overflow-hidden
            "
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-outline/10">
              <div className="text-left">
                <p className="font-headline font-black text-xs text-on-surface uppercase tracking-wider">Compartir Carta</p>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-0.5">Elige qué deseas enviar</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Opciones */}
            <div className="p-2 space-y-1">

              {/* Opción PDF */}
              <button
                onClick={() => handleShare('pdf')}
                className="
                  w-full flex items-center gap-3 px-3 py-3 rounded-2xl
                  hover:bg-surface-container active:scale-[0.98]
                  transition-all duration-100 text-left group
                "
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-xs text-on-surface">Menú completo (PDF)</p>
                  <p className="text-[9px] text-secondary font-medium leading-normal mt-0.5">
                    Todas las páginas del catálogo en PDF
                  </p>
                </div>
              </button>

              {/* Opción QR */}
              <button
                onClick={() => handleShare('qr')}
                className="
                  w-full flex items-center gap-3 px-3 py-3 rounded-2xl
                  hover:bg-surface-container active:scale-[0.98]
                  transition-all duration-100 text-left group
                "
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <QrCode className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-xs text-on-surface">Código QR Imagen</p>
                  <p className="text-[9px] text-secondary font-medium leading-normal mt-0.5">
                    Para que lo escaneen y vean la carta
                  </p>
                </div>
              </button>
            </div>

            {/* Pie del modal */}
            <div className="px-4 py-2.5 bg-surface-container-low/50 border-t border-outline/10 text-center">
              <p className="text-[8px] font-bold text-secondary/70 uppercase tracking-widest leading-normal">
                Se abrirá tu menú de compartir móvil
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
