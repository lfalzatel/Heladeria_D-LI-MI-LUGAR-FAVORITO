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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);

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
    if (!navigator.geolocation) { toast.error('Tu dispositivo no soporta GPS'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          setAddress(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } catch {
          setAddress(`Lat: ${pos.coords.latitude.toFixed(5)}, Lon: ${pos.coords.longitude.toFixed(5)}`);
        }
        setGpsLoading(false);
      },
      () => { toast.error('No se pudo obtener la ubicación'); setGpsLoading(false); }
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
      setShowCart(false);
      setAddress('');
      setNote('');
      setPaymentMethod('efectivo');
    } catch (err) {
      toast.error('Error al enviar el pedido');
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="bg-white rounded-[1.5rem] p-3 flex items-center gap-3 relative border hover:shadow-lg hover:border-primary/20 transition-all group active:scale-[0.98] text-left border-outline/10 shadow-sm"
            >
              {/* Integrated Image inside card */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-surface-container-low border border-outline/5 transition-transform group-hover:scale-105 duration-300">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <IceCream className="w-8 h-8 text-secondary/30 absolute inset-0 m-auto group-hover:text-primary transition-colors" />
                )}
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex w-full justify-between items-center mb-0.5">
                  <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-[7px] font-black text-secondary uppercase tracking-widest truncate max-w-[60px]">
                    {product.category}
                  </span>
                </div>

                <h3 className="font-bold text-on-surface text-sm leading-tight w-full line-clamp-2 mb-1">{product.name}</h3>
                
                <p className="text-primary font-black text-sm leading-none">
                  {product.variants && product.variants.length > 0
                    ? `Desde ${formatCurrency(Math.min(...product.variants.map(v => v.price)))}`
                    : formatCurrency(product.basePrice || 0)
                  }
                </p>
              </div>
            </button>
          ))}
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

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-outline/30 rounded-full" />
              </div>

              <div className="px-6 pt-3 pb-4 flex items-center justify-between border-b border-outline/10">
                <h3 className="font-headline font-bold text-lg">Mi Lista de Compra</h3>
                <button onClick={() => setShowCart(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cart header card */}
              <div className="px-6 py-4">
                <div className="flex items-center gap-4 bg-primary/5 rounded-2xl p-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <ShoppingCart className="w-7 h-7 text-primary" />
                    </div>
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-black text-on-surface text-base">Mi Carrito</p>
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Tu selección</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="px-6 flex flex-col gap-3 max-h-[40vh] overflow-y-auto hide-scrollbar">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-30">
                    <ShoppingCart className="w-10 h-10 mb-2" />
                    <p className="text-sm font-bold">Tu carrito está vacío</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center flex-shrink-0">
                      <IceCream className="w-6 h-6 text-primary/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">{item.productName}</p>
                      <p className="text-primary font-black text-sm">{formatCurrency(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-container hover:bg-outline/20 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-sm w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-container hover:bg-outline/20 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total + actions */}
              <div className="px-6 py-5 border-t border-outline/10 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-secondary font-bold uppercase tracking-wider">Total Estimado</p>
                  <p className="text-2xl font-black text-on-surface">{formatCurrency(cartTotal)}</p>
                </div>
                <button
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}
                  disabled={cart.length === 0}
                  className="w-full py-4 rounded-2xl bg-on-surface text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                >
                  Hacer Pedido <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={() => setCart([])} className="w-full mt-2 py-2 text-xs text-secondary font-bold hover:text-red-500 transition-colors">
                  Vaciar Lista
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCheckout(false)}
              className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col h-[85dvh] sm:h-auto sm:max-h-[85vh]"
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-outline/30 rounded-full" />
              </div>

              <div className="px-6 pt-4 pb-3 flex items-start justify-between border-b border-outline/10">
                <div>
                  <h3 className="font-bold text-lg text-on-surface">Finalizar Pedido</h3>
                  <p className="text-[10px] text-secondary font-medium">Confirma los detalles de tu compra</p>
                </div>
                <button onClick={() => setShowCheckout(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-4 flex flex-col gap-5 overflow-y-auto hide-scrollbar flex-1">
                {/* Total */}
                <div className="bg-on-surface rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-white/60 font-black uppercase tracking-widest">Total a Pagar</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(cartTotal)}</p>
                  </div>
                  <Hash className="w-8 h-8 text-white/30" />
                </div>

                {/* Payment */}
                <div>
                  <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-3">¿Cómo deseas pagar?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setPaymentMethod(opt.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all",
                          paymentMethod === opt.id
                            ? "bg-on-surface border-on-surface text-white"
                            : "border-outline/20 text-secondary hover:border-secondary/30"
                        )}
                      >
                        {opt.icon}
                        <span className="uppercase tracking-wide">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-2">
                    Dirección de Entrega <span className="text-red-400">*</span>
                  </p>
                  {address && (
                    <div className="flex items-start gap-2 bg-success/10 border border-success/20 rounded-xl px-4 py-3 mb-2">
                      <MapPin className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-success font-medium flex-1 leading-snug">{address}</p>
                      <button onClick={() => setAddress('')} className="text-success/60 hover:text-success transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-surface-container rounded-xl px-4 py-3 border border-outline/20 gap-2">
                      <MapPin className="w-4 h-4 text-secondary/40 flex-shrink-0" />
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Ej: Calle 45 #12-30"
                        className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-secondary/30"
                      />
                    </div>
                    <button
                      onClick={getGPS}
                      disabled={gpsLoading}
                      className="w-12 h-12 flex items-center justify-center rounded-xl bg-success/10 text-success border border-success/20 hover:bg-success hover:text-white transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {gpsLoading ? (
                        <div className="w-4 h-4 border-2 border-success/40 border-t-success rounded-full animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-2">Nota para el Pedido</p>
                  <div className="flex items-start bg-surface-container rounded-xl px-4 py-3 border border-outline/20 gap-2">
                    <span className="text-secondary/40 flex-shrink-0 mt-0.5">💬</span>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Ej: Tocar el timbre fuerte..."
                      className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-secondary/30 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-outline/10">
                <button
                  onClick={handlePlaceOrder}
                  disabled={!address.trim() || cart.length === 0 || placing}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  {placing ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirmar Pedido
                    </>
                  )}
                </button>
                {!address.trim() && (
                  <p className="text-center text-[10px] text-red-400 font-medium mt-2">
                    * Debes ingresar una dirección para continuar
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Floating Cart Button for Client */}
      {cart.length > 0 && !showCart && !showCheckout && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCart(true)}
          className="fixed bottom-24 right-6 z-[45] w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center group"
        >
          <div className="relative">
            <ShoppingCart className="w-7 h-7" />
            <span className="absolute -top-3 -right-3 bg-on-surface text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-primary shadow-lg">
              {cartCount}
            </span>
          </div>
          
          {/* Pulsing effect */}
          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 pointer-events-none" />
        </motion.button>
      )}

      <BottomNav />
    </div>
  );
}
