import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Tag, Layers } from 'lucide-react';
import { useExpenseCategoriesStore } from '../stores/useExpenseCategoriesStore';

export function ExpenseCategoryManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { categories, addCategory, deleteCategory } = useExpenseCategoriesStore();
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🛒');
  const [isAdding, setIsAdding] = useState(false);

  const EMOJI_LIST = ['🛒', '🧹', '⚡', '💧', '🔧', '📦', '🍔', '🚌', '📝', '🏥', '🏦', '🎨', '💼'];

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    setIsAdding(true);
    await addCategory(newCatName.trim(), newCatEmoji);
    setNewCatName('');
    setNewCatEmoji('🛒');
    setIsAdding(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="px-6 pt-5 pb-4 border-b border-outline/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-base text-on-surface">Categorías de Gastos</h3>
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Añade o elimina etiquetas</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 border-b border-outline/5 bg-surface-container/30">
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase text-secondary tracking-widest">Nueva Categoría</p>
                <div className="flex gap-2">
                  <select 
                    value={newCatEmoji} 
                    onChange={e => setNewCatEmoji(e.target.value)}
                    className="h-12 w-16 bg-white border border-outline/20 rounded-2xl text-xl text-center focus:border-primary outline-none"
                  >
                    {EMOJI_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Ej: Aseo, Servicios..."
                    className="flex-1 h-12 bg-white border border-outline/20 rounded-2xl px-4 text-sm font-bold focus:border-primary outline-none"
                  />
                  <button onClick={handleAdd} disabled={!newCatName.trim() || isAdding}
                    className="h-12 w-12 shrink-0 bg-primary text-white rounded-2xl flex items-center justify-center disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {categories.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-secondary" />
                  <p className="text-xs font-bold">No hay categorías</p>
                </div>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-outline/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 bg-surface-container flex items-center justify-center rounded-xl text-lg">{cat.emoji}</span>
                      <span className="font-black text-sm">{cat.name}</span>
                    </div>
                    <button onClick={() => deleteCategory(cat.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
