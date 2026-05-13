import React, { useState, useEffect } from 'react';
import { 
  collection, onSnapshot, query, orderBy, where, doc, updateDoc,
  addDoc, serverTimestamp, increment, limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Package, Clock, ChevronRight, IceCream, ShoppingBag,
  Banknote, CreditCard, Smartphone, Check, X, Truck, History
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useHeaderStore } from '../stores/useHeaderStore';
import { useAuthStore } from '../stores/useAuthStore';
import { toast } from 'sonner';
import OrderCard from '../components/OrderCard';
import MovementDetailModal from '../components/MovementDetailModal';
import { notifyAdmins, notifyUser } from '../lib/notifications';
import { deductInventory } from '../utils/inventory';

interface Pedido {
  id: string;
  clienteId: string;
  clienteName: string;
  items: any[];
  total: number;
  status: 'pendiente' | 'aceptado' | 'celebrado' | 'entregado' | 'rechazado' | 'cancelado';
  createdAt: any;
  paymentMethod: string;
  messages?: any[];
}

const ACTIVE_STATUSES = ['pendiente', 'aceptado', 'celebrado'];
const DONE_STATUSES   = ['entregado', 'rechazado', 'cancelado'];

export default function ClientPedidos() {
  const { profile } = useAuthStore();
  const { setHeader, clearHeader } = useHeaderStore();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';

  useEffect(() => {
    setHeader({
      title: isStaff ? 'Pedidos' : 'Mis Pedidos',
      subtitle: isStaff ? 'Gestión en tiempo real' : 'Seguimiento en tiempo real'
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, isStaff]);

  useEffect(() => {
    if (!profile) return;
    // For staff: all pedidos; for client: only their own
    const q = isStaff
      ? query(collection(db, 'pedidos'), orderBy('updatedAt', 'desc'), limit(50))
      : query(collection(db, 'pedidos'), where('clienteId', '==', profile.uid), orderBy('updatedAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[]);
    });
    return unsub;
  }, [profile?.uid, isStaff]);

  const activePedidos = pedidos.filter(p => ACTIVE_STATUSES.includes(p.status));
  const donePedidos   = pedidos.filter(p => DONE_STATUSES.includes(p.status));
  const selectedPedido = pedidos.find(p => p.id === selectedId) || null;

  const handleUpdateStatus = async (pedidoId: string, newStatus: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUpdatingId(pedidoId);
    try {
      const updates: any = { 
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (isStaff && profile) {
         updates.sellerId = profile.uid;
         updates.sellerName = profile.name;
      }

      await updateDoc(doc(db, 'pedidos', pedidoId), updates);
      
      // 2. If delivered, record as SALE
      if (newStatus === 'entregado' && profile) {
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (pedido) {
          const now = new Date();
          const saleData = {
            items: pedido.items,
            total: pedido.total,
            sellerId: profile.uid,
            sellerName: profile.name,
            soldBy: profile.uid, // Requerido por reglas de seguridad
            tableName: pedido.tableName || 'Pedido Online',
            status: 'completed',
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
            paymentMethod: pedido.paymentMethod || 'Efectivo',
            date: now.toISOString().split('T')[0],
            hour: now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
            pedidoId: pedido.id,
            type: 'online',
            customerName: pedido.clienteName || profile.name // Para saber quién lo marcó como entregado
          };
          
          await addDoc(collection(db, 'sales'), saleData);
          
          // Update product sales stats
          const updatePromises = pedido.items.map(item => 
            updateDoc(doc(db, 'products', item.productId), {
              salesCount: increment(item.quantity)
            })
          );
          await Promise.all(updatePromises);
          
          // Deduct inventory
          await deductInventory(pedido.items);
        }
      }

      const labels: Record<string, string> = {
        aceptado: 'Pedido aceptado ✓',
        entregado: 'Pedido entregado ✓',
        cancelado: 'Pedido cancelado',
        rechazado: 'Pedido rechazado',
      };
      toast.success(labels[newStatus] || 'Estado actualizado');
      
      // Notificar al cliente sobre el cambio de estado
      const statusMessages: Record<string, string> = {
        aceptado: 'Tu pedido ha sido aceptado y está en preparación 🍦',
        celebrado: '¡Tu pedido va en camino! 🚀',
        entregado: '¡Tu pedido ha sido entregado! Disfrútalo ✓',
        rechazado: 'Lo sentimos, tu pedido ha sido rechazado.'
      };

      if (statusMessages[newStatus]) {
        await notifyUser(
          selectedPedido?.clienteId || '',
          `Pedido ${newStatus.toUpperCase()}`,
          statusMessages[newStatus],
          { type: 'order_status', pedidoId, status: newStatus }
        );
      }

      if (selectedId === pedidoId) setSelectedId(null);
    } catch (error: any) {
      console.error("Error updating status or recording sale:", error);
      toast.error('Error al actualizar el estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendMessage = async () => {
    const messageText = chatMessage.trim();
    if (!messageText || !selectedPedido || !profile) return;
    setSending(true);
    try {
      const newMsg = {
        id: Math.random().toString(36).substring(2, 9),
        from: profile.uid,
        fromName: profile.name,
        text: messageText,
        timestamp: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'pedidos', selectedPedido.id), {
        messages: [...(selectedPedido.messages || []), newMsg],
        updatedAt: serverTimestamp()
      });
      setChatMessage('');

      // Notificar según quién escribe
      if (isStaff) {
        await notifyUser(
          selectedPedido.clienteId,
          "💬 Nuevo mensaje de la Heladería",
          `Sobre tu pedido #${selectedPedido.id.slice(-6).toUpperCase()}: "${messageText}"`,
          { type: 'chat_message', pedidoId: selectedPedido.id }
        );
      } else {
        await notifyAdmins(
          `💬 Mensaje de ${profile.name}`,
          `Pedido #${selectedPedido.id.slice(-6).toUpperCase()}: "${messageText}"`,
          { 
            type: 'chat_message',
            pedidoId: selectedPedido.id,
            fromName: profile.name
          }
        );
      }
    } catch {
      toast.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const pageTitle   = isStaff ? 'Pedidos' : 'Mis Pedidos';
  const pageSubtitle = isStaff ? 'Gestión en tiempo real' : 'Seguimiento en tiempo real';

  return (
    <>
      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">

        {/* ── ACTIVOS ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Pedidos Activos</h3>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-black">{activePedidos.length}</span>
          </div>

          <AnimatePresence mode="popLayout">
            {activePedidos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-10 text-center border-2 border-dashed border-outline/20"
              >
                <div className="w-14 h-14 bg-surface-container rounded-3xl flex items-center justify-center mx-auto mb-3 text-secondary/30">
                  <Package className="w-7 h-7" />
                </div>
                <p className="text-secondary font-bold text-sm">Sin pedidos activos</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-secondary/40 mt-1">
                  {isStaff ? 'Esperando nuevos pedidos' : '¡Haz uno en la sección de compras!'}
                </p>
              </motion.div>
            ) : (
              activePedidos.map(pedido => (
                <OrderCard
                  key={pedido.id}
                  pedido={pedido}
                  isStaff={isStaff}
                  userId={profile?.uid || ''}
                  onOpen={() => setSelectedId(pedido.id)}
                  onUpdateStatus={handleUpdateStatus}
                  isUpdating={updatingId === pedido.id}
                />
              ))
            )}
          </AnimatePresence>
        </section>

        {/* ── HISTORIAL (entregados / cancelados) ── */}
        {donePedidos.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <History className="w-3.5 h-3.5 text-secondary/50" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/50">Historial reciente</h3>
              <span className="px-2 py-0.5 bg-surface-container text-secondary/50 rounded-full text-[9px] font-black">{donePedidos.length}</span>
            </div>

            <AnimatePresence mode="popLayout">
              {donePedidos.map(pedido => (
                <OrderCard
                  key={pedido.id}
                  pedido={pedido}
                  isStaff={isStaff}
                  userId={profile?.uid || ''}
                  onOpen={() => setSelectedId(pedido.id)}
                  onUpdateStatus={handleUpdateStatus}
                  isUpdating={updatingId === pedido.id}
                />
              ))}
            </AnimatePresence>
          </section>
        )}
      </main>

      <MovementDetailModal
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        data={selectedPedido}
        profile={profile}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
        onSendMessage={handleSendMessage}
        isSending={sending}
        onUpdateStatus={
          (selectedPedido && (isStaff || selectedPedido.clienteId === profile?.uid))
            ? handleUpdateStatus
            : undefined
        }
        onToggleItemPrepared={isStaff ? async (itemId, currentPrepared) => {
          if (!selectedPedido) return;
          try {
            const updatedItems = selectedPedido.items.map((item: any) => 
              item.id === itemId || (!item.id && item.productId === itemId) ? { ...item, prepared: !currentPrepared } : item
            );
            
            // Update Firebase (local state will update via listener)
            const { doc, updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'pedidos', selectedPedido.id), {
              items: updatedItems
            });
          } catch (error) {
            console.error("Error updating item preparation state:", error);
            toast.error("Error al actualizar el estado de preparación");
          }
        } : undefined}
      />

    </>
  );
}
