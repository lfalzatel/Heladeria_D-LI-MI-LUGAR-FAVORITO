import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Download, FileText, FileImage, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';

export type ExportFormat = 'pdf' | 'excel' | 'image' | null;

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: ExportFormat;
  previewUrl?: string | null;
  onDownload: () => void;
  onShare: () => void;
  isGenerating?: boolean;
}

export default function ExportPreviewModal({
  isOpen,
  onClose,
  format,
  previewUrl,
  onDownload,
  onShare,
  isGenerating = false,
}: ExportPreviewModalProps) {
  if (!isOpen) return null;

  const getFormatDetails = () => {
    switch (format) {
      case 'pdf': return { title: 'Reporte PDF', icon: <FileText className="w-12 h-12 text-red-500" />, color: 'bg-red-50 text-red-600' };
      case 'image': return { title: 'Reporte Imagen', icon: <FileImage className="w-12 h-12 text-blue-500" />, color: 'bg-blue-50 text-blue-600' };
      case 'excel': return { title: 'Reporte Excel', icon: <FileSpreadsheet className="w-12 h-12 text-green-500" />, color: 'bg-green-50 text-green-600' };
      default: return { title: 'Reporte', icon: <FileText className="w-12 h-12 text-gray-500" />, color: 'bg-gray-50 text-gray-600' };
    }
  };

  const details = getFormatDetails();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-outline/10 flex items-center justify-between">
              <h3 className="font-headline font-black text-xl text-on-surface flex items-center gap-2">
                Previsualización
              </h3>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col items-center justify-center bg-surface-container-lowest min-h-[250px]">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                  <p className="font-bold text-secondary text-sm">Generando reporte...</p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-4">
                  <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center shadow-inner", details.color)}>
                    {details.icon}
                  </div>
                  <h4 className="font-black text-lg text-on-surface">{details.title}</h4>
                  
                  {previewUrl && (format === 'image' || format === 'pdf') && (
                    <div className="w-full mt-4 max-h-64 overflow-auto rounded-xl border border-outline/10 shadow-sm bg-white p-2">
                      {format === 'image' ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-lg" />
                      ) : (
                        <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-64 rounded-lg" />
                      )}
                    </div>
                  )}

                  {!previewUrl && format === 'excel' && (
                    <p className="text-xs text-secondary text-center mt-2 px-4">
                      El formato Excel (.csv) contiene todos los datos tabulares listos para ser analizados en hojas de cálculo.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-surface-container-low flex gap-3">
              <button
                disabled={isGenerating}
                onClick={onShare}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-outline/50 text-on-surface font-black text-[11px] uppercase tracking-widestáshadow-sm hover:bg-surface-container transition-all disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
              <button
                disabled={isGenerating}
                onClick={onDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-widestáshadow-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
