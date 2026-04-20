import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, X, Check, XCircle, MessageCircle, 
  Calendar, Clock, Package, ChevronDown, ChevronUp,
  MapPin, Banknote, Smartphone, CreditCard, Hash,
  Receipt, Send, DollarSign, Target
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import AppHeader, { PageTitle } from '../components/AppHeader';

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
  pendiente: { label: 'Pendiente', color: 'text-amber-500', bg: 'bg-amber-400/10', ring: 'ring-amber-500/20', dot: 'bg-amber-400', icon: <Clock className="w-5 h-5" /> },
  aceptado:  { label: 'Aceptado',  color: 'text-emerald-500', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20', dot: 'bg-emerald-500', icon: <Check className="w-5 h-5" /> },
  rechazado: { label: 'Rechazado', color: 'text-red-500', bg: 'bg-red-400/10', ring: 'ring-red-500/20', dot: 'bg-red-400', icon: <XCircle className="w-5 h-5" /> },
};

const PAYMENT_ICONS: Record<string, any> = {
  efectivo: <Banknote className="w-4 h-4" />,
  transferencia: <Smartphone className="w-4 h-4" />,
  datafono: <CreditCard className="w-4 h-4" />,
  credito: <Hash className="w-4 h-4" />,
};

const toDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
};

const formatDate = (ts: any) => {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function ClientPedidos() {
  const { profile } = useAuthStore();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);

  const selectedPedido = pedidos.find(p => p.id === selectedId) || null;
  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';

  useEffect(() => {
    if (!profile) return;
    
    // Staff sees everything, Client sees only their own
    const q = isStaff
      ? query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'pedidos'), where('clienteId', '==', profile.uid), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
      setPedidos(data);
      
      // Calculate stats (Filter stats based on user type if needed, but here we show all they see)
      const total = data.reduce((acc, p) => p.status === 'aceptado' ? acc + p.total : acc, 0);
      setStats({
        totalSpent: total,
        orderCount: data.length,
        favoriteItem: 'Tradicional' 
      });
    }, (error) => {
      console.error("Error fetching pedidos:", error);
    });
    return unsub;
  }, [profile?.uid, isStaff]);

  const activeDays = Array.from(new Set(
    pedidos.map(p => {
      const d = toDate(p.createdAt);
      return d ? d.toLocaleDateString('es-CO') : null;
    }).filter(Boolean)
  )) as string[];

  const filteredPedidos = selectedDay
    ? pedidos.filter(p => toDate(p.createdAt)?.toLocaleDateString('es-CO') === selectedDay)
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
      await updateDoc(doc(db, 'pedidos', selectedPedido.id), { messages });
      setChatMessage('');
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const metrics = [
    { label: 'Total Gastado', value: formatCurrency(stats.totalSpent), trend: 'Histórico', icon: <DollarSign className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-400/10' },
    { label: 'Mis Pedidos', value: stats.orderCount.toString(), trend: 'En tiempo real', icon: <Package className="w-5 h-5 text-primary" />, bg: 'bg-primary/10' },
  ];

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      <div className="flex flex-col min-h-screen relative pb-32 max-w-lg mx-auto bg-white shadow-2xl shadow-on-surface/5">
        <AppHeader showBell />
        
        <div className="px-6 pt-6 pb-2">
           <PageTitle
             title={`Hola, ${profile?.name?.split(' ')[0] || 'Cliente'}!`}
             subtitle="Aquí tienes el resumen de tus compras"
           />
        </div>

        <main className="px-6 flex flex-col gap-8">
          {/* Dashboard Stats Section */}
          <section className="grid grid-cols-2 gap-4">
             {metrics.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-[2rem] p-5 border border-outline/10 shadow-sm flex flex-col gap-3"
                >
                   <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", m.bg)}>
                      {m.icon}
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mb-1">{m.label}</p>
                      <h3 className="text-xl font-headline font-black text-on-surface leading-none">{m.value}</h3>
                   </div>
                   <p className="text-[8px] font-bold text-secondary/40 uppercase tracking-tighter">{m.trend}</p>
                </motion.div>
             ))}
          </section>

          {/* Calendar Glass Filter */}
          <div className="bg-surface-container/50 rounded-[2.5rem] border border-outline/10 overflow-hidden shadow-sm">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between px-5 py-4 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-on-surface text-white flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-on-surface uppercase tracking-widest">
                    {selectedDay ? selectedDay : 'Filtrar Historial'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedDay && (
                  <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="text-[10px] font-black text-primary uppercase">Limpiar</button>
                )}
                {showCalendar ? <ChevronUp className="w-5 h-5 text-secondary" /> : <ChevronDown className="w-5 h-5 text-secondary" />}
              </div>
            </button>

            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 flex flex-wrap gap-2 border-t border-outline/5 pt-4"
                >
                  {activeDays.length === 0 ? (
                    <p className="text-[10px] text-secondary/40 font-bold italic py-2">No hay fechas registradas</p>
                  ) : (
                    activeDays.map(day => (
                      <button
                        key={day}
                        onClick={() => { setSelectedDay(day === selectedDay ? null : day); setShowCalendar(false); }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                          selectedDay === day ? "bg-primary text-white shadow-lg" : "bg-white text-secondary border border-outline/10"
                        )}
                      >
                        {day}
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pedidos List - Dashboard Style */}
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between px-1">
                <h4 className="font-headline font-black text-sm text-on-surface uppercase tracking-widest">Compras Recientes</h4>
                <Receipt className="w-4 h-4 text-secondary/30" />
             </div>
             
             {filteredPedidos.length === 0 ? (
               <div className="py-20 flex flex-col items-center opacity-30">
                  <div className="w-20 h-20 bg-surface-container rounded-[2.5rem] flex items-center justify-center mb-4">
                    <Package className="w-10 h-10" />
                  </div>
                  <p className="font-headline font-black text-on-surface uppercase tracking-widest text-xs">Sin actividad</p>
                  <p className="text-[10px] text-secondary font-bold mt-1">Tus pedidos aparecerán aquí</p>
               </div>
             ) : (
               filteredPedidos.map(pedido => {
                  const cfg = STATUS_CONFIG[pedido.status];
                  return (
                    <motion.button
                      layout
                      key={pedido.id}
                      onClick={() => setSelectedPedido(pedido)}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="w-full text-left bg-white rounded-[2.5rem] p-6 border border-outline/10 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-4">
                         <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", cfg.bg, cfg.color)}>
                               {cfg.icon}
                            </div>
                            <div>
                               <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Orden</p>
                               <h4 className="font-headline font-black text-on-surface text-lg leading-none">#{pedido.id.slice(-6).toUpperCase()}</h4>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="font-headline font-black text-primary text-xl leading-none">{formatCurrency(pedido.total)}</p>
                            <p className="text-[10px] text-secondary font-bold uppercase mt-1 tracking-tighter">{formatDate(pedido.createdAt)}</p>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-outline/5 mt-2">
                         <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full ring-1 ring-outline/5 font-headline">
                               {PAYMENT_ICONS[pedido.paymentMethod] || <Hash className="w-3.5 h-3.5" />}
                               <span className="text-[9px] font-black text-secondary uppercase tracking-tighter">
                                  {pedido.paymentMethod}
                               </span>
                            </div>
                            <span className="text-[10px] font-bold text-secondary/40 uppercase">
                               {pedido.items.length} items
                            </span>
                         </div>
                         <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-2 shadow-sm font-headline", cfg.ring, cfg.bg)}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cfg.dot)} />
                            <span className={cn("text-[9px] font-black uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
                         </div>
                      </div>
                    </motion.button>
                  );
               })
             )}
          </div>
        </main>

        {/* Premium Centered Detail Modal (90vh) */}
        <AnimatePresence>
          {selectedPedido && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedPedido(null)}
                className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col h-[90dvh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="px-6 pt-5 pb-4 border-b border-outline/10 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-primary" />
                     </div>
                     <div>
                        <h3 className="font-headline font-black text-xl text-on-surface leading-none">Detalle de Compra</h3>
                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-1">Ref: #{selectedPedido.id.slice(-6).toUpperCase()}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedPedido(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-all active:scale-90">
                    <X className="w-5 h-5 text-secondary" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar flex flex-col gap-6">
                   {/* Status Card */}
                   {(() => {
                      const cfg = STATUS_CONFIG[selectedPedido.status];
                      return (
                        <div className={cn("rounded-3xl p-5 flex items-center gap-5 ring-2 shadow-sm font-headline", cfg.ring, cfg.bg)}>
                           <div className={cn("w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center", cfg.color)}>
                              {cfg.icon}
                           </div>
                           <div className="flex-1">
                              <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-0.5", cfg.color)}>{cfg.label}</p>
                              <h4 className="font-headline font-black text-on-surface text-lg leading-tight uppercase tracking-tight">
                                 {selectedPedido.status === 'pendiente' ? '¡Estamos revisando!' : selectedPedido.status === 'aceptado' ? '¡Está en camino!' : 'Hubo un problema'}
                              </h4>
                           </div>
                        </div>
                      );
                   })()}

                   {/* Info Grid */}
                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-container/30 rounded-3xl p-4 flex flex-col gap-1 border border-outline/5 shadow-sm">
                         <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Entrega en</p>
                         <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-primary mt-0.5" />
                            <p className="text-xs font-bold text-on-surface leading-normal">{selectedPedido.address}</p>
                         </div>
                      </div>
                      <div className="bg-primary rounded-3xl p-4 flex flex-col gap-1 shadow-lg shadow-primary/20">
                         <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Total Pagado</p>
                         <p className="text-xl font-headline font-black text-white">{formatCurrency(selectedPedido.total)}</p>
                      </div>
                   </div>

                   {/* Summary Section */}
                   <section>
                      <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface mb-4">Productos</h4>
                      <div className="flex flex-col gap-2">
                         {selectedPedido.items.map((item, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline/5">
                              <div className="flex-1 min-w-0 pr-4">
                                 <p className="text-xs font-black text-on-surface truncate">{item.productName}</p>
                                 <p className="text-[10px] font-bold text-secondary uppercase mt-0.5">{item.variantLabel || 'Porción Estándar'}</p>
                                 {item.flavors?.length > 0 && <p className="text-[10px] text-primary font-bold italic mt-0.5">S: {item.flavors.join(' · ')}</p>}
                              </div>
                              <div className="text-right flex-shrink-0 font-headline">
                                 <p className="text-xs font-black text-on-surface">{formatCurrency(item.unitPrice)}</p>
                                 <p className="text-[10px] font-black text-secondary italic">x{item.quantity}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </section>

                   {/* Chat Bubble Experience */}
                   <section className="bg-surface-container/40 rounded-[2rem] p-5 border border-outline/10 h-[300px] flex flex-col shadow-inner">
                      <div className="flex items-center gap-2 text-secondary mb-4">
                         <MessageCircle className="w-5 h-5 opacity-40" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Soporte D'LI</span>
                      </div>
                      <div className="flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar pr-1">
                         {(selectedPedido.messages || []).length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-4">
                              <MessageCircle className="w-8 h-8 mb-2" />
                              <p className="text-[10px] font-bold">¿Deseas pedir algún sabor extra? Escríbenos aquí.</p>
                           </div>
                         ) : (
                           selectedPedido.messages.map((msg: any, i: number) => {
                             const isMe = msg.from === profile?.uid;
                             return (
                               <div key={i} className={cn("flex flex-col gap-1 max-w-[85%]", isMe ? "self-end items-end" : "self-start")}>
                                  <div className={cn("px-4 py-2.5 rounded-2xl text-[11px] font-bold shadow-sm leading-relaxed", 
                                    isMe ? "bg-primary text-white rounded-br-none" : "bg-white text-on-surface border border-outline/10 rounded-bl-none"
                                  )}>
                                     {msg.text}
                                  </div>
                                  <div className="px-2 flex items-center gap-1 opacity-40">
                                     <span className="text-[8px] font-black uppercase tracking-tighter">{msg.fromName === profile?.name ? 'Tú' : 'D´LI'}</span>
                                     <span className="text-[8px]">•</span>
                                     <span className="text-[8px] font-medium">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                               </div>
                             );
                           })
                         )}
                      </div>
                   </section>
                </div>

                {/* Sticky Modal Input Footer */}
                <div className="p-4 bg-white border-t border-outline/10 flex items-center gap-3">
                   <div className="flex-1 bg-surface-container-lowest border border-outline/20 rounded-2xl flex items-center px-4 py-2 group focus-within:ring-2 ring-primary/20 transition-all font-headline">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={e => setChatMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1 bg-transparent text-xs font-bold py-2 outline-none placeholder:text-secondary/30"
                      />
                   </div>
                   <button 
                     onClick={handleSendMessage}
                     disabled={!chatMessage.trim() || sending}
                     className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-all disabled:opacity-30"
                   >
                     <Send className="w-5 h-5 mx-auto" />
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
