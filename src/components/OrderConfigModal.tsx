import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check, IceCream, Droplets, Plus } from 'lucide-react';
import { Product, ProductVariant, CartItem } from '../types';
import { useFlavorsStore } from '../stores/useFlavorsStore';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';

const SALSAS = ['Chocolate', 'Mora', 'Arequipe', 'Fresa', 'Leche Condensada', 'Miel'];

interface OrderConfigModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  initialItem?: CartItem | null;
}

// Frutas por defecto (salpicón, ensalada genérica, etc.)
const FRUTAS_DEFAULT = ['Banano', 'Fresa', 'Mango', 'Papaya', 'Uva', 'Kiwi'];

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function OrderConfigModal({ product, isOpen, onClose, onAdd, initialItem }: OrderConfigModalProps) {
  const { availableFlavors: allFlavors } = useFlavorsStore();
  const [step, setStep] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedFrutas, setSelectedFrutas] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedAdditions, setSelectedAdditions] = useState<{name: string, price: number}[]>([]);
  const [availableAdditions, setAvailableAdditions] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  
  // Dynamic step calculation
  const steps: string[] = [];
  // Only show variant step if there are 2+ variants to choose from
  if (product.variants && product.variants.length > 1) steps.push('variants');
  // For Oblea Tradicional, fruit choice comes first (only for hasFruit variant)
  if (product.requiresFruitChoice) steps.push('fruits');
  // Flavors: only show if product requires it (and for Oblea Cuchareable, only when hasIceCream variant)
  if (product.requiresFlavors) steps.push('flavors');
  // Sauces: only for helados and copas
  if (product.requiresSauces) steps.push('sauces');
  // Additions step
  steps.push('additions');
  
  const totalSteps = steps.length;
  const currentStepType = steps[step - 1];

  // For Oblea Cuchareable: skip flavors step when "Sin Helado" variant selected
  const effectiveSteps = steps.filter(s => {
    if (s === 'flavors') {
      // Skip if the selected variant explicitly has no ice cream
      if (selectedVariant?.hasIceCream === false) return false;
    }
    if (s === 'fruits') {
      // For Oblea Tradicional, skip if the variant has no fruit
      if (selectedVariant?.hasFruit === false) return false;
    }
    return true;
  });
  const effectiveTotalSteps = effectiveSteps.length;
  const effectiveCurrentStepType = effectiveSteps[step - 1];

  // Max scoops: reads from selected variant, then label, then product-level
  const getMaxScoops = () => {
    if (selectedVariant?.scoops !== undefined) return selectedVariant.scoops;
    
    const label = (selectedVariant?.label || '').toLowerCase();
    if (label.includes('triple')) return 3;
    if (label.includes('doble')) return 2;
    if (label.includes('sencill')) return 1;
    
    return product.scoops || (product.requiresFlavors ? 1 : 0);
  };
  const maxScoops = getMaxScoops();

  // Fruit options: use product.fruitOptions if defined, otherwise defaults
  const fruitOptions = product.fruitOptions && product.fruitOptions.length > 0
    ? product.fruitOptions
    : FRUTAS_DEFAULT;

  // Fetch additions
  useEffect(() => {
    const fetchAdditions = async () => {
      try {
        const q = query(collection(db, 'products'), where('category', '==', 'adiciones'), where('isActive', '==', true));
        const snap = await getDocs(q);
        const adds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAvailableAdditions(adds);
      } catch (err) {
        console.error("Error fetching additions:", err);
      }
    };
    fetchAdditions();
  }, []);

  // Reset or pre-fill state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        const variant = product.variants?.find(v => 
          v.label.toLowerCase().trim() === (initialItem.variantLabel || '').toLowerCase().trim()
        ) || product.variants?.[0] || null;
        
        setSelectedVariant(variant);
        setSelectedFlavors(initialItem.flavors || []);
        setSelectedFrutas(initialItem.fruitChoices || []);
        // Parse sauces from additions
        const sauceAdditions = (initialItem.additions || []).filter(a => SALSAS.includes(a));
        setSelectedSauces(sauceAdditions);
        
        // Parse actual additions (ignoring sauces for simplicity in this reconstruction)
        const otherAdds = (initialItem.additions || []).filter(a => !SALSAS.includes(a));
        // We'd need prices here... for now just names
        setSelectedAdditions(otherAdds.map(name => ({name, price: 0})));

        setQuantity(initialItem.quantity);
        setStep(1);
      } else {
        setStep(1);
        // Auto-select if only 1 variant
        setSelectedVariant(product.variants?.length === 1 ? product.variants[0] : null);
        setSelectedFlavors([]);
        setSelectedFrutas([]);
        setSelectedSauces([]);
        setSelectedAdditions([]);
        setQuantity(1);
      }
    }
  }, [isOpen, initialItem, product.variants, product.requiresFlavors]);

  // When variant changes, reset dependent selections
  useEffect(() => {
    if (selectedVariant) {
      // Reset flavors if scoops changed
      setSelectedFlavors([]);
    }
  }, [selectedVariant?.label]);

  const handleNext = () => {
    // Validation for current step
    if (effectiveCurrentStepType === 'variants' && !selectedVariant) {
      toast.error('Selecciona una opción');
      return;
    }
    
    if (effectiveCurrentStepType === 'flavors' && selectedFlavors.length === 0) {
      toast.error('Selecciona al menos un sabor');
      return;
    }

    if (effectiveCurrentStepType === 'fruits' && selectedFrutas.length === 0) {
      // Fruits are optional for some products (like salpicón selection already determined by variant)
      // Only enforce for obleas
      if (product.category === 'obleas') {
        toast.error('Selecciona una fruta');
        return;
      }
    }

    if (step < effectiveTotalSteps) {
      setStep(step + 1);
    } else {
      // Build cart item
      const variantLabel = selectedVariant?.label || '';
      const additionPrices = selectedAdditions.reduce((sum, a) => sum + a.price, 0);
      const unitPrice = (selectedVariant?.price || product.basePrice || 0) + additionPrices;
      
      // Combine additions names
      const allAdditionsNames = [
        ...selectedSauces,
        ...selectedAdditions.map(a => a.name)
      ];

      const configParts = [
        variantLabel,
        selectedFlavors.join(', '),
        selectedFrutas.length > 0 ? `Fruta: ${selectedFrutas.join(', ')}` : '',
        allAdditionsNames.length > 0 ? `Extras: ${allAdditionsNames.join(', ')}` : '',
      ].filter(Boolean);

      onAdd({
        id: initialItem?.id || Math.random().toString(36).substr(2, 9),
        productId: product.id,
        productName: product.name,
        variantLabel,
        description: configParts.join(' | '),
        flavors: selectedFlavors,
        fruitChoices: selectedFrutas,
        additions: allAdditionsNames,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      });
      onClose();
    }
  };

  const toggleFlavor = (flavor: string) => {
    if (selectedFlavors.includes(flavor)) {
      setSelectedFlavors(selectedFlavors.filter(f => f !== flavor));
    } else if (selectedFlavors.length < maxScoops) {
      setSelectedFlavors([...selectedFlavors, flavor]);
    } else {
      toast.info(`Solo puedes elegir ${maxScoops} ${maxScoops === 1 ? 'sabor' : 'sabores'}`);
    }
  };

  const toggleSauce = (sauce: string) => {
    if (selectedSauces.includes(sauce)) {
      setSelectedSauces(selectedSauces.filter(s => s !== sauce));
    } else {
      setSelectedSauces([...selectedSauces, sauce]);
    }
  };

  const toggleFruta = (fruta: string) => {
    if (selectedFrutas.includes(fruta)) {
      setSelectedFrutas(selectedFrutas.filter(f => f !== fruta));
    } else {
      setSelectedFrutas([...selectedFrutas, fruta]);
    }
  };

  const toggleAddition = (add: Product) => {
    const addPrice = add.variants?.[0]?.price || 0;
    setSelectedAdditions(prev => {
      const exists = prev.find(a => a.name === add.name);
      if (exists) return prev.filter(a => a.name !== add.name);
      return [...prev, { name: add.name, price: addPrice }];
    });
  };

  const getStepTitle = () => {
    switch (effectiveCurrentStepType) {
      case 'variants': return 'Presentación';
      case 'flavors': return `Selecciona ${maxScoops === 1 ? 'el Sabor' : 'los Sabores'}`;
      case 'fruits': return 'Elige la Fruta';
      case 'sauces': return 'Salsas (Opcional)';
      case 'additions': return 'Adiciones';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-surface flex flex-col h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl border border-white/20"
          >
            {/* ── SECCIÓN SUPERIOR: HERO IMAGE + OVERLAY ── */}
            <div className="relative h-[25%] sm:h-[28%] flex-shrink-0 bg-surface-container-low group">
               {product.imageUrl ? (
                 <img 
                   src={product.imageUrl} 
                   alt={product.name} 
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                 />
               ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-container opacity-20">
                     <IceCream className="w-16 h-16 text-primary" />
                  </div>
               )}
               
               {/* Overlay Gradiente Premium */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

               {/* Información sobre la Imagen */}
               <div className="absolute bottom-4 left-6 right-6">
                 <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex flex-col gap-0.5"
                 >
                   <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/90 text-white text-[8px] font-black uppercase tracking-[0.2em] w-fit shadow-lg backdrop-blur-md">
                     {product.category}
                   </span>
                   <h2 className="font-brand font-black text-2xl sm:text-3xl text-white leading-tight drop-shadow-2xl">
                     {product.name}
                   </h2>
                 </motion.div>
               </div>

               {/* Botón Cerrar Flotante */}
               <button 
                 onClick={onClose}
                 className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/40 transition-all shadow-lg active:scale-90 border border-white/30"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* ── SECCIÓN CENTRAL: CONFIGURACIÓN (SCROLLABLE) ── */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar bg-surface-container-lowest/30">
              


              <div className="mb-6">
                <div className="flex justify-between items-end mb-3 px-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mb-0.5">Paso {step} de {effectiveTotalSteps}</span>
                    <h3 className="font-bold text-on-surface text-lg sm:text-xl">{getStepTitle()}</h3>
                  </div>
                  {effectiveCurrentStepType === 'flavors' && (
                    <div className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black ring-1 transition-all shadow-sm",
                      selectedFlavors.length === maxScoops 
                      ? "bg-success/10 text-success ring-success/20" 
                      : "bg-primary text-white ring-primary shadow-primary/20"
                    )}>
                      {selectedFlavors.length} / {maxScoops}
                    </div>
                  )}
                </div>
                
                {/* Progress Bar Minimalista */}
                <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / effectiveTotalSteps) * 100}%` }}
                    className="h-full bg-gradient-to-r from-primary to-primary-container shadow-[0_0_8px_rgba(233,30_140,0.4)]"
                  />
                </div>
              </div>

              {/* CONTENIDO SEGÚN EL PASO */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={effectiveCurrentStepType}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {effectiveCurrentStepType === 'variants' && (
                    <div className="grid grid-cols-1 gap-2.5">
                      {product.variants?.map(variant => (
                        <button
                          key={variant.label}
                          onClick={() => setSelectedVariant(variant)}
                          className={cn(
                            "relative flex items-center justify-between p-4 rounded-[1.5rem] transition-all border-2 text-left group",
                            selectedVariant?.label === variant.label
                              ? "bg-primary/5 border-primary shadow-sm scale-[1.01]"
                              : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                          )}
                        >
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                               selectedVariant?.label === variant.label ? "bg-primary text-white rotate-3" : "bg-surface-container text-secondary"
                             )}>
                               <IceCream className="w-6 h-6" />
                             </div>
                             <div>
                                <p className="font-black text-base tracking-tight">{variant.label}</p>
                                {variant.scoops && <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">{variant.scoops} {variant.scoops === 1 ? 'bola' : 'bolas'}</p>}
                             </div>
                          </div>
                          <div className="text-right pr-1">
                            <p className="font-brand font-black text-xl text-primary">{formatCurrency(variant.price)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'flavors' && (
                    <div className="flex flex-wrap gap-2">
                      {allFlavors.filter(f => f.isAvailable).map(flavor => (
                        <button
                          key={flavor.id}
                          onClick={() => toggleFlavor(flavor.name)}
                          className={cn(
                            "relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border-2 group flex-grow sm:flex-grow-0 justify-center",
                            selectedFlavors.includes(flavor.name)
                              ? "bg-primary border-primary text-white shadow-md scale-[1.02] z-10"
                              : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                          )}
                        >
                          <IceCream className={cn("w-4 h-4 transition-transform group-hover:scale-110 shrink-0", selectedFlavors.includes(flavor.name) ? "text-white" : "text-primary")} />
                          <span className="text-[11px] font-black leading-none">{flavor.name}</span>
                          {selectedFlavors.includes(flavor.name) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 text-primary stroke-[4]" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'fruits' && (
                    <div className="flex flex-wrap gap-2">
                      {fruitOptions.map(fruta => (
                        <button
                          key={fruta}
                          onClick={() => toggleFruta(fruta)}
                          className={cn(
                            "relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border-2 flex-grow sm:flex-grow-0 justify-center group",
                            selectedFrutas.includes(fruta)
                              ? "bg-success border-success text-white shadow-md scale-[1.02] z-10"
                              : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                          )}
                        >
                          <span className="text-sm">
                            {fruta === 'Fresa' ? '🍓' : fruta === 'Mango' ? '🥭' : fruta === 'Durazno' ? '🍑' : fruta === 'Mixta' ? '🍇' : '🍍'}
                          </span>
                          <span className="text-[11px] font-black leading-none">{fruta}</span>
                          {selectedFrutas.includes(fruta) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 text-success stroke-[4]" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'sauces' && (
                    <div className="flex flex-wrap gap-2">
                      {SALSAS.map(sauce => (
                        <button
                          key={sauce}
                          onClick={() => toggleSauce(sauce)}
                          className={cn(
                            "relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border-2 flex-grow sm:flex-grow-0 justify-center",
                            selectedSauces.includes(sauce)
                              ? "bg-primary border-primary text-white shadow-md scale-[1.02] z-10"
                              : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                          )}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", selectedSauces.includes(sauce) ? "bg-white" : "bg-primary")} />
                          <span className="text-[11px] font-black leading-none">{sauce}</span>
                          {selectedSauces.includes(sauce) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 text-primary stroke-[4]" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'additions' && (
                    <div className="grid grid-cols-2 gap-2">
                      {availableAdditions.map(add => {
                        const price = add.variants?.[0]?.price || 0;
                        const shortName = add.name.replace(/^(Adición|Adicion)\s+/i, '');
                        return (
                        <button
                          key={add.id}
                          onClick={() => toggleAddition(add)}
                          className={cn(
                            "relative flex items-center p-2.5 rounded-2xl transition-all border-2 gap-3",
                            selectedAdditions.find(a => a.name === add.name)
                              ? "bg-success/10 border-success shadow-sm"
                              : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                            selectedAdditions.find(a => a.name === add.name) ? "bg-success text-white scale-110" : "bg-surface-container text-secondary"
                          )}>
                             <Plus className="w-4 h-4" />
                          </div>
                          <div className="flex-1 text-left leading-tight">
                            <p className="font-black text-xs tracking-tight line-clamp-2">{shortName}</p>
                            <p className={cn("text-[10px] font-black mt-0.5", selectedAdditions.find(a => a.name === add.name) ? "text-success" : "text-primary")}>
                              +{formatCurrency(price)}
                            </p>
                          </div>
                        </button>
                      )})}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── FOOTER: BOTONES DE ACCIÓN (MÁS COMPACTO) ── */}
            <footer className="p-5 sm:p-6 bg-surface border-t border-outline/10 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4 bg-surface-container/50 p-1.5 rounded-2xl border border-outline/5">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-white text-on-surface hover:bg-surface-container-high transition-all active:scale-90 border border-outline/10 shadow-sm"
                  >
                    <span className="text-xl font-bold leading-none">−</span>
                  </button>
                  <span className="text-2xl font-brand font-black text-primary w-6 text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary text-white hover:bg-primary-container transition-all active:scale-90 shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-black text-secondary uppercase tracking-[0.2em] block mb-0.5">Precio Total</span>
                  <p className="text-2xl font-brand font-black text-on-surface leading-tight">
                    {formatCurrency(((selectedVariant?.price || product.basePrice || 0) + selectedAdditions.reduce((s, a) => s + a.price, 0)) * quantity)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                {step > 1 && (
                  <button 
                    onClick={() => setStep(step - 1)}
                    className="w-14 h-14 flex shrink-0 items-center justify-center rounded-2xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-all active:scale-90 border border-outline/10"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[3]" />
                  </button>
                )}
                
                <button 
                  onClick={handleNext}
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  
                  {step < effectiveTotalSteps ? (
                    <>
                      <span className="relative z-10 font-brand tracking-widest uppercase text-xs">Siguiente Paso</span>
                      <ChevronRight className="w-5 h-5 stroke-[3] relative z-10" />
                    </>
                  ) : (
                    <>
                      <Check className="w-6 h-6 stroke-[4] relative z-10" /> 
                      <span className="relative z-10 font-brand tracking-widest uppercase text-xs">
                        {initialItem ? 'Actualizar Pedido' : 'Confirmar y Agregar'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
