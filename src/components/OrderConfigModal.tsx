import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check, IceCream, Droplets, Plus, GlassWater } from 'lucide-react';
import { Product, ProductVariant, CartItem } from '../types';
import { useFlavorsStore } from '../stores/useFlavorsStore';
import { formatCurrency, cn, getAssetUrl } from '../lib/utils';
import { toast } from 'sonner';

const SALSAS = ['Arequipe', 'Mora', 'Chocolate', 'Lecherita'];

interface OrderConfigModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  initialItem?: CartItem | null;
  initialStep?: number;
}

// Frutas por defecto y específicas para Obleas
const FRUTAS_DEFAULT = ['Fresa', 'Mango', 'Papaya', 'Manzana', 'Banano', 'Uva'];
const OBLEA_FRUITS = ['Fresa', 'Mango', 'Durazno'];

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function OrderConfigModal({ product, isOpen, onClose, onAdd, initialItem, initialStep }: OrderConfigModalProps) {
  const { availableFlavors: allFlavors } = useFlavorsStore();
  const [step, setStep] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const isOblea = product.name.toLowerCase().includes('oblea');
  const fruitOptions = product.fruitOptions && product.fruitOptions.length > 0
    ? product.fruitOptions
    : (isOblea ? OBLEA_FRUITS : FRUTAS_DEFAULT);

  const [selectedFrutas, setSelectedFrutas] = useState<string[]>(() => {
    if (initialItem?.fruitChoices) return initialItem.fruitChoices;
    // For Ensaladas and Salpicón, pre-select all fruits by default
    if (product.category === 'ensaladas' || product.category === 'salpicon') return fruitOptions;
    return [];
  });
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedIncludedToppings, setSelectedIncludedToppings] = useState<string[]>([]);
  const [selectedAdditions, setSelectedAdditions] = useState<{id: string, name: string, price: number}[]>([]);
  const [availableAdditions, setAvailableAdditions] = useState<Product[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Extra additions states
  const [extraFlavors, setExtraFlavors] = useState<string[]>([]);
  const [extraFrutas, setExtraFrutas] = useState<string[]>([]);
  const [extraSauces, setExtraSauces] = useState<string[]>([]);
  
  const isBasicIceCream = ['cono', 'vaso', 'cucurucho', 'conchita'].includes(product.id);
  const isSalpicon = product.requiresBaseFlavor || product.id === 'copa-salpicon' || product.id === 'vaso-salpicon';

  // Dynamic step calculation
  const steps: string[] = [];
  if (product.variants && product.variants.length > 1) steps.push('variants');
  if (isSalpicon) steps.push('salpiconBase');
  
  const getMaxScoops = () => {
    let base = 0;
    if (selectedVariant?.scoops !== undefined) base = selectedVariant.scoops;
    else {
      const label = (selectedVariant?.label || '').toLowerCase();
      if (label.includes('triple')) base = 3;
      else if (label.includes('doble')) base = 2;
      else if (label.includes('sencill')) base = 1;
      else base = product.scoops || (product.requiresFlavors ? 1 : 0);
    }
    return base;
  };
  const maxScoops = getMaxScoops();

  // Base options
  if (product.requiresFlavors || maxScoops > 0) steps.push('flavors');
  
  const hasBaseFruits = product.category === 'ensaladas' || isSalpicon || isOblea;
  if (hasBaseFruits) steps.push('fruits');
  
  if (product.requiresSauces || isBasicIceCream) steps.push('sauces');
  if (product.requiresToppings || isBasicIceCream) steps.push('includedToppings');
  
  // Additions intent
  steps.push('additions');

  // Extras selections
  const hasFruitAdd = selectedAdditions.some(a => a.name.toLowerCase().includes('fruta'));
  const hasIceCreamAdd = selectedAdditions.some(a => a.name.toLowerCase().includes('helado') || a.name.toLowerCase().includes('bola'));
  const hasSauceAdd = selectedAdditions.some(a => a.name.toLowerCase().includes('salsa'));

  if (hasFruitAdd) steps.push('fruits_extra');
  if (hasIceCreamAdd) steps.push('flavors_extra');
  if (hasSauceAdd) steps.push('sauces_extra');
  
  const effectiveSteps = steps.filter(s => {
    if (s === 'flavors') {
      if (selectedVariant?.hasIceCream === false) return false;
    }
    return true;
  });
  const effectiveTotalSteps = effectiveSteps.length;
  const effectiveCurrentStepType = effectiveSteps[step - 1];

  // Prices for extras
  const getAdditionPrice = (keyword: string, fallback: number) => {
    const add = availableAdditions.find(a => a.name.toLowerCase().includes(keyword));
    return add?.variants?.[0]?.price || fallback;
  };

  const extraFruitsCount = extraFrutas.length;
  const extraFruitsPrice = extraFruitsCount * 3500;
  const extraFlavorsPrice = extraFlavors.length * getAdditionPrice('helado', 3500);
  const extraSaucesPrice = extraSauces.length * getAdditionPrice('salsa', 1000);

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
        
        // Compute base scoops to split flavors
        let bScoops = 0;
        if (variant?.scoops !== undefined) bScoops = variant.scoops;
        else {
          const lbl = (variant?.label || '').toLowerCase();
          if (lbl.includes('triple')) bScoops = 3;
          else if (lbl.includes('doble')) bScoops = 2;
          else if (lbl.includes('sencill')) bScoops = 1;
          else bScoops = product.scoops || (product.requiresFlavors ? 1 : 0);
        }
        
        const initialFlavors = initialItem.flavors || [];
        setSelectedFlavors(initialFlavors.slice(0, bScoops));
        setExtraFlavors(initialFlavors.slice(bScoops));

        const initialFruits = initialItem.fruitChoices || [];
        const hasBaseFruits = product.category === 'ensaladas' || isSalpicon || isOblea;
        const bFruitsCount = hasBaseFruits ? (isOblea ? 1 : 99) : 0;
        setSelectedFrutas(initialFruits.slice(0, bFruitsCount));
        setExtraFrutas(initialFruits.slice(bFruitsCount));

        const TOPPINGS = ['Maní', 'Bolitas de colores'];
        
        const sauceAdditions = (initialItem.additions || []).filter(a => SALSAS.includes(a));
        const bSaucesCount = isBasicIceCream ? 1 : (product.requiresSauces ? 99 : 0);
        setSelectedSauces(sauceAdditions.slice(0, bSaucesCount));
        setExtraSauces(sauceAdditions.slice(bSaucesCount));

        const includedToppings = (initialItem.additions || []).filter(a => TOPPINGS.includes(a));
        setSelectedIncludedToppings(includedToppings);
        
        const otherAdds = (initialItem.additions || []).filter(a => !SALSAS.includes(a) && !TOPPINGS.includes(a));
        
        if (initialItem.additionIds && initialItem.additionIds.length > 0) {
          if (availableAdditions.length > 0) {
            const mapped = initialItem.additionIds.map(id => {
              const prod = availableAdditions.find(p => p.id === id);
              return prod ? { id: prod.id, name: prod.name, price: prod.variants?.[0]?.price || 0 } : null;
            }).filter(Boolean) as {id: string, name: string, price: number}[];
            setSelectedAdditions(mapped);
          }
        } else {
          // Fallback
          const mapped = otherAdds.map(name => {
            const prod = availableAdditions.find(p => p.name === name);
            return prod ? { id: prod.id, name: prod.name, price: prod.variants?.[0]?.price || 0 } : { id: '', name, price: 0 };
          });
          setSelectedAdditions(mapped);
        }
        
        setNotes(initialItem.notes || '');
        setQuantity(initialItem.quantity);
        setStep(initialStep || 1);
      } else {
        setStep(initialStep || 1);
        setSelectedVariant(product.variants?.length === 1 ? product.variants[0] : null);
        setSelectedFlavors([]);
        setSelectedFrutas(product.category === 'ensaladas' || product.category === 'salpicon' ? fruitOptions : []);
        setSelectedSauces([]);
        setSelectedIncludedToppings([]);
        setSelectedAdditions([]);
        setExtraFlavors([]);
        setExtraFrutas([]);
        setExtraSauces([]);
        setNotes('');
        setQuantity(1);
      }
    }
  }, [isOpen, initialItem, product.variants, product.requiresFlavors, availableAdditions]);

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

    if (effectiveCurrentStepType === 'salpiconBase' && selectedFrutas.length === 0) {
      toast.error('Selecciona la base del salpicón (Fresa o Mango)');
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

      // Consolidate all flavors (base + extra)
      const allFlavorsConsolidated = [...selectedFlavors, ...extraFlavors];
      // Consolidate all fruits (base + extra)
      const allFruitsConsolidated = [...selectedFrutas, ...extraFrutas];
      // Consolidate all sauces (base + extra)
      const allSaucesConsolidated = [...selectedSauces, ...extraSauces];

      const otherAdditionsPrices = selectedAdditions.reduce((sum, a) => sum + a.price, 0);

      const unitPrice = (selectedVariant?.price || product.basePrice || 0)
        + otherAdditionsPrices
        + extraFruitsPrice
        + extraFlavorsPrice
        + extraSaucesPrice;

      const allAdditionsNames = [
        ...allSaucesConsolidated,
        ...selectedIncludedToppings,
        ...selectedAdditions.map(a => a.name),
      ];

      if (extraFrutas.length > 0) allAdditionsNames.push(`Adición Fruta x${extraFrutas.length}`);
      if (extraFlavors.length > 0) allAdditionsNames.push(`Adición Helado x${extraFlavors.length}`);

      const allAdditionIds = selectedAdditions.map(a => a.id);

      const flavorCounts = allFlavorsConsolidated.reduce((acc, f) => {
        acc[f] = (acc[f] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const formattedFlavors = Object.entries(flavorCounts).map(([flavor, count]) =>
        count > 1 ? `${flavor} (x${count})` : flavor
      ).join(', ');

      const configParts = [
        variantLabel,
        formattedFlavors,
        allFruitsConsolidated.length > 0
          ? (isSalpicon ? `Base: ${allFruitsConsolidated.join(', ')}` : `Fruta: ${allFruitsConsolidated.join(', ')}`)
          : '',
        allAdditionsNames.length > 0 ? `Extras: ${allAdditionsNames.join(', ')}` : '',
        notes ? `Notas: ${notes}` : ''
      ].filter(Boolean);

      onAdd({
        id: initialItem?.id || Math.random().toString(36).substr(2, 9),
        productId: product.id,
        productName: product.name,
        variantLabel,
        description: configParts.join(' | '),
        flavors: allFlavorsConsolidated,
        fruitChoices: allFruitsConsolidated,
        additions: allAdditionsNames,
        additionIds: allAdditionIds,
        notes,
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
    if (isBasicIceCream) {
      // Single select for basic ice cream (included sauces)
      if (selectedSauces.includes(sauce)) {
        setSelectedSauces([]);
      } else {
        setSelectedSauces([sauce]);
      }
    } else {
      // Multi select for others (optional sauces)
      if (selectedSauces.includes(sauce)) {
        setSelectedSauces(selectedSauces.filter(s => s !== sauce));
      } else {
        setSelectedSauces([...selectedSauces, sauce]);
      }
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
      const exists = prev.find(a => a.id === add.id);
      if (exists) return prev.filter(a => a.id !== add.id);
      return [...prev, { id: add.id, name: add.name, price: addPrice }];
    });
  };

  const getStepTitle = () => {
    switch (effectiveCurrentStepType) {
      case 'variants': return 'Presentación';
      case 'salpiconBase': return 'Base del Salpicón';
      case 'flavors': return `Selecciona ${maxScoops === 1 ? 'el Sabor' : 'los Sabores'}`;
      case 'fruits': return 'Elige la Fruta';
      case 'sauces': return isBasicIceCream ? 'Salsas (Incluidas)' : 'Salsas (Opcional)';
      case 'includedToppings': return (product.requiresToppings || isBasicIceCream) ? 'Toppings (Incluidos)' : 'Toppings';
      case 'additions': return 'Adiciones (Costo Extra)';
      case 'fruits_extra': return '🍓 Adición de Fruta';
      case 'flavors_extra': return '🍦 Adición de Helado';
      case 'sauces_extra': return '🍫 Adición de Salsa';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
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
                     src={getAssetUrl(product.imageUrl)} 
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
                          onClick={() => {
                            if (selectedVariant?.label !== variant.label) {
                              setSelectedVariant(variant);
                              setSelectedFlavors([]);
                              const label = variant.label.toLowerCase();
                              if (label.includes('fresa')) setSelectedFrutas(['Fresa']);
                              else if (label.includes('mango')) setSelectedFrutas(['Mango']);
                              else if (label.includes('durazno')) setSelectedFrutas(['Durazno']);
                              else if (!label.includes('fruta')) setSelectedFrutas([]);
                            }
                          }}
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

                  {effectiveCurrentStepType === 'salpiconBase' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['Fresa', 'Mango'].map(base => (
                        <button
                          key={base}
                          onClick={() => setSelectedFrutas([base])} // Overwrite, only one base allowed
                          className={cn(
                            "relative flex items-center justify-center p-6 rounded-[1.5rem] transition-all border-2 text-center",
                            selectedFrutas.includes(base)
                              ? "bg-primary/5 border-primary shadow-sm scale-[1.02]"
                              : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                          )}
                        >
                          <span className={cn(
                            "font-black text-xl",
                            selectedFrutas.includes(base) ? "text-primary" : "text-on-surface"
                          )}>{base}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'includedToppings' && (
                    <div className="flex flex-col gap-2">
                      {['Maní', 'Bolitas de colores'].map(topping => {
                        const isSelected = selectedIncludedToppings.includes(topping);
                        return (
                          <button
                            key={topping}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedIncludedToppings([]);
                              } else {
                                setSelectedIncludedToppings([topping]);
                              }
                            }}
                            className={cn(
                              "relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all border-2 w-full text-left",
                              isSelected
                                ? "bg-primary border-primary text-white shadow-md"
                                : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                            )}
                          >
                            <div className={cn("w-2 h-2 rounded-full shrink-0", isSelected ? "bg-white" : "bg-primary")} />
                            <span className="font-black text-sm flex-1">{topping}</span>
                            {isSelected && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                                <Check className="w-3 h-3 text-primary stroke-[4]" />
                              </motion.div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'flavors' && (
                    <div className="grid grid-cols-2 gap-2">
                      {allFlavors.filter(f => f.isAvailable).length === 0 ? (
                        <div className="col-span-2 text-center py-6 text-on-surface/50 text-sm flex flex-col items-center gap-2">
                          <IceCream className="w-8 h-8 text-outline/30" />
                          <span>No hay sabores disponibles</span>
                        </div>
                      ) : (
                        allFlavors.filter(f => f.isAvailable).map(flavor => {
                        const count = selectedFlavors.filter(f => f === flavor.name).length;
                        return (
                          <div
                            key={flavor.id}
                            className={cn(
                              "relative flex flex-col p-2.5 rounded-2xl transition-all border-2",
                              count > 0
                                ? "bg-primary/5 border-primary shadow-sm"
                                : "bg-white border-outline/10 hover:bg-surface-container-low"
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              <IceCream className={cn("w-4 h-4 shrink-0", count > 0 ? "text-primary" : "text-secondary")} />
                              <span className={cn("text-xs font-black leading-tight", count > 0 ? "text-primary" : "text-on-surface")}>{flavor.name}</span>
                            </div>
                            {count > 0 ? (
                              <div className="flex items-center justify-between bg-white rounded-xl border border-outline/20 p-0.5 shadow-sm">
                                <button 
                                  onClick={() => {
                                    const index = selectedFlavors.indexOf(flavor.name);
                                    if (index > -1) {
                                      const newFlavors = [...selectedFlavors];
                                      newFlavors.splice(index, 1);
                                      setSelectedFlavors(newFlavors);
                                    }
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high active:scale-95 transition-all text-secondary"
                                >
                                  <span className="text-base font-bold leading-none">−</span>
                                </button>
                                <span className="font-brand font-black text-primary text-base w-5 text-center">{count}</span>
                                <button 
                                  onClick={() => {
                                    if (selectedFlavors.length < maxScoops) {
                                      setSelectedFlavors([...selectedFlavors, flavor.name]);
                                    } else {
                                      toast.info(`Solo puedes elegir ${maxScoops} ${maxScoops === 1 ? 'sabor' : 'sabores'}`);
                                    }
                                  }}
                                  disabled={selectedFlavors.length >= maxScoops}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (selectedFlavors.length < maxScoops) {
                                    setSelectedFlavors([...selectedFlavors, flavor.name]);
                                  } else {
                                    toast.info(`Solo puedes elegir ${maxScoops} ${maxScoops === 1 ? 'sabor' : 'sabores'}`);
                                  }
                                }}
                                disabled={selectedFlavors.length >= maxScoops}
                                className="w-full py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                Agregar
                              </button>
                            )}
                          </div>
                        );
                        })
                      )}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'fruits' && (
                    <div className="flex flex-col gap-4">
                      {extraFruitsCount > 0 && (
                        <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-primary uppercase tracking-wider">Costo Adicional</p>
                            <p className="text-[11px] font-bold text-on-surface/70 leading-tight">
                              Has seleccionado {extraFruitsCount} {extraFruitsCount === 1 ? 'fruta adicional' : 'frutas adicionales'}. 
                              (+{formatCurrency(extraFruitsPrice)})
                            </p>
                          </div>
                        </div>
                      )}
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
                            {fruta === 'Fresa' ? '🍓' : fruta === 'Mango' ? '🥭' : fruta === 'Durazno' ? '🍑' : fruta === 'Manzana' ? '🍎' : fruta === 'Banano' ? '🍌' : fruta === 'Uva' ? '🍇' : fruta === 'Papaya' ? '🍈' : '🍍'}
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
                    </div>
                  )}

                  {effectiveCurrentStepType === 'sauces' && (
                    <div className="flex flex-col gap-2">
                      {SALSAS.map(sauce => (
                        <button
                          key={sauce}
                          onClick={() => toggleSauce(sauce)}
                          className={cn(
                            "relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all border-2 w-full text-left",
                            selectedSauces.includes(sauce)
                              ? "bg-primary border-primary text-white shadow-md"
                              : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                          )}
                        >
                          <div className={cn("w-2 h-2 rounded-full shrink-0", selectedSauces.includes(sauce) ? "bg-white" : "bg-primary")} />
                          <span className="font-black text-sm flex-1">{sauce}</span>
                          {selectedSauces.includes(sauce) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 text-primary stroke-[4]" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'additions' && (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-2 gap-2">
                        {availableAdditions
                          .filter(add => {
                            return true;
                          })
                          .map(add => {
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

                      {/* NOTAS ADICIONALES */}
                      <div className="flex flex-col gap-2 mt-2">
                        <label className="text-[11px] font-black text-secondary uppercase tracking-widest">Notas de preparación</label>
                        <textarea
                          placeholder="Ej: Sin papaya, sin crema..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-white border border-outline/20 rounded-2xl p-4 text-sm font-medium text-on-surface placeholder:text-outline/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none h-24 shadow-sm"
                        />
                      </div>
                    </div>
                  )}
                  {/* PANTALLA: FRUTA EXTRA */}
                  {effectiveCurrentStepType === 'fruits_extra' && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl">
                        <p className="text-xs font-black text-primary uppercase tracking-wider">+{formatCurrency(3500)} por cada fruta adicional</p>
                        {extraFruitsCount > 0 && <p className="text-[11px] font-bold text-on-surface/70 mt-1">{extraFruitsCount} seleccionada{extraFruitsCount > 1 ? 's' : ''} — +{formatCurrency(extraFruitsPrice)}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(isOblea ? Array.from(new Set([...fruitOptions, ...FRUTAS_DEFAULT])) : fruitOptions).map(fruta => {
                          const count = extraFrutas.filter(f => f === fruta).length;
                          const isIncluded = selectedFrutas.includes(fruta);
                          return (
                            <div
                              key={fruta}
                              onClick={() => setExtraFrutas([...extraFrutas, fruta])}
                              className={cn(
                                "relative flex flex-col p-2.5 rounded-2xl border-2 transition-all flex-grow sm:flex-grow-0 min-w-[100px] cursor-pointer select-none",
                                count > 0 ? "bg-success/10 border-success shadow-sm" : "bg-white border-outline/10 hover:bg-surface-container-low"
                              )}>
                              <div className="flex items-center justify-between gap-1.5 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xl shrink-0">{fruta === 'Fresa' ? '🍓' : fruta === 'Mango' ? '🥭' : fruta === 'Durazno' ? '🍑' : fruta === 'Manzana' ? '🍎' : fruta === 'Banano' ? '🍌' : fruta === 'Uva' ? '🍇' : fruta === 'Papaya' ? '🍈' : '🍍'}</span>
                                  <span className={cn("text-[11px] font-black leading-tight", count > 0 ? "text-success" : "text-on-surface")}>{fruta}</span>
                                </div>
                                {isIncluded && (
                                  <span className="text-[8px] font-black bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full uppercase shrink-0">Incluida</span>
                                )}
                              </div>
                              
                              {/* Contenedor de altura fija para evitar saltos */}
                              <div className="relative w-full h-[28px]">
                                <div
                                  onClick={e => e.stopPropagation()}
                                  className={cn(
                                    "absolute inset-0 flex items-center gap-1 bg-white rounded-xl border border-outline/20 p-0.5 w-full justify-center",
                                    count === 0 ? "invisible" : ""
                                  )}
                                >
                                  <button
                                    onClick={() => { const idx = extraFrutas.indexOf(fruta); if (idx > -1) { const nf = [...extraFrutas]; nf.splice(idx, 1); setExtraFrutas(nf); }}}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-container text-secondary text-sm font-bold"
                                  >−</button>
                                  <span className="font-black text-success text-sm w-4 text-center">{count}</span>
                                  <button
                                    onClick={() => setExtraFrutas([...extraFrutas, fruta])}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-success text-white"
                                  >
                                    <Plus className="w-3 h-3 stroke-[3]" />
                                  </button>
                                </div>
                                
                                {count === 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface-container text-secondary font-bold text-[10px] uppercase tracking-wider">
                                    Agregar
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PANTALLA: HELADO EXTRA */}
                  {effectiveCurrentStepType === 'flavors_extra' && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl">
                        <p className="text-xs font-black text-primary uppercase tracking-wider">+{formatCurrency(getAdditionPrice('helado', 3500))} por cada bola adicional</p>
                        {extraFlavors.length > 0 && <p className="text-[11px] font-bold text-on-surface/70 mt-1">{extraFlavors.length} seleccionada{extraFlavors.length > 1 ? 's' : ''} — +{formatCurrency(extraFlavorsPrice)}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {allFlavors.filter(f => f.isAvailable).map(flavor => {
                          const count = extraFlavors.filter(f => f === flavor.name).length;
                          const isIncluded = selectedFlavors.includes(flavor.name);
                          return (
                            <div
                              key={flavor.id}
                              onClick={() => setExtraFlavors([...extraFlavors, flavor.name])}
                              className={cn(
                                "relative flex flex-col p-2.5 rounded-2xl border-2 transition-all cursor-pointer select-none",
                                count > 0
                                  ? "bg-primary/5 border-primary shadow-sm"
                                  : isIncluded
                                    ? "bg-success/10 border-success/40 hover:bg-success/15"
                                    : "bg-white border-outline/10 hover:bg-surface-container-low"
                              )}
                            >
                              <div className="flex items-center gap-1.5 mb-2">
                                <IceCream className={cn("w-4 h-4 shrink-0", count > 0 ? "text-primary" : isIncluded ? "text-success" : "text-secondary")} />
                                <span className={cn("text-xs font-black leading-tight", count > 0 ? "text-primary" : isIncluded ? "text-success" : "text-on-surface")}>{flavor.name}</span>
                              </div>
                              {/* Controles siempre presentes — invisible cuando count=0 para mantener altura */}
                              <div className="relative w-full h-[32px]">
                                <div
                                  onClick={e => e.stopPropagation()}
                                  className={cn(
                                    "absolute inset-0 flex items-center justify-between bg-white rounded-xl border border-outline/20 p-0.5",
                                    count === 0 ? "invisible" : ""
                                  )}
                                >
                                  <button onClick={() => { const idx = extraFlavors.indexOf(flavor.name); if (idx > -1) { const nf = [...extraFlavors]; nf.splice(idx, 1); setExtraFlavors(nf); }}} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container text-secondary">
                                    <span className="text-base font-bold leading-none">−</span>
                                  </button>
                                  <span className="font-brand font-black text-primary text-base w-5 text-center">{count}</span>
                                  <button onClick={() => setExtraFlavors([...extraFlavors, flavor.name])} className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white">
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                </div>
                                
                                {count === 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface-container text-secondary font-bold text-[10px] uppercase tracking-wider">
                                    Agregar
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PANTALLA: SALSA EXTRA */}
                  {effectiveCurrentStepType === 'sauces_extra' && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl">
                        <p className="text-xs font-black text-primary uppercase tracking-wider">+{formatCurrency(getAdditionPrice('salsa', 1000))} por cada salsa adicional</p>
                        {extraSauces.length > 0 && <p className="text-[11px] font-bold text-on-surface/70 mt-1">{extraSauces.length} seleccionada{extraSauces.length > 1 ? 's' : ''} — +{formatCurrency(extraSaucesPrice)}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SALSAS.map(sauce => {
                          const count = extraSauces.filter(s => s === sauce).length;
                          return (
                            <div 
                              key={sauce}
                              onClick={() => setExtraSauces([...extraSauces, sauce])}
                              className={cn(
                                "relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all flex-grow sm:flex-grow-0 min-w-[90px] cursor-pointer select-none",
                                count > 0 ? "bg-primary/10 border-primary shadow-sm" : "bg-white border-outline/10 hover:bg-surface-container-low"
                              )}>
                              <Droplets className={cn("w-6 h-6 mb-1", count > 0 ? "text-primary" : "text-secondary")} />
                              <span className="text-[11px] font-black text-center mb-2">{sauce}</span>
                              {count > 0 ? (
                                <div 
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 bg-white rounded-xl border border-outline/20 p-0.5"
                                >
                                  <button onClick={() => { const idx = extraSauces.indexOf(sauce); if (idx > -1) { const ns = [...extraSauces]; ns.splice(idx, 1); setExtraSauces(ns); }}} className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-container text-secondary text-sm font-bold">−</button>
                                  <span className="font-black text-primary text-sm w-4 text-center">{count}</span>
                                  <button onClick={() => setExtraSauces([...extraSauces, sauce])} className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary text-white">
                                    <Plus className="w-3 h-3 stroke-[3]" />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full py-1 rounded-xl bg-surface-container text-secondary font-bold text-[10px] uppercase tracking-wider text-center">
                                  Agregar
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── FOOTER: BOTONES DE ACCIÓN (MÁS COMPACTO) ── */}
            <footer className="p-3 sm:p-4 bg-surface border-t border-outline/10 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4 bg-surface-container/50 p-1 rounded-2xl border border-outline/5">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-on-surface hover:bg-surface-container-high transition-all active:scale-90 border border-outline/10 shadow-sm"
                  >
                    <span className="text-xl font-bold leading-none">−</span>
                  </button>
                  <span className="text-xl font-brand font-black text-primary w-6 text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary text-white hover:bg-primary-container transition-all active:scale-90 shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-black text-secondary uppercase tracking-[0.2em] block mb-0.5">Precio Total</span>
                  <p className="text-xl font-brand font-black text-on-surface leading-tight">
                    {formatCurrency(((selectedVariant?.price || product.basePrice || 0) + 
                      selectedAdditions.reduce((s, a) => s + a.price, 0) + 
                      extraFruitsPrice + extraFlavorsPrice + extraSaucesPrice) * quantity)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                {step > 1 && (
                  <button 
                    onClick={() => setStep(step - 1)}
                    className="w-12 h-12 flex shrink-0 items-center justify-center rounded-2xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-all active:scale-90 border border-outline/10"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[3]" />
                  </button>
                )}
                
                <button 
                  onClick={handleNext}
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 overflow-hidden relative group"
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
