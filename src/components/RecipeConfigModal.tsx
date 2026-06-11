import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Save, Database, Search, Calculator, Info, Minus } from 'lucide-react';
import { Product, RecipeIngredient, Supply } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface RecipeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  supplies: Supply[];
  onSave: (productId: string, recipe: RecipeIngredient[], variantLabel?: string) => Promise<void>;
}

export default function RecipeConfigModal({ isOpen, onClose, product, supplies, onSave }: RecipeConfigModalProps) {
  const [activeVariant, setActiveVariant] = useState<string | 'base'>('base');
  const [currentRecipe, setCurrentRecipe] = useState<RecipeIngredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const loadedVariantRef = useRef<string | null>(null);

  // Cargar receta cuando cambia el producto o la variante activa
  useEffect(() => {
    if (product && isOpen && loadedVariantRef.current !== activeVariant) {
      loadedVariantRef.current = activeVariant;
      const sizeHelper = (prodName: string, varLabel: string) => {
        const name = (prodName + ' ' + varLabel).toLowerCase();
        if (name.includes('mini')) return 'mini';
        if (name.includes('pequeñ') || name.includes('sencill')) return 'small';
        if (name.includes('grand') || name.includes('triple')) return 'large';
        return 'medium';
      };

      const syncWithSupplyYield = (recipeToLoad: RecipeIngredient[], varLabel: string) => {
        const size = sizeHelper(product.name, varLabel);
        return recipeToLoad.map(ing => {
            const supply = supplies.find(s => s.id === ing.supplyId);
            if (supply?.yieldPerSize && supply.yieldPerSize[size]) {
                return { ...ing, quantity: supply.yieldPerSize[size] };
            }
            return ing;
        });
      };

      if (activeVariant === 'base') {
        setCurrentRecipe(product.recipe || []);
      } else {
        const variant = product.variants?.find(v => v.label === activeVariant);
        if ((!variant?.recipe || variant.recipe.length === 0) && product.recipe && product.recipe.length > 0) {
          setCurrentRecipe(syncWithSupplyYield([...product.recipe], activeVariant));
          toast.info(`Cargada receta base para ${activeVariant}`);
        } else {
          setCurrentRecipe(variant?.recipe || []);
        }
      }
    }
    
    // Si se cierra el modal, reseteamos la referencia para que al volver a abrir se cargue
    if (!isOpen) {
      loadedVariantRef.current = null;
    }
  }, [product, activeVariant, isOpen, supplies]);

  if (!isOpen || !product) return null;

  const filteredSupplies = supplies
    .filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aInRecipe = currentRecipe.some(i => i.supplyId === a.id);
      const bInRecipe = currentRecipe.some(i => i.supplyId === b.id);
      if (aInRecipe && !bInRecipe) return -1;
      if (!aInRecipe && bInRecipe) return 1;
      return a.name.localeCompare(b.name);
    });

  const toggleIngredient = (supply: Supply) => {
    const exists = currentRecipe.find(i => i.supplyId === supply.id);
    if (exists) {
      setCurrentRecipe(currentRecipe.filter(i => i.supplyId !== supply.id));
    } else {
      const sizeHelper = (prodName: string, varLabel: string) => {
        const name = (prodName + ' ' + varLabel).toLowerCase();
        if (name.includes('mini')) return 'mini';
        if (name.includes('pequeñ') || name.includes('sencill')) return 'small';
        if (name.includes('grand') || name.includes('triple')) return 'large';
        return 'medium';
      };
      const size = sizeHelper(product.name, activeVariant);
      const defaultQty = (supply.yieldPerSize && supply.yieldPerSize[size]) ? supply.yieldPerSize[size] : 1;

      const newIngredient: RecipeIngredient = {
        supplyId: supply.id,
        name: supply.name,
        quantity: defaultQty,
        unit: supply.unit
      };
      setCurrentRecipe([...currentRecipe, newIngredient]);
    }
  };

  const updateQuantity = (supplyId: string, delta: number) => {
    setCurrentRecipe(currentRecipe.map(i => {
      if (i.supplyId === supplyId) {
        const newQty = Math.max(0.1, (Number(i.quantity) || 0) + delta);
        return { ...i, quantity: Number(newQty.toFixed(2)) };
      }
      return i;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(
        product.id, 
        currentRecipe, 
        activeVariant === 'base' ? undefined : activeVariant
      );
      toast.success('Receta guardada correctamente');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999
      });
      onClose(); // Cerrar el modal después de guardar exitosamente
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la receta');
    } finally {
      setIsSaving(false);
    }
  };

  const estimatedCost = currentRecipe.reduce((acc, ing) => {
    const supply = supplies.find(s => s.id === ing.supplyId);
    if (!supply || !supply.lastPurchasePrice || !supply.yieldPerUnit) return acc;
    const costPerPortion = supply.lastPurchasePrice / supply.yieldPerUnit;
    return acc + (costPerPortion * (Number(ing.quantity) || 0));
  }, 0);

  let activePrice = product.price || 0;
  if (product.variants && product.variants.length > 0) {
    if (activeVariant !== 'base') {
      const v = product.variants.find(v => v.label === activeVariant);
      if (v?.price) activePrice = v.price;
    } else {
      const minPrice = Math.min(...product.variants.map(v => v.price || 0));
      activePrice = product.basePrice || (minPrice !== Infinity ? minPrice : 0);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] sm:max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-outline/10 bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-on-surface leading-tight">Configurar Receta</h2>
              <p className="text-[10px] text-secondary font-black uppercase tracking-widest">
                {product.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <X className="w-5 h-5 text-on-surface" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 hide-scrollbar">
          
          {/* Selector de Variantes */}
          {product.variants && product.variants.length > 0 && (
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60">Selecciona para qué variante:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveVariant('base')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                    activeVariant === 'base' ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white text-secondary border-outline/20"
                  )}
                >
                  General
                </button>
                {product.variants.map(v => (
                  <button
                    key={v.label}
                    onClick={() => setActiveVariant(v.label)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                      activeVariant === v.label ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white text-secondary border-outline/20"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Descripción del Producto */}
          {product.description && (
            <div className="bg-surface-container/50 p-4 rounded-2xl border border-outline/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 mb-1">Descripción / Receta Sugerida:</p>
              <p className="text-xs text-on-surface font-medium whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Buscador y Resumen de Costo */}
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
              <input
                type="text"
                placeholder="Buscar insumo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-11 bg-surface-container/50 rounded-2xl border-none text-xs font-medium focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 bg-surface-container/30 border border-outline/10 p-3 rounded-2xl flex flex-col items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60">Precio de Venta</p>
                <p className="text-xl font-black text-on-surface">{formatCurrency(activePrice)}</p>
              </div>
              <div className="bg-surface-container/30 border border-outline/10 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-secondary opacity-60 mb-1">Costo Producción</p>
                <p className="text-lg font-black text-orange-600">{formatCurrency(estimatedCost, true)}</p>
              </div>
              <div className="bg-surface-container/30 border border-outline/10 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-secondary opacity-60 mb-1">Ganancia</p>
                <div className="flex flex-col items-center">
                  <p className="text-lg font-black text-emerald-600 leading-none">
                    {formatCurrency(activePrice - estimatedCost, true)}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600/80 mt-1">
                    Margen: {activePrice > 0 ? (((activePrice - estimatedCost) / activePrice) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Listado Único de Insumos */}
            <div className="flex flex-col gap-2">
              {filteredSupplies.map(supply => {
                const ingredient = currentRecipe.find(i => i.supplyId === supply.id);
                const isInRecipe = !!ingredient;

                return (
                  <motion.div 
                    layout
                    key={supply.id}
                    className={cn(
                      "p-3 rounded-2xl border transition-all flex",
                      isInRecipe 
                        ? "flex-col gap-3 items-start bg-emerald-50 border-emerald-200 shadow-sm" 
                        : "flex-row items-center justify-between bg-white border-outline/10"
                    )}
                  >
                    <div className="w-full flex-1 min-w-0 pr-2">
                      <p className={cn("font-bold text-xs leading-tight mb-1", isInRecipe ? "text-emerald-700" : "text-on-surface")}>
                        {supply.name}
                      </p>
                      <p className="text-[9px] text-secondary font-black uppercase tracking-tighter opacity-50">
                        {supply.category} • {supply.portionsPerUnit || 1} {supply.consumptionUnit || 'por.'}
                      </p>
                    </div>

                    <div className={cn("flex items-center gap-2", isInRecipe && "w-full justify-end")}>
                      {isInRecipe ? (
                        <div className="flex items-center bg-white rounded-xl p-0.5 border border-primary/20 shadow-sm">
                          <button
                            onClick={() => updateQuantity(supply.id, -0.5)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-secondary hover:text-red-500 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center justify-center gap-1 min-w-[64px] px-1">
                            <input
                              type="number"
                              step="any"
                              value={ingredient.quantity}
                              onChange={(e) => {
                                setCurrentRecipe(currentRecipe.map(i => i.supplyId === supply.id ? { ...i, quantity: e.target.value as any } : i));
                              }}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (!e.target.value || isNaN(val) || val < 0) {
                                  setCurrentRecipe(currentRecipe.map(i => i.supplyId === supply.id ? { ...i, quantity: 0.1 } : i));
                                } else {
                                  setCurrentRecipe(currentRecipe.map(i => i.supplyId === supply.id ? { ...i, quantity: Number(val.toFixed(4)) } : i));
                                }
                              }}
                              className="w-16 text-center font-black text-sm text-primary bg-transparent outline-none focus:bg-primary/5 rounded py-0.5"
                            />
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{supply.unit}</span>
                          </div>
                          <button
                            onClick={() => updateQuantity(supply.id, 0.5)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-50 text-secondary hover:text-emerald-500 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-4 bg-outline/10 mx-1" />
                          <button
                            onClick={() => toggleIngredient(supply)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleIngredient(supply)}
                          className="w-10 h-10 rounded-xl bg-surface-container text-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-outline/10 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl font-bold text-sm text-secondary hover:bg-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || currentRecipe.length === 0}
            className="flex-[2] h-12 bg-on-surface text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-black/10"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Receta</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
