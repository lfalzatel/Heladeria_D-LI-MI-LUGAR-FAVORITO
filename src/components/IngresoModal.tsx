import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Wallet, Trash2 } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { localDateStr, parseLocalDate } from '../utils/dates';

export const INGRESO_CATEGORIES = ['Salario', 'Pago', 'Mesada', 'Venta', 'Regalo', 'Otro'];

export interface Ingreso {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  dateObj?: Date;
}

/** Registrar, editar o eliminar un ingreso personal del cliente (colección `ingresos`) */
export default function IngresoModal({ userId, ingreso, onClose }: {
  userId: string;
  ingreso: Ingreso | null;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(ingreso?.description || '');
  const [amount, setAmount] = useState(ingreso ? String(ingreso.amount) : '');
  const [date, setDate] = useState(ingreso?.date ? localDateStr(parseLocalDate(ingreso.date)) : localDateStr());
  const [category, setCategory] = useState(ingreso?.category || 'Salario');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast.error('Ingresa un monto mayor a 0');
      return;
    }
    setSaving(true);
    try {
      const data = { description: description.trim() || category, amount: value, category, date };
      if (ingreso) {
        await updateDoc(doc(db, 'ingresos', ingreso.id), data);
      } else {
        await addDoc(collection(db, 'ingresos'), { ...data, userId, createdAt: serverTimestamp() });
      }
      toast.success(ingreso ? 'Ingreso actualizado' : 'Ingreso registrado');
      onClose();
    } catch (err: any) {
      console.error('Error guardando ingreso:', err);
      toast.error('No se pudo guardar el ingreso', { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!ingreso || !window.confirm('¿Eliminar este ingreso? Esta acción no se puede deshacer.')) return;
    try {
      await deleteDoc(doc(db, 'ingresos', ingreso.id));
      toast.success('Ingreso eliminado');
      onClose();
    } catch (err: any) {
      toast.error('No se pudo eliminar el ingreso');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 border border-outline/10 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-headline font-black text-xl text-on-surface">{ingreso ? 'Editar ingreso' : 'Registrar ingreso'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full text-secondary"><X className="w-5 h-5" /></button>
        </div>

        <form className="space-y-4" onSubmit={save}>
          <div>
            <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Monto</label>
            <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required autoFocus
              className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-lg font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-outline/10" />
          </div>
          <div>
            <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">¿De dónde viene?</label>
            <div className="flex flex-wrap gap-2">
              {INGRESO_CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                    category === cat ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-secondary border-outline/20')}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Descripción (opcional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Quincena, venta de ropa..." maxLength={80}
              className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-outline/10" />
          </div>
          <div>
            <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-outline/10" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm uppercase tracking-widest shadow-lg disabled:opacity-50">
            {saving ? 'Guardando...' : ingreso ? 'Guardar cambios' : 'Registrar ingreso'}
          </button>
          {ingreso && (
            <button type="button" onClick={remove}
              className="w-full py-3 rounded-2xl bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar ingreso
            </button>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
}
