import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, CartItem } from '../types';
import { useAuthStore } from '../stores/useAuthStore';
import { useTableCartStore } from '../stores/useTableCartStore';
import { useHeaderStore } from '../stores/useHeaderStore';
import { useCategoriesStore } from '../stores/useCategoriesStore';
import { 
  MenuSquare, 
  ShoppingBag, 
  Plus, 
  Minus,
  ShoppingCart,
  IceCream,
  Search,
  X
} from 'lucide-react';
import { formatCurrency, cn, getAssetUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import OrderConfigModal from '../components/OrderConfigModal';
import CartDrawer from '../components/CartDrawer';
import ProductDetailsCarousel from '../components/ProductDetailsCarousel';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

export default function POS() {
  const location = useLocation();
  const { profile } = useAuthStore();
  const { activeTable, setActiveTable, carts, addItem, removeItem, updateQuantity, initialize } = useTableCartStore();
  const { activeCategories } = useCategoriesStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editingStep, setEditingStep] = useState<number | undefined>(undefined);
  const [showFidelityTargetModal, setShowFidelityTargetModal] = useState(false);
  const [isOwnerConsumptionMode, setIsOwnerConsumptionMode] = useState(false);
  const [extraTables, setExtraTables] = useState<number>(0);

  // Sync extra tables with active carts from Firebase
  useEffect(() => {
    const activeMesaNumbers = Object.keys(carts)
      .filter(key => key.startsWith('mesa') && carts[key].items && carts[key].items.length > 0)
      .map(key => parseInt(key.replace('mesa', ''), 10))
      .filter(num => !isNaN(num) && num > 3);
    
    if (activeMesaNumbers.length > 0) {
      const maxMesa = Math.max(...activeMesaNumbers);
      if (maxMesa - 3 > extraTables) {
        setExtraTables(maxMesa - 3);
      }
    }
  }, [carts, extraTables]);

  const handleEdit = (item: CartItem, step?: number) => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      setEditingItem(item);
      setEditingStep(step);
      setSelectedProduct(product);
      setIsCartOpen(false);
    } else {
      toast.error('Producto no encontrado');
    }
  };

  const handleAddItem = async (item: CartItem) => {
    let finalItem = { ...item };
    if (isOwnerConsumptionMode) {
      finalItem.isOwnerConsumption = true;
      finalItem.isLoyaltyReward = true;
      finalItem.unitPrice = 0;
      finalItem.subtotal = 0;
      setIsOwnerConsumptionMode(false);
      toast.success('Producto de autoconsumo registrado a $0');
    }

    if (editingItem) {
      // If we are editing, we remove the exact original ID first
      await removeItem(activeTable, editingItem.id);
      setEditingItem(null);
    }
    // Then add the new one (addItem handles merging if it matches an existing entry)
    await addItem(activeTable, finalItem);
  };

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  useEffect(() => {
    if (!profile) return;
    
    const q = query(collection(db, 'products'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const prods = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        
        // Sort: Adiciones last, then by salesCount (desc), then by name
        prods.sort((a, b) => {
          // 1. Adiciones always go last
          const isAddA = a.category === 'adiciones';
          const isAddB = b.category === 'adiciones';
          if (isAddA && !isAddB) return 1;
          if (!isAddA && isAddB) return -1;
          
          // 2. Then sort by salesCount (desc)
          const salesA = a.salesCount || 0;
          const salesB = b.salesCount || 0;
          if (salesB !== salesA) return salesB - salesA;
          
          // 3. Finally by name
          return a.name.localeCompare(b.name);
        });
        
        setProducts(prods);
        setLoading(false);
      },
      (error) => {
        console.error("Products listener error:", error);
        if (error.code === 'permission-denied') {
          setLoading(false);
        }
      }
    );
    return unsubscribe;
  }, [profile]);

  const categories = [
    { id: 'todos', label: 'Todos' },
    ...activeCategories.map(c => ({ id: c.id, label: c.label })),
    { id: 'premio-fidelidad', label: '⭐ Premio Fidelidad' },
  ];

  const baseTables = [
    { id: 'directa', label: 'Venta Directa', type: 'delivery' },
    { id: 'mesa1', label: 'Mesa 1', type: 'table' },
    { id: 'mesa2', label: 'Mesa 2', type: 'table' },
    { id: 'mesa3', label: 'Mesa 3', type: 'table' },
  ];

  const tables = [
    ...baseTables,
    ...Array.from({ length: extraTables }).map((_, i) => ({
      id: `mesa${i + 4}`, label: `Mesa ${i + 4}`, type: 'table'
    }))
  ];

  const filteredProducts = products
    .filter(p => {
      const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
    // products is already sorted by salesCount in the listener
  const itemCount = useTableCartStore(state => state.getItemCount(activeTable));

  const { setHeader, clearHeader } = useHeaderStore();

  useEffect(() => {
    setHeader({
      title: 'Punto de Venta',
      subtitle: 'Registra tus ventas y gestiona mesas',
      rightExtra: (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="hidden sm:flex relative items-center justify-center w-11 h-11 rounded-full bg-surface-container hover:bg-primary/5 transition-colors mr-2 group border border-outline/10"
          title="Ver carrito"
        >
          <ShoppingCart className="w-6 h-6 text-secondary group-hover:text-primary transition-colors" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
              {itemCount}
            </span>
          )}
        </button>
      )
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, itemCount]);

  return (
    <>
      <AnimatePresence>
        {selectedProduct && (
          <OrderConfigModal 
            isOpen={!!selectedProduct} 
            product={selectedProduct} 
            initialItem={editingItem}
            initialStep={editingStep}
            onClose={() => {
              setSelectedProduct(null);
              setEditingItem(null);
              setEditingStep(undefined);
            }} 
            onAdd={handleAddItem}
          />
        )}
      </AnimatePresence>

      <ProductDetailsCarousel
        products={filteredProducts}
        initialProductId={detailsProduct?.id || null}
        isOpen={!!detailsProduct}
        onClose={() => setDetailsProduct(null)}
        onAddToCart={(product) => {
          setDetailsProduct(null);
          const hasVariantSteps = product.variants?.some(v => v.steps && v.steps.length > 0) || false;
          const isComplex = (product.variants && product.variants.length > 1) || 
                            product.requiresFlavors || 
                            product.requiresFruitChoice || 
                            product.requiresSauces || 
                            product.requiresToppings || 
                            product.requiresSalpiconBase ||
                            hasVariantSteps ||
                            (product.customOptions && product.customOptions.length > 0);
          if (isComplex) {
            setSelectedProduct(product);
          } else {
            const minPrice = product.variants?.length ? Math.min(...product.variants.map(v => v.price)) : (product.basePrice || 0);
            const item: CartItem = {
              id: Math.random().toString(36).substr(2, 9),
              productId: product.id,
              productName: product.name,
              variantLabel: product.variants?.[0]?.label || '',
              description: '',
              flavors: [],
              fruitChoices: [],
              additions: [],
              quantity: 1,
              unitPrice: minPrice,
              subtotal: minPrice,
            };
            handleAddItem(item);
            toast.success(`${product.name} agregado`);
          }
        }}
      />
      
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onEdit={handleEdit}
        onRedeemLoyalty={() => {
          setShowFidelityTargetModal(true);
          setIsCartOpen(false);
        }}
      />

      <main className="flex-1 p-2.5 sm:p-6 flex flex-col gap-2 sm:gap-4 pb-32">
        {/* Mesas / Ubicación del Pedido */}
        <section id="mesas-section">
          <header className="flex items-center justify-between mb-0.5 px-1">
            <h3 className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">Ubicación del Pedido</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-success/20 ring-1 ring-success animate-pulse" />
                 <span className="text-[7.5px] font-bold text-secondary uppercase">Libre</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary/20 ring-1 ring-primary animate-pulse" />
                 <span className="text-[7.5px] font-bold text-secondary uppercase">Ocupada</span>
              </div>
            </div>
          </header>
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1.5 hide-scrollbar snap-x px-1">
            {tables.map((table) => {
              const isActive = activeTable === table.id;
              const cartEmpty = !carts[table.id]?.items.length;
              return (
                <button 
                  key={table.id}
                  onClick={() => setActiveTable(table.id)}
                  className={cn(
                    "snap-start flex-shrink-0 min-w-[54px] h-9 sm:h-10 rounded-xl flex items-center justify-center px-3 gap-1.5 transition-all duration-200 relative border-b-2 text-xs font-bold",
                    isActive 
                      ? (cartEmpty 
                          ? "bg-success text-white border-success shadow-md -translate-y-1" 
                          : "bg-primary text-white border-primary shadow-md -translate-y-1")
                      : (cartEmpty 
                          ? "bg-white border-success/20 text-success hover:border-success/50" 
                          : "bg-white border-primary/20 text-primary hover:border-primary/50"
                        )
                  )}
                >
                  <div className="flex items-center gap-1">
                     <ShoppingBag className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-inherit opacity-50")} />
                     <span className={cn("font-black text-xs", isActive ? "text-white" : "")}>
                        {table.type === 'delivery' ? '' : table.label.replace('Mesa ', '')}
                     </span>
                  </div>
                </button>
              );
            })}
            
            <button 
              className="flex-shrink-0 w-9 h-9 sm:h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary/40 hover:bg-primary/5 hover:text-primary transition-all border border-dashed border-outline/40"
              onClick={() => {
                setExtraTables(prev => prev + 1);
                toast.success(`Mesa ${extraTables + 4} agregada temporalmente`);
              }}
              title="Agregar Mesa"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Toolbar Unificado: Buscador (~35%) + Categorías */}
        <section id="toolbar-section" className="flex items-center gap-2 px-1">
          {/* Buscador ~35% */}
          <div className="relative w-[38%] min-w-[120px] max-w-[240px] flex-shrink-0 group">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="w-3.5 h-3.5 text-secondary/40 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-white border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl py-2 pl-8 pr-7 text-xs font-bold text-on-surface placeholder:text-secondary/40 transition-all outline-none"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2 flex items-center"
              >
                <div className="w-4 h-4 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
                  <X className="w-3 h-3 text-secondary/60" />
                </div>
              </button>
            )}
          </div>

          {/* Categorías en scroll horizontal */}
          <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.id === 'premio-fidelidad') {
                    setShowFidelityTargetModal(true);
                  } else {
                    setActiveCategory(cat.id);
                  }
                }}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-xl font-bold text-xs transition-all border flex-shrink-0",
                  activeCategory === cat.id 
                    ? "bg-primary border-primary text-white shadow-xs"
                    : cat.id === 'premio-fidelidad'
                      ? "bg-gradient-to-r from-amber-400 to-orange-500 border-orange-500 text-white shadow-xs"
                      : "bg-white border-outline/30 text-secondary hover:border-primary/30"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Cuadrícula de Productos: 2 por fila en móvil (grid-cols-2) */}
        <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-surface-container animate-pulse rounded-2xl" />
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product, i) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.35, 
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: i * 0.03 
                }}
                className="h-full"
              >
                <ProductCard 
                  product={product} 
                  onClick={() => setSelectedProduct(product)}
                  onDetailClick={() => setDetailsProduct(product)}
                  isOwnerConsumptionMode={isOwnerConsumptionMode}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-16 flex flex-col items-center opacity-30">
              <MenuSquare className="w-10 h-10 mb-2" />
              <p className="font-bold text-sm">No hay productos en esta categoría</p>
            </div>
          )}
        </section>
      </main>

      {/* Floating Cart Button - Mobile Only */}
      <AnimatePresence mode="wait">
        {itemCount > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ 
              scale: 0, 
              opacity: 0, 
              y: 20,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ y: -5 }}
            onClick={() => setIsCartOpen(true)}
            className="lg:hidden fixed bottom-28 right-6 w-16 h-16 bg-primary rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center text-white z-[60] border-4 border-white"
          >
            {/* Continuous subtle bounce container inside */}
            <motion.div
              animate={{
                y: [0, -6, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
              className="w-full h-full flex items-center justify-center relative"
            >
              <motion.div 
                key={itemCount}
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, -10, 10, 0],
                }}
                transition={{
                  duration: 0.5,
                  ease: "backOut"
                }}
                className="relative"
              >
                <ShoppingCart className="w-7 h-7" />
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-primary shadow-sm"
                >
                  {itemCount}
                </motion.span>
              </motion.div>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Target Modal for Fidelity Reward */}
      <AnimatePresence>
        {showFidelityTargetModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFidelityTargetModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-on-surface">Destinatario</h3>
                <button onClick={() => setShowFidelityTargetModal(false)} className="p-2 rounded-full hover:bg-surface-container transition-colors">
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>
              <p className="text-sm text-secondary font-medium mb-6">¿Para quién es este premio o consumo?</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowFidelityTargetModal(false);
                    if (window.confirm("¿Estás seguro de otorgar un premio por fidelidad para cliente (Cucurucho Doble Gratis)?")) {
                      const rewardProduct = products.find(p => p.id === 'cucurucho');
                      if (rewardProduct) {
                        const variant = rewardProduct.variants?.find(v => v.label === 'Doble') || rewardProduct.variants?.[1] || rewardProduct.variants?.[0];
                        setEditingItem({
                          id: Math.random().toString(36).substr(2, 9),
                          productId: rewardProduct.id,
                          productName: rewardProduct.name,
                          variantLabel: variant?.label || 'Doble',
                          description: '',
                          flavors: [],
                          fruitChoices: [],
                          additions: [],
                          quantity: 1,
                          unitPrice: 0,
                          subtotal: 0,
                          isLoyaltyReward: true,
                          isOwnerConsumption: false
                        } as any);
                        setEditingStep(1);
                        setSelectedProduct(rewardProduct);
                        setIsCartOpen(false);
                      } else {
                        toast.error('No se encontró el producto Cucurucho');
                      }
                    }
                  }}
                  className="w-full py-4 rounded-2xl bg-fuchsia-50 text-fuchsia-700 font-black text-xs uppercase tracking-widest hover:bg-fuchsia-100 transition-colors flex items-center justify-center gap-2"
                >
                  <IceCream className="w-5 h-5" />
                  Para Cliente
                </button>
                <button 
                  onClick={() => {
                    setShowFidelityTargetModal(false);
                    setIsOwnerConsumptionMode(true);
                    toast.success('Modo Autoconsumo: Selecciona cualquier producto a $0', { duration: 4000 });
                  }}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Para Propietario
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function ProductCard({ product, onClick, onDetailClick, isOwnerConsumptionMode }: { product: Product, onClick: () => void, onDetailClick?: () => void, isOwnerConsumptionMode?: boolean }) {
  const { activeTable, carts, addItem, updateQuantity, removeItem } = useTableCartStore();
  const [imgError, setImgError] = useState(false);
  
  const cartItems = carts[activeTable]?.items.filter(item => item.productId === product.id) || [];
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const hasVariantSteps = product.variants?.some(v => v.steps && v.steps.length > 0) || false;
  const isComplex = (product.variants && product.variants.length > 1) || 
                    product.requiresFlavors || 
                    product.requiresFruitChoice || 
                    product.requiresSauces || 
                    product.requiresToppings || 
                    product.requiresSalpiconBase ||
                    hasVariantSteps ||
                    (product.customOptions && product.customOptions.length > 0);
  const minPrice = product.variants?.length ? Math.min(...product.variants.map(v => v.price)) : (product.basePrice || 0);
  const priceDisplay = product.variants && product.variants.length > 1 ? `Desde ${formatCurrency(minPrice)}` : formatCurrency(minPrice);

  const handleMainClick = () => {
    if (isComplex) {
      onClick();
    } else {
      const unlockedItem = cartItems.find(i => !i.locked);
      if (!unlockedItem) {
        const item: CartItem = {
          id: Math.random().toString(36).substr(2, 9),
          productId: product.id,
          productName: product.name,
          variantLabel: product.variants?.[0]?.label || '',
          description: '',
          flavors: [],
          fruitChoices: [],
          additions: [],
          quantity: 1,
          unitPrice: isOwnerConsumptionMode ? 0 : minPrice,
          subtotal: isOwnerConsumptionMode ? 0 : minPrice,
          isOwnerConsumption: isOwnerConsumptionMode
        };
        addItem(activeTable, item);
        setIsOwnerConsumptionMode(false);
        toast.success(`${product.name} agregado`);
      }
    }
  };

  const handleUpdateQty = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (cartItems.length > 0 && !isComplex) {
      const unlockedItem = cartItems.find(i => !i.locked);
      
      if (delta === 1) {
        if (unlockedItem) {
           updateQuantity(activeTable, unlockedItem.id, 1);
        } else {
           const item: CartItem = {
             id: Math.random().toString(36).substr(2, 9),
             productId: product.id,
             productName: product.name,
             variantLabel: product.variants?.[0]?.label || '',
             description: '',
             flavors: [],
             fruitChoices: [],
             additions: [],
             quantity: 1,
             unitPrice: isOwnerConsumptionMode ? 0 : minPrice,
             subtotal: isOwnerConsumptionMode ? 0 : minPrice,
             isOwnerConsumption: isOwnerConsumptionMode
           };
           addItem(activeTable, item);
           setIsOwnerConsumptionMode(false);
        }
      } else if (delta === -1 && unlockedItem) {
        if (unlockedItem.quantity === 1) {
          removeItem(activeTable, unlockedItem.id);
        } else {
          updateQuantity(activeTable, unlockedItem.id, -1);
        }
      }
    }
  };

  const isAnimEnabled = typeof localStorage !== 'undefined' ? localStorage.getItem('ui_animations_enabled') !== 'false' : true;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleMainClick}
      className={cn(
        (!product.cardColor || !product.cardColor.startsWith('#')) && (product.cardColor || "bg-white"),
        "rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between relative border hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group h-full min-h-[175px] sm:min-h-[195px]",
        totalQuantity > 0 
          ? "ring-2 ring-primary shadow-md border-primary/40 bg-primary/[0.03] z-10" 
          : product.cardColor ? "border-outline/20 shadow-xs" : "border-outline/10 shadow-xs"
      )}
      style={product.cardColor?.startsWith('#') ? { backgroundColor: product.cardColor } : {}}
    >
      {/* Top Image + Quick Detail Button + Badges */}
      <motion.div 
        animate={isAnimEnabled ? {
          rotate: [0, -8, 8, -8, 0, 0, 0, 0, 0, 0],
          scale: [1, 1.06, 0.94, 1.06, 1, 1, 1, 1, 1, 1],
        } : {}}
        whileHover={{ scale: 1.03 }}
        transition={isAnimEnabled ? {
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: (product.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 20) / 10
        } : { duration: 0.2 }}
        className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-surface-container-low border border-outline/5 mb-2 flex-shrink-0"
      >
        {product.imageUrl && !imgError ? (
           <img 
             src={getAssetUrl(product.imageUrl)} 
             alt={product.name} 
             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
             onError={() => setImgError(true)} 
           />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
            <IceCream className="w-8 h-8 text-primary/30 group-hover:text-primary transition-colors" />
          </div>
        )}
        
        {/* Detail Inspector Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDetailClick ? onDetailClick() : onClick();
          }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-xs z-10"
          title="Ver detalle del producto"
        >
          <Search className="w-3 h-3" />
        </button>

        {/* Category Tag */}
        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-xs text-[7.5px] font-black text-white uppercase tracking-widest truncate max-w-[80%] z-10">
          {product.category}
        </span>

        {/* Quantity Badge */}
        {totalQuantity > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] font-black w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shadow-md border border-white z-10">
            {totalQuantity}
          </div>
        )}
      </motion.div>

      {/* Content: Title & Price + Add Button */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <h3 className="font-bold text-on-surface text-xs sm:text-sm leading-snug line-clamp-2 mb-1.5">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between mt-auto pt-1">
          <p className="text-primary font-black text-xs sm:text-sm leading-none">
            {isOwnerConsumptionMode ? "$0" : priceDisplay}
          </p>

          {/* Quick UI Add controls right inside the item details */}
          {!isComplex && totalQuantity > 0 ? (
            <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => handleUpdateQty(e, -1)}
                className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-white shadow-xs hover:text-primary text-secondary rounded-md transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-black text-xs w-3.5 text-center">{totalQuantity}</span>
              <button 
                onClick={(e) => handleUpdateQty(e, 1)}
                className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-white shadow-xs hover:text-primary text-secondary rounded-md transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
