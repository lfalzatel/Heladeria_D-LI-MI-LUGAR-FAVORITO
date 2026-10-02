import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, orderBy, updateDoc, doc, increment, arrayUnion, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { Product, ProductVariant, CartItem } from '../types';
import { useCategoriesStore } from '../stores/useCategoriesStore';
import { formatCurrency, cn, getAssetUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, X, Plus, Minus, Search, IceCream, 
  Utensils, GlassWater, CupSoda, Package, MapPin,
  Navigation, Banknote, Smartphone, CreditCard, Hash,
  CheckCircle2, ChevronRight, Trash2, Edit2, Phone,
  MessageCircle, User, ExternalLink
} from 'lucide-react';
import { useHeaderStore } from '../stores/useHeaderStore';
import { HeaderSearch } from '../components/AppHeader';
import OrderConfigModal from '../components/OrderConfigModal';
import ProductDetailsCarousel from '../components/ProductDetailsCarousel';
import MovementDetailModal from '../components/MovementDetailModal';
import DualTrajectoryBurst from '../components/DualTrajectoryBurst';
import { toast } from 'sonner';
import { notifyAdmins } from '../lib/notifications';
import { playEventSound } from '../lib/soundEffects';
import confetti from 'canvas-confetti';

const CONSTANT_CATEGORIES = [
  { id: 'all',       label: 'Todos',     icon: <Package className="w-4 h-4" /> }
];

const PAYMENT_OPTIONS = [
  { id: 'efectivo',      label: 'Efectivo',       icon: <Banknote className="w-4 h-4" /> },
  { id: 'transferencia', label: 'Transferencia',  icon: <Smartphone className="w-4 h-4" /> },
];

export default function ClientCompras() {
  const navigate = useNavigate();
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
  const [customerName, setCustomerName] = useState(profile?.name || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Resumen, 2: Datos de entrega

  // Modal de confirmación y envío por WhatsApp (con botón grande, cero bloqueos)
  const [orderSuccessData, setOrderSuccessData] = useState<{
    id: string;
    customerName: string;
    total: number;
    waUrl: string;
  } | null>(null);

  // Modal del pedido recién creado
  const [newOrderData, setNewOrderData]   = useState<any>(null);
  const [newOrderOpen, setNewOrderOpen]   = useState(false);
  const [chatMessage,  setChatMessage]    = useState('');
  const [sendingChat,  setSendingChat]    = useState(false);
  const [burstTrigger, setBurstTrigger]   = useState(false);

  useEffect(() => {
    if (profile) {
      if (!customerName) setCustomerName(profile.name || '');
      if (!phone) setPhone(profile.phone || '');
      if (!address) setAddress(profile.address || '');
    }
  }, [profile]);

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
        const cleanCart = JSON.parse(JSON.stringify(updatedCart));
        setDoc(doc(db, 'carts', profile.uid), { currentCart: cleanCart }, { merge: true })
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
        const cleanCart = JSON.parse(JSON.stringify(updatedCart));
        setDoc(doc(db, 'carts', profile.uid), { currentCart: cleanCart }, { merge: true })
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
        const cleanCart = JSON.parse(JSON.stringify(updatedCart));
        setDoc(doc(db, 'carts', profile.uid), { currentCart: cleanCart }, { merge: true })
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
      toast.error('Tu dispositivo no soporta geolocalización');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsCoords({ lat: latitude, lng: longitude });

        // Intentar autocompletar sugerencia de calle/barrio si la dirección está vacía
        try {
          const controller = new AbortController();
          const signalTimeout = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
            { signal: controller.signal }
          );
          clearTimeout(signalTimeout);
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const road = data.address.road || data.address.pedestrian || data.address.neighbourhood || '';
              const sub = data.address.suburb || data.address.village || data.address.city || '';
              const shortAddr = [road, sub].filter(Boolean).join(', ');
              if (shortAddr && !address.trim()) {
                setAddress(shortAddr);
              }
            }
          }
        } catch (err) {
          // Si falla OSM, las coordenadas exactas ya están guardadas
        } finally {
          setGpsLoading(false);
        }

        toast.success('📍 Ubicación GPS fijada con éxito', {
          description: 'Se incluirá el enlace exacto de Google Maps en tu pedido.'
        });
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          toast.error('Permiso de ubicación denegado. Escribe tu dirección a mano.');
        } else {
          toast.warning('No se pudo obtener el GPS. Puedes escribir tu dirección normalmente.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePlaceOrder = async () => {
    const finalName = customerName.trim() || profile?.name || '';
    const finalPhone = phone.trim();
    const finalAddress = address.trim();

    if (!finalName) {
      toast.error('Por favor escribe tu nombre');
      return;
    }
    if (!finalPhone) {
      toast.error('Por favor escribe tu número de teléfono / WhatsApp');
      return;
    }
    if (!finalAddress && !gpsCoords) {
      toast.error('Por favor ingresa tu dirección de entrega o fija tu GPS');
      return;
    }
    if (cart.length === 0) {
      toast.error('Agrega al menos un producto al carrito');
      return;
    }

    setPlacing(true);
    try {
      // 1. Obtener o generar identificador de cliente (con anonymous auth si no ha iniciado sesión)
      let currentUid = profile?.uid;
      if (!currentUid) {
        try {
          const { signInAnonymously } = await import('firebase/auth');
          const cred = await signInAnonymously(auth);
          currentUid = cred.user.uid;
        } catch (authErr) {
          console.warn('Anonymous auth no disponible, usando identificador temporal:', authErr);
          currentUid = 'guest_' + Date.now();
        }
      }

      const isTransfer = paymentMethod === 'transferencia';
      const initialMessages = isTransfer ? [{
        from: 'system',
        fromName: "D'LI - Lugar Favorito",
        text: `¡Hola ${finalName}! 🍦 Recibimos tu pedido. Para comenzar a prepararlo necesitamos que realices la transferencia a:\n\n📱 Nequi: 300 119 8206\n💰 Total a pagar: $${cartTotal.toLocaleString()}\n\n🛵 *Nota:* El valor del envío a domicilio no está incluido en este total y se cancela por separado al recibir tu pedido.\n\nUna vez realizada, por favor adjunta el comprobante aquí usando el botón del clip 📎.`,
        timestamp: Date.now(),
      }] : [];

      // 2. Enlace de Google Maps a partir de las coordenadas GPS
      const mapsLink = gpsCoords 
        ? `https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}`
        : null;

      // 3. Formateo enriquecido de los productos para WhatsApp
      const itemsListText = cart.map(i => {
        let line = `• ${i.quantity}x ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}`;
        if (i.flavors && i.flavors.length > 0) {
          line += `\n   🍦 Sabores: ${i.flavors.join(', ')}`;
        }
        if (i.fruitChoices && i.fruitChoices.length > 0) {
          line += `\n   🍓 Frutas: ${i.fruitChoices.join(', ')}`;
        }
        if (i.includedSauces && i.includedSauces.length > 0) {
          line += `\n   🍯 Salsas: ${i.includedSauces.join(', ')}`;
        }
        const additions = (i.additions || []).filter((a: string) => 
          !a.toLowerCase().includes('adición fruta') && 
          !a.toLowerCase().includes('adición helado') &&
          !a.toLowerCase().includes('adición salsa')
        );
        if (additions.length > 0) {
          line += `\n   ✨ Adiciones: ${additions.join(', ')}`;
        }
        line += `\n   Subtotal: $${(i.subtotal || i.price * i.quantity).toLocaleString('es-CO')}`;
        return line;
      }).join('\n\n');

      // 4. Mensaje estructurado para WhatsApp
      const waText = `¡Hola D'LI Heladería! 🍦 Acabo de realizar un pedido desde la app:\n\n` +
        `👤 *Cliente:* ${finalName}\n` +
        `📱 *Teléfono:* ${finalPhone}\n` +
        `📍 *Dirección:* ${finalAddress || 'Ubicación GPS adjunta'}\n` +
        (mapsLink ? `🗺️ *Ubicación GPS (Google Maps):*\n${mapsLink}\n` : '') +
        `💳 *Método de Pago:* ${paymentMethod === 'transferencia' ? 'Transferencia Nequi' : 'Efectivo contraentrega'}\n` +
        (note.trim() ? `📝 *Indicaciones:* ${note.trim()}\n` : '') +
        `\n🛒 *Productos:*\n${itemsListText}\n\n` +
        `💰 *Total a Pagar:* $${cartTotal.toLocaleString('es-CO')}\n\n` +
        `¡Quedo atento a la confirmación para el despacho! 🙌`;

      const cleanWaPhone = '573011198206';
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanWaPhone}&text=${encodeURIComponent(waText)}`;

      // 5. Guardar en Firestore (dentro de try/catch para que NUNCA bloquee el WhatsApp del cliente)
      let docId = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      try {
        const docRef = await addDoc(collection(db, 'pedidos'), {
          clienteId: currentUid,
          clienteName: finalName,
          items: cart,
          total: cartTotal,
          paymentMethod,
          address: finalAddress,
          phone: finalPhone,
          gpsCoords: gpsCoords || null,
          mapsUrl: mapsLink || null,
          note: note.trim(),
          status: 'pendiente',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          messages: initialMessages,
          isGuest: !profile || (profile as any).isAnonymous,
        });
        docId = docRef.id.slice(-6).toUpperCase();
      } catch (dbErr) {
        console.warn('Advertencia al guardar pedido en Firestore (continuando con WhatsApp):', dbErr);
      }

      // 6. Si el usuario está registrado, actualizar su teléfono y dirección guardada y puntos
      if (profile && profile.uid && !profile.uid.startsWith('guest_')) {
        try {
          await updateProfile({
            address: finalAddress,
            phone: finalPhone
          });
        } catch (e) {}

        try {
          await updateDoc(doc(db, 'users', profile.uid), {
            loyaltyPoints: increment(1)
          });
        } catch (e) {}
      }

      // 7. Confeti y sonido
      try {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#d946ef', '#f59e0b', '#fbbf24', '#fcd34d', '#c026d3'],
          disableForReducedMotion: true
        });
        playEventSound('new_order');
      } catch (e) {}

      // 8. Activar el Modal de Éxito con el botón de WhatsApp directo
      setOrderSuccessData({
        id: docId,
        customerName: finalName,
        total: cartTotal,
        waUrl: waUrl,
      });

      setShowCheckout(false);
      setCheckoutStep(1);
    } catch (err: any) {
      console.error('Order Submission Error:', err);
      toast.error(`Error al procesar pedido: ${err.message || 'Error desconocido'}`);
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
        {/* Banner para clientes invitados sin cuenta */}
        {!profile && (
          <div className="bg-gradient-to-r from-primary/10 via-amber-50 to-primary/5 border border-primary/20 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-lg flex-shrink-0">
                🍦
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-on-surface">
                  ¡Haz tu pedido a domicilio sin necesidad de registro!
                </p>
                <p className="text-[11px] text-secondary">
                  Si deseas acumular estrellas y beneficios, puedes <button onClick={() => navigate('/login')} className="text-primary font-bold underline hover:text-primary-dark">iniciar sesión</button>.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="hidden sm:flex px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm flex-shrink-0"
            >
              Ingresar
            </button>
          </div>
        )}

        {/* Toolbar: Buscador (38%) + Categorías desplazables en 1 misma fila */}
        <section className="flex items-center gap-2 mb-1">
          {/* Buscador ~38% */}
          <div className="w-[38%] min-w-[110px] max-w-[220px] relative flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-secondary/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            {[{ id: 'all', label: 'Todos', icon: <Package className="w-3.5 h-3.5" /> }, ...activeCategories.map(c => ({ id: c.id, label: c.label, icon: <Package className="w-3.5 h-3.5" /> }))].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-xl font-bold text-xs transition-all border flex-shrink-0 flex items-center gap-1.5",
                  activeCategory === cat.id 
                    ? "bg-primary border-primary text-white shadow-xs"
                    : "bg-white border-outline/30 text-secondary hover:border-primary/30"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Products grid: 2 por fila en móvil (grid-cols-2) */}
        <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
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
                  const item: CartItem = {
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

            const isAnimEnabled = typeof localStorage !== 'undefined' ? localStorage.getItem('ui_animations_enabled') !== 'false' : true;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleCardClick}
                className={cn(
                  (!product.cardColor || !product.cardColor.startsWith('#')) && (product.cardColor || "bg-white"),
                  "rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between relative border hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group h-full min-h-[175px] sm:min-h-[195px]",
                  totalQuantity > 0 
                    ? "ring-2 ring-primary shadow-md border-primary/40 bg-primary/[0.03] z-10" 
                    : product.cardColor ? "border-outline/20 shadow-xs" : "border-outline/10 shadow-xs"
                )}
                style={product.cardColor?.startsWith('#') ? { backgroundColor: product.cardColor } : {}}
              >
                {/* Top Image + Detail Inspector Button + Badges */}
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
                  {product.imageUrl ? (
                    <img src={getAssetUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                      <IceCream className="w-8 h-8 text-primary/30 group-hover:text-primary transition-colors" />
                    </div>
                  )}

                  {/* Detail Inspector Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailsProduct(product);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-xs z-10"
                    title="Ver detalle del producto"
                  >
                    <Search className="w-3 h-3" />
                  </button>

                  {/* Category Badge */}
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-xs text-[8px] font-black text-white uppercase tracking-wider truncate max-w-[80%]">
                    {product.category}
                  </span>

                  {totalQuantity > 0 && (
                    <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                      {totalQuantity}
                    </div>
                  )}
                </motion.div>

                {/* Title & Price & Quick Buttons */}
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <h3 className="font-bold text-on-surface text-xs sm:text-sm leading-snug line-clamp-2 mb-1.5">{product.name}</h3>
                  
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <p className="text-primary font-black text-xs sm:text-sm">
                      {priceDisplay}
                    </p>

                    {!isComplex && totalQuantity > 0 ? (
                      <div className="flex items-center gap-1.5 bg-surface-container rounded-lg p-0.5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleUpdateQty(e, -1)}
                          className="w-5 h-5 flex items-center justify-center bg-white shadow-xs text-secondary rounded transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-black text-xs w-3 text-center">{totalQuantity}</span>
                        <button 
                          onClick={(e) => handleUpdateQty(e, 1)}
                          className="w-5 h-5 flex items-center justify-center bg-white shadow-xs text-secondary rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </section>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <IceCream className="w-12 h-12 mb-3" />
            <p className="text-sm font-bold">Sin productos en esta categoría</p>
          </div>
        )}


        {/* Floating Cart Button for Client */}
        <AnimatePresence mode="wait">
          {cartCount > 0 && !showCheckout && (
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
              onClick={() => setShowCheckout(true)}
              className="fixed bottom-28 right-6 w-16 h-16 bg-primary rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center text-white z-[45] border-4 border-white"
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
                  <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-primary shadow-sm">
                    {cartCount}
                  </span>
                </motion.div>
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
                       <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface mb-2">Datos de Entrega</h4>
                       <div className="flex flex-col gap-3">
                          {/* Nombre de quien recibe */}
                          <div className="relative">
                            <User className="absolute top-3.5 left-4 w-5 h-5 text-secondary/40" />
                            <input 
                              type="text" 
                              value={customerName} 
                              onChange={e => setCustomerName(e.target.value)} 
                              placeholder="Nombre de quien recibe *" 
                              className="w-full bg-surface-container border-2 border-outline/10 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-on-surface outline-none" 
                            />
                          </div>

                          {/* Teléfono / WhatsApp */}
                          <div className="relative">
                            <Phone className="absolute top-3.5 left-4 w-5 h-5 text-secondary/40" />
                            <input 
                              type="tel" 
                              value={phone} 
                              onChange={e => setPhone(e.target.value)} 
                              placeholder="Teléfono / WhatsApp de contacto *" 
                              className="w-full bg-surface-container border-2 border-outline/10 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-on-surface outline-none" 
                            />
                          </div>

                          {/* Dirección de entrega escrita */}
                          <div className="relative">
                            <MapPin className="absolute top-3.5 left-4 w-5 h-5 text-secondary/40" />
                            <textarea 
                              value={address} 
                              onChange={e => setAddress(e.target.value)} 
                              placeholder="Dirección, barrio o punto de referencia..." 
                              rows={2} 
                              className="w-full bg-surface-container-lowest border-2 border-outline/10 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-on-surface outline-none resize-none" 
                            />
                          </div>

                          {/* Botón GPS estilo CargoFlow ($0 costo) */}
                          <div className="flex flex-col gap-1.5">
                            <button 
                              type="button" 
                              onClick={getGPS} 
                              disabled={gpsLoading} 
                              className={cn(
                                "w-full py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                                gpsCoords 
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                                  : "bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                              )}
                            >
                              {gpsLoading ? (
                                <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                              ) : (
                                <Navigation className={cn("w-4 h-4", gpsCoords ? "text-emerald-600 fill-emerald-600" : "text-primary")} />
                              )}
                              <span>
                                {gpsLoading 
                                  ? 'Obteniendo coordenadas GPS...' 
                                  : gpsCoords 
                                    ? `📍 GPS fijado (${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}) - Actualizar` 
                                    : '📍 Usar mi ubicación GPS actual ($0 costo)'
                                }
                              </span>
                            </button>
                            {gpsCoords && (
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] text-emerald-700 font-bold">✓ Coordenadas listas para Google Maps</span>
                                <button 
                                  type="button" 
                                  onClick={() => setGpsCoords(null)} 
                                  className="text-[10px] text-red-500 hover:text-red-700 underline font-bold"
                                >
                                  Quitar GPS
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Indicaciones adicionales */}
                          <textarea 
                            value={note} 
                            onChange={e => setNote(e.target.value)} 
                            placeholder="Indicaciones adicionales (ej: timbre 201, casa blanca rejas negras)..." 
                            rows={2} 
                            className="w-full bg-surface-container rounded-2xl p-3 text-xs font-bold text-on-surface outline-none resize-none border border-outline/10 focus:border-primary" 
                          />
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
                      className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-20 hover:bg-primary-dark transition-all"
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
                      disabled={!customerName.trim() || phone.trim().length < 7 || (!address.trim() && !gpsCoords) || cart.length === 0 || placing} 
                      className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary-dark transition-all"
                    >
                      {placing ? <div className="w-6 h-6 border-3 border-white/40 border-t-white rounded-full animate-spin" /> : <> <CheckCircle2 className="w-6 h-6" /> Confirmar Pedido </>}
                    </button>

                    <div className="flex justify-between items-center mt-1">
                      <button 
                        onClick={() => setCheckoutStep(1)} 
                        className="text-[10px] text-secondary font-black uppercase tracking-widest hover:text-primary transition-colors"
                      >
                        Volver al carrito
                      </button>
                      <button 
                        onClick={() => { setShowCheckout(false); setCheckoutStep(1); }} 
                        className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:text-red-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Mensajes de validación claros para el cliente */}
                    {!customerName.trim() && (
                      <p className="text-center text-[11px] text-amber-600 font-bold">⚠️ Ingresa el nombre de quien recibe</p>
                    )}
                    {customerName.trim() && phone.trim().length < 7 && (
                      <p className="text-center text-[11px] text-amber-600 font-bold">⚠️ Ingresa un número de teléfono de contacto</p>
                    )}
                    {customerName.trim() && phone.trim().length >= 7 && !address.trim() && !gpsCoords && (
                      <p className="text-center text-[11px] text-primary font-bold animate-pulse">⚠️ Escribe tu dirección o presiona "Usar mi ubicación GPS"</p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Pedido Exitoso con botón directo a WhatsApp ($0 bloqueos) */}
      <AnimatePresence>
        {orderSuccessData && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-outline/10 flex flex-col items-center gap-4 relative"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-inner">
                🎉
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                  Pedido #{orderSuccessData.id} Registrado
                </span>
                <h3 className="font-brand font-black text-2xl text-on-surface mt-2.5">
                  ¡Listo, {orderSuccessData.customerName}!
                </h3>
                <p className="text-xs text-secondary mt-1">
                  Tu pedido por <strong className="text-on-surface font-black">{formatCurrency(orderSuccessData.total)}</strong> ha sido registrado en el sistema.
                </p>
              </div>

              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left text-xs text-emerald-900 flex flex-col gap-1.5">
                <p className="font-black text-sm flex items-center gap-2 text-emerald-800">
                  <span>📲</span> Paso Final: Enviar por WhatsApp
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-700">
                  Haz clic en el botón verde a continuación para abrir WhatsApp y enviar tu pedido a la heladería para iniciar la preparación inmediata.
                </p>
              </div>

              <a
                href={orderSuccessData.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setTimeout(() => {
                    setOrderSuccessData(null);
                    clearCart();
                  }, 500);
                }}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2.5 transition-all text-center"
              >
                <MessageCircle className="w-5 h-5" />
                ENVIAR PEDIDO POR WHATSAPP
              </a>

              <button
                onClick={() => {
                  setOrderSuccessData(null);
                  clearCart();
                }}
                className="text-xs text-secondary hover:text-on-surface font-bold py-1 transition-colors"
              >
                Cerrar y seguir viendo el menú
              </button>
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

      <DualTrajectoryBurst
        trigger={burstTrigger}
        onComplete={() => setBurstTrigger(false)}
      />

      </main>
    );
}

