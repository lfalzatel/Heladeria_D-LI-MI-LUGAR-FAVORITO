import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Package, Ghost } from 'lucide-react';
import { Supply } from '../types';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface SupplyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyToEdit?: Supply | null;
  existingCategories?: string[];
  onSave: (data: Partial<Supply>) => Promise<void>;
}

const CATEGORIES = ['Lácteos', 'Frutas', 'Toppings', 'Insumos Venta', 'Helados base', 'Acompañamientos', 'Desechables', 'Limpieza', 'Galletas'];
const UNITS = ['kg', 'g', 'Litro', 'mL', 'Unidad', 'Paquete', 'Caja', 'Pouch', 'Bloque', 'Rollo', 'Lata', 'Tarro'];

export default function SupplyFormModal({ isOpen, onClose, supplyToEdit, existingCategories = [], onSave }: SupplyFormModalProps) {
  const mergedCategories = Array.from(new Set([...CATEGORIES, ...existingCategories]));
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(mergedCategories[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [minLimit, setMinLimit] = useState<number>(5);
  const [minLimitUnit, setMinLimitUnit] = useState<string>('base');
  const [currentStock, setCurrentStock] = useState<number | string>(0);
  const [portionsPerUnit, setPortionsPerUnit] = useState<number>(1);
  const [yieldMini, setYieldMini] = useState<number | ''>('');
  const [yieldSmall, setYieldSmall] = useState<number | ''>('');
  const [yieldMedium, setYieldMedium] = useState<number | ''>('');
  const [yieldLarge, setYieldLarge] = useState<number | ''>('');
  const [yieldDetails, setYieldDetails] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualPrice, setVirtualPrice] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      if (supplyToEdit) {
        setName(supplyToEdit.name);
        const editCat = supplyToEdit.category || mergedCategories[0];
        if (mergedCategories.includes(editCat)) {
          setCategory(editCat);
          setIsCustomCategory(false);
          setCustomCategory('');
        } else {
          setCategory('NEW_CATEGORY');
          setIsCustomCategory(true);
          setCustomCategory(editCat);
        }
        // Fallback for custom units not in dropdown
        let initialUnit = supplyToEdit.unit || supplyToEdit.purchaseUnit || UNITS[0];
        if (initialUnit.toLowerCase() === 'kilo') initialUnit = 'kg';
        if (initialUnit.toLowerCase() === 'und') initialUnit = 'Unidad';
        
        setUnit(initialUnit);
        
        const ppu = supplyToEdit.portionsPerUnit || supplyToEdit.yieldPerUnit || 1;
        setPortionsPerUnit(ppu);

        const loadedMinLimitUnit = supplyToEdit.minLimitUnit || 'base';
        setMinLimitUnit(loadedMinLimitUnit);
        
        const loadedMinLimit = supplyToEdit.minLimit ?? supplyToEdit.stockMinimum ?? 5;
        setMinLimit(loadedMinLimitUnit === 'internal' ? loadedMinLimit * ppu : loadedMinLimit);
        
        setCurrentStock(supplyToEdit.currentStock ?? supplyToEdit.stockQuantity ?? 0);
        setYieldMini(supplyToEdit.yieldPerSize?.mini || '');
        setYieldSmall(supplyToEdit.yieldPerSize?.small || '');
        setYieldMedium(supplyToEdit.yieldPerSize?.medium || '');
        setYieldLarge(supplyToEdit.yieldPerSize?.large || '');
        setYieldDetails(supplyToEdit.yieldDetails || '');
        setIsVirtual(supplyToEdit.isVirtual || false);
        setVirtualPrice(supplyToEdit.lastPurchasePrice || '');
      } else {
        setName('');
        setCategory(mergedCategories[0]);
        setIsCustomCategory(false);
        setCustomCategory('');
        setUnit(UNITS[0]);
        setMinLimit(5);
        setCurrentStock(0);
        setPortionsPerUnit(1);
        setYieldMini('');
        setYieldSmall('');
        setYieldMedium('');
        setYieldLarge('');
        setYieldDetails('');
        setIsVirtual(false);
        setVirtualPrice('');
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
      const finalMinLimit = minLimit;

      const data: Partial<Supply> = {
        name: name.trim(),
        category: finalCategory,
        unit, // we are mapping this to the UI
        minLimit: finalMinLimit,
        minLimitUnit,
        currentStock: currentStock === '' ? 0 : Number(currentStock),
        portionsPerUnit: 1,
        yieldPerUnit: 1, // compatibility
        yieldPerSize: {
          mini: null,
          small: null,
          medium: null,
          large: null,
        },
        yieldDetails: '',
        isVirtual,
        // Fallbacks for older structure compatibility
        stockMinimum: finalMinLimit,
        stockQuantity: currentStock === '' ? 0 : Number(currentStock),
        purchaseUnit: unit,
      };

      if (virtualPrice !== '') {
        data.lastPurchasePrice = Number(virtualPrice);
      }

      await onSave(data);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999
      });
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
                {mergedCategories.map(c => (
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

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-secondary"> Unidad de Compra *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface appearance-none"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>



            <div className="grid grid-cols-2 gap-4 items-end">
               <div className="flex flex-col gap-2">
                 <label className="text-[11px] font-black uppercase tracking-widest text-secondary" title="Alerta naranja cuando llegue a este número"> Límite Crítico *</label>
                 <input
                   type="number"
                   required
                   min={0}
                   step="any"
                   value={minLimit}
                   onChange={(e) => setMinLimit(Number(e.target.value))}
                   className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface"
                 />
               </div>
               {['Paquete', 'Caja', 'Pouch', 'Rollo', 'Bolsa', 'Lata'].includes(unit) ? (
                 <div className="flex flex-col gap-2">
                   {/* Empty label to match height of Límite Crítico label */}
                   <label className="text-[11px] font-black uppercase tracking-widest text-transparent select-none hidden sm:block">&nbsp;</label>
                   <select
                     value={minLimitUnit}
                     onChange={(e) => setMinLimitUnit(e.target.value)}
                     className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary text-sm font-bold text-secondary"
                   >
                     <option value="base">{unit}s</option>
                     <option value="internal">Unidades</option>
                   </select>
                 </div>
               ) : (
                 <div className="hidden sm:block"></div>
               )}
            </div>

            {!isVirtual && (
              <div className="flex flex-col gap-2 bg-primary/5 p-4 rounded-3xl border border-primary/20">
                 <label className="text-[11px] font-black uppercase tracking-widest text-primary"> Ajuste Manual de Stock</label>
                 <input
                   type="number"
                   required
                   min={0}
                   step="any"
                   value={currentStock}
                   onChange={(e) => setCurrentStock(e.target.value)}
                   className="w-full px-4 h-14 bg-white rounded-xl border border-outline/20 outline-none focus:ring-2 focus:ring-primary transition-all font-black text-lg text-primary"
                 />
                 <p className="text-xs text-primary/70 mt-1">
                   Actualmente hay registro de <strong className="font-black">{currentStock} {unit}</strong> en tienda. Usa las Compras diarias para sumar inventario o corrígelo gratis aquí si hay un desfase en conteo.
                 </p>
              </div>
            )}

            {/* VIRTUAL SUPPLY TOGGLE */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsVirtual(v => !v)}
                className={`w-full flex items-center gap-4 p-4 rounded-3xl border-2 transition-all ${
                  isVirtual
                    ? 'bg-amber-50 border-amber-400 text-amber-700'
                    : 'bg-surface-container border-outline/10 text-on-surface/50'
                }`}
              >
                <Ghost className={`w-6 h-6 shrink-0 transition-colors ${ isVirtual ? 'text-amber-500' : 'text-on-surface/30' }`} />
                <div className="text-left">
                  <p className={`text-sm font-black ${ isVirtual ? 'text-amber-700' : 'text-on-surface/50' }`}>
                    {isVirtual ? '👻 Insumo Virtual Activado' : 'Marcar como Insumo Virtual'}
                  </p>
                  <p className={`text-[10px] leading-snug ${ isVirtual ? 'text-amber-600' : 'text-on-surface/30' }`}>
                    {isVirtual
                      ? 'Este insumo es solo organizativo (ej. "Salsa", "Fruta"). No se descontará del inventario en ninguna venta.'
                      : 'Activa si este insumo es solo una etiqueta organizativa en recetas y no existe físicamente.'}
                  </p>
                </div>
                <div className={`ml-auto w-12 h-6 rounded-full transition-all shrink-0 ${ isVirtual ? 'bg-amber-400' : 'bg-outline/20' }`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${ isVirtual ? 'translate-x-6' : 'translate-x-0' }`} />
                </div>
              </button>

              <div className={`flex flex-col gap-2 p-4 rounded-3xl border ${isVirtual ? 'bg-amber-50 border-amber-200' : 'bg-surface-container border-outline/10'}`}>
                <label className={`text-[11px] font-black uppercase tracking-widest ${isVirtual ? 'text-amber-700' : 'text-primary'}`}>
                  {isVirtual ? `Costo Estándar por ${unit} (Referencia)` : `Costo Promedio Histórico por ${unit}`}
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Ej. 77000"
                  value={virtualPrice}
                  onChange={(e) => setVirtualPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full px-4 h-14 bg-white rounded-xl border outline-none focus:ring-2 transition-all font-black text-lg ${isVirtual ? 'border-amber-200 focus:ring-amber-500 text-amber-700' : 'border-outline/10 focus:ring-primary text-on-surface'}`}
                />
                <p className={`text-[10px] mt-1 font-bold ${isVirtual ? 'text-amber-700/80' : 'text-secondary'}`}>
                  {isVirtual 
                    ? `Ingresa el precio promedio de 1 ${unit} de este insumo. Este valor se usará para calcular el costo en las recetas, ya que los insumos virtuales no se compran directamente.`
                    : `Este costo se actualiza automáticamente al registrar compras. Si cambiaste la unidad (ej. de Litro a mL), puedes corregir este costo y el stock manualmente. Actualmente equivale a $${virtualPrice} por 1 ${unit}.`}
                </p>
              </div>
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
