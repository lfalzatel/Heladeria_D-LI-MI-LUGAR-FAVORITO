import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Supply } from '../components/PurchaseModals';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplies: Supply[];
  onConfirm: (supplyId: string, quantity: number, note: string) => Promise<void>;
}

export function WasteModal({ isOpen, onClose, supplies, onConfirm }: Props) {
  const [supplyId, setSupplyId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const reset = () => { setSupplyId(''); setQuantity(''); setNote(''); setSaving(false); setSearchTerm(''); setIsDropdownOpen(false); };
  const handleClose = () => { reset(); onClose(); };

  const selectedSupply = supplies.find(s => s.id === supplyId);

  const handleConfirm = async () => {
    if (!supplyId || !quantity || quantity <= 0 || !note) return;
    setSaving(true);
    try { 
      await onConfirm(supplyId, Number(quantity), note); 
      reset(); 
      onClose(); 
    }
    finally { setSaving(false); }
  };

  // Sort supplies alphabetically
  const sortedSupplies = [...supplies].sort((a, b) => a.name.localeCompare(b.name));
  const filteredSupplies = sortedSupplies.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col"
          >

            <div className="px-6 pt-5 pb-4 border-b border-outline/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-500" /></div>
                <div>
                  <h3 className="font-black text-base text-on-surface">Registrar Merma</h3>
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Insumos dañados o perdidos</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-all"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="relative">
                <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1.5">Insumo</p>
                <div 
                  className={cn("w-full h-11 bg-surface-container rounded-2xl border px-4 flex items-center justify-between cursor-pointer transition-all", isDropdownOpen ? "border-red-500" : "border-outline/20")}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className={cn("font-bold text-sm truncate", !selectedSupply && "text-secondary/50")}>
                    {selectedSupply ? `${selectedSupply.name} (${selectedSupply.unit})` : 'Seleccionar insumo...'}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-secondary/50 transition-transform", isDropdownOpen && "rotate-180")} />
                </div>
                
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-outline/10 shadow-xl z-[210] max-h-60 flex flex-col overflow-hidden"
                    >
                      <div className="p-2 border-b border-outline/10">
                        <input
                          type="text"
                          placeholder="Buscar insumo..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full bg-surface-container/50 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                        {filteredSupplies.length === 0 ? (
                          <p className="p-3 text-xs text-center text-secondary font-bold">No se encontraron insumos</p>
                        ) : (
                          filteredSupplies.map(s => (
                            <button
                              key={s.id}
                              onClick={() => { setSupplyId(s.id); setIsDropdownOpen(false); setSearchTerm(''); }}
                              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm font-bold text-on-surface hover:text-red-600 transition-colors flex items-center justify-between"
                            >
                              <span className="truncate">{s.name}</span>
                              <span className="text-[10px] text-secondary ml-2 flex-shrink-0">{s.unit}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedSupply && (
                <div>
                  <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1.5">Cantidad a descontar</p>
                  <div className="flex items-center bg-surface-container rounded-xl px-3 h-11 border border-outline/20 focus-within:border-red-500 transition-all">
                    <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value) || '')} placeholder="Ej: 0.2" className="flex-1 bg-transparent text-sm font-black outline-none w-full" />
                    <span className="text-secondary text-xs ml-1 font-bold">{selectedSupply.unit}</span>
                  </div>
                  <p className="text-[10px] text-secondary mt-1 font-bold">Stock actual: {selectedSupply.currentStock} {selectedSupply.unit}</p>
                </div>
              )}

              <div>
                <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1.5">Motivo / Nota</p>
                <textarea 
                  value={note} 
                  onChange={e => setNote(e.target.value)} 
                  placeholder="Ej: Se dañaron por falta de refrigeración" 
                  className="w-full bg-surface-container rounded-2xl border border-outline/20 p-4 font-bold text-sm focus:border-red-500 outline-none transition-all resize-none h-24"
                />
              </div>

            </div>

            <div className="px-6 py-4 border-t border-outline/10 bg-white rounded-b-[2.5rem]">
              <button onClick={handleConfirm} disabled={saving || !supplyId || !quantity || !note}
                className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-red-600 active:scale-[0.98] transition-all shadow-lg shadow-red-500/30">
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Registrando...' : 'Confirmar Merma'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
