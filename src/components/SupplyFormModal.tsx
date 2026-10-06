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

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
          <form id="supply-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            
            {/* Fila 1: Nombre del Insumo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary"> Nombre del Insumo *</label>
              <input
                type="text"
                required
                placeholder="Ej. Vasos 7 Onzas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 h-11 bg-surface-container rounded-xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface text-sm"
              />
            </div>
            
            {/* Fila 2: Categoría + Unidad de Compra (2 Columnas) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary"> Categoría *</label>
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
                  className="w-full px-3 h-11 bg-surface-container rounded-xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface text-sm appearance-none"
                >
                  {mergedCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="NEW_CATEGORY">+ Nueva categoría...</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary"> Unidad de Compra *</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 h-11 bg-surface-container rounded-xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface text-sm appearance-none"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {isCustomCategory && (
              <div className="flex flex-col gap-1.5 -mt-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary"> Nombre de la Nueva Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Bases, Galletas..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3.5 h-11 bg-primary/5 rounded-xl border border-primary/20 outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-primary text-sm"
                />
              </div>
            )}

            {/* Fila 3: Límite Crítico + Stock Actual (2 Columnas) */}
            <div className="grid grid-cols-2 gap-3 items-start">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary" title="Alerta naranja cuando llegue a este número">
                    Límite Crítico *
                  </label>
                  {['Paquete', 'Caja', 'Pouch', 'Rollo', 'Bolsa', 'Lata'].includes(unit) && (
                    <select
                      value={minLimitUnit}
                      onChange={(e) => setMinLimitUnit(e.target.value)}
                      className="bg-surface-container px-1 py-0.5 rounded-lg text-[9px] font-bold text-secondary outline-none border border-outline/10"
                    >
                      <option value="base">{unit}s</option>
                      <option value="internal">Unds</option>
                    </select>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={minLimit}
                  onChange={(e) => setMinLimit(Number(e.target.value))}
                  className="w-full px-3.5 h-11 bg-surface-container rounded-xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface text-sm"
                />
              </div>

              {!isVirtual ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Stock Actual ({unit}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full px-3.5 h-11 bg-primary/5 rounded-xl border border-primary/20 outline-none focus:ring-2 focus:ring-primary transition-all font-black text-sm text-primary"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 justify-center h-full pt-4">
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-2 rounded-xl border border-amber-200 text-center">
                    Insumo virtual (sin stock)
                  </span>
                </div>
              )}
            </div>

            {!isVirtual && (
              <p className="text-[10px] text-secondary/70 -mt-1 font-medium">
                Hay registro de <strong className="font-bold text-primary">{currentStock} {unit}</strong> en tienda. Usa Compras para sumar inventario o corrígelo aquí si hay desfase.
              </p>
            )}

            {/* VIRTUAL SUPPLY TOGGLE */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsVirtual(v => !v)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                  isVirtual
                    ? 'bg-amber-50 border-amber-400 text-amber-700'
                    : 'bg-surface-container border-outline/10 text-on-surface/50'
                }`}
              >
                <Ghost className={`w-5 h-5 shrink-0 transition-colors ${ isVirtual ? 'text-amber-500' : 'text-on-surface/30' }`} />
                <div className="text-left flex-1 min-w-0">
                  <p className={`text-xs font-black ${ isVirtual ? 'text-amber-700' : 'text-on-surface/60' }`}>
                    {isVirtual ? '👻 Insumo Virtual Activado' : 'Marcar como Insumo Virtual'}
                  </p>
                  <p className={`text-[9px] leading-snug line-clamp-1 ${ isVirtual ? 'text-amber-600' : 'text-on-surface/40' }`}>
                    {isVirtual
                      ? 'Insumo organizativo (ej. Salsa, Fruta). No descuenta stock en ventas.'
                      : 'Activa si es solo una etiqueta organizativa en recetas y no existe físicamente.'}
                  </p>
                </div>
                <div className={`ml-auto w-10 h-5 rounded-full transition-all shrink-0 ${ isVirtual ? 'bg-amber-400' : 'bg-outline/20' }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${ isVirtual ? 'translate-x-5' : 'translate-x-0' }`} />
                </div>
              </button>

              <div className={`flex flex-col gap-1.5 p-3.5 rounded-2xl border ${isVirtual ? 'bg-amber-50 border-amber-200' : 'bg-surface-container border-outline/10'}`}>
                <label className={`text-[10px] font-black uppercase tracking-widest ${isVirtual ? 'text-amber-700' : 'text-primary'}`}>
                  {isVirtual ? `Costo Estándar por ${unit} (Referencia)` : `Costo Promedio Histórico por ${unit}`}
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Ej. 77000"
                  value={virtualPrice}
                  onChange={(e) => setVirtualPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full px-3.5 h-11 bg-white rounded-xl border outline-none focus:ring-2 transition-all font-black text-sm ${isVirtual ? 'border-amber-200 focus:ring-amber-500 text-amber-700' : 'border-outline/10 focus:ring-primary text-on-surface'}`}
                />
                <p className={`text-[9px] font-bold ${isVirtual ? 'text-amber-700/80' : 'text-secondary/70'}`}>
                  {isVirtual 
                    ? `Precio promedio de 1 ${unit} para costear recetas sin compras directas.`
                    : `Se actualiza con compras. Actualmente equivale a $${virtualPrice} por 1 ${unit}.`}
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
