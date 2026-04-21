import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { Product, ProductVariant } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, X, Plus, Minus, Search, IceCream, 
  Utensils, GlassWater, CupSoda, Package, MapPin,
  Navigation, Banknote, Smartphone, CreditCard, Hash,
  CheckCircle2, ChevronRight, Trash2
} from 'lucide-react';
import AppHeader, { HeaderSearch, PageTitle } from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import OrderConfigModal from '../components/OrderConfigModal';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variantLabel?: string;
  description?: string;
  flavors?: string[];
  fruitChoices?: string[];
  additions?: string[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

const CATEGORIES = [
  { id: 'all',       label: 'Todos',     icon: <Package className="w-4 h-4" /> },
  { id: 'helados',   label: 'Helados',   icon: <IceCream className="w-4 h-4" /> },
  { id: 'ensaladas', label: 'Ensaladas', icon: <Utensils className="w-4 h-4" /> },
  { id: 'copas',     label: 'Copas',     icon: <GlassWater className="w-4 h-4" /> },
  { id: 'salpicon',  label: 'Salpicón',  icon: <CupSoda className="w-4 h-4" /> },
  { id: 'obleas',    label: 'Obleas',    icon: <Package className="w-4 h-4" /> },
  { id: 'adiciones', label: 'Adiciones', icon: <Plus className="w-4 h-4" /> },
];

const PAYMENT_OPTIONS = [
  { id: 'efectivo',      label: 'Efectivo',       icon: <Banknote className="w-4 h-4" /> },
  { id: 'transferencia', label: 'Transferencia',  icon: <Smartphone className="w-4 h-4" /> },
  { id: 'datafono',      label: 'Datáfono',       icon: <CreditCard className="w-4 h-4" /> },
  { id: 'credito',       label: 'A Crédito',      icon: <Hash className="w-4 h-4" /> },
];

export default function ClientCompras() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('dli_heladeria_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    localStorage.setItem('dli_heladeria_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('isActive', '==', true), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
    });
    return unsub;
  }, []);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const cartTotal = cart.reduce((acc, i) => acc + i.subtotal, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id
          ? { ...c, quantity: c.quantity + item.quantity, subtotal: c.unitPrice * (c.quantity + item.quantity) }
          : c
        );
      }
      return [...prev, item];
    });
    toast.success(`${item.productName} agregado`);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: qty, subtotal: c.unitPrice * qty } : c));
  };

  const getGPS = () => {
    if (!navigator.geolocation) { 
      toast.error('Tu dispositivo no soporta GPS o requiere conexión segura (HTTPS)'); 
      return; 
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          setAddress(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          toast.success('Ubicación detectada');
        } catch (err) {
          console.error('GPS Fetch Error:', err);
          setAddress(`Lat: ${pos.coords.latitude.toFixed(5)}, Lon: ${pos.coords.longitude.toFixed(5)}`);
          toast.warning('Se obtuvo coordenadas pero no la dirección exacta');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => { 
        console.error('GPS Permission Error:', err);
        if (err.code === 1) toast.error('Permiso de ubicación denegado');
        else if (err.code === 2) toast.error('Ubicación no disponible');
        else if (err.code === 3) toast.error('Tiempo de espera agotado');
        else toast.error('Error al obtener GPS');
        setGpsLoading(false); 
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePlaceOrder = async () => {
    if (!address.trim()) { toast.error('Ingresa una dirección de entrega'); return; }
    if (cart.length === 0) { toast.error('Agrega al menos un producto'); return; }
    if (!profile) return;

    setPlacing(true);
    try {
      await addDoc(collection(db, 'pedidos'), {
        clienteId: profile.uid,
        clienteName: profile.name,
        items: cart,
        total: cartTotal,
        paymentMethod,
        address: address.trim(),
        note: note.trim(),
        status: 'pendiente',
        createdAt: serverTimestamp(),
        messages: [],
      });
      toast.success('¡Pedido enviado! Pronto te confirmaremos.');
      setCart([]);
      setShowCheckout(false);
      setAddress('');
      setNote('');
      setPaymentMethod('efectivo');
    } catch (err: any) {
      console.error('Order Submission Error:', err);
      toast.error(`Error al enviar: ${err.message || 'Error desconocido'}`);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-container-lowest to-surface-container/20 pb-32">
      <AppHeader
        showBell
        left={
          <HeaderSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar un producto..."
          />
        }
      />
      <PageTitle title="Mis Compras" subtitle="Elige tus antojos D'LI" />

      <main className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-5 pt-2">
        {/* Category filter */}
        <div className="flex gap-1.5 p-1 overflow-x-auto hide-scrollbar bg-surface-container rounded-xl text-[10px] font-black uppercase">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2 sm:py-1.5 rounded-lg transition-all flex items-center gap-2 flex-shrink-0",
                activeCategory === cat.id
                  ? "bg-on-surface text-white shadow-sm"
                  : "text-secondary hover:bg-surface"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const productInCart = cart.filter(item => item.productId === product.id);
            const totalQuantity = productInCart.reduce((sum, i) => sum + i.quantity, 0);
            const isComplex = (product.variants && product.variants.length > 0) || product.requiresFlavors || product.requiresFruitChoice;

            const handleCardClick = () => {
              if (isComplex) {
                setSelectedProduct(product);
              } else {
                if (totalQuantity === 0) {
                  const item = {
                    id: Math.random().toString(36).substr(2, 9),
                    productId: product.id,
                    productName: product.name,
                    quantity: 1,
                    unitPrice: product.basePrice || 0,
                    subtotal: product.basePrice || 0,
                  };
                  addToCart(item);
                }
              }
            };

            const handleUpdateQty = (e: React.MouseEvent, delta: number) => {
              e.stopPropagation();
              if (productInCart.length > 0 && !isComplex) {
                updateQty(productInCart[0].id, productInCart[0].quantity + delta);
              }
            };

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleCardClick}
                className={cn(
                  "bg-white rounded-[1.5rem] p-3 flex items-center gap-3 relative border hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group",
                  totalQuantity > 0 ? "ring-2 ring-primary/40 bg-primary/5 border-primary/40 shadow-sm" : "border-outline/10 shadow-sm"
                )}
              >
                {/* Zone 1: Image -> Opens Details manually via a soon-to-be-added Details Modal if they click here */}
                <div 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setDetailsProduct(product); 
                  }}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-surface-container-low border border-outline/5 transition-transform group-hover:scale-105 duration-300"
                >
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <IceCream className="w-8 h-8 text-secondary/30 absolute inset-0 m-auto group-hover:text-primary transition-colors" />
                  )}
                  
                  {totalQuantity > 0 && !isComplex && (
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-xl font-black text-primary drop-shadow-md">{totalQuantity}</span>
                    </div>
                  )}
                </div>

                {/* Zone 2: Rest of Card */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex w-full justify-between items-center mb-0.5">
                    <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-[7px] font-black text-secondary uppercase tracking-widest truncate max-w-[60px]">
                      {product.category}
                    </span>
                    {totalQuantity > 0 && (
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>

                  <h3 className="font-bold text-on-surface text-sm sm:text-base leading-tight w-full line-clamp-2 mb-1">{product.name}</h3>
                  
                  <div className="flex justify-between items-end mt-1">
                    <p className="text-primary font-black text-base sm:text-lg leading-none">
                      {product.basePrice ? formatCurrency(product.basePrice) : 'Var. P'}
                    </p>

                    {/* Quantity Controls inside logic */}
                    {!isComplex && totalQuantity > 0 ? (
                      <div className="flex items-center gap-3 bg-surface-container rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleUpdateQty(e, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-white shadow-sm hover:text-primary text-secondary rounded-md transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-sm w-4 text-center">{totalQuantity}</span>
                        <button 
                          onClick={(e) => handleUpdateQty(e, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white shadow-sm hover:text-primary text-secondary rounded-md transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : !isComplex && totalQuantity === 0 ? (
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        <Plus className="w-4 h-4" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <IceCream className="w-12 h-12 mb-3" />
            <p className="text-sm font-bold">Sin productos en esta categoría</p>
          </div>
        )}
      </main>

      {/* Order Config Modal */}
      {selectedProduct && (
        <OrderConfigModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      )}

      {/* Product Details Modal (Image & Info) */}
      <AnimatePresence>
        {detailsProduct && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailsProduct(null)}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="relative w-full aspect-square bg-surface-container-low">
                {detailsProduct.imageUrl ? (
                  <img src={detailsProduct.imageUrl} alt={detailsProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-secondary/30">
                    <IceCream className="w-24 h-24" />
                  </div>
                )}
                <button
                  onClick={() => setDetailsProduct(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-surface-container rounded-lg text-[9px] font-black uppercase tracking-widest text-secondary">
                    {detailsProduct.category}
                  </span>
                </div>
                <h3 className="text-2xl font-headline font-black text-on-surface leading-tight mb-2">
                  {detailsProduct.name}
                </h3>
                <p className="text-sm text-secondary font-medium leading-relaxed mb-6">
                  {detailsProduct.description || "Deliciosa opción preparada con ingredientes de la más alta calidad en D'LI."}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Precio Base</p>
                  <p className="text-xl font-black text-primary">
                    {detailsProduct.basePrice ? formatCurrency(detailsProduct.basePrice) : 'Var. P'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Checkout Modal (95vh) */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCheckout(false)}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white w-[94%] max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col h-[90dvh] sm:h-auto sm:max-h-[85vh] overflow-hidden"
            >
              {/* Handle mobile */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-outline/30 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 pt-4 pb-3 flex items-start justify-between border-b border-outline/10">
                <div>
                  <h3 className="font-headline font-black text-xl text-on-surface">Finalizar Pedido</h3>
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-0.5">Confirma tu selección y entrega</p>
                </div>
                <button onClick={() => setShowCheckout(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-all active:scale-90">
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar flex flex-col gap-8 pb-10">
                
                {/* 1. Resumen de Productos */}
                <section>
                   <div className="flex items-center justify-between mb-4">
                      <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface">Mi Pedido</h4>
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black">{cartCount} items</span>
                   </div>
                   <div className="flex flex-col gap-3">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-2xl bg-surface-container-lowest border border-outline/5">
                           <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                              <IceCream className="w-6 h-6 text-primary/40" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-on-surface truncate">{item.productName}</p>
                              {item.variantLabel && <p className="text-[10px] font-bold text-secondary italic mb-0.5">{item.variantLabel}</p>}
                              <p className="text-primary font-black text-xs">{formatCurrency(item.unitPrice)}</p>
                           </div>
                           <div className="flex items-center gap-2.5 bg-surface-container rounded-full p-1 border border-outline/5">
                              <button 
                                onClick={() => updateQty(item.id, item.quantity - 1)} 
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-secondary hover:text-primary shadow-sm active:scale-90 transition-all"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateQty(item.id, item.quantity + 1)} 
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-secondary hover:text-primary shadow-sm active:scale-90 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                {/* 2. Total */}
                <div className="bg-on-surface rounded-3xl p-6 flex items-center justify-between shadow-xl shadow-on-surface/10">
                  <div>
                    <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">Total del Pedido</p>
                    <p className="text-3xl font-brand font-black text-white">{formatCurrency(cartTotal)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center rotate-12">
                    <ShoppingCart className="w-7 h-7 text-white/30" />
                  </div>
                </div>

                {/* 3. Pago */}
                <section>
                   <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface mb-4">Forma de Pago</h4>
                   <div className="grid grid-cols-2 gap-3">
                     {PAYMENT_OPTIONS.slice(0, 3).map(opt => (
                       <button
                         key={opt.id}
                         onClick={() => setPaymentMethod(opt.id)}
                         className={cn(
                           "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all relative overflow-hidden",
                           paymentMethod === opt.id
                             ? "bg-primary/5 border-primary text-primary"
                             : "border-outline/10 text-secondary hover:bg-surface-container"
                         )}
                       >
                         {opt.icon}
                         <span className="text-[10px] font-black uppercase tracking-wider">{opt.label}</span>
                         {paymentMethod === opt.id && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />}
                       </button>
                     ))}
                   </div>
                </section>

                {/* 4. Ubicación */}
                <section>
                   <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface mb-4">Ubicación de Entrega</h4>
                   <div className="flex flex-col gap-3">
                      <div className="relative group">
                        <div className="absolute top-4 left-4">
                           <MapPin className="w-5 h-5 text-secondary/40 group-focus-within:text-primary transition-colors" />
                        </div>
                        <textarea
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          placeholder="Calle, Número, Barrio o nombre del Edificio..."
                          rows={2}
                          className="w-full bg-surface-container-lowest border-2 border-outline/10 focus:border-primary rounded-2xl py-4 pl-12 pr-14 text-sm font-bold text-on-surface placeholder:text-secondary/20 transition-all outline-none resize-none"
                        />
                        <button
                          onClick={getGPS}
                          className="absolute top-3.5 right-3.5 w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                          disabled={gpsLoading}
                          title="Usar mi ubicación actual"
                        >
                           {gpsLoading ? (
                             <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                           ) : (
                             <Navigation className="w-4 h-4" />
                           )}
                        </button>
                      </div>

                      <div className="bg-surface-container rounded-2xl p-4 flex gap-3 items-start border border-outline/5">
                         <span className="text-lg mt-0.5">💬</span>
                         <textarea
                           value={note}
                           onChange={e => setNote(e.target.value)}
                           placeholder="Indicaciones adicionales (Ej: Tocar timbre fuerte)"
                           rows={2}
                           className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-on-surface placeholder:text-secondary/20 resize-none"
                         />
                      </div>
                   </div>
                </section>
              </div>

              {/* Action Button */}
              <div className="px-6 py-6 bg-surface-container-low border-t border-outline/10">
                <button
                  onClick={handlePlaceOrder}
                  disabled={!address.trim() || cart.length === 0 || placing}
                  className="w-full py-5 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-3"
                >
                  {placing ? (
                    <div className="w-6 h-6 border-3 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      Enviar Mi Pedido
                    </>
                  )}
                </button>
                {!address.trim() && cart.length > 0 && (
                  <p className="text-center text-[10px] text-primary font-black uppercase tracking-widest mt-3 animate-pulse">
                     Falta tu dirección de entrega
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Floating Cart Button for Client */}
      <AnimatePresence>
        {cart.length > 0 && !showCheckout && (
          <motion.button
            initial={{ scale: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              y: 0,
            }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ y: -5 }}
            exit={{ scale: 0, y: 20 }}
            onClick={() => setShowCheckout(true)}
            className="fixed bottom-28 right-6 w-16 h-16 bg-primary rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center text-white z-[45] border-4 border-white"
          >
            <motion.div 
              key={cartCount}
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
                {cartCount}
              </motion.span>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
