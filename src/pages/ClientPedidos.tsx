import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  ShoppingCart, X, Check, XCircle, MessageCircle, 
  Calendar, Clock, Package, ChevronDown, ChevronUp,
  MapPin, Banknote, Smartphone, CreditCard, Hash,
  Receipt, Send, DollarSign, Target
} from 'lucide-react';
import AppHeader, { PageTitle } from '../components/AppHeader';
import HistoryMovementCard from '../components/HistoryMovementCard';
import MovementDetailModal from '../components/MovementDetailModal';
import BottomNav from '../components/BottomNav';

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

  // Stats
  const [stats, setStats] = useState({
    totalSpent: 0,
    orderCount: 0,
    favoriteItem: '---'
  });

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
      
      const total = data.reduce((acc, p) => p.status === 'aceptado' ? acc + (p.total || 0) : acc, 0);
      setStats({
        totalSpent: total,
        orderCount: data.length,
        favoriteItem: 'Tradicional' 
      });
    }, (error) => {
      console.error("Error fetching pedidos:", error);
      if (error.code === 'failed-precondition') {
        toast.error("Falta crear el Índice en Firebase para esta consulta.");
      } else {
        toast.error("Error al cargar pedidos.");
      }
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
               filteredPedidos.map((pedido, idx) => (
                 <HistoryMovementCard 
                   key={pedido.id || `pedido-${idx}`}
                   id={pedido.id}
                   total={pedido.total || 0}
                   date={formatDate(pedido.createdAt)}
                   paymentMethod={pedido.paymentMethod || 'Efectivo'}
                   status={pedido.status || 'pendiente'}
                   itemCount={pedido.items?.length || 0}
                   onClick={() => setSelectedId(pedido.id)}
                 />
               ))
             )}
          </div>
        </main>

        <MovementDetailModal 
          isOpen={!!selectedPedido}
          onClose={() => setSelectedId(null)}
          data={selectedPedido}
          profile={profile}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          onSendMessage={handleSendMessage}
          isSending={sending}
        />

        <BottomNav />
      </div>
    </div>
  );
}
