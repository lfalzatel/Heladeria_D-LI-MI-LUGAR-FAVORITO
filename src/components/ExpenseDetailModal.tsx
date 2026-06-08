import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useState } from 'react';

export interface GastoRecord {
  id: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  description: string;
  dateObj: Date;
  userName: string;
  createdAt: any;
}

interface Props {
  gasto: GastoRecord | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function ExpenseDetailModal({ gasto, onClose, onDelete }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <AnimatePresence>
      {gasto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 pt-5 pb-4 border-b border-outline/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-red-100 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-base text-red-900">Detalle de Gasto</h3>
                  <p className="text-[10px] text-red-600/70 font-bold uppercase tracking-widest">
                    {gasto.dateObj.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} · {gasto.dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onDelete && (
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
                        setIsDeleting(true);
                        onDelete(gasto.id);
                      }
                    }} 
                    disabled={isDeleting}
                    className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-all disabled:opacity-50"
                    title="Eliminar Gasto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-all"><X className="w-4 h-4 text-red-900" /></button>
              </div>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-surface-container/50 rounded-2xl p-5 flex flex-col gap-4 border border-outline/5">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-outline/10">
                    {gasto.categoryEmoji}
                  </span>
                  <div>
                    <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Categoría</p>
                    <p className="font-black text-lg text-on-surface leading-tight">{gasto.categoryName}</p>
                  </div>
                </div>

                {gasto.description && (
                  <div className="bg-white rounded-xl p-3 border border-outline/10">
                    <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">Descripción</p>
                    <p className="text-sm font-bold text-on-surface whitespace-pre-wrap">{gasto.description}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2 pt-4 border-t border-outline/10">
                  <div>
                    <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Registrado por</p>
                    <p className="font-bold text-sm text-on-surface capitalize">{gasto.userName || 'Usuario'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 bg-red-600">
              <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mb-1">Monto del Gasto</p>
              <p className="text-3xl font-black text-white">{formatCurrency(gasto.amount)}</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
