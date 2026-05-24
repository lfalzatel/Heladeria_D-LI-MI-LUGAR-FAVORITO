import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Share2, Download } from 'lucide-react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'pdf' | 'excel' | 'image' | null;
  previewUrl: string | null;
  onDownload: () => void;
  onShare: () => void;
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  type,
  previewUrl,
  onDownload,
  onShare
}: ReportPreviewModalProps) {
  const typeLabels = {
    pdf: 'FORMATO PDF',
    excel: 'FORMATO EXCEL',
    image: 'IMAGEN JPG'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 bg-primary text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Vista Previa</h3>
                  <p className="text-xs font-bold tracking-wider text-white/70 uppercase">
                    {type ? typeLabels[type] : 'REPORTE'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Area */}
            <div className="bg-surface p-4 sm:p-6 flex-1 flex flex-col items-center">
              <div className="w-full bg-white rounded-2xl p-2 shadow-sm border border-outline/20 min-h-[300px] flex items-center justify-center overflow-hidden relative">
                {previewUrl || type === 'excel' ? (
                   type === 'excel' ? (
                     <div className="flex flex-col items-center justify-center text-secondary gap-4">
                       <FileText className="w-16 h-16 text-emerald-500" />
                       <p className="text-sm font-bold text-center">Archivo Excel preparado<br/>(No hay vista previa visual)</p>
                     </div>
                   ) : (
                     <img src={previewUrl!} alt="Preview" className="w-full max-h-[50vh] object-contain rounded-xl" />
                   )
                ) : (
                  <div className="animate-pulse flex flex-col items-center justify-center text-secondary">
                    <div className="w-12 h-12 rounded-full border-4 border-outline/20 border-t-primary animate-spin mb-4" />
                    <p className="text-sm font-bold">Generando vista previa...</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={onShare}
                  disabled={!previewUrl && type !== 'excel'}
                  className="w-full bg-white text-primary border-2 border-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Share2 className="w-5 h-5" />
                  Compartir
                </button>
                <button
                  onClick={onDownload}
                  disabled={!previewUrl && type !== 'excel'}
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
                >
                  <Download className="w-5 h-5" />
                  Descargar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
