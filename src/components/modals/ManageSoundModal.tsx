import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Volume2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { stopCurrentAudio } from '../../lib/soundEffects';

export interface SoundModalOption {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  isDefault?: boolean;
  playFn: () => void;
}

interface ManageSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  options: SoundModalOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function ManageSoundModal({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  selectedId,
  onSelect
}: ManageSoundModalProps) {
  if (!isOpen) return null;

  const handleSelectOption = (opt: SoundModalOption) => {
    // 1. Detener inmediatamente cualquier audio en reproducción activa (sin solapamiento)
    stopCurrentAudio();
    // 2. Notificar cambio de opción
    onSelect(opt.id);
    // 3. Reproducir la muestra sonora seleccionada
    try {
      opt.playFn();
    } catch (e) {
      console.warn('Error al probar sonido:', e);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 border border-outline/10 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline/10 pb-4 mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Volume2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-headline font-black text-lg text-on-surface leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-secondary mt-0.5">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl hover:bg-surface-container transition-all active:scale-95 text-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Options Checklist */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {options.map((opt) => {
              const isSelected = selectedId === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(opt)}
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all duration-200 active:scale-[0.98] shadow-xs",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-outline/15 hover:border-primary/40 bg-surface-container-lowest hover:bg-surface-container-low"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline/10 flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
                      {opt.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-on-surface truncate">
                          {opt.name}
                        </span>
                        {opt.isDefault && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                            Por defecto
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-secondary mt-0.5 truncate">
                        {opt.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-outline/30" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-outline/10 mt-4 flex justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              Guardar y Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
