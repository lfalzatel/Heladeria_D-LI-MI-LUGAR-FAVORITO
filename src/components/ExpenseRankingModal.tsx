import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Banknote, ListMinus } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

// ── SHARED MODAL WRAPPER (from ReportsModals) ──
function ModalWrapper({ isOpen, onClose, children }: {
  isOpen: boolean; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full sm:max-w-sm bg-white rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] max-h-[90vh] overflow-hidden"
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-10 h-1 bg-outline/30 rounded-full" />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ModalHeader({ icon, iconBg, title, subtitle, onClose }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string; onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm', iconBg)}>
          {icon}
        </div>
        <div>
          <h3 className="font-headline font-black text-xl text-on-surface leading-tight">{title}</h3>
          <p className="text-[9px] font-black text-secondary uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-all active:scale-90 mt-1"
      >
        <X className="w-4 h-4 text-secondary" />
      </button>
    </div>
  );
}

function ModalFooter({ label = 'CERRAR', onClick }: { label?: string; onClick: () => void }) {
  return (
    <div className="px-6 py-4 border-t border-outline/10 flex-shrink-0 rounded-b-[2.5rem] bg-white">
      <button
        onClick={onClick}
        className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-secondary hover:text-on-surface transition-colors"
      >
        {label}
      </button>
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filter: string;
  ranking: { name: string; emoji: string; amount: number; percentage: number }[];
}

export function ExpenseRankingModal({ isOpen, onClose, filter, ranking }: Props) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        icon={<ListMinus className="w-6 h-6 text-red-600" />}
        iconBg="bg-red-50"
        title="Gastos por Categoría"
        subtitle={`TOP CATEGORÍAS • ${filter.toUpperCase()}`}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {ranking.length === 0 ? (
          <div className="py-16 flex flex-col items-center opacity-30">
            <Banknote className="w-12 h-12 mb-3" />
            <p className="text-xs font-bold uppercase tracking-widest">Sin gastos registrados</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-1 px-3 pb-2">
              <p className="col-span-8 text-[8px] font-black text-secondary uppercase">Categoría</p>
              <p className="col-span-4 text-[8px] font-black text-secondary uppercase text-right">Monto</p>
            </div>
            <div className="flex flex-col gap-1 pb-2">
              {ranking.map((item, i) => (
                <div key={item.name} className={cn(
                  'relative overflow-hidden grid grid-cols-12 gap-1 items-center p-3 rounded-2xl border',
                  i === 0 ? 'bg-red-50/50 border-red-100' : 'bg-surface-container-lowest border-outline/5'
                )}>
                  {/* Background progress bar */}
                  <div 
                    className={cn(
                      "absolute inset-y-0 left-0 opacity-10",
                      i === 0 ? "bg-red-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.max(item.percentage, 2)}%` }}
                  />
                  
                  <div className="col-span-8 flex items-center gap-2 relative z-10">
                    <span className="text-lg">{item.emoji}</span>
                    <p className={cn(
                      "text-xs font-bold truncate",
                      i === 0 ? "text-red-900" : "text-on-surface"
                    )}>
                      {item.name}
                    </p>
                  </div>
                  <div className="col-span-4 relative z-10 text-right flex flex-col">
                    <p className={cn(
                      "text-sm font-black",
                      i === 0 ? "text-red-600" : "text-on-surface"
                    )}>
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="text-[9px] font-bold text-secondary">{item.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <ModalFooter onClick={onClose} />
    </ModalWrapper>
  );
}
