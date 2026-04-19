import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check, IceCream, Droplets } from 'lucide-react';
import { Product, ProductVariant, CartItem } from '../types';
import { useFlavorsStore } from '../stores/useFlavorsStore';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';

interface OrderConfigModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  initialItem?: CartItem | null;
}

// Salsas disponibles para helados
const SALSAS = ["Arequipe", "Mora", "Chocolate", "Lecherita", "Maní", "Bolitas de Colores"];

// Frutas por defecto (salpicón, ensalada genérica, etc.)
const FRUTAS_DEFAULT = ['Banano', 'Fresa', 'Mango', 'Papaya', 'Uva', 'Kiwi'];

export default function OrderConfigModal({ product, isOpen, onClose, onAdd, initialItem }: OrderConfigModalProps) {
  const { availableFlavors: allFlavors } = useFlavorsStore();
  const [step, setStep] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedFrutas, setSelectedFrutas] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  
  // Dynamic step calculation
  const steps: string[] = [];
  if (product.variants && product.variants.length > 0) steps.push('variants');
  // For Oblea Tradicional, fruit choice comes first (only for hasFruit variant)
  if (product.requiresFruitChoice) steps.push('fruits');
  // Flavors: only show if product requires it (and for Oblea Cuchareable, only when hasIceCream variant)
  if (product.requiresFlavors) steps.push('flavors');
  // Sauces: only for helados and copas
  if (product.requiresSauces) steps.push('sauces');
  
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

  // Reset or pre-fill state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        const variant = product.variants?.find(v => 
          v.label.toLowerCase().trim() === (initialItem.variantLabel || '').toLowerCase().trim()
        ) || null;
        
        setSelectedVariant(variant);
        setSelectedFlavors(initialItem.flavors || []);
        setSelectedFrutas(initialItem.fruitChoices || []);
        // Parse sauces from additions
        const sauceAdditions = (initialItem.additions || []).filter(a => SALSAS.includes(a));
        setSelectedSauces(sauceAdditions);
        setQuantity(initialItem.quantity);
        setStep(1);
      } else {
        setStep(1);
        setSelectedVariant(null);
        setSelectedFlavors([]);
        setSelectedFrutas([]);
        setSelectedSauces([]);
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
    
    if (effectiveCurrentStepType === 'flavors' && selectedFlavors.length < maxScoops) {
      toast.error(`Selecciona ${maxScoops} ${maxScoops === 1 ? 'sabor' : 'sabores'}`);
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
      const unitPrice = selectedVariant?.price || product.basePrice || 0;
      
      // Combine non-sauce additions + selected sauces
      const nonSauceAdditions = (initialItem?.additions || []).filter(a => !SALSAS.includes(a));
      const allAdditions = [...nonSauceAdditions, ...selectedSauces];

      const configParts = [
        variantLabel,
        selectedFlavors.join(', '),
        selectedFrutas.length > 0 ? `Fruta: ${selectedFrutas.join(', ')}` : '',
        selectedSauces.length > 0 ? `Salsas: ${selectedSauces.join(', ')}` : '',
      ].filter(Boolean);

      const item: CartItem = {
        id: initialItem?.id || Math.random().toString(36).substr(2, 9),
        productId: product.id,
        productName: product.name,
        variantLabel,
        description: configParts.join(' — '),
        flavors: selectedFlavors,
        fruitChoices: selectedFrutas,
        additions: allAdditions,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: unitPrice * quantity,
      };
      
      onAdd(item);
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

  const getStepTitle = () => {
    switch (effectiveCurrentStepType) {
      case 'variants': return 'Presentación';
      case 'flavors': return `Selecciona ${maxScoops === 1 ? 'el Sabor' : 'los Sabores'}`;
      case 'fruits': return 'Elige la Fruta';
      case 'sauces': return 'Salsas (Opcional)';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-surface-container-lowest w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]"
        >
          {/* Header */}
          <header className="pt-4 sm:pt-8 px-5 sm:px-8 pb-3 sm:pb-6 border-b border-surface-container shrink-0">
            <div className="flex items-center justify-between mb-4 sm:mb-8">
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant transition-colors text-on-surface-variant shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center">
                <span className="font-bold text-lg tracking-tight text-primary font-brand text-xl sm:text-2xl">D'LI</span>
                <div className="h-0.5 w-6 bg-primary/20 rounded-full mt-0.5" />
              </div>
              <div className="w-10" />
            </div>
            
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-2xl font-bold text-on-surface leading-tight">
                  {getStepTitle()}
                </h1>
                <p className="text-[10px] sm:text-xs font-semibold text-secondary/60 uppercase tracking-wider">{product.name}</p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-tighter ring-1 ring-primary/10">
                  {step}/{effectiveTotalSteps}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden flex gap-0.5">
              {Array.from({ length: effectiveTotalSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "h-full flex-1 transition-all duration-500",
                    i + 1 <= step ? "bg-primary" : "bg-transparent"
                  )}
                />
              ))}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-10 hide-scrollbar scroll-smooth bg-surface-container-lowest/50">
            {/* PASO: VARIANTES */}
            {effectiveCurrentStepType === 'variants' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {(product.variants || []).map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariant(v)}
                    className={cn(
                      "p-4 sm:p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-1 sm:gap-2 relative",
                      selectedVariant?.label === v.label 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-surface-container-high hover:border-primary/30"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-base sm:text-lg text-on-surface">{v.label}</span>
                      {selectedVariant?.label === v.label && <Check className="w-5 h-5 text-primary stroke-[3]" />}
                    </div>
                    <span className="text-primary font-black text-xl sm:text-2xl tracking-tighter">{formatCurrency(v.price)}</span>
                    {v.scoops && <span className="text-[10px] text-secondary font-black uppercase tracking-wider">{v.scoops} Bola{v.scoops > 1 ? 's' : ''}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* PASO: SABORES */}
            {effectiveCurrentStepType === 'flavors' && (
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <h3 className="font-bold text-on-surface text-base sm:text-lg">Selecciona Sabores</h3>
                    <p className="text-[10px] sm:text-xs text-secondary font-medium uppercase tracking-wider">Límite: {maxScoops} {maxScoops === 1 ? 'sabor' : 'sabores'}</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-black ring-1 transition-all",
                    selectedFlavors.length === maxScoops 
                    ? "bg-success/10 text-success ring-success/20" 
                    : "bg-primary/5 text-primary ring-primary/20"
                  )}>
                    {selectedFlavors.length}/{maxScoops}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {allFlavors.map(flavor => (
                    <button
                      key={flavor.id}
                      onClick={() => toggleFlavor(flavor.name)}
                      disabled={!flavor.isAvailable}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl transition-all border-2",
                        selectedFlavors.includes(flavor.name)
                          ? "bg-primary border-primary text-white shadow-md scale-[1.02]"
                          : flavor.isAvailable 
                            ? "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                            : "opacity-30 cursor-not-allowed border-transparent grayscale"
                      )}
                    >
                      <IceCream className={cn("w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2", selectedFlavors.includes(flavor.name) ? "text-white" : "text-primary")} />
                      <span className="text-[10px] sm:text-xs font-bold text-center leading-tight line-clamp-1">{flavor.name}</span>
                      {selectedFlavors.includes(flavor.name) && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary stroke-[4]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO: FRUTAS */}
            {effectiveCurrentStepType === 'fruits' && (
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <h3 className="font-bold text-on-surface text-base sm:text-lg">Elige la Fruta</h3>
                    <p className="text-[10px] sm:text-xs text-secondary font-medium uppercase tracking-wider">Selecciona una opción</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {fruitOptions.map(fruta => (
                    <button
                      key={fruta}
                      onClick={() => toggleFruta(fruta)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl transition-all border-2 text-center",
                        selectedFrutas.includes(fruta)
                          ? "bg-success border-success text-white shadow-md scale-[1.02]"
                          : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                      )}
                    >
                      <span className="text-2xl mb-1">
                        {fruta === 'Fresa' ? '🍓' : fruta === 'Mango' ? '🥭' : fruta === 'Durazno' ? '🍑' : fruta === 'Mixta' ? '🍇' : '🍑'}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold leading-tight">{fruta}</span>
                      {selectedFrutas.includes(fruta) && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-success stroke-[4]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO: SALSAS */}
            {effectiveCurrentStepType === 'sauces' && (
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <h3 className="font-bold text-on-surface text-base sm:text-lg">Salsas</h3>
                    <p className="text-[10px] sm:text-xs text-secondary font-medium uppercase tracking-wider">Opcional — Puedes elegir varias</p>
                  </div>
                  {selectedSauces.length > 0 && (
                    <div className="px-3 py-1.5 rounded-full text-xs font-black bg-primary/10 text-primary ring-1 ring-primary/20">
                      {selectedSauces.length} elegida{selectedSauces.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {SALSAS.map(sauce => (
                    <button
                      key={sauce}
                      onClick={() => toggleSauce(sauce)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl transition-all border-2",
                        selectedSauces.includes(sauce)
                          ? "bg-primary border-primary text-white shadow-md scale-[1.02]"
                          : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                      )}
                    >
                      <Droplets className={cn("w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2", selectedSauces.includes(sauce) ? "text-white" : "text-primary")} />
                      <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">{sauce}</span>
                      {selectedSauces.includes(sauce) && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary stroke-[4]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {/* Skip option */}
                <button
                  onClick={() => { setSelectedSauces([]); handleNext(); }}
                  className="mt-2 py-3 rounded-2xl border-2 border-dashed border-outline/30 text-secondary text-xs font-bold hover:border-secondary/30 transition-all"
                >
                  Sin salsas — Continuar
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="p-4 sm:p-8 bg-white border-t border-surface-container shrink-0">
            <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <button 
                  onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 border-primary/20 text-primary font-bold hover:bg-primary/5 transition-colors shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 bg-surface-container-low px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-outline/10 h-10 sm:h-12">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white shadow-sm text-primary hover:bg-primary hover:text-white transition-all ring-1 ring-primary/5"
                  >
                    <span className="text-xl font-bold leading-none">-</span>
                  </button>
                  <div className="flex flex-col items-center min-w-[28px] sm:min-w-[32px]">
                     <span className="text-[8px] font-black text-secondary leading-none uppercase tracking-tighter mb-0.5">Cant</span>
                     <span className="text-base sm:text-lg font-black text-on-surface leading-none">{quantity}</span>
                  </div>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white shadow-sm text-primary hover:bg-primary hover:text-white transition-all ring-1 ring-primary/5"
                  >
                    <span className="text-xl font-bold leading-none">+</span>
                  </button>
                </div>
              </div>

              {/* Hide main "next" button when on sauces step (has its own skip button above) */}
              {effectiveCurrentStepType !== 'sauces' ? (
                <button 
                  onClick={handleNext}
                  className="flex-1 h-12 sm:h-14 px-6 sm:px-8 rounded-2xl sm:rounded-full bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all flex items-center justify-between sm:justify-center gap-3"
                >
                  <div className="flex flex-col items-start sm:hidden">
                    <span className="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5 opacity-70">Subtotal</span>
                    <span className="text-xs font-black leading-none">
                      {formatCurrency((selectedVariant?.price || product.basePrice || 0) * quantity)}
                    </span>
                  </div>
                  <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">Total del Item</span>
                    <span className="text-sm font-black leading-none">
                      {formatCurrency((selectedVariant?.price || product.basePrice || 0) * quantity)}
                    </span>
                  </div>
                  <span className="hidden sm:block h-6 w-px bg-white/20" />
                  <div className="flex items-center gap-2">
                    <span className="font-brand uppercase tracking-tight">{step === effectiveTotalSteps ? 'Finalizar' : 'Siguiente'}</span>
                    <ChevronRight className="w-5 h-5 overflow-hidden" />
                  </div>
                </button>
              ) : (
                <button 
                  onClick={handleNext}
                  className="flex-1 h-12 sm:h-14 px-6 sm:px-8 rounded-2xl sm:rounded-full bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <span className="font-brand uppercase tracking-tight">Finalizar Pedido</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
