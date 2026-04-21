import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  Trash2,
  ChevronRight,
  MessageCircle,
  Smartphone,
  CreditCard,
  Banknote,
  Hash
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
  status: 'pendiente' | 'aceptado' | 'celebrado' | 'entregado' | 'rechazado';
  createdAt: any;
  paymentMethod: string;
  messages?: any[];
}

export default function ClientPedidos() {
  const { profile } = useAuthStore();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';

  useEffect(() => {
    if (!profile) return;
    
    // Fetch base query
    const q = isStaff
      ? query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'pedidos'), where('clienteId', '==', profile.uid), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      const allData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
      // FILTRO: Solo pedidos ACTIVOS (Pendiente o Aceptado)
      const actives = allData.filter(p => p.status === 'pendiente' || p.status === 'aceptado');
      setPedidos(actives);
    }, (error) => {
      console.error("Error fetching pedidos:", error);
    });
    return unsub;
  }, [profile?.uid, isStaff]);

  const selectedPedido = pedidos.find(p => p.id === selectedId) || null;

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
      const messages = [...(selectedPedido.messages || []), newMsg];
      await updateDoc(doc(db, 'pedidos', selectedPedido.id), { messages });
      setChatMessage('');
    } catch (error) {
      toast.error("Error al enviar mensaje");
    } finally {
      setSending(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pendiente': return { label: 'Pendiente', color: 'text-amber-500', bg: 'bg-amber-50', icon: <Clock className="w-4 h-4" /> };
      case 'aceptado': return { label: 'En Preparación', color: 'text-blue-500', bg: 'bg-blue-50', icon: <Package className="w-4 h-4" /> };
      default: return { label: status, color: 'text-secondary', bg: 'bg-surface-container', icon: <Package className="w-4 h-4" /> };
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-32">
      <AppHeader showBell />
      <PageTitle 
        title="Mis Pedidos" 
        subtitle="Seguimiento en tiempo real"
      />

      <main className="p-4 sm:p-6 max-w-md mx-auto flex flex-col gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Pedidos Activos</h3>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-black">
              {pedidos.length}
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {pedidos.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-12 text-center border-2 border-dashed border-outline/20"
              >
                <div className="w-16 h-16 bg-surface-container rounded-3xl flex items-center justify-center mx-auto mb-4 text-secondary/30">
                  <Package className="w-8 h-8" />
                </div>
                <p className="text-secondary font-bold text-sm">No tienes pedidos activos</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-secondary/40 mt-1">¡Haz uno en la sección de compras!</p>
              </motion.div>
            ) : (
              pedidos.map((pedido) => {
                const cfg = getStatusConfig(pedido.status);
                return (
                  <motion.div
                    key={pedido.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedId(pedido.id)}
                    className="bg-white rounded-[2rem] p-5 sm:p-6 border border-outline/10 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", cfg.bg, cfg.color)}>
                          {cfg.icon}
                        </div>
                        <div>
                          <p className="text-[10px] text-secondary font-black uppercase tracking-widest leading-none mb-1">Orden</p>
                          <h4 className="font-brand font-black text-on-surface text-lg leading-none uppercase">#{pedido.id.slice(-6).toUpperCase()}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-brand font-black text-primary text-xl leading-none">{formatCurrency(pedido.total)}</p>
                        <p className="text-[10px] text-secondary font-bold uppercase mt-1">Pendiente</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-outline/5 mt-2">
                       <div className="flex items-center gap-2">
                          <div className={cn("px-3 py-1.5 rounded-full flex items-center gap-1.5 ring-2", cfg.bg, "ring-outline/5")}>
                             <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cfg.color.replace('text', 'bg'))} />
                             <span className={cn("text-[9px] font-black uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-secondary/20 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
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
      />

      <BottomNav />
    </div>
  );
}
