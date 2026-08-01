import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check, IceCream, Droplets, Plus, GlassWater, Ban } from 'lucide-react';
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
const FRUTAS_DEFAULT = ['Fresa', 'Mango', 'Papaya', 'Manzana', 'Banano', 'Uva', 'Kiwi'];
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
    const cat = product.category?.toLowerCase();
    if (cat === 'ensaladas' || cat === 'salpicon') return fruitOptions;
    return [];
  });
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedIncludedToppings, setSelectedIncludedToppings] = useState<string[]>([]);
  const [selectedAdditions, setSelectedAdditions] = useState<{id: string, name: string, price: number}[]>([]);
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string>>({});
  const [selectedBaseChoice, setSelectedBaseChoice] = useState<string>('');
  const [availableBases, setAvailableBases] = useState<string[]>(['Brownie', 'Chocorramo', 'Jet Wafer']);
  const [availableAdditions, setAvailableAdditions] = useState<Product[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showFullImage, setShowFullImage] = useState(false);
  const openTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
    }
  }, [isOpen]);

  // Extra additions states
  const [extraFlavors, setExtraFlavors] = useState<string[]>([]);
  const [extraFrutas, setExtraFrutas] = useState<string[]>([]);
  const [extraSauces, setExtraSauces] = useState<string[]>([]);
  
  const isBasicIceCream = ['cono', 'vaso', 'cucurucho', 'conchita'].includes(product.id);
  const isSalpicon = product.requiresBaseFlavor || product.id === 'copa-salpicon' || product.id === 'vaso-salpicon';

  // Dynamic step calculation
  const steps: string[] = [];
  if (product.variants && product.variants.length > 1) steps.push('variants');
  if (product.customOptions && product.customOptions.length > 0) steps.push('custom_options');
  if (isSalpicon) steps.push('salpiconBase');
  
  const getMaxScoops = () => {
    if (selectedVariant?.steps) {
      const flavorStep = selectedVariant.steps.find((s: any) => s.type === 'flavors');
      if (flavorStep && flavorStep.scoops !== undefined) {
         return flavorStep.scoops;
      }
    }
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
  const currentScoops = selectedFlavors.reduce((acc, f) => acc + (f.quantity || 1), 0);

  // Base options
  if (selectedVariant?.steps && selectedVariant.steps.length > 0) {
    selectedVariant.steps.forEach((s: any) => steps.push(s.type));
  } else {
    if (maxScoops > 0) steps.push('flavors');
    
    const variantRequiresFruit = selectedVariant?.hasFruit ?? false;
    const hasBaseFruits = product.requiresFruitChoice || variantRequiresFruit || product.category === 'ensaladas';
    
    if (hasBaseFruits) steps.push('fruits');
    
    if (product.requiresSauces || isBasicIceCream) steps.push('sauces');
    if (product.requiresToppings || isBasicIceCream) steps.push('includedToppings');
    
    // Additions intent
    steps.push('additions');
  }

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

  // Fetch additions and bases
  useEffect(() => {
    const fetchData = async () => {
      try {
        const qAdditions = query(collection(db, 'products'), where('category', '==', 'adiciones'), where('isActive', '==', true));
        const snapAdditions = await getDocs(qAdditions);
        const adds = snapAdditions.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAvailableAdditions(adds);

        const qBases = query(collection(db, 'supplies'), where('category', '==', 'Bases'));
        const snapBases = await getDocs(qBases);
        if (!snapBases.empty) {
          const basesNames = snapBases.docs
            .map(doc => doc.data())
            .filter(data => !data.isVirtual)
            .map(data => data.name as string);
          if (basesNames.length > 0) {
            setAvailableBases(basesNames);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  const hasInitializedRef = useRef(false);

  // Reset or pre-fill state when modal opens
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }

    if (initialItem && initialItem.additionIds && initialItem.additionIds.length > 0 && availableAdditions.length === 0) {
      // Waiting for additions to load before initializing edit mode
      return;
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

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
        const baseHasFruits = product.category === 'ensaladas' || isSalpicon || product.requiresFruitChoice || variant?.hasFruit;
        const bFruitsCount = baseHasFruits ? ((product.requiresFruitChoice || isOblea) ? 1 : 99) : 0;
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
        
        setSelectedCustomOptions(initialItem.customSelections || {});
        setSelectedBaseChoice(initialItem.baseChoice || '');
        setNotes(initialItem.notes || '');
        setQuantity(initialItem.quantity);
        setStep(initialStep || 1);
      } else {
        setStep(initialStep || 1);
        setSelectedVariant(product.variants?.length === 1 ? product.variants[0] : null);
        setSelectedFlavors([]);
        // Salpicón: Banano y Papaya incluidos por defecto. El cliente elige Fresa o Mango.
        if (isSalpicon) {
          setSelectedFrutas(['Banano', 'Papaya']);
        } else if (product.category?.toLowerCase() === 'ensaladas') {
          const initVariant = product.variants?.length === 1 ? product.variants[0] : null;
          if (initVariant?.label.toLowerCase().includes('mini')) {
            setSelectedFrutas(FRUTAS_DEFAULT.filter(f => f !== 'Kiwi'));
          } else if (initVariant) {
            setSelectedFrutas(FRUTAS_DEFAULT);
          } else {
            setSelectedFrutas([]);
          }
        } else {
          setSelectedFrutas([]);
        }
        setSelectedSauces([]);
        setSelectedIncludedToppings([]);
        setSelectedAdditions([]);
        setSelectedCustomOptions({});
        setSelectedBaseChoice('');
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
    
    if (effectiveCurrentStepType === 'custom_options') {
      const missingRequired = product.customOptions?.some(opt => opt.required && !selectedCustomOptions[opt.name]);
      if (missingRequired) {
        toast.error("Por favor selecciona todas las opciones");
        return;
      }
    }

    if (effectiveCurrentStepType === 'flavors' && currentScoops < maxScoops) {
      toast.info(`Debes seleccionar ${maxScoops} ${maxScoops === 1 ? 'sabor' : 'sabores'}`);
      return;
    }

    if (effectiveCurrentStepType === 'bases' && !selectedBaseChoice) {
      toast.error('Selecciona una base');
      return;
    }

    if (effectiveCurrentStepType === 'salpiconBase' && !selectedFrutas.some(f => f === 'Fresa' || f === 'Mango')) {
      toast.error('Debes elegir una base: Fresa o Mango');
      return;
    }

    if (effectiveCurrentStepType === 'fruits' && selectedFrutas.length === 0) {
      // Fruits are optional for some products (like salpicón selection already determined by variant)
      if (product.requiresFruitChoice || selectedVariant?.hasFruit) {
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

      const otherAdditionsPrices = selectedAdditions.filter(a => 
        !a.name.toLowerCase().includes('fruta') && 
        !a.name.toLowerCase().includes('helado') && 
        !a.name.toLowerCase().includes('salsa')
      ).reduce((sum, a) => sum + a.price, 0);

      const isLoyalty = initialItem?.isLoyaltyReward;

      const unitPrice = isLoyalty ? 0 : ((selectedVariant?.price || product.basePrice || 0)
        + otherAdditionsPrices
        + extraFruitsPrice
        + extraFlavorsPrice
        + extraSaucesPrice);

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

      const finalBaseChoice = isSalpicon ? (allFruitsConsolidated.find(f => f === 'Mango' || f === 'Fresa') || '') : selectedBaseChoice;
      const remainingFruits = allFruitsConsolidated.filter(f => f !== finalBaseChoice);

      const customOptionsStrings = Object.entries(selectedCustomOptions).map(([key, val]) => `${key}: ${val}`);

      const configParts = [
        variantLabel,
        finalBaseChoice ? `Base: ${finalBaseChoice}` : '',
        formattedFlavors,
        remainingFruits.length > 0
          ? `Fruta: ${remainingFruits.join(', ')}`
          : '',
        ...customOptionsStrings,
        allAdditionsNames.length > 0 ? `Extras: ${allAdditionsNames.join(', ')}` : '',
        notes ? `Notas: ${notes}` : ''
      ].filter(Boolean);

      onAdd({
        id: initialItem?.id || Math.random().toString(36).substr(2, 9),
        productId: product.id,
        productName: product.name,
        variantLabel,
        description: configParts.join(' | '),
        baseChoice: finalBaseChoice,
        flavors: allFlavorsConsolidated,
        fruitChoices: allFruitsConsolidated,
        additions: allAdditionsNames,
        additionIds: allAdditionIds,
        customSelections: selectedCustomOptions,
        notes,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
        includedFlavors: selectedFlavors,
        includedFruits: selectedFrutas,
        includedSauces: selectedSauces,
        extraFlavors: extraFlavors,
        extraFruits: extraFrutas,
        extraSauces: extraSauces,
        isLoyaltyReward: isLoyalty,
      });
      onClose();
    }
  };

  const toggleFlavor = (flavor: string) => {
    if (selectedFlavors.includes(flavor)) {
      setSelectedFlavors(selectedFlavors.filter(f => f !== flavor));
    } else if (currentScoops < maxScoops) {
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
      case 'bases': return 'Elige la Base';
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
    <>
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
            <div 
              className="relative h-[30%] sm:h-[35%] flex-shrink-0 bg-surface-container-low group cursor-pointer" 
              onClick={() => {
                const elapsed = Date.now() - openTimeRef.current;
                if (elapsed > 700 && product.imageUrl) {
                  setShowFullImage(true);
                }
              }}
            >
               {product.imageUrl ? (
                   <img 
                     src={getAssetUrl(product.imageUrl)} 
                   alt={product.name} 
                   className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" 
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
                      currentScoops === maxScoops 
                      ? "bg-success/10 text-success ring-success/20" 
                      : "bg-primary text-white ring-primary shadow-primary/20"
                    )}>
                      {currentScoops} / {maxScoops}
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
                      {product.variants?.map(variant => {
                        const isStrictLoyaltyReward = initialItem?.isLoyaltyReward && !initialItem?.isOwnerConsumption;
                        const isBlocked = isStrictLoyaltyReward && selectedVariant?.label !== variant.label;
                        
                        return (
                        <button
                          key={variant.label}
                          disabled={isBlocked}
                          onClick={() => {
                            if (selectedVariant?.label !== variant.label) {
                              setSelectedVariant(variant);
                              setSelectedFlavors([]);
                              const label = variant.label.toLowerCase();
                              const cat = product.category?.toLowerCase();
                              if (cat === 'salpicon') {
                                // Resetear a las frutas fijas. El cliente elige Fresa/Mango en el siguiente paso.
                                setSelectedFrutas(['Banano', 'Papaya']);
                              } else if (cat === 'ensaladas') {
                                if (label.includes('mini')) {
                                  setSelectedFrutas(FRUTAS_DEFAULT.filter(f => f !== 'Kiwi'));
                                } else {
                                  setSelectedFrutas(FRUTAS_DEFAULT);
                                }
                              } else if (label.includes('fresa')) {
                                setSelectedFrutas(['Fresa']);
                              } else if (label.includes('mango')) {
                                setSelectedFrutas(['Mango']);
                              } else if (label.includes('durazno')) {
                                setSelectedFrutas(['Durazno']);
                              } else if (!label.includes('fruta')) {
                                setSelectedFrutas([]);
                              }
                            }
                          }}
                          className={cn(
                            "relative flex items-center justify-between p-4 rounded-[1.5rem] transition-all border-2 text-left group",
                            selectedVariant?.label === variant.label
                              ? "bg-primary/5 border-primary shadow-sm scale-[1.01]"
                              : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low",
                            isBlocked && "opacity-50 cursor-not-allowed hover:bg-white"
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
                        );
                      })}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'salpiconBase' && (
                    <div className="flex flex-col gap-5">
                      {/* ELECCIÓN EXCLUSIVA: Fresa o Mango */}
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Elige una base *</p>
                        <div className="grid grid-cols-2 gap-3">
                          {['Fresa', 'Mango'].map(base => {
                            const isSelected = selectedFrutas.includes(base);
                            return (
                              <button
                                key={base}
                                onClick={() => {
                                  const otherBase = base === 'Fresa' ? 'Mango' : 'Fresa';
                                  setSelectedFrutas(prev => [base, ...prev.filter(f => f !== otherBase && f !== 'Fresa' && f !== 'Mango')]);
                                }}
                                className={cn(
                                  "flex items-center justify-center gap-2 p-4 rounded-[1.5rem] transition-all border-2 text-center",
                                  isSelected
                                    ? "bg-primary/5 border-primary shadow-md scale-[1.02]"
                                    : "bg-white border-outline/10 hover:bg-surface-container-low"
                                )}
                              >
                                <span className="text-2xl">{base === 'Fresa' ? '🍓' : '🥭'}</span>
                                <div className="flex flex-col items-start">
                                  <span className={cn("font-black text-base tracking-tight", isSelected ? "text-primary" : "text-on-surface")}>
                                    {base}
                                  </span>
                                  {isSelected && <span className="text-[9px] font-black text-primary uppercase tracking-wider">✓ Elegida</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* FRUTAS FIJAS INCLUIDAS: Banano y Papaya (removibles) */}
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Frutas incluidas</p>
                        <div className="flex gap-2 flex-wrap">
                          {['Banano', 'Papaya'].map(fruit => {
                            const included = selectedFrutas.includes(fruit);
                            return (
                              <button
                                key={fruit}
                                onClick={() => setSelectedFrutas(prev =>
                                  prev.includes(fruit) ? prev.filter(f => f !== fruit) : [...prev, fruit]
                                )}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 transition-all text-sm font-bold",
                                  included
                                    ? "bg-success/10 border-success text-success"
                                    : "bg-white border-outline/20 text-secondary/50 line-through"
                                )}
                              >
                                <span className="text-lg">{fruit === 'Banano' ? '🍌' : '🍈'}</span>
                                <span>{fruit}</span>
                                {included
                                  ? <span className="text-[9px] font-black bg-success/20 text-success px-1.5 py-0.5 rounded-full">INCLUIDA</span>
                                  : <span className="text-[9px] font-black bg-outline/10 text-outline px-1.5 py-0.5 rounded-full">RETIRADA</span>
                                }
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-secondary/60 italic">Toca para incluir o retirar del pedido</p>
                      </div>
                    </div>
                  )}

                  {effectiveCurrentStepType === 'bases' && (
                    <div className="grid grid-cols-2 gap-3">
                      {availableBases.map(base => (
                        <button
                          key={base}
                          onClick={() => setSelectedBaseChoice(base)}
                          className={cn(
                            "relative flex items-center p-4 rounded-2xl transition-all border-2 text-left",
                            selectedBaseChoice === base
                              ? "bg-primary/5 border-primary shadow-sm scale-[1.02]"
                              : "bg-white border-outline/10 hover:bg-surface-container"
                          )}
                        >
                          <span className={cn(
                            "font-black text-sm",
                            selectedBaseChoice === base ? "text-primary" : "text-on-surface"
                          )}>
                            {base}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {effectiveCurrentStepType === 'custom_options' && product.customOptions && (
                    <div className="flex flex-col gap-6">
                      {product.customOptions.map(opt => (
                        <div key={opt.id} className="flex flex-col gap-3">
                          <label className="text-xs font-black uppercase tracking-widest text-secondary flex items-center gap-1">
                            {opt.name}
                            {opt.required && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {opt.choices.map(choice => {
                              const isSelected = selectedCustomOptions[opt.name] === choice;
                              return (
                                <button
                                  key={choice}
                                  onClick={() => setSelectedCustomOptions(prev => ({ ...prev, [opt.name]: choice }))}
                                  className={cn(
                                    "px-5 py-3 rounded-2xl font-bold text-sm transition-all border-2 flex-1 min-w-[120px]",
                                    isSelected 
                                      ? "bg-primary border-primary text-white shadow-md scale-[1.02]" 
                                      : "bg-white border-outline/10 text-on-surface hover:bg-surface-container-low"
                                  )}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>
                        </div>
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
                                : "bg-white border-outline/10 hover:bg-surface-container-low cursor-pointer"
                            )}
                            onClick={count === 0 ? () => {
                              if (currentScoops < maxScoops) {
                                setSelectedFlavors([...selectedFlavors, flavor.name]);
                              } else {
                                toast.info(`Solo puedes elegir ${maxScoops} ${maxScoops === 1 ? 'sabor' : 'sabores'}`);
                              }
                            } : undefined}
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              {flavor.name.toLowerCase() === 'sin helado' ? (
                                <Ban className={cn("w-4 h-4 shrink-0", count > 0 ? "text-red-500" : "text-red-400")} />
                              ) : (
                                <IceCream className={cn("w-4 h-4 shrink-0", count > 0 ? "text-primary" : "text-secondary")} />
                              )}
                              <span className={cn("text-xs font-black leading-tight", 
                                flavor.name.toLowerCase() === 'sin helado' ? (count > 0 ? "text-red-600" : "text-red-500") : 
                                (count > 0 ? "text-primary" : "text-on-surface")
                              )}>{flavor.name}</span>
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
                                    if (currentScoops < maxScoops) {
                                      setSelectedFlavors([...selectedFlavors, flavor.name]);
                                    } else {
                                      toast.info(`Solo puedes elegir ${maxScoops} ${maxScoops === 1 ? 'sabor' : 'sabores'}`);
                                    }
                                  }}
                                  disabled={currentScoops >= maxScoops}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "w-full py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary font-bold text-[10px] uppercase tracking-widest transition-all text-center",
                                  currentScoops >= maxScoops ? "opacity-50" : ""
                                )}
                              >
                                Agregar
                              </div>
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
                            {fruta === 'Fresa' ? '🍓' : fruta === 'Mango' ? '🥭' : fruta === 'Durazno' ? '🍑' : fruta === 'Manzana' ? '🍎' : fruta === 'Banano' ? '🍌' : fruta === 'Uva' ? '🍇' : fruta === 'Papaya' ? '🍈' : fruta === 'Kiwi' ? '🥝' : '🍍'}
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
                      {[...(product.sauceOptions || SALSAS), 'Sin Salsa'].map(sauce => (
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
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from(new Set([...(fruitOptions || []), ...FRUTAS_DEFAULT])).filter(f => f !== 'Mixta').map(fruta => {
                          const count = extraFrutas.filter(f => f === fruta).length;
                          const isIncluded = selectedFrutas.includes(fruta);
                          return (
                            <div
                              key={fruta}
                              onClick={() => setExtraFrutas([...extraFrutas, fruta])}
                              className={cn(
                                "relative flex flex-col p-2.5 rounded-2xl border-2 transition-all cursor-pointer select-none",
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
                        {allFlavors.filter(f => f.isAvailable && f.name.toLowerCase() !== 'sin helado').map(flavor => {
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
                      selectedAdditions.filter(a => 
                        !a.name.toLowerCase().includes('fruta') && 
                        !a.name.toLowerCase().includes('helado') && 
                        !a.name.toLowerCase().includes('salsa')
                      ).reduce((s, a) => s + a.price, 0) + 
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

      {/* PRODUCT DETAIL SHEET (image + descripción + variantes) */}
      <AnimatePresence>
        {showFullImage && product.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md cursor-pointer"
            onClick={() => setShowFullImage(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-y-auto max-h-screen sm:max-h-[96vh] cursor-default shadow-2xl"
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden sticky top-0 z-10 bg-white">
                <div className="w-10 h-1 bg-outline/20 rounded-full" />
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowFullImage(false)}
                className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center transition-colors text-white backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Imagen completa sin recorte */}
              <div className="relative w-full bg-black">
                <img
                  src={getAssetUrl(product.imageUrl)}
                  alt={product.name}
                  className="w-full h-auto object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-5">
                  <span className="px-2 py-0.5 rounded-full bg-primary/90 text-white text-[8px] font-black uppercase tracking-[0.2em] shadow-lg">
                    {product.category}
                  </span>
                  <h2 className="font-brand font-black text-2xl text-white drop-shadow-lg mt-1 leading-tight">
                    {product.name}
                  </h2>
                </div>
              </div>

              {/* Contenido: descripción + variantes */}
              <div className="px-5 py-5 flex flex-col gap-5">

                {/* Descripción */}
                {product.description && (
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1.5">Descripción</p>
                    <p className="text-sm text-on-surface/80 leading-relaxed">{product.description}</p>
                  </div>
                )}

                {/* Variantes */}
                {product.variants && product.variants.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Opciones y Precios</p>
                    <div className="flex flex-col gap-2">
                      {product.variants.map((v) => (
                        <div
                          key={v.label}
                          className="flex items-center justify-between px-4 py-3 bg-surface-container rounded-2xl border border-outline/10"
                        >
                          <div className="flex items-center gap-2">
                            {v.scoops != null && v.scoops > 0 && (
                              <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-lg">
                                {v.scoops} {v.scoops === 1 ? 'bola' : 'bolas'}
                              </span>
                            )}
                            <span className="font-bold text-sm text-on-surface">{v.label}</span>
                          </div>
                          <span className="font-brand font-black text-base text-primary">
                            {formatCurrency(v.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precio base (si no tiene variantes) */}
                {(!product.variants || product.variants.length === 0) && product.basePrice && (
                  <div className="flex items-center justify-between px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10">
                    <span className="font-bold text-sm text-on-surface">Precio</span>
                    <span className="font-brand font-black text-lg text-primary">{formatCurrency(product.basePrice)}</span>
                  </div>
                )}

                {/* Botón cerrar */}
                <button
                  onClick={() => setShowFullImage(false)}
                  className="w-full h-12 bg-on-surface text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
