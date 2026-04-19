import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, CartItem } from '../types';
import { useAuthStore } from '../stores/useAuthStore';
import { useTableCartStore } from '../stores/useTableCartStore';
import { useFlavorsStore } from '../stores/useFlavorsStore';
import { 
  MenuSquare, 
  Table as TableIcon, 
  Receipt, 
  ShoppingBag, 
  Plus, 
  Minus,
  ShoppingCart,
  Menu,
  Database,
  Search,
  LayoutDashboard,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import OrderConfigModal from '../components/OrderConfigModal';
import CartDrawer from '../components/CartDrawer';
import { toast } from 'sonner';
import { Link, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AppHeader, { HeaderSearch } from '../components/AppHeader';
import BottomNav from '../components/BottomNav';

export default function POS() {
  const location = useLocation();
  const { profile } = useAuthStore();
  const { activeTable, setActiveTable, carts, addItem, removeItem, updateQuantity, initialize } = useTableCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  const handleEdit = (item: CartItem) => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      setEditingItem(item);
      setSelectedProduct(product);
      setIsCartOpen(false);
    } else {
      toast.error('Producto no encontrado');
    }
  };

  const handleAddItem = async (item: CartItem) => {
    if (editingItem) {
      // If we are editing, we remove the exact original ID first
      await removeItem(activeTable, editingItem.id);
      setEditingItem(null);
    }
    // Then add the new one (addItem handles merging if it matches an existing entry)
    await addItem(activeTable, item);
  };

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  useEffect(() => {
    if (!profile) return;
    
    const q = query(collection(db, 'products'), where('isActive', '==', true), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const prods = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
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
    { id: 'helados', label: 'Helados' },
    { id: 'ensaladas', label: 'Ensaladas' },
    { id: 'copas', label: 'Copas' },
    { id: 'salpicon', label: 'Salpicón' },
    { id: 'obleas', label: 'Obleas' },
    { id: 'adiciones', label: 'Adiciones' },
  ];

  const tables = [
    { id: 'paraLlevar', label: 'Para Llevar', type: 'delivery' },
    { id: 'mesa1', label: 'Mesa 1', type: 'table' },
    { id: 'mesa2', label: 'Mesa 2', type: 'table' },
    { id: 'mesa3', label: 'Mesa 3', type: 'table' },
    { id: 'mesa4', label: 'Mesa 4', type: 'table' },
    { id: 'mesa5', label: 'Mesa 5', type: 'table' },
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const itemCount = useTableCartStore(state => state.getItemCount(activeTable));

  return (
    <div className="min-h-screen flex bg-surface">
      <AnimatePresence>
        {selectedProduct && (
          <OrderConfigModal 
            isOpen={!!selectedProduct} 
            product={selectedProduct} 
            initialItem={editingItem}
            onClose={() => {
              setSelectedProduct(null);
              setEditingItem(null);
            }} 
            onAdd={handleAddItem}
          />
        )}
      </AnimatePresence>
      
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onEdit={handleEdit}
      />

      <AdminSidebar />

      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        <AppHeader
          showBell
          left={
            <HeaderSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar producto..."
            />
          }
        />

        <main className="flex-1 p-4 sm:p-8 flex flex-col gap-6 sm:gap-10 pb-32">
          <section id="mesas-section">
            <header className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Ubicación del Pedido</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-3">
                   <div className="w-2 h-2 rounded-full bg-success/20 ring-1 ring-success animate-pulse" />
                   <span className="text-[8px] font-bold text-secondary uppercase">Libre</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-primary/20 ring-1 ring-primary animate-pulse" />
                   <span className="text-[8px] font-bold text-secondary uppercase">Ocupada</span>
                </div>
              </div>
            </header>
            <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar snap-x px-1">
              {tables.map((table, index) => {
                const isActive = activeTable === table.id;
                const cartEmpty = !carts[table.id]?.items.length;
                return (
                  <button 
                    key={table.id}
                    onClick={() => setActiveTable(table.id)}
                    className={cn(
                      "snap-start flex-shrink-0 min-w-[60px] h-12 rounded-xl flex items-center justify-center px-4 gap-2 transition-all duration-300 relative border-b-4",
                      isActive 
                        ? (cartEmpty 
                            ? "bg-success text-white border-success shadow-xl -translate-y-1" 
                            : "bg-primary text-white border-primary shadow-xl -translate-y-1")
                        : (cartEmpty 
                            ? "bg-white border-success/20 text-success hover:border-success/50" 
                            : "bg-white border-primary/20 text-primary hover:border-primary/50"
                          )
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                       <ShoppingBag className={cn("w-4 h-4", isActive ? "text-white" : "text-inherit opacity-40")} />
                       <span className={cn("font-black text-sm", isActive ? "text-white" : "")}>
                          {table.type === 'delivery' ? '' : table.label.replace('Mesa ', '')}
                       </span>
                    </div>
                  </button>
                );
              })}
              
              <button 
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary/20 hover:bg-primary/5 hover:text-primary transition-all border-2 border-dashed border-outline/40"
                onClick={() => toast.info('Función para agregar mesas próximamente')}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </section>

          <section id="search-section" className="px-1">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-secondary/40 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busca por nombre de producto..."
                className="w-full bg-white border-2 border-outline/30 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-on-surface placeholder:text-secondary/30 transition-all outline-none"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center hover:bg-surface-container transition-colors">
                    <X className="w-4 h-4 text-secondary/60" />
                  </div>
                </button>
              )}
            </div>
          </section>

          <section id="catalogo-section">
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "whitespace-nowrap px-6 py-2.5 rounded-xl font-bold text-xs transition-all border-2",
                    activeCategory === cat.id 
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                      : "bg-white border-outline/50 text-secondary hover:border-primary/30"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-8">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-surface-container animate-pulse rounded-3xl" />
              ))
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div key={product.id}>
                  <ProductCard 
                    product={product} 
                    onClick={() => setSelectedProduct(product)}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center opacity-20">
                <MenuSquare className="w-12 h-12 mb-4" />
                <p className="font-bold">No hay productos en esta categoría</p>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Floating Cart Button - Mobile Only */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.button
            initial={{ scale: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              y: 0,
            }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ y: -5 }}
            exit={{ scale: 0, y: 20 }}
            onClick={() => setIsCartOpen(true)}
            className="lg:hidden fixed bottom-28 right-6 w-16 h-16 bg-primary rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center text-white z-[60] border-4 border-white"
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
          </motion.button>
        )}
      </AnimatePresence>

      <BottomNav onCartOpen={() => setIsCartOpen(true)} />
    </div>
  );
}

function ProductCard({ product, onClick }: { product: Product, onClick: () => void }) {
  const { activeTable, carts, addItem, updateQuantity, removeItem } = useTableCartStore();
  
  const cartItems = carts[activeTable]?.items.filter(item => item.productId === product.id) || [];
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const isComplex = product.variants && product.variants.length > 0 || product.requiresFlavors || product.requiresFruitChoice;

  const handleSimpleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isComplex) {
      onClick();
      return;
    }

    const item: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      productName: product.name,
      variantLabel: '',
      description: '',
      flavors: [],
      fruitChoices: [],
      additions: [],
      quantity: 1,
      unitPrice: product.basePrice || 0,
      subtotal: product.basePrice || 0,
    };
    addItem(activeTable, item);
    toast.success(`${product.name} agregado`);
  };

  const handleUpdateQty = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (cartItems.length === 1 && !isComplex) {
      if (delta === -1 && cartItems[0].quantity === 1) {
        removeItem(activeTable, cartItems[0].id);
      } else {
        updateQuantity(activeTable, cartItems[0].id, delta);
      }
    } else {
      // For complex items, we open the cart or modal
      onClick();
    }
  };

  const handleMainClick = () => {
    if (isComplex) {
      onClick();
    } else {
      handleSimpleAdd({ stopPropagation: () => {} } as React.MouseEvent);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleMainClick}
      className={cn(
        "bg-white rounded-[2rem] p-3 sm:p-5 border border-outline/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer group flex sm:flex-col h-full gap-4",
        totalQuantity > 0 && "ring-2 ring-primary/20 bg-primary/5"
      )}
    >
      {/* Icon / Avatar */}
      <div className="w-20 h-20 sm:w-full sm:aspect-square bg-surface-container rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors flex-shrink-0 relative overflow-hidden">
        <MenuSquare className="w-8 h-8 sm:w-10 sm:h-10 text-secondary/20 group-hover:text-primary/20" />
        {totalQuantity > 0 && !isComplex && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-2xl font-black text-primary">{totalQuantity}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center sm:justify-start">
        <div className="flex justify-between items-start mb-1">
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-[8px] sm:text-[9px] font-black text-secondary uppercase tracking-widest translate-y-[-2px]">
            {product.category}
          </span>
          <span className="hidden sm:inline text-sm font-black text-on-surface">
            {product.basePrice ? formatCurrency(product.basePrice) : '---'}
          </span>
        </div>
        
        <h4 className="font-headline font-bold text-sm sm:text-base text-on-surface mb-0.5 sm:mb-1 line-clamp-1">
          {product.name}
        </h4>
        
        <div className="sm:hidden text-xs font-black text-primary mb-3">
          {product.basePrice ? formatCurrency(product.basePrice) : 'Precio variable'}
        </div>

        <div className="mt-auto flex items-center justify-between sm:pt-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400">Stock: 12</span>
          </div>

          <div className="flex-shrink-0">
            {totalQuantity > 0 && !isComplex ? (
              <div className="flex items-center bg-primary rounded-xl p-1 gap-3 shadow-lg shadow-primary/20">
                <button 
                  onClick={(e) => handleUpdateQty(e, -1)}
                  className="w-7 h-7 flex items-center justify-center bg-white/20 rounded-lg hover:bg-white/30 text-white"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <span className="text-xs font-black text-white w-4 text-center">{totalQuantity}</span>
                <button 
                  onClick={(e) => handleUpdateQty(e, 1)}
                  className="w-7 h-7 flex items-center justify-center bg-white/20 rounded-lg hover:bg-white/30 text-white"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSimpleAdd}
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                  totalQuantity > 0 
                    ? "bg-primary text-white" 
                    : "bg-surface-container text-secondary/40 group-hover:bg-primary group-hover:text-white"
                )}
              >
                {totalQuantity > 0 && isComplex ? (
                  <div className="relative">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{totalQuantity}</span>
                  </div>
                ) : (
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SidebarLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-sm font-bold cursor-pointer group",
      active 
        ? "bg-primary text-white shadow-lg shadow-primary/20" 
        : "text-slate-500 hover:text-white hover:bg-white/5"
    )}>
      <span className={cn("transition-colors", active ? "text-white" : "text-slate-600 group-hover:text-primary")}>{icon}</span>
      <span className="tracking-tight">{label}</span>
      {active && <div className="ml-auto w-1 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />}
    </div>
  );
}

function BottomNavLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 transition-all",
      active ? "text-primary scale-110" : "text-secondary/40"
    )}>
      {icon}
      <span className={cn("text-[9px] font-black uppercase tracking-widest", active ? "opacity-100" : "opacity-0")}>{label}</span>
      {active && <div className="w-1 h-1 rounded-full bg-primary mt-1 shadow-[0_0_8px_#E91E8C]" />}
    </div>
  );
}
