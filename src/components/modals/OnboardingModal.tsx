import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, Sparkles, Volume2, ChevronRight, ChevronLeft, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { playUiSound } from '../../lib/soundEffects';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: <Mic className="w-10 h-10 text-primary animate-pulse" />,
    badge: 'Paso 1 de 3',
    title: '🎙️ Asistente de Voz por IA',
    subtitle: 'Controla tu heladería usando la voz sin presionar botones',
    description: 'Puedes dictar ventas, egresos de caja y pedidos de clientes de forma fluida. El asistente analiza tus palabras en tiempo real mediante Inteligencia Artificial.',
    examples: [
      '🗣️ "Gasto de 30 mil pesos en bolsas de azúcar"',
      '🗣️ "Cobrar 2 helados especiales de vainilla"'
    ]
  },
  {
    icon: <Zap className="w-10 h-10 text-amber-500" />,
    badge: 'Paso 2 de 3',
    title: '⚡ Comandos Rápidos e Inteligentes',
    subtitle: 'Navegación y consultas instantáneas en vivo',
    description: 'Accede a cualquier reporte o sección de la PWA pidiéndoselo directamente al asistente.',
    examples: [
      '🗣️ "Ver ventas totales de hoy"',
      '🗣️ "Buscar producto helado choco-berry"',
      '🗣️ "Abrir inventario de insumos"'
    ]
  },
  {
    icon: <Volume2 className="w-10 h-10 text-fuchsia-500" />,
    badge: 'Paso 3 de 3',
    title: '🔊 Confirmaciones Auditivas',
    subtitle: 'Voz hablada y efectos 3D retro para cada transacción',
    description: 'Cada vez que registres un movimiento, la PWA te confirmará verbalmente con voz hablada (Web Speech API) y disparará efectos sintetizados.',
    examples: [
      '📢 "Venta de 15 mil pesos registrada con éxito"',
      '✨ Ráfaga cristalina de partículas hacia el saldo'
    ]
  }
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[currentStep];

  const handleNext = () => {
    playUiSound('pop');
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    playUiSound('click');
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
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
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 border border-outline/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-2xl hover:bg-surface-container transition-all active:scale-95 text-secondary z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Step Badge */}
          <div className="flex justify-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary">
              {step.badge}
            </span>
          </div>

          {/* Step Icon */}
          <div className="w-20 h-20 mx-auto my-3 rounded-3xl bg-surface-container-low border border-outline/10 flex items-center justify-center shadow-inner">
            {step.icon}
          </div>

          {/* Step Content */}
          <div className="text-center space-y-2 mb-4">
            <h3 className="font-headline font-black text-xl text-on-surface">
              {step.title}
            </h3>
            <p className="text-xs font-bold text-primary">
              {step.subtitle}
            </p>
            <p className="text-xs text-secondary leading-relaxed px-2">
              {step.description}
            </p>
          </div>

          {/* Examples Container */}
          <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline/10 space-y-2 mb-6 text-left">
            <p className="text-[10px] font-black uppercase text-secondary tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Ejemplos de uso:
            </p>
            {step.examples.map((ex, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-outline/10 text-xs font-medium text-on-surface flex items-center gap-2">
                <span>{ex}</span>
              </div>
            ))}
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentStep ? "w-6 bg-primary" : "w-1.5 bg-outline/30"
                )}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="py-3 px-4 rounded-2xl border border-outline/20 hover:bg-surface-container text-secondary font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-98"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> ¡Entendido! Empezar
                </>
              ) : (
                <>
                  Siguiente <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
