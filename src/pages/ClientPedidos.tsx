import React, { useState, useEffect } from 'react';
import { 
  collection, onSnapshot, query, orderBy, where, doc, updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Package, Clock, ChevronRight, IceCream, ShoppingBag,
  Banknote, CreditCard, Smartphone, Check, X, Truck, History
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import AppHeader, { PageTitle } from '../components/AppHeader';
import { useAuthStore } from '../stores/useAuthStore';
import AdminSidebar from '../components/AdminSidebar';
import BottomNav from '../components/BottomNav';
import { toast } from 'sonner';
import OrderCard from '../components/OrderCard';
import MovementDetailModal from '../components/MovementDetailModal';

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
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';

  useEffect(() => {
    if (!profile) return;
    // For staff: all pedidos; for client: only their own
    const q = isStaff
      ? query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'pedidos'), where('clienteId', '==', profile.uid), orderBy('createdAt', 'desc'));

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
      await updateDoc(doc(db, 'pedidos', pedidoId), { status: newStatus });
      const labels: Record<string, string> = {
        aceptado: 'Pedido aceptado ✓',
        entregado: 'Pedido entregado ✓',
        cancelado: 'Pedido cancelado',
        rechazado: 'Pedido rechazado',
      };
      toast.success(labels[newStatus] || 'Estado actualizado');
      if (selectedId === pedidoId) setSelectedId(null);
    } catch {
      toast.error('Error al actualizar el estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedPedido || !profile) return;
    setSending(true);
    try {
      const newMsg = {
        id: Math.random().toString(36).substring(2, 9),
        from: profile.uid,
        fromName: profile.name,
        text: chatMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'pedidos', selectedPedido.id), {
        messages: [...(selectedPedido.messages || []), newMsg]
      });
      setChatMessage('');
    } catch {
      toast.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const pageTitle   = isStaff ? 'Pedidos' : 'Mis Pedidos';
  const pageSubtitle = isStaff ? 'Gestión en tiempo real' : 'Seguimiento en tiempo real';

  return (
    <div className="min-h-screen bg-surface-container-lowest flex overflow-x-hidden w-full">
      <AdminSidebar />

      <div className="flex-1 w-full min-w-0 flex flex-col min-h-screen pb-24 lg:pb-0">
        <AppHeader showBell />
        <PageTitle title={pageTitle} subtitle={pageSubtitle} />

        <main className="p-4 sm:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

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
      />

      <BottomNav />
      </div>
    </div>
  );
}
