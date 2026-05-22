import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, Receipt, Smartphone, Banknote, CreditCard, Loader2, ShoppingBag, Pencil, CheckSquare, Check, Lock, Unlock, Send } from 'lucide-react';
import { useTableCartStore } from '../stores/useTableCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import { formatCurrency, cn } from '../lib/utils';
import { CartItem } from '../types';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState } from 'react';
import { notifyAdmins } from '../lib/notifications';
import { deductInventory } from '../utils/inventory';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: CartItem, step?: number) => void;
}

export default function CartDrawer({ isOpen, onClose, onEdit }: CartDrawerProps) {
  const { activeTable, carts, removeItem, updateQuantity, clearCart, getTotal, updateNote, toggleLock } = useTableCartStore();
  const { profile } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta'>('Efectivo');
  
  const cart = carts[activeTable];
  const total = getTotal(activeTable);

  const handleCheckout = async () => {
    if (!cart?.items.length || !profile) return;
    
    setIsProcessing(true);
    try {
      const saleData = {
        items: cart.items,
        total,
        sellerId: profile.uid,
        sellerName: profile.name,
        soldBy: profile.uid, // Required by Firestore rules
        status: 'completed', // Required by Firestore rules
        tableId: activeTable,
        tableName: activeTable === 'paraLlevar' ? 'Para Llevar' : `Mesa ${activeTable.replace('mesa', '')}`,
        note: cart.note || '', // Global order note
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(), // Required by Firestore rules
        paymentMethod,
        date: new Date().toISOString().split('T')[0],
        hour: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
      };

      await addDoc(collection(db, 'sales'), saleData);
      
      // Actualizar conteo de ventas de productos
      const updatePromises = cart.items.map(item => 
        updateDoc(doc(db, 'products', item.productId), {
          salesCount: increment(item.quantity)
        })
      );
      await Promise.all(updatePromises);
      
      // Descontar insumos automáticamente (Frutas, Queso, etc)
      await deductInventory(cart.items);
      
      toast.success('¡Venta realizada con éxito!');
      notifyAdmins(
        "🍦 Nueva venta realizada",
        `Venta manual por ${formatCurrency(total)} - ${paymentMethod}`
      );
      clearCart(activeTable);
      onClose();
    } catch (error: any) {
      console.error("Error finalizing sale:", error);
      toast.error('Error al procesar la venta: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
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
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
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
                          {(item.includedFruits || item.fruitChoices || []).map((f, i) => (
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
              )}
            </div>

            {/* Footer / Checkout */}
            <footer className="p-4 sm:p-8 bg-surface-container-lowest border-t border-surface-container flex flex-col gap-4 sm:gap-6">
              
              {/* Lock / Unlock UI */}
              {cart?.items && cart.items.length > 0 && (
                !cart.items.some(item => !item.locked) ? (
                  <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 text-orange-600">
                      <Lock className="w-5 h-5" />
                      <span className="font-bold text-sm">Pedido Bloqueado</span>
                    </div>
                    {(profile?.role === 'admin' || profile?.role === 'propietario') && (
                      <button 
                        onClick={() => toggleLock(activeTable, false)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 text-xs font-bold rounded-full shadow-sm hover:bg-orange-50 transition-colors"
                      >
                        <Unlock className="w-3 h-3" />
                        Desbloquear
                      </button>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => toggleLock(activeTable, true)}
                    className="w-full py-3 rounded-2xl bg-surface-container border-2 border-primary/20 text-primary font-bold text-sm hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Tomar Pedido (Bloquear)
                  </button>
                )
              )}

              <div className="flex justify-between items-center">
                <span className="text-secondary font-semibold">Total del Pedido</span>
                <span className="text-3xl font-black text-primary">{formatCurrency(total)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPaymentMethod('Efectivo')}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all border-2",
                    paymentMethod === 'Efectivo' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-surface-container-high/50 border-transparent text-on-surface hover:bg-primary/5"
                  )}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Efectivo</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('Transferencia')}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all border-2",
                    paymentMethod === 'Transferencia' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-surface-container-high/50 border-transparent text-on-surface hover:bg-primary/5"
                  )}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Transferencia</span>
                </button>
              </div>

              <button 
                disabled={!cart?.items.length || isProcessing}
                onClick={handleCheckout}
                className="w-full py-5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Receipt className="w-6 h-6" />
                    Finalizar Venta
                  </>
                )}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
