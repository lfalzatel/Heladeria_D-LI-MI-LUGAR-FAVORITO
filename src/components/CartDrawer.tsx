import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, Receipt, Smartphone, Banknote, CreditCard, Loader2, ShoppingBag, Pencil } from 'lucide-react';
import { useTableCartStore } from '../stores/useTableCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import { formatCurrency, cn } from '../lib/utils';
import { CartItem } from '../types';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: CartItem) => void;
}

export default function CartDrawer({ isOpen, onClose, onEdit }: CartDrawerProps) {
  const { activeTable, carts, removeItem, updateQuantity, clearCart, getTotal } = useTableCartStore();
  const { profile } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  
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
        tableId: activeTable,
        tableName: activeTable === 'paraLlevar' ? 'Para Llevar' : `Mesa ${activeTable.replace('mesa', '')}`,
        timestamp: serverTimestamp(),
        paymentMethod,
        date: new Date().toISOString().split('T')[0], // To simplify daily queries
        hour: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
      };

      await addDoc(collection(db, 'sales'), saleData);
      
      toast.success('¡Venta realizada con éxito!');
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
        <div className="fixed inset-0 z-[70]">
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
                  <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-white border border-outline/30 shadow-sm group">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-on-surface leading-tight">
                        {item.productName}
                        {item.variantLabel && <span className="text-xs text-primary ml-2 uppercase">({item.variantLabel})</span>}
                      </h4>
                      
                      {/* Configuration Details */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(item.flavors || []).map((f, i) => (
                          <span key={i} className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded-md font-black italic border border-primary/10">
                            {f}
                          </span>
                        ))}
                        {(item.fruitChoices || []).map((f, i) => (
                          <span key={i} className="text-[10px] bg-success/5 text-success px-1.5 py-0.5 rounded-md font-black border border-success/10">
                            {f}
                          </span>
                        ))}
                        {(item.additions || []).map((a, i) => (
                          <span key={i} className="text-[10px] bg-orange-500/5 text-orange-600 px-1.5 py-0.5 rounded-md font-black border border-orange-500/10">
                            +{a}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center bg-surface-container-low rounded-full px-2 py-1 ring-1 ring-outline/10">
                          <button 
                            onClick={() => updateQuantity(activeTable, item.id, -1)}
                            className="p-1 text-primary hover:bg-primary/10 rounded-full"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(activeTable, item.id, 1)}
                            className="p-1 text-primary hover:bg-primary/10 rounded-full"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-primary">{formatCurrency(item.subtotal)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 transition-all">
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
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer / Checkout */}
            <footer className="p-4 sm:p-8 bg-surface-container-lowest border-t border-surface-container flex flex-col gap-4 sm:gap-6">
              <div className="flex justify-between items-center">
                <span className="text-secondary font-semibold">Total del Pedido</span>
                <span className="text-3xl font-black text-primary">{formatCurrency(total)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all border-2",
                    paymentMethod === 'cash' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-surface-container-high/50 border-transparent text-on-surface hover:bg-primary/5"
                  )}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Efectivo</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('transfer')}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all border-2",
                    paymentMethod === 'transfer' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-surface-container-high/50 border-transparent text-on-surface hover:bg-primary/5"
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
