import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, Receipt, Smartphone, Banknote, CreditCard, Loader2, ShoppingBag, Pencil, CheckSquare, Check, Lock, Unlock, Send, User, Mail, Phone, CheckCircle2, Star } from 'lucide-react';
import { useTableCartStore } from '../stores/useTableCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import { formatCurrency, cn } from '../lib/utils';
import { CartItem } from '../types';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState, useEffect } from 'react';
import { notifyAdmins } from '../lib/notifications';
import { deductInventory } from '../utils/inventory';
import { generateWhatsAppReceiptLink } from '../utils/receiptHelpers';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: CartItem, step?: number) => void;
  onRedeemLoyalty?: () => void;
}

export default function CartDrawer({ isOpen, onClose, onEdit, onRedeemLoyalty }: CartDrawerProps) {
  const { activeTable, carts, removeItem, updateQuantity, clearCart, getTotal, updateNote, toggleLock, setTakeout, updatePackagingSupply } = useTableCartStore();
  const { profile } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Mixto'>('Efectivo');
  const [splitAmounts, setSplitAmounts] = useState({ efectivo: '', transferencia: '' });

  interface ClienteOption {
    id: string;
    name: string;
    email: string;
    phone?: string;
    loyaltyPoints?: number;
  }

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<ClienteOption | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [successSale, setSuccessSale] = useState<any | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const [packagingSuppliesData, setPackagingSuppliesData] = useState<any[]>([]);
  const [packagingSearch, setPackagingSearch] = useState('');

  // Fetch packaging supplies
  useEffect(() => {
    const fetchPackaging = async () => {
      try {
        const q = query(collection(db, 'supplies'), where('category', '==', 'Desechables'));
        const snap = await getDocs(q);
        setPackagingSuppliesData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching packaging supplies:", error);
      }
    };
    fetchPackaging();
  }, []);

  // Fetch clients
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'cliente'));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Cliente sin nombre',
          email: doc.data().email || '',
          phone: doc.data().phone || '',
          loyaltyPoints: doc.data().loyaltyPoints || 0
        }));
        setClientes(list);
      } catch (err) {
        console.error('Error fetching clientes:', err);
      }
    };
    if (isOpen) {
      fetchClientes();
    }
  }, [isOpen]);

  const sendEmailReceipt = async (targetEmail: string, saleObj: any) => {
    setEmailSending(true);
    try {
      const res = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, sale: saleObj })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.simulated) {
          toast.info('Recibo guardado (simulado)', { description: 'Los parámetros SMTP no están configurados en desarrollo.' });
        } else {
          toast.success('Recibo enviado al correo exitosamente ✓');
        }
      } else {
        throw new Error(data.error || 'Error al enviar');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo enviar el correo: ' + err.message);
    } finally {
      setEmailSending(false);
    }
  };
  
  const cart = carts[activeTable];
  const total = getTotal(activeTable);

  const handleCheckout = async () => {
    if (!cart?.items.length || !profile) return;
    
    setIsProcessing(true);
    try {
      let totalStr = total.toString();
      if (paymentMethod === 'Mixto') {
        const ef = Number(splitAmounts.efectivo) || 0;
        const tr = Number(splitAmounts.transferencia) || 0;
        if (ef + tr !== total) {
           toast.error('La suma de Efectivo y Transferencia debe ser igual al total ($' + total.toLocaleString() + ')');
           setIsProcessing(false);
           return;
        }
        totalStr = `Efectivo: $${ef.toLocaleString()} / Transferencia: $${tr.toLocaleString()}`;
      }

      const saleData: any = {
        items: cart.items,
        total,
        // Se envía 'Efectivo' a la BD para no romper las reglas de Firebase, pero isMixto permite saber que es mixto
        paymentMethod: paymentMethod === 'Mixto' ? 'Efectivo' : paymentMethod,
        isMixto: paymentMethod === 'Mixto',
        splitDetails: paymentMethod === 'Mixto' ? {
           efectivo: Number(splitAmounts.efectivo) || 0,
           transferencia: Number(splitAmounts.transferencia) || 0
        } : null,
        sellerId: profile.uid,
        sellerName: profile.name,
        soldBy: profile.uid, // Required by Firestore rules
        status: 'completed', // Required by Firestore rules
        tableId: activeTable,
        tableName: cart.isTakeout ? 'Para Llevar' : (activeTable === 'directa' ? 'Venta Directa' : `Mesa ${activeTable.replace('mesa', '')}`),
        note: cart.note || '', // Global order note
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(), // Required by Firestore rules
        date: new Date().toISOString().split('T')[0],
        hour: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
      };

      if (selectedCliente) {
        saleData.clienteId = selectedCliente.id;
        saleData.clienteName = selectedCliente.name;
        saleData.clienteEmail = selectedCliente.email;
        saleData.clientePhone = selectedCliente.phone || '';
      }

      const docRef = await addDoc(collection(db, 'sales'), saleData);
      
      // Actualizar conteo de ventas de productos
      const updatePromises = cart.items.map(item => 
        updateDoc(doc(db, 'products', item.productId), {
          salesCount: increment(item.quantity)
        })
      );
      
      // Update Loyalty Points
      if (selectedCliente) {
        const hasReward = cart.items.some(item => item.isLoyaltyReward);
        const hasPaidItems = cart.items.some(item => !item.isLoyaltyReward);
        let pointsChange = hasPaidItems ? 1 : 0;
        
        if (hasReward) {
          pointsChange -= 9; // Consumir 9 puntos del premio
        }

        const currentPoints = selectedCliente.loyaltyPoints || 0;
        const newPoints = currentPoints + pointsChange;

        updatePromises.push(
          updateDoc(doc(db, 'users', selectedCliente.id), {
            loyaltyPoints: increment(pointsChange)
          })
        );

        // Notificar a los administradores si alcanza el premio
        if (newPoints >= 9 && currentPoints < 9) {
          notifyAdmins(
            "🎉 ¡Fidelidad completada!",
            `El cliente ${selectedCliente.name} ha alcanzado los ${newPoints} puntos y ya puede reclamar su premio.`
          );
        }
      }

      await Promise.all(updatePromises);
      
      // Descontar insumos automáticamente (Frutas, Queso, etc) y empaques
      await deductInventory(cart.items, cart.packagingSupplies);
      
      toast.success('¡Venta realizada con éxito!');
      notifyAdmins(
        "🍦 Nueva venta realizada",
        `Venta manual por ${formatCurrency(total)} - ${paymentMethod === 'Mixto' ? totalStr : paymentMethod}`
      );

      const completedSale = {
        id: docRef.id,
        items: cart.items,
        total,
        // Se envía 'Efectivo' para bypass de Firebase Rules
        paymentMethod: paymentMethod === 'Mixto' ? 'Efectivo' : paymentMethod,
        isMixto: paymentMethod === 'Mixto',
        splitDetails: paymentMethod === 'Mixto' ? {
           efectivo: Number(splitAmounts.efectivo) || 0,
           transferencia: Number(splitAmounts.transferencia) || 0
        } : null,
        tableName: saleData.tableName,
        clienteName: selectedCliente ? selectedCliente.name : undefined,
        clienteEmail: selectedCliente ? selectedCliente.email : undefined,
        clientePhone: selectedCliente ? selectedCliente.phone : undefined,
        date: saleData.date,
        hour: saleData.hour
      };

      // Limpiar carrito local
      clearCart(activeTable);
      
      // Activar modal de éxito con los datos finales
      setSuccessSale(completedSale);

      // Si el cliente tiene correo, disparar recibo automático
      if (selectedCliente && selectedCliente.email) {
        sendEmailReceipt(selectedCliente.email, completedSale);
      }

    } catch (error: any) {
      console.error("Error finalizing sale:", error);
      toast.error('Error al procesar la venta: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200]">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface shadow-2xl flex flex-col"
          >
            {/* Header */}
            <header className="p-4 sm:p-8 border-b border-surface-container-high flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">Tu Carrito</h2>
                <p className="text-secondary text-sm font-medium mt-1">
                  {activeTable === 'paraLlevar' ? 'Pedido para llevar' : `Mesa ${activeTable.replace('mesa', '')}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {cart?.items && cart.items.length > 0 && cart.items.some(item => !item.locked) && (
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de que deseas vaciar el carrito por completo?')) {
                        clearCart(activeTable);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-full shadow-sm hover:bg-red-100 transition-colors"
                    title="Vaciar todo el carrito"
                  >
                    <Trash2 className="w-4 h-4" />
                    Vaciar
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </header>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 hide-scrollbar">
              {!cart?.items.length ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                  <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <p className="font-bold">El carrito está vacío</p>
                  <p className="text-sm">Agrega productos del catálogo</p>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.id} className={cn(
                    "flex gap-4 p-4 rounded-2xl bg-white border shadow-sm group transition-all",
                    item.prepared ? "border-success/30 opacity-70 grayscale-[0.5]" : "border-outline/30"
                  )}>
                    <div className="flex-1">
                      <h4 className={cn(
                        "font-bold text-sm leading-tight transition-all",
                        item.prepared ? "text-success line-through" : "text-on-surface"
                      )}>
                        {item.productName}
                        {item.variantLabel && <span className="text-xs text-primary ml-2 uppercase">({item.variantLabel})</span>}
                        {item.locked && <Lock className="w-3.5 h-3.5 inline ml-2 mb-0.5 text-orange-500" />}
                      </h4>
                      
                      {/* Configuration Details */}
                      <div className={cn("mt-2 flex flex-col gap-1 transition-all", item.prepared && "opacity-50 grayscale")}>
                        {/* Cosas Incluidas */}
                        <div className="flex flex-wrap gap-1">
                          {(item.includedFlavors || item.flavors || []).map((f, i) => (
                            <span key={i} className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded-md font-black italic border border-primary/10">
                              {f}
                            </span>
                          ))}
                          {(item.includedFruits || item.fruitChoices || []).filter(f => f !== item.baseChoice).map((f, i) => (
                            <button 
                              key={i} 
                              onClick={() => !item.locked && onEdit?.(item, 4)}
                              className={cn("text-[10px] bg-success/5 text-success px-1.5 py-0.5 rounded-md font-black border border-success/10 transition-colors", !item.locked ? "hover:bg-success/10 cursor-pointer" : "cursor-default")}
                            >
                              {f}
                            </button>
                          ))}
                          {(item.includedSauces || []).map((s, i) => (
                            <span key={i} className="text-[10px] bg-orange-500/5 text-orange-600 px-1.5 py-0.5 rounded-md font-black border border-orange-500/10">
                              {s}
                            </span>
                          ))}
                          {item.baseChoice && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded-md font-black border border-amber-500/20">
                              Base: {item.baseChoice}
                            </span>
                          )}
                          {Object.entries(item.customSelections || {}).map(([key, val], i) => (
                            <span key={i} className="text-[10px] bg-purple-500/5 text-purple-600 px-1.5 py-0.5 rounded-md font-black border border-purple-500/10">
                              {val}
                            </span>
                          ))}
                        </div>

                        {/* Adiciones */}
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {item.extraFruits && item.extraFruits.length > 0 && (
                            <button 
                              onClick={() => !item.locked && onEdit?.(item, 4)}
                              className={cn("text-[10px] text-orange-600 font-bold text-left", !item.locked ? "hover:underline cursor-pointer" : "cursor-default")}
                            >
                              adición de fruta: [{item.extraFruits.join(', ')}]
                            </button>
                          )}
                          {item.extraFlavors && item.extraFlavors.length > 0 && (
                            <button 
                              onClick={() => !item.locked && onEdit?.(item, 2)} // Assuming 2 is flavors
                              className={cn("text-[10px] text-orange-600 font-bold text-left", !item.locked ? "hover:underline cursor-pointer" : "cursor-default")}
                            >
                              adición de helado: [{item.extraFlavors.join(', ')}]
                            </button>
                          )}
                          {item.extraSauces && item.extraSauces.length > 0 && (
                            <button 
                              onClick={() => !item.locked && onEdit?.(item, 3)} // Assuming 3 is additions
                              className={cn("text-[10px] text-orange-600 font-bold text-left", !item.locked ? "hover:underline cursor-pointer" : "cursor-default")}
                            >
                              adición de salsa: [{item.extraSauces.join(', ')}]
                            </button>
                          )}
                          {/* Otras adiciones (queso, etc) */}
                          {(item.additions || []).filter(a => 
                            !a.toLowerCase().includes('adición fruta') && 
                            !a.toLowerCase().includes('adición helado') &&
                            !a.toLowerCase().includes('adición salsa') &&
                            !(item.includedSauces || []).includes(a) &&
                            !(item.extraSauces || []).includes(a)
                          ).map((a, i) => (
                            <button 
                              key={i} 
                              onClick={() => !item.locked && onEdit?.(item, 3)}
                              className={cn("text-[10px] text-orange-600 font-bold text-left", !item.locked ? "hover:underline cursor-pointer" : "cursor-default")}
                            >
                              +{a}
                            </button>
                          ))}
                        </div>

                        {item.notes && (
                          <span className="text-[10px] bg-red-500/5 text-red-600 px-1.5 py-0.5 rounded-md font-black border border-red-500/10 mt-0.5">
                            Nota: {item.notes}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className={cn("flex items-center bg-surface-container-low rounded-full px-2 py-1 ring-1 ring-outline/10", item.locked && "opacity-50 pointer-events-none")}>
                          <button 
                            onClick={() => !item.locked && updateQuantity(activeTable, item.id, -1)}
                            className="p-1 text-primary hover:bg-primary/10 rounded-full disabled:opacity-50"
                            disabled={item.locked}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => !item.locked && updateQuantity(activeTable, item.id, 1)}
                            className="p-1 text-primary hover:bg-primary/10 rounded-full disabled:opacity-50"
                            disabled={item.locked}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-primary">{formatCurrency(item.subtotal)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 transition-all">
                      <button 
                        onClick={() => useTableCartStore.getState().updateItem(activeTable, item.id, { prepared: !item.prepared })}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                          item.prepared ? "bg-success/20 text-success hover:bg-success/30" : "bg-outline/5 text-outline hover:bg-success/10 hover:text-success"
                        )}
                        title={item.prepared ? "Marcar como pendiente" : "Marcar como preparado"}
                      >
                        {item.prepared ? <Check className="w-5 h-5" /> : <CheckSquare className="w-4 h-4" />}
                      </button>
                      {!item.locked && (
                        <>
                          <button 
                            onClick={() => onEdit?.(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/5 text-primary hover:bg-primary hover:text-white transition-colors"
                            title="Editar pedido"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => removeItem(activeTable, item.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-outline hover:bg-red-500 hover:text-white transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {cart?.items && cart.items.length > 0 && (
                <>
                  {/* Selector de Cliente para POS */}
                  <div className="mt-2 mb-2 p-4 rounded-2xl bg-surface-container-lowest border border-outline/20">
                    <label className="block text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Asociar Cliente (Recibo Digital)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar cliente por nombre o correo..."
                        value={selectedCliente ? selectedCliente.name : searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          if (selectedCliente) setSelectedCliente(null);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/50 font-bold"
                      />
                      {selectedCliente && (
                        <button
                          onClick={() => {
                            setSelectedCliente(null);
                            setSearchTerm('');
                          }}
                          className="absolute right-3 top-3.5 text-secondary hover:text-primary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {showDropdown && !selectedCliente && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-outline/10 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-[250] text-sm">
                          {clientes
                            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedCliente(c);
                                  setShowDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-surface-container transition-colors border-b border-outline/5 cursor-pointer block"
                              >
                                <div className="font-bold text-on-surface flex justify-between">
                                  {c.name}
                                  <span className="text-[10px] bg-fuchsia-50 text-fuchsia-500 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Star className="w-3 h-3 fill-fuchsia-500" /> {c.loyaltyPoints || 0}</span>
                                </div>
                                <div className="text-[10px] text-secondary">
                                  {c.email || 'Sin correo'} {c.phone ? `• ${c.phone}` : ''}
                                </div>
                              </button>
                            ))}
                          {clientes.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                            <div className="p-3 text-center text-xs text-secondary opacity-60">No se encontraron clientes</div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedCliente && (
                      <div className="mt-3 flex items-center justify-between p-3 bg-fuchsia-50/50 rounded-xl border border-fuchsia-200">
                        <div>
                          <p className="text-xs font-bold text-fuchsia-600 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-fuchsia-500 animate-pulse" />
                            Puntos Premium
                          </p>
                          <p className="text-sm font-black text-fuchsia-700">{selectedCliente.loyaltyPoints || 0} / 9</p>
                        </div>
                        {(selectedCliente.loyaltyPoints || 0) >= 9 && !cart.items.some(i => i.isLoyaltyReward) && (
                          <button
                            onClick={onRedeemLoyalty}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all"
                          >
                            ⭐ CANJEAR PREMIO
                          </button>
                        )}
                        {cart.items.some(i => i.isLoyaltyReward) && (
                          <span className="text-xs font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-md">Premio en carrito</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 mb-2 p-4 rounded-2xl bg-surface-container-lowest border border-outline/20">
                    <label htmlFor="order-note" className="block text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-primary" />
                      Nota general del pedido (opcional)
                    </label>
                  <textarea
                    id="order-note"
                    rows={2}
                    placeholder="Escribe aquí cualquier nota adicional para toda la orden..."
                    value={cart.note || ''}
                    readOnly={cart?.isLocked}
                    onChange={(e) => updateNote(activeTable, e.target.value)}
                    className={cn("w-full bg-surface-container-low border-none rounded-xl p-3 text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/50 resize-none transition-all", cart?.isLocked && "opacity-60 cursor-not-allowed")}
                  />
                </div>


              </>
            )}
            </div>

            {/* Footer / Checkout */}
            <footer className="p-3 sm:p-4 bg-surface-container-lowest border-t border-surface-container flex flex-col gap-2 sm:gap-3">
              
              {/* Lock / Unlock UI */}
              {cart?.items && cart.items.length > 0 && (
                !cart.items.some(item => !item.locked) ? (
                  <div className="flex items-center justify-between p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-orange-600">
                      <Lock className="w-4 h-4" />
                      <span className="font-bold text-xs">Pedido Fijado</span>
                    </div>
                    {(profile?.role === 'admin' || profile?.role === 'propietario') && (
                      <button 
                        onClick={() => toggleLock(activeTable, false)}
                        className="flex items-center gap-1 px-2 py-1 bg-white text-orange-600 text-[10px] font-bold rounded-full shadow-sm hover:bg-orange-50 transition-colors"
                      >
                        <Unlock className="w-3 h-3" />
                        Desfijar
                      </button>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => toggleLock(activeTable, true)}
                    className="w-full py-2 rounded-xl bg-surface-container border-2 border-primary/20 text-primary font-bold text-sm hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Tomar Pedido
                  </button>
                )
              )}

              <div className="flex justify-between items-center">
                <span className="text-secondary font-semibold text-sm">Total</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(total)}</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <button 
                  onClick={() => setPaymentMethod('Efectivo')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all border-2",
                    paymentMethod === 'Efectivo' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-surface-container-high/50 border-transparent text-on-surface hover:bg-primary/5"
                  )}
                >
                  <Banknote className="w-4 h-4" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Efectivo</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('Transferencia')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all border-2",
                    paymentMethod === 'Transferencia' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-surface-container-high/50 border-transparent text-on-surface hover:bg-primary/5"
                  )}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-[8px] font-bold uppercase tracking-wider truncate w-full text-center">Transf.</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('Tarjeta')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all group",
                    paymentMethod === 'Tarjeta' ? "bg-primary/5 border-primary text-primary shadow-sm" : "border-outline/10 text-secondary hover:bg-surface-container hover:border-outline/20"
                  )}
                >
                  <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Tarjeta</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('Mixto')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all group",
                    paymentMethod === 'Mixto' ? "bg-primary/5 border-primary text-primary shadow-sm" : "border-outline/10 text-secondary hover:bg-surface-container hover:border-outline/20"
                  )}
                >
                  <div className="flex -space-x-1">
                     <Banknote className="w-4 h-4 group-hover:scale-110 transition-transform z-10 bg-white rounded-full" />
                     <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform opacity-70" />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-wider">Mixto</span>
                </button>
              </div>

              {/* Split Payment Inputs */}
              <AnimatePresence>
                {paymentMethod === 'Mixto' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex gap-4 mt-3 overflow-hidden"
                   >
                      <div className="flex-1 space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-secondary/60 ml-2">Efectivo ($)</label>
                         <input 
                           type="number" 
                           placeholder="Monto en efectivo" 
                           value={splitAmounts.efectivo}
                           onChange={(e) => {
                             const val = e.target.value;
                             const remainder = total - (Number(val) || 0);
                             setSplitAmounts({ efectivo: val, transferencia: val === '' ? '' : (remainder >= 0 ? remainder.toString() : '0') });
                           }}
                           className="w-full h-12 bg-surface-container rounded-2xl px-4 font-bold text-sm focus:ring-2 ring-primary outline-none"
                         />
                      </div>
                      <div className="flex-1 space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-secondary/60 ml-2">Transferencia ($)</label>
                         <input 
                           type="number" 
                           placeholder="Monto transferido" 
                           value={splitAmounts.transferencia}
                           onChange={(e) => {
                             const val = e.target.value;
                             const remainder = total - (Number(val) || 0);
                             setSplitAmounts({ transferencia: val, efectivo: val === '' ? '' : (remainder >= 0 ? remainder.toString() : '0') });
                           }}
                           className="w-full h-12 bg-surface-container rounded-2xl px-4 font-bold text-sm focus:ring-2 ring-primary outline-none"
                         />
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>

              {/* Pedido Para Llevar Toggle */}
              <div className="p-2 sm:p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-indigo-900 text-xs">Pedido Para Llevar</span>
                  </div>
                  <button
                    onClick={() => setTakeout(activeTable, !cart.isTakeout)}
                    className={cn(
                      "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      cart.isTakeout ? "bg-indigo-500" : "bg-outline/20"
                    )}
                  >
                    <span className="sr-only">Toggle Para Llevar</span>
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        cart.isTakeout ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
                
                <AnimatePresence>
                  {cart.isTakeout && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2 mt-2 border-t border-indigo-100 flex flex-col"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[9px] uppercase font-black tracking-widest text-indigo-400">Empaques</p>
                        <input
                          type="text"
                          placeholder="Buscar..."
                          value={packagingSearch}
                          onChange={(e) => setPackagingSearch(e.target.value)}
                          className="flex-1 bg-white border border-indigo-100 rounded text-[10px] px-2 py-1 outline-none focus:border-indigo-300"
                        />
                      </div>
                      
                      <div className="space-y-1.5 overflow-y-auto max-h-[25vh] pr-1 styled-scrollbar">
                        {packagingSuppliesData
                          .filter(s => s.name.toLowerCase().includes(packagingSearch.toLowerCase()))
                          .map(supply => {
                            const quantity = cart.packagingSupplies?.find(s => s.supplyId === supply.id)?.quantity || 0;
                            return (
                              <div key={supply.id} className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-indigo-50 shadow-sm">
                                <span className="text-[10px] font-bold text-indigo-900">{supply.name}</span>
                                <div className="flex items-center gap-2 bg-surface-container-low rounded p-0.5">
                                  <button
                                    onClick={() => updatePackagingSupply(activeTable, supply.id, quantity - 1)}
                                    disabled={quantity <= 0}
                                    className="p-0.5 rounded-sm hover:bg-white disabled:opacity-30 transition-colors"
                                  >
                                    <Minus className="w-3 h-3 text-indigo-600" />
                                  </button>
                                  <span className="text-[10px] font-black text-indigo-900 w-3 text-center">{quantity}</span>
                                  <button
                                    onClick={() => updatePackagingSupply(activeTable, supply.id, quantity + 1)}
                                    className="p-0.5 rounded-sm hover:bg-white transition-colors"
                                  >
                                    <Plus className="w-3 h-3 text-indigo-600" />
                                  </button>
                                </div>
                              </div>
                            );
                        })}
                        {packagingSuppliesData.filter(s => s.name.toLowerCase().includes(packagingSearch.toLowerCase())).length === 0 && (
                          <p className="text-[10px] text-center text-indigo-300 py-2">No se encontraron empaques.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                disabled={!cart?.items.length || isProcessing}
                onClick={handleCheckout}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    Finalizar Venta
                  </>
                )}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* MODAL DE ÉXITO DE VENTA / RECIBO DIGITAL */}
    <AnimatePresence>
      {successSale && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSuccessSale(null);
              setSelectedCliente(null);
              setSearchTerm('');
              setManualPhone('');
              setManualEmail('');
              onClose();
            }}
            className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 overflow-hidden z-10 flex flex-col text-center"
          >
            {/* Celebración */}
            <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <h3 className="font-headline font-black text-2xl text-on-surface mb-1">¡Venta Completada!</h3>
            <p className="text-[10px] text-secondary font-black uppercase tracking-wider mb-4">
              Código de venta: #${successSale.id.slice(-6).toUpperCase()}
            </p>
            
            <div className="bg-surface-container rounded-2xl p-4 mb-6 flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-secondary">Método de pago:</span>
                <span className="text-primary uppercase">
                  {successSale.isMixto || successSale.splitDetails ? 'Mixto' : successSale.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-black border-t border-outline/10 pt-2 text-left">
                <span className="text-on-surface">Total pagado:</span>
                <span className="text-lg text-primary" style={{ marginLeft: 'auto' }}>{formatCurrency(successSale.total)}</span>
              </div>
            </div>

            {/* Opciones de Recibo Digital */}
            <div className="flex flex-col gap-4 text-left">
              <h4 className="font-bold text-xs uppercase tracking-widest text-secondary mb-1">Enviar Recibo Digital</h4>
              
              {/* WhatsApp Option */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-success" /> Número de WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Celular (ej: 3001234567)"
                    value={successSale.clientePhone || manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="flex-1 bg-surface-container border border-outline/10 focus:border-primary rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                  <button
                    onClick={() => {
                      const num = successSale.clientePhone || manualPhone;
                      const link = generateWhatsAppReceiptLink(num, successSale);
                      window.open(link, '_blank');
                    }}
                    disabled={!(successSale.clientePhone || manualPhone)}
                    className="bg-success text-white hover:bg-success/90 transition-colors px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40"
                  >
                    Enviar
                  </button>
                </div>
              </div>

              {/* Email Option */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-primary" /> Correo Electrónico
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Correo (ej: cliente@gmail.com)"
                    value={successSale.clienteEmail || manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="flex-1 bg-surface-container border border-outline/10 focus:border-primary rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                  <button
                    onClick={() => sendEmailReceipt(successSale.clienteEmail || manualEmail, successSale)}
                    disabled={!(successSale.clienteEmail || manualEmail) || emailSending}
                    className="bg-primary text-white hover:bg-primary/90 transition-colors px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessSale(null);
                setSelectedCliente(null);
                setSearchTerm('');
                setManualPhone('');
                setManualEmail('');
                onClose();
              }}
              className="w-full py-4 mt-8 bg-on-surface text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Finalizar y Cerrar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}

