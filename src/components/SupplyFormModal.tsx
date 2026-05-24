import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Package } from 'lucide-react';
import { Supply } from '../types';
import { toast } from 'sonner';

interface SupplyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyToEdit?: Supply | null;
  onSave: (data: Partial<Supply>) => Promise<void>;
}

const CATEGORIES = ['Lácteos', 'Frutas', 'Toppings', 'Insumos Venta', 'Helados base', 'Acompañamientos', 'Desechables', 'Limpieza'];
const UNITS = ['kg', 'Litro', 'und', 'Paquete', 'Caja', 'Pouch', 'Bloque', 'Rollo', 'Lata'];

export default function SupplyFormModal({ isOpen, onClose, supplyToEdit, onSave }: SupplyFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [minLimit, setMinLimit] = useState<number>(5);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [portionsPerUnit, setPortionsPerUnit] = useState<number>(1);
  const [yieldDetails, setYieldDetails] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (supplyToEdit) {
        setName(supplyToEdit.name);
        const editCat = supplyToEdit.category || CATEGORIES[0];
        if (CATEGORIES.includes(editCat)) {
          setCategory(editCat);
          setIsCustomCategory(false);
          setCustomCategory('');
        } else {
          setCategory('NEW_CATEGORY');
          setIsCustomCategory(true);
          setCustomCategory(editCat);
        }
        // Fallback for custom units not in dropdown
        if (UNITS.includes(supplyToEdit.unit || supplyToEdit.purchaseUnit)) {
          setUnit(supplyToEdit.unit || supplyToEdit.purchaseUnit);
        } else {
          setUnit(supplyToEdit.unit || supplyToEdit.purchaseUnit || UNITS[0]);
        }
        setMinLimit(supplyToEdit.minLimit ?? supplyToEdit.stockMinimum ?? 5);
        setCurrentStock(supplyToEdit.currentStock ?? supplyToEdit.stockQuantity ?? 0);
        setPortionsPerUnit(supplyToEdit.portionsPerUnit || supplyToEdit.yieldPerUnit || 1);
        setYieldDetails(supplyToEdit.yieldDetails || '');
      } else {
        setName('');
        setCategory(CATEGORIES[0]);
        setIsCustomCategory(false);
        setCustomCategory('');
        setUnit(UNITS[0]);
        setMinLimit(5);
        setCurrentStock(0);
        setPortionsPerUnit(1);
        setYieldDetails('');
      }
    }
  }, [isOpen, supplyToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('El insumo necesita un nombre');
    if (minLimit < 0) return toast.error('El límite mínimo no puede ser negativo');
    
    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (!finalCategory) return toast.error('La categoría es requerida');

    setLoading(true);
    try {
      const data: Partial<Supply> = {
        name: name.trim(),
        category: finalCategory,
        unit, // we are mapping this to the UI
        minLimit,
        currentStock,
        portionsPerUnit,
        yieldPerUnit: portionsPerUnit, // compatibility
        yieldDetails,
        // Fallbacks for older structure compatibility
        stockMinimum: minLimit,
        stockQuantity: currentStock,
        purchaseUnit: unit,
      };

      await onSave(data);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el insumo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ y: '100%', opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-outline/20 rounded-full" />
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-b border-outline/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-on-surface leading-tight">
                {supplyToEdit ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h2>
              <p className="text-[10px] text-secondary font-black uppercase tracking-widest">
                Catálogo Base
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <X className="w-5 h-5 text-on-surface" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
          <form id="supply-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-secondary"> Nombre del Insumo *</label>
              <input
                type="text"
                required
                placeholder="Ej. Vasos 7 Onzas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-secondary"> Categoría *</label>
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === 'NEW_CATEGORY') {
                    setCategory('NEW_CATEGORY');
                    setIsCustomCategory(true);
                  } else {
                    setCategory(e.target.value);
                    setIsCustomCategory(false);
                  }
                }}
                className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface appearance-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="NEW_CATEGORY">+ Nueva categoría...</option>
              </select>
            </div>

            {isCustomCategory && (
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-primary"> Nombre de la Nueva Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Bases, Galletas..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-4 h-14 bg-primary/5 rounded-2xl border border-primary/20 outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-primary"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-secondary"> Porciones x {unit || 'unidad'} *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={portionsPerUnit}
                  onChange={(e) => setPortionsPerUnit(Number(e.target.value))}
                  className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface"
                />
                <p className="text-[9px] text-secondary/60 font-bold px-1 italic">Para calcular costos.</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-secondary"> Detalle Rendimiento</label>
                <input
                  type="text"
                  placeholder="Ej: 6p P / 5p M"
                  value={yieldDetails}
                  onChange={(e) => setYieldDetails(e.target.value)}
                  className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-2">
                 <label className="text-[11px] font-black uppercase tracking-widest text-secondary"> Unidad *</label>
                 <select
                   value={unit}
                   onChange={(e) => setUnit(e.target.value)}
                   className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface appearance-none"
                 >
                   {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                 </select>
               </div>
               
               <div className="flex flex-col gap-2">
                 <label className="text-[11px] font-black uppercase tracking-widest text-secondary" title="Alerta naranja cuando llegue a este número"> Límite Crítico *</label>
                 <input
                   type="number"
                   required
                   min={0}
                   value={minLimit}
                   onChange={(e) => setMinLimit(Number(e.target.value))}
                   className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface"
                 />
               </div>
            </div>

            <div className="flex flex-col gap-2 bg-primary/5 p-4 rounded-3xl border border-primary/20">
               <label className="text-[11px] font-black uppercase tracking-widest text-primary"> Ajuste Manual de Stock</label>
               <input
                 type="number"
                 required
                 min={0}
                 step="0.1"
                 value={currentStock}
                 onChange={(e) => setCurrentStock(Number(e.target.value))}
                 className="w-full px-4 h-14 bg-white rounded-xl border border-outline/20 outline-none focus:ring-2 focus:ring-primary transition-all font-black text-lg text-primary"
               />
               <p className="text-xs text-primary/70 mt-1">
                 Actualmente hay registro de <strong className="font-black">{currentStock} {unit}</strong> en tienda. Usa las Compras diarias para sumar inventario o corrígelo gratis aquí si hay un desfase en conteo.
               </p>
            </div>
          </form>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-outline/10 rounded-b-[2.5rem]">
           <button
             type="submit"
             form="supply-form"
             disabled={loading}
             className="w-full h-14 bg-on-surface text-white rounded-2xl font-black uppercase space-x-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
           >
             {loading ? (
               <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
               <>
                 <Save className="w-5 h-5" />
                 <span>{supplyToEdit ? 'Guardar Cambios' : 'Registrar Insumo'}</span>
               </>
             )}
           </button>
        </div>
      </motion.div>
    </div>
  );
}
