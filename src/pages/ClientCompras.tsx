import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, orderBy, updateDoc, doc, increment, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { Product, ProductVariant, CartItem } from '../types';
import { useCategoriesStore } from '../stores/useCategoriesStore';
import { formatCurrency, cn, getAssetUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, X, Plus, Minus, Search, IceCream, 
  Utensils, GlassWater, CupSoda, Package, MapPin,
  Navigation, Banknote, Smartphone, CreditCard, Hash,
  CheckCircle2, ChevronRight, Trash2, Edit2, Phone
} from 'lucide-react';
import { useHeaderStore } from '../stores/useHeaderStore';
import { HeaderSearch } from '../components/AppHeader';
import OrderConfigModal from '../components/OrderConfigModal';
import ProductDetailsCarousel from '../components/ProductDetailsCarousel';
import MovementDetailModal from '../components/MovementDetailModal';
import { toast } from 'sonner';
import { notifyAdmins } from '../lib/notifications';
import confetti from 'canvas-confetti';

const CONSTANT_CATEGORIES = [
  { id: 'all',       label: 'Todos',     icon: <Package className="w-4 h-4" /> }
];

const PAYMENT_OPTIONS = [
  { id: 'efectivo',      label: 'Efectivo',       icon: <Banknote className="w-4 h-4" /> },
  { id: 'transferencia', label: 'Transferencia',  icon: <Smartphone className="w-4 h-4" /> },
];

export default function ClientCompras() {
  const { profile, updateProfile } = useAuthStore();
  const { activeCategories } = useCategoriesStore();
  const { setHeader, clearHeader } = useHeaderStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('dli_heladeria_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Resumen, 2: Datos de entrega

  // Modal del pedido recién creado
  const [newOrderData, setNewOrderData]   = useState<any>(null);
  const [newOrderOpen, setNewOrderOpen]   = useState(false);
  const [chatMessage,  setChatMessage]    = useState('');
  const [sendingChat,  setSendingChat]    = useState(false);

  useEffect(() => {
    localStorage.setItem('dli_heladeria_cart', JSON.stringify(cart));
  }, [cart]);

  // Listener para sincronizar el carrito desde Firestore
  useEffect(() => {
    if (!profile?.uid) return;

    const unsub = onSnapshot(doc(db, 'carts', profile.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.currentCart) {
          setCart(data.currentCart);
        }
      }
    });

    return unsub;
  }, [profile?.uid]);

  useEffect(() => {
    setHeader({
      title: "Mis Compras",
      subtitle: "Elige tus antojos D'LI",
      leftExtra: (
        <HeaderSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar un producto..."
        />
      )
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, searchTerm]);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('isActive', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      
      // Sort by salesCount (desc) then by name
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
    let wasEdited = false;
    setCart(prev => {
      let currentCart = [...prev];
      const existingByIdIndex = currentCart.findIndex(c => c.id === item.id);
      
      if (existingByIdIndex > -1) {
        // Es una edición: removemos el item original antes de reevaluar agrupación
        currentCart.splice(existingByIdIndex, 1);
        wasEdited = true;
      }

      // Buscar si ya existe un producto exactamente igual
      const existingIndex = currentCart.findIndex(c => 
        c.productId === item.productId && 
        c.variantLabel === item.variantLabel && 
        JSON.stringify(c.flavors || []) === JSON.stringify(item.flavors || []) &&
        JSON.stringify(c.fruitChoices || []) === JSON.stringify(item.fruitChoices || []) &&
        JSON.stringify(c.additions || []) === JSON.stringify(item.additions || [])
      );

      let updatedCart: CartItem[];
      if (existingIndex > -1) {
        const existing = currentCart[existingIndex];
        currentCart[existingIndex] = {
          ...existing,
          quantity: existing.quantity + item.quantity,
          subtotal: existing.unitPrice * (existing.quantity + item.quantity)
        };
        updatedCart = currentCart;
      } else {
        updatedCart = [...currentCart, item];
      }

      // Sync to Firestore
      if (profile?.uid) {
        setDoc(doc(db, 'carts', profile.uid), { currentCart: updatedCart }, { merge: true })
          .catch(err => console.error("Error saving cart:", err));
      }

      return updatedCart;
    });
    setTimeout(() => {
      toast.success(`${item.productName} ${wasEdited ? 'actualizado' : 'agregado'}`);
    }, 0);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const updatedCart = prev.filter(c => c.id !== id);
      if (profile?.uid) {
        setDoc(doc(db, 'carts', profile.uid), { currentCart: updatedCart }, { merge: true })
          .catch(err => console.error("Error removing from cart:", err));
      }
      return updatedCart;
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { 
      removeFromCart(id); 
      return; 
    }
    setCart(prev => {
      const updatedCart = prev.map(c => c.id === id ? { ...c, quantity: qty, subtotal: c.unitPrice * qty } : c);
      if (profile?.uid) {
        setDoc(doc(db, 'carts', profile.uid), { currentCart: updatedCart }, { merge: true })
          .catch(err => console.error("Error updating quantity:", err));
      }
      return updatedCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    if (profile?.uid) {
      setDoc(doc(db, 'carts', profile.uid), { currentCart: [] }, { merge: true })
        .catch(err => console.error("Error clearing cart:", err));
    }
  };

  const getGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    if (!window.isSecureContext) {
      toast.error('El GPS requiere una conexión segura (HTTPS)');
      return;
    }

    setGpsLoading(true);
    const timeoutId = setTimeout(() => {
       if (gpsLoading) {
         setGpsLoading(false);
         toast.error('Tiempo de espera agotado al obtener ubicación');
       }
    }, 12000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(timeoutId);
        try {
          const { latitude, longitude } = pos.coords;
          // Use a shorter timeout for reverse geocoding
          const controller = new AbortController();
          const signalTimeout = setTimeout(() => controller.abort(), 5000);
          
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, { signal: controller.signal });
          clearTimeout(signalTimeout);
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
        clearTimeout(timeoutId);
        console.error('GPS Error:', err);
        setGpsLoading(false);
        if (err.code === 1) {
          toast.error('Permiso de ubicación denegado. Por favor actívalo en tu navegador.');
        } else if (err.code === 2) toast.error('Ubicación no disponible');
        else if (err.code === 3) toast.error('Tiempo de espera agotado');
        else toast.error('Error al obtener GPS');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handlePlaceOrder = async () => {
    if (!address.trim()) { toast.error('Ingresa una dirección de entrega'); return; }
    if (cart.length === 0) { toast.error('Agrega al menos un producto'); return; }
    if (!profile) return;

    setPlacing(true);
    try {
      const isTransfer = paymentMethod === 'transferencia';

      const initialMessages = isTransfer ? [{
        from: 'system',
        fromName: "D'LI - Lugar Favorito",
        text: `¡Hola ${profile.name}! 🍦 Recibimos tu pedido. Para comenzar a prepararlo necesitamos que realices la transferencia a:\n\n📱 Nequi: 300 119 8206\n💰 Total a pagar: $${cartTotal.toLocaleString()}\n\n🛵 *Nota:* El valor del envío a domicilio no está incluido en este total y se cancela por separado al recibir tu pedido.\n\nUna vez realizada, por favor adjunta el comprobante aquí usando el botón del clip 📎.`,
        timestamp: Date.now(),
      }] : [];

      const docRef = await addDoc(collection(db, 'pedidos'), {
        clienteId: profile.uid,
        clienteName: profile.name,
        items: cart,
        total: cartTotal,
        paymentMethod,
        address: address.trim(),
        phone: phone.trim(),
        note: note.trim(),
        status: 'pendiente',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messages: initialMessages,
      });

      // Construir objeto local para abrir el modal inmediatamente
      const pedidoLocal = {
        id: docRef.id,
        clienteId: profile.uid,
        clienteName: profile.name,
        items: cart,
        total: cartTotal,
        paymentMethod,
        address: address.trim(),
        phone: phone.trim(),
        note: note.trim(),
        status: 'pendiente',
        createdAt: new Date(),
        messages: initialMessages,
      };
      setNewOrderData(pedidoLocal);
      setNewOrderOpen(true);

      // Actualizar el perfil del usuario con la última dirección y teléfono
      if (profile) {
        await updateProfile({
          address: address.trim(),
          phone: phone.trim()
        });
      }

      // Actualizar conteo de ventas de productos (Opcional, puede fallar por permisos en el cliente)
      try {
        const updatePromises = cart.map(item => 
          updateDoc(doc(db, 'products', item.productId), {
            salesCount: increment(item.quantity)
          })
        );
        await Promise.all(updatePromises);
      } catch (err) {
        console.warn('No se pudo actualizar salesCount (probablemente falta de permisos), pero el pedido fue enviado.', err);
      }

      // Incrementar puntos de fidelidad en el perfil del cliente
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          loyaltyPoints: increment(1)
        });
      } catch (err) {
        console.warn('Error al incrementar puntos de fidelidad:', err);
      }

      // Animación de confeti de estrella (Fucsia/Dorado)
      const colors = ['#d946ef', '#f59e0b', '#fbbf24', '#fcd34d', '#c026d3'];
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: colors,
        disableForReducedMotion: true
      });

      toast.success('¡Ganaste 1 Punto Premium! ⭐ Revisa tu perfil.', {
        description: '¡Tu pedido fue enviado exitosamente!',
        duration: 8000,
      });

      notifyAdmins(
        "🆕 Nuevo pedido online",
        `De ${profile.name} por $${cartTotal.toLocaleString()} - ${paymentMethod}`
      );
      clearCart();
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

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !newOrderData?.id || !profile) return;
    setSendingChat(true);
    try {
      const newMsg = {
        from: profile.uid,
        fromName: profile.name,
        text: chatMessage,
        timestamp: Date.now(),
      };
      await updateDoc(doc(db, 'pedidos', newOrderData.id), {
        messages: arrayUnion(newMsg),
        updatedAt: serverTimestamp(),
      });
      setNewOrderData((prev: any) => ({
        ...prev,
        messages: [...(prev.messages || []), newMsg],
      }));
      setChatMessage('');
    } catch (err) {
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col gap-5 pt-2">
          {/* Category filter */}
          <div className="flex gap-1.5 p-1 overflow-x-auto hide-scrollbar bg-surface-container rounded-xl text-[10px] font-black uppercase">
            {[{ id: 'all', label: 'Todos', icon: <Package className="w-4 h-4" /> }, ...activeCategories.map(c => ({ id: c.id, label: c.label, icon: <Package className="w-4 h-4" /> }))].map(cat => (
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
              const isComplex = (product.variants && product.variants.length > 1) || 
                                product.requiresFlavors || 
                                product.requiresFruitChoice || 
                                product.requiresSauces || 
                                product.requiresToppings || 
                                product.requiresSalpiconBase ||
                                (product.customOptions && product.customOptions.length > 0);
              
              const minPrice = product.variants?.length ? Math.min(...product.variants.map(v => v.price)) : (product.basePrice || 0);
              const priceDisplay = product.variants && product.variants.length > 1 ? `Desde ${formatCurrency(minPrice)}` : formatCurrency(minPrice);

              const handleCardClick = () => {
                if (isComplex) {
                  setSelectedProduct(product);
                } else {
                  if (totalQuantity === 0) {
                    const item = {
                      id: Math.random().toString(36).substr(2, 9),
                      productId: product.id,
                      productName: product.name,
                      variantLabel: product.variants?.[0]?.label || '',
                      quantity: 1,
                      unitPrice: minPrice,
                      subtotal: minPrice,
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
                    "rounded-[1.5rem] p-3 flex items-center gap-3 relative border hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group",
                    (!product.cardColor || !product.cardColor.startsWith('#')) && (product.cardColor || "bg-white"),
                    totalQuantity > 0 ? "ring-4 ring-primary/10 shadow-md border-primary/20" : 
                    product.cardColor ? "border-outline/20 shadow-sm" : "border-outline/10 shadow-sm"
                  )}
                  style={product.cardColor?.startsWith('#') ? { backgroundColor: product.cardColor } : {}}
                >
                  <motion.div 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setDetailsProduct(product); 
                    }}
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-surface-container-low border border-outline/5"
                    animate={{
                      rotate: [0, -12, 12, -12, 0, 0, 0, 0, 0, 0],
                      scale: [1, 1.12, 0.88, 1.12, 1, 1, 1, 1, 1, 1],
                    }}
                    whileHover={{ scale: 1.05 }}
                    transition={{
                      duration: 3.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (product.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 20) / 10
                    }}
                  >
                    {product.imageUrl ? (
                      <img src={getAssetUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <IceCream className="w-8 h-8 text-secondary/30 absolute inset-0 m-auto group-hover:text-primary transition-colors" />
                    )}
                    
                    {totalQuantity > 0 && !isComplex && (
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-xl font-black text-primary drop-shadow-md">{totalQuantity}</span>
                      </div>
                    )}
                  </motion.div>

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
                        {priceDisplay}
                      </p>

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
                      ) : (
                        <div className="flex items-center gap-2">
                          {isComplex && totalQuantity > 0 && (
                            <span className="font-bold text-[10px] uppercase text-primary tracking-wider">{totalQuantity} en carrito</span>
                          )}
                          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                            <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      )}
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


        {/* Floating Cart Button for Client */}
        <AnimatePresence>
          {cart.length > 0 && !showCheckout && (
            <motion.button
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
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

      {/* Order Config Modal */}
      {selectedProduct && (
        <OrderConfigModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          initialItem={editingItem || undefined}
          onClose={() => {
            setSelectedProduct(null);
            setEditingItem(null);
          }}
          onAdd={addToCart}
        />
      )}

      <ProductDetailsCarousel
        products={filteredProducts}
        initialProductId={detailsProduct?.id || null}
        isOpen={!!detailsProduct}
        onClose={() => setDetailsProduct(null)}
        onAddToCart={(product) => {
          setDetailsProduct(null);
          const isComplex = (product.variants && product.variants.length > 1) || 
                            product.requiresFlavors || 
                            product.requiresFruitChoice || 
                            product.requiresSauces || 
                            product.requiresToppings || 
                            product.requiresSalpiconBase;
          if (isComplex) {
            setSelectedProduct(product);
          } else {
            const minPrice = product.variants?.length ? Math.min(...product.variants.map(v => v.price)) : (product.basePrice || 0);
            const item = {
              id: Math.random().toString(36).substr(2, 9),
              productId: product.id,
              productName: product.name,
              variantLabel: product.variants?.[0]?.label || '',
              quantity: 1,
              unitPrice: minPrice,
              subtotal: minPrice,
            };
            addToCart(item);
          }
        }}
      />

      {/* Unified Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                setShowCheckout(false);
                setCheckoutStep(1);
              }}
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full h-full sm:w-[94%] sm:max-w-2xl sm:rounded-[2.5rem] shadow-2xl flex flex-col sm:h-auto sm:max-h-[85vh] overflow-hidden"
            >
              <div className="px-6 pt-4 pb-3 flex items-start justify-between border-b border-outline/10">
                <div>
                  <h3 className="font-headline font-black text-xl text-on-surface">
                    {checkoutStep === 1 ? 'Mi Lista de Compra' : 'Finalizar Pedido'}
                  </h3>
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-0.5">
                    {checkoutStep === 1 ? 'Confirma tu selección' : 'Confirma tu entrega y pago'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowCheckout(false);
                    setCheckoutStep(1);
                  }} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-all active:scale-90"
                >
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar flex flex-col gap-4">
                {checkoutStep === 1 ? (
                  <>
                    {/* Paso 1: Resumen de Pedido */}
                    <div className="flex flex-col gap-3">
                      {cart.map(item => (
                        <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-white border border-outline/30 shadow-sm group transition-all">
                           <div className="flex-1">
                              <h4 className="font-bold text-sm leading-tight text-on-surface">
                                {item.productName}
                                {item.variantLabel && <span className="text-xs text-primary ml-2 uppercase">({item.variantLabel})</span>}
                              </h4>
                              
                              {/* Detalles */}
                              <div className="mt-2 flex flex-col gap-1">
                                {/* Cosas Incluidas (Chips) */}
                                <div className="flex flex-wrap gap-1">
                                  {(item.includedFlavors || item.flavors || []).map((f: any, idx: number) => (
                                    <span key={idx} className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded-md font-black italic border border-primary/10">
                                      {typeof f === 'object' ? f.name || f.label : f}
                                    </span>
                                  ))}
                                  {(item.includedFruits || item.fruitChoices || []).filter((f: any) => f !== item.baseChoice).map((f: any, idx: number) => (
                                    <span key={idx} className="text-[10px] bg-success/5 text-success px-1.5 py-0.5 rounded-md font-black border border-success/10">
                                      {typeof f === 'object' ? f.name || f.label : f}
                                    </span>
                                  ))}
                                  {(item.includedSauces || []).map((s: any, idx: number) => (
                                    <span key={idx} className="text-[10px] bg-orange-500/5 text-orange-600 px-1.5 py-0.5 rounded-md font-black border border-orange-500/10">
                                      {s}
                                    </span>
                                  ))}
                                </div>

                                {/* Adiciones (Líneas de texto) */}
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                  {(item.extraFruits || []).length > 0 && (
                                    <span className="text-[10px] text-orange-600 font-bold text-left">
                                      adición de fruta: [{(item.extraFruits || []).join(', ')}]
                                    </span>
                                  )}
                                  {(item.extraFlavors || []).length > 0 && (
                                    <span className="text-[10px] text-orange-600 font-bold text-left">
                                      adición de helado: [{(item.extraFlavors || []).join(', ')}]
                                    </span>
                                  )}
                                  {(item.extraSauces || []).length > 0 && (
                                    <span className="text-[10px] text-orange-600 font-bold text-left">
                                      adición de salsa: [{(item.extraSauces || []).join(', ')}]
                                    </span>
                                  )}
                                  {/* Otras adiciones */}
                                  {(item.additions || []).filter((a: string) => 
                                    !a.toLowerCase().includes('adición fruta') && 
                                    !a.toLowerCase().includes('adición helado') &&
                                    !a.toLowerCase().includes('adición salsa') &&
                                    !(item.includedSauces || []).includes(a) &&
                                    !(item.extraSauces || []).includes(a)
                                  ).map((a: string, i: number) => (
                                    <span key={i} className="text-[10px] text-orange-600 font-bold text-left">
                                      +{a}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center bg-surface-container-low rounded-full px-2 py-1 ring-1 ring-outline/10">
                                  <button onClick={() => updateQty(item.id, item.quantity - 1)} className="p-1 text-primary hover:bg-primary/10 rounded-full"><Minus className="w-3 h-3" /></button>
                                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                  <button onClick={() => updateQty(item.id, item.quantity + 1)} className="p-1 text-primary hover:bg-primary/10 rounded-full"><Plus className="w-3 h-3" /></button>
                                </div>
                                <span className="text-sm font-bold text-primary">{formatCurrency(item.subtotal)}</span>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2">
                             <button 
                               onClick={() => {
                                 setEditingItem(item);
                                 const prod = products.find(p => p.id === item.productId);
                                 if (prod) setSelectedProduct(prod);
                               }}
                               className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/5 text-primary hover:bg-primary hover:text-white transition-colors"
                               title="Editar"
                             >
                               <Edit2 className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => removeFromCart(item.id)}
                               className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-outline hover:bg-red-500 hover:text-white transition-colors"
                               title="Eliminar"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-on-surface rounded-2xl p-4 flex items-center justify-between shadow-xl mt-auto">
                      <div>
                        <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">Total</p>
                        <p className="text-3xl font-brand font-black text-white">{formatCurrency(cartTotal)}</p>
                      </div>
                      <ShoppingCart className="w-10 h-10 text-white/10 rotate-12" />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Paso 2: Datos de Entrega y Pago */}
                    <div className="bg-on-surface rounded-2xl p-4 flex items-center justify-between shadow-xl mb-2">
                      <div>
                        <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">Total a Pagar</p>
                        <p className="text-2xl font-brand font-black text-white">{formatCurrency(cartTotal)}</p>
                      </div>
                      <ShoppingCart className="w-8 h-8 text-white/10 rotate-12" />
                    </div>

                    <section>
                       <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface mb-2">Forma de Pago</h4>
                       <div className="grid grid-cols-2 gap-3">
                         {PAYMENT_OPTIONS.slice(0, 3).map(opt => (
                           <button key={opt.id} onClick={() => setPaymentMethod(opt.id)} className={cn("flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all", paymentMethod === opt.id ? "bg-primary/5 border-primary text-primary" : "border-outline/10 text-secondary")}>
                             {opt.icon}
                             <span className="text-[10px] font-black uppercase tracking-wider">{opt.label}</span>
                           </button>
                         ))}
                       </div>
                    </section>

                    <section>
                       <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface mb-2">Ubicación</h4>
                       <div className="flex flex-col gap-3">
                          <div className="relative">
                            <Phone className="absolute top-3 left-4 w-5 h-5 text-secondary/40" />
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Número de teléfono..." className="w-full bg-surface-container border-2 border-outline/10 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-on-surface outline-none" />
                          </div>
                          <div className="relative">
                            <MapPin className="absolute top-3 left-4 w-5 h-5 text-secondary/40" />
                            <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección de entrega..." rows={2} className="w-full bg-surface-container-lowest border-2 border-outline/10 focus:border-primary rounded-2xl py-3 pl-12 pr-14 text-sm font-bold text-on-surface outline-none resize-none" />
                            <button onClick={getGPS} disabled={gpsLoading} className="absolute top-2.5 right-3.5 w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg">
                               {gpsLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
                            </button>
                          </div>
                          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Indicaciones adicionales..." rows={2} className="w-full bg-surface-container rounded-2xl p-3 text-xs font-bold text-on-surface outline-none resize-none" />
                       </div>
                    </section>
                  </>
                )}
              </div>

              <div className="px-6 py-4 bg-surface-container-low border-t border-outline/10 flex flex-col gap-3">
                {checkoutStep === 1 ? (
                  <>
                    <button 
                      onClick={() => setCheckoutStep(2)} 
                      disabled={cart.length === 0}
                      className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widestáshadow-xl flex items-center justify-center gap-3 disabled:opacity-20"
                    >
                      Continuar con el pedido <ChevronRight className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={clearCart} 
                      className="text-center text-[10px] text-secondary font-black uppercase tracking-widest mt-1 hover:text-primary transition-colors"
                    >
                      VACIAR LISTA
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handlePlaceOrder} 
                      disabled={!address.trim() || cart.length === 0 || placing} 
                      className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widestáshadow-xl flex items-center justify-center gap-3 disabled:opacity-20"
                    >
                      {placing ? <div className="w-6 h-6 border-3 border-white/40 border-t-white rounded-full animate-spin" /> : <> <CheckCircle2 className="w-6 h-6" /> Confirmar Pedido </>}
                    </button>
                    <div className="flex justify-between items-center mt-1">
                      <button 
                        onClick={() => setCheckoutStep(1)} 
                        className="text-[10px] text-secondary font-black uppercase tracking-widest hover:text-primary transition-colors"
                      >
                        Volver
                      </button>
                      <button 
                        onClick={() => { setShowCheckout(false); setCheckoutStep(1); }} 
                        className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:text-red-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                    {!address.trim() && cart.length > 0 && <p className="text-center text-[10px] text-primary font-black uppercase tracking-widest mt-1 animate-pulse">Falta tu dirección de entrega</p>}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal que se abre automáticamente al crear el pedido */}
      <MovementDetailModal
        isOpen={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
        data={newOrderData}
        profile={profile}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
        onSendMessage={handleSendChat}
        isSending={sendingChat}
      />

      </main>
    );
}

