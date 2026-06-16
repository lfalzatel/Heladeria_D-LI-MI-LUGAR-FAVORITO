import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Wallet, Layers, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useExpenseCategoriesStore } from '../stores/useExpenseCategoriesStore';

export interface ExpenseData {
  amount: number;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  description: string;
  paymentMethod?: 'Efectivo' | 'Transferencia';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (expense: ExpenseData) => Promise<void>;
  onOpenCategoryManager: () => void;
}

export function ExpenseModal({ isOpen, onClose, onConfirm, onOpenCategoryManager }: Props) {
  const { categories } = useExpenseCategoriesStore();
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setDescription('');
      setPaymentMethod('Efectivo');
      setSaving(false);
    }
  }, [isOpen, categories]);

  const handleConfirm = async () => {
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || !categoryId) return;
    
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    setSaving(true);
    try {
      await onConfirm({
        amount: amt,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryEmoji: cat.emoji,
        description: description.trim(),
        paymentMethod
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 pt-5 pb-4 border-b border-outline/10 flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-red-100 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-base text-red-900">Registrar Gasto</h3>
                  <p className="text-[10px] text-red-600/70 font-bold uppercase tracking-widest">Gasto Operativo</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm border border-red-100"><X className="w-4 h-4 text-red-900" /></button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Monto */}
              <div>
                <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1.5">Monto ($)</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-black">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="w-full h-14 bg-surface-container rounded-2xl pl-8 pr-4 text-xl font-black text-on-surface outline-none focus:border focus:border-red-300 focus:bg-red-50/30 transition-all"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Categoría</p>
                  <button onClick={onOpenCategoryManager} className="text-[10px] font-black text-primary hover:underline">Gestionar</button>
                </div>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full h-14 bg-surface-container rounded-2xl px-4 text-sm font-bold text-on-surface outline-none appearance-none cursor-pointer focus:border focus:border-red-300"
                  >
                    {categories.length === 0 ? (
                      <option value="">(Sin categorías)</option>
                    ) : (
                      categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1.5">Descripción (Opcional)</p>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ej: Papel aluminio D1..."
                  rows={2}
                  className="w-full bg-surface-container rounded-2xl p-4 text-sm font-bold text-on-surface outline-none focus:border focus:border-red-300 resize-none"
                />
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1.5">Método de Pago</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setPaymentMethod('Efectivo')}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${paymentMethod === 'Efectivo' ? 'bg-red-600 text-white shadow-md' : 'bg-surface-container text-on-surface hover:bg-outline/10'}`}
                  >
                    Efectivo
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('Transferencia')}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${paymentMethod === 'Transferencia' ? 'bg-red-600 text-white shadow-md' : 'bg-surface-container text-on-surface hover:bg-outline/10'}`}
                  >
                    Transf.
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-outline/10 bg-surface-container/50">
              <button 
                onClick={handleConfirm} 
                disabled={saving || !amount || !categoryId}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 disabled:opacity-40 hover:bg-red-700 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Guardando...' : 'Registrar Gasto'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
