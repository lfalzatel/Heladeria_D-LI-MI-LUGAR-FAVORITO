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
import BottomNav from '../components/BottomNav';
import { toast } from 'sonner';
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

function formatOrderDate(ts: any): { date: string; time: string } {
  if (!ts) return { date: 'Hoy', time: '—' };
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return {
    date: `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`,
    time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
  };
}

function PaymentIcon({ method }: { method: string }) {
  const m = (method || '').toLowerCase();
  if (m.includes('efectivo') || m.includes('cash')) return <Banknote className="w-3 h-3" />;
  if (m.includes('nequi') || m.includes('daviplata') || m.includes('pse')) return <Smartphone className="w-3 h-3" />;
  return <CreditCard className="w-3 h-3" />;
}

const ACTIVE_STATUSES = ['pendiente', 'aceptado', 'celebrado'];
const DONE_STATUSES   = ['entregado', 'rechazado', 'cancelado'];

function getStatusConfig(status: string) {
  switch (status) {
    case 'pendiente':  return { label: 'Pendiente',           color: 'text-amber-500',   bg: 'bg-amber-50',   dot: 'bg-amber-400',   ring: 'ring-amber-200' };
    case 'aceptado':   return { label: 'En Preparación',      color: 'text-blue-500',    bg: 'bg-blue-50',    dot: 'bg-blue-400',    ring: 'ring-blue-200' };
    case 'celebrado':  return { label: 'Listo p/ entregar',   color: 'text-emerald-500', bg: 'bg-emerald-50', dot: 'bg-emerald-400', ring: 'ring-emerald-200' };
    case 'entregado':  return { label: 'Entregado',           color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', ring: 'ring-emerald-200' };
    case 'cancelado':  return { label: 'Cancelado',           color: 'text-secondary',   bg: 'bg-surface-container', dot: 'bg-secondary/40', ring: 'ring-outline/10' };
    case 'rechazado':  return { label: 'Rechazado',           color: 'text-red-500',     bg: 'bg-red-50',     dot: 'bg-red-400',     ring: 'ring-red-200' };
    default:           return { label: status,                color: 'text-secondary',   bg: 'bg-surface-container', dot: 'bg-secondary', ring: 'ring-outline/10' };
  }
}

function OrderCard({
  pedido, isStaff, userId, onOpen, onUpdateStatus, isUpdating
}: {
  pedido: Pedido;
  isStaff: boolean;
  userId: string;
  onOpen: () => void;
  onUpdateStatus: (id: string, status: string, e?: React.MouseEvent) => void;
  isUpdating: boolean;
}) {
  const cfg = getStatusConfig(pedido.status);
  const { date, time } = formatOrderDate(pedido.createdAt);
  const singleItem = pedido.items?.length === 1 ? pedido.items[0] : null;
  const multiCount = pedido.items?.length || 0;
  const isActive = ACTIVE_STATUSES.includes(pedido.status);
  const isOwner = pedido.clienteId === userId;
  // Staff can mark any order delivered; client can only confirm their own
  const canMarkDelivered = isStaff || isOwner;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white rounded-[2rem] overflow-hidden border border-outline/10 shadow-sm hover:shadow-md transition-all",
        isUpdating && "opacity-60 pointer-events-none",
        !isActive && "opacity-75"
      )}
    >
      {/* ── Clickable body ── */}
      <div className="p-4 sm:p-5 cursor-pointer" onClick={onOpen}>

        {/* Hero: product info */}
        {singleItem ? (
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
              <IceCream className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-on-surface text-sm leading-tight">
                {singleItem.quantity > 1 && <span className="text-primary mr-1">{singleItem.quantity}×</span>}
                {singleItem.productName}
                {singleItem.variantLabel && <span className="text-secondary font-bold"> · {singleItem.variantLabel}</span>}
              </p>
              {((singleItem.flavors?.length > 0) || (singleItem.additions?.length > 0) || (singleItem.fruitChoices?.length > 0)) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {singleItem.flavors?.map((f: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-primary/8 text-primary text-[8px] font-bold">{f}</span>
                  ))}
                  {singleItem.fruitChoices?.map((f: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-500 text-[8px] font-bold">{f}</span>
                  ))}
                  {singleItem.additions?.map((a: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[8px] font-bold">+{a}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-brand font-black text-primary text-lg leading-none">{formatCurrency(pedido.total)}</p>
              <div className="flex items-center justify-end gap-1 mt-1 text-secondary/50">
                <PaymentIcon method={pedido.paymentMethod} />
                <span className="text-[9px] font-bold capitalize">{pedido.paymentMethod || 'Efectivo'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="font-black text-on-surface text-sm">{multiCount} productos</p>
              <p className="text-[10px] text-secondary font-bold">Ver detalle →</p>
            </div>
            <div className="text-right">
              <p className="font-brand font-black text-primary text-lg leading-none">{formatCurrency(pedido.total)}</p>
              <div className="flex items-center justify-end gap-1 mt-1 text-secondary/50">
                <PaymentIcon method={pedido.paymentMethod} />
                <span className="text-[9px] font-bold capitalize">{pedido.paymentMethod || 'Efectivo'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Secondary meta row */}
        <div className="flex items-center justify-between pt-3 border-t border-outline/5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={cn("px-2.5 py-1 rounded-full flex items-center gap-1.5 ring-1", cfg.bg, cfg.ring)}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isActive && "animate-pulse", cfg.dot)} />
              <span className={cn("text-[9px] font-black uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
            </div>
            <span className="text-[9px] text-secondary/50 font-bold">{date} · {time}</span>
            {isStaff && pedido.clienteName && (
              <span className="text-[9px] text-secondary/50 font-bold">· {pedido.clienteName}</span>
            )}
          </div>
          <span className="text-[9px] font-mono text-secondary/25 font-bold">#{pedido.id.slice(-6).toUpperCase()}</span>
        </div>
      </div>

      {/* ── Action buttons ── */}
      {isActive && (
        <div className="border-t border-outline/5 px-4 py-2.5 flex gap-2 bg-surface-container-lowest/40">
          {isStaff ? (
            <>
              {pedido.status === 'pendiente' && (
                <button
                  onClick={(e) => onUpdateStatus(pedido.id, 'aceptado', e)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Aceptar
                </button>
              )}
              {(pedido.status === 'aceptado' || pedido.status === 'celebrado') && (
                <button
                  onClick={(e) => onUpdateStatus(pedido.id, 'entregado', e)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95"
                >
                  <Truck className="w-3.5 h-3.5" /> Marcar Entregado
                </button>
              )}
              <button
                onClick={(e) => onUpdateStatus(pedido.id, 'rechazado', e)}
                className="w-10 flex items-center justify-center py-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                title="Rechazar pedido"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
              <button
                onClick={onOpen}
                className="w-10 flex items-center justify-center py-2 rounded-xl bg-surface-container text-secondary hover:bg-surface-container-high transition-all active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Client: can cancel only if pending */}
              {pedido.status === 'pendiente' && (
                <button
                  onClick={(e) => onUpdateStatus(pedido.id, 'cancelado', e)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-400 text-[11px] font-black uppercase tracking-wider hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" /> Cancelar
                </button>
              )}
              {/* Client: can confirm delivery of their own order */}
              {canMarkDelivered && (pedido.status === 'aceptado' || pedido.status === 'celebrado') && (
                <button
                  onClick={(e) => onUpdateStatus(pedido.id, 'entregado', e)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Confirmar Entrega
                </button>
              )}
              {!canMarkDelivered && pedido.status !== 'pendiente' && (
                <p className="text-[10px] text-secondary/40 font-bold italic px-1">Ya en preparación · No cancelable</p>
              )}
              <button
                onClick={onOpen}
                className="ml-auto w-10 flex items-center justify-center py-2 rounded-xl bg-surface-container text-secondary hover:bg-surface-container-high transition-all active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

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
    <div className="min-h-screen bg-surface-container-lowest pb-32">
      <AppHeader showBell />
      <PageTitle title={pageTitle} subtitle={pageSubtitle} />

      <main className="p-4 sm:p-6 max-w-md mx-auto flex flex-col gap-6">

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
  );
}
