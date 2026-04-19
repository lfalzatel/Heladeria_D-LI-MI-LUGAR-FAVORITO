import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, X, Check, XCircle, ChevronRight, MessageCircle, 
  Calendar, Clock, Package, ChevronDown, ChevronUp 
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import AppHeader, { PageTitle } from '../components/AppHeader';
import AdminSidebar from '../components/AdminSidebar';

interface Pedido {
  id: string;
  clienteId: string;
  clienteName: string;
  items: any[];
  total: number;
  paymentMethod: string;
  address: string;
  status: 'pendiente' | 'aceptado' | 'rechazado';
  note?: string;
  createdAt: any;
  messages?: any[];
}

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'text-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-200', dot: 'bg-amber-400', icon: <Clock className="w-4 h-4" /> },
  aceptado:  { label: 'Aceptado',  color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500', icon: <Check className="w-4 h-4" /> },
  rechazado: { label: 'Rechazado', color: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-200', dot: 'bg-red-400', icon: <XCircle className="w-4 h-4" /> },
};

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: '💵 Efectivo',
  transferencia: '📲 Transferencia',
  datafono: '💳 Datáfono',
  credito: '# A Crédito',
};

// Helper: get a Date object from Firestore Timestamp or string
const toDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
};

const formatDate = (ts: any) => {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatShortDate = (ts: any) => {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ClientPedidos() {
  const { profile } = useAuthStore();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const isCliente = profile?.role === 'cliente';

  useEffect(() => {
    if (!profile) return;

    const q = isCliente
      ? query(collection(db, 'pedidos'), where('clienteId', '==', profile.uid), orderBy('createdAt', 'desc'))
      : query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
      setPedidos(data);
      if (selectedPedido) {
        const updated = data.find(p => p.id === selectedPedido.id);
        if (updated) setSelectedPedido(updated);
      }
    });

    return unsub;
  }, [profile?.uid]);

  // Get unique days with pedidos
  const activeDays = Array.from(new Set(
    pedidos.map(p => {
      const d = toDate(p.createdAt);
      return d ? d.toLocaleDateString('es-CO') : null;
    }).filter(Boolean)
  )) as string[];

  const filteredPedidos = selectedDay
    ? pedidos.filter(p => {
        const d = toDate(p.createdAt);
        return d && d.toLocaleDateString('es-CO') === selectedDay;
      })
    : pedidos;

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedPedido || !profile) return;
    setSending(true);
    try {
      const newMsg = {
        id: Math.random().toString(36).substr(2, 9),
        from: profile.uid,
        fromName: profile.name,
        text: chatMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      const messages = [...(selectedPedido.messages || []), newMsg];
      await import('firebase/firestore').then(({ updateDoc, doc }) =>
        updateDoc(doc(db, 'pedidos', selectedPedido.id), { messages })
      );
      setChatMessage('');
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-surface-container-lowest to-surface-container/30">
      {profile?.role !== 'cliente' && <AdminSidebar />}
      <div className="flex-1 flex flex-col min-h-screen relative pb-32">
        <AppHeader showBell />
        <PageTitle
          title="Tus Pedidos"
          subtitle="Revisa el estado de tus compras y contáctanos."
        />

      <main className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
        {/* Calendar toggle */}
        <div className="bg-white rounded-2xl border border-outline/20 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-on-surface">
                  {selectedDay ? `Filtrando: ${selectedDay}` : 'Ver por fecha'}
                </p>
                <p className="text-[10px] text-secondary font-medium">{activeDays.length} días con actividad</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedDay && (
                <button
                  onClick={e => { e.stopPropagation(); setSelectedDay(null); }}
                  className="text-[10px] text-secondary font-bold hover:text-primary underline"
                >
                  Ver todos
                </button>
              )}
              {showCalendar ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
            </div>
          </button>

          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-outline/10 px-5 py-4 flex flex-wrap gap-2 overflow-hidden"
              >
                {activeDays.length === 0 ? (
                  <p className="text-xs text-secondary font-medium py-2">No hay pedidos registrados aún.</p>
                ) : activeDays.map(day => (
                  <button
                    key={day}
                    onClick={() => { setSelectedDay(day === selectedDay ? null : day); setShowCalendar(false); }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                      selectedDay === day
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-surface-container text-secondary border-outline/20 hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pedidos list */}
        {filteredPedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <ShoppingCart className="w-14 h-14 mb-4" />
            <p className="text-base font-bold">Sin pedidos {selectedDay ? 'este día' : 'aún'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredPedidos.map(pedido => {
              const cfg = STATUS_CONFIG[pedido.status];
              return (
                <motion.button
                  key={pedido.id}
                  layout
                  onClick={() => setSelectedPedido(pedido)}
                  className="w-full text-left bg-white rounded-3xl border border-outline/20 shadow-sm p-5 hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    {/* Status icon */}
                    <div className={cn("w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ring-1", cfg.bg, cfg.ring, cfg.color)}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-secondary font-bold uppercase tracking-[0.15em]">Pedido</p>
                          <p className="font-black text-on-surface text-lg leading-tight">#{pedido.id.slice(-6).toUpperCase()}</p>
                        </div>
                        <p className="font-black text-on-surface text-lg shrink-0">{formatCurrency(pedido.total)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3 h-3 text-secondary/50" />
                        <p className="text-[11px] text-secondary font-medium">{formatDate(pedido.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-secondary font-medium">
                        {pedido.items?.length || 0} item{(pedido.items?.length || 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="text-outline/40">•</span>
                      <div className="flex items-center gap-1 text-secondary">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">Consultas</span>
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide", cfg.color)}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                      {cfg.label}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      {/* Order Detail Drawer */}
      <AnimatePresence>
        {selectedPedido && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPedido(null)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Drawer handle */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-outline/30 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 pt-4 pb-4 border-b border-outline/10 flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Detalle de Pedido</p>
                  <h2 className="font-black text-on-surface text-2xl">#{selectedPedido.id.slice(-6).toUpperCase()}</h2>
                  <p className="text-xs text-secondary mt-1">{formatDate(selectedPedido.createdAt)}</p>
                </div>
                <button
                  onClick={() => setSelectedPedido(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Status + info */}
                <div className="px-6 py-4 flex flex-col gap-3">
                  {/* Status badge */}
                  {(() => {
                    const cfg = STATUS_CONFIG[selectedPedido.status];
                    return (
                      <div className={cn("flex items-center gap-2 px-4 py-3 rounded-2xl ring-1", cfg.bg, cfg.ring)}>
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", cfg.color, 'bg-white/60')}>
                          {cfg.icon}
                        </div>
                        <div>
                          <p className={cn("text-xs font-black uppercase tracking-wider", cfg.color)}>{cfg.label}</p>
                          <p className="text-[10px] text-secondary font-medium">
                            {selectedPedido.status === 'pendiente' && 'Estamos revisando tu pedido'}
                            {selectedPedido.status === 'aceptado' && '¡Tu pedido está en preparación!'}
                            {selectedPedido.status === 'rechazado' && 'Tu pedido no pudo procesarse'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-container/50 rounded-2xl p-4">
                      <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-1">Pago</p>
                      <p className="text-sm font-bold text-on-surface">{PAYMENT_LABELS[selectedPedido.paymentMethod] || selectedPedido.paymentMethod}</p>
                    </div>
                    <div className="bg-surface-container/50 rounded-2xl p-4">
                      <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-1">Total</p>
                      <p className="text-sm font-black text-primary">{formatCurrency(selectedPedido.total)}</p>
                    </div>
                    <div className="bg-surface-container/50 rounded-2xl p-4 col-span-2">
                      <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-1">📍 Dirección</p>
                      <p className="text-xs font-medium text-on-surface">{selectedPedido.address}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-2">Items del Pedido</p>
                    <div className="flex flex-col gap-2">
                      {(selectedPedido.items || []).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2.5 px-4 bg-surface-container/40 rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-on-surface">{item.productName}</p>
                            {item.variantLabel && <p className="text-[10px] text-secondary">{item.variantLabel}</p>}
                            {item.flavors?.length > 0 && <p className="text-[10px] text-primary/70">{item.flavors.join(', ')}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-on-surface">{formatCurrency(item.unitPrice)}</p>
                            <p className="text-[10px] text-secondary">x{item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  {selectedPedido.note && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">📝 Nota</p>
                      <p className="text-xs text-amber-800">{selectedPedido.note}</p>
                    </div>
                  )}
                </div>

                {/* Chat */}
                <div className="border-t border-outline/10 px-6 py-4">
                  <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5" /> Conversación
                  </p>
                  <div className="flex flex-col gap-2 min-h-[80px]">
                    {(selectedPedido.messages || []).length === 0 ? (
                      <div className="flex items-center justify-center py-6 opacity-30">
                        <p className="text-xs font-bold text-secondary">Sin mensajes aún. Escríbeles aquí.</p>
                      </div>
                    ) : (
                      (selectedPedido.messages || []).map((msg: any, i: number) => {
                        const isMe = msg.from === profile?.uid;
                        return (
                          <div key={i} className={cn("flex flex-col gap-0.5 max-w-[75%]", isMe ? "self-end items-end" : "self-start")}>
                            <span className="text-[9px] font-bold text-secondary px-1">{msg.fromName}</span>
                            <div className={cn("px-3 py-2 rounded-2xl text-xs font-medium shadow-sm",
                              isMe ? "bg-primary text-white rounded-br-sm" : "bg-surface-container text-on-surface rounded-bl-sm"
                            )}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Chat input */}
              <div className="px-5 py-4 border-t border-outline/10 flex items-center gap-3 bg-white rounded-b-[2.5rem]">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Escribe un mensaje al equipo D'LI..."
                  className="flex-1 bg-surface-container rounded-full px-5 py-3 text-xs font-medium outline-none border border-outline/20 focus:border-primary transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || sending}
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:scale-110 active:scale-95 transition-all shadow-md shadow-primary/30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
      </div>
    </div>
  );
}
