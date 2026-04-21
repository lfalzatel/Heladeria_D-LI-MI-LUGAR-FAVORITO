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
  X,
  Calendar,
  History,
  ArrowLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import AppHeader, { PageTitle } from '../components/AppHeader';
import HistoryMovementCard from '../components/HistoryMovementCard';
import MovementDetailModal from '../components/MovementDetailModal';
import { useAuthStore } from '../stores/useAuthStore';
import BottomNav from '../components/BottomNav';

export default function ClientHistorial() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [userSales, setUserSales] = useState<any[]>([]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setIsLoading(true);
    // Para el cliente, el historial son sus propios 'pedidos'
    const salesQ = query(
      collection(db, 'pedidos'),
      where('clienteId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(salesQ, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data();
        let hourStr = item.hour;
        if (!hourStr) {
          const ts = item.createdAt;
          if (ts) {
            const dateObj = ts.toDate ? ts.toDate() : new Date(ts);
            hourStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
          }
        }

        return { 
          id: doc.id, 
          ...item, 
          hour: hourStr || 'Reciente',
          title: item.tableName || 'Pedido Online'
        };
      });
      setUserSales(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user history:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedSaleDetail || !profile) return;
    setSending(true);
    try {
      const newMsg = {
        id: Math.random().toString(36).substr(2, 9),
        from: profile.uid,
        fromName: profile.name,
        text: chatMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      const messages = [...(selectedSaleDetail.messages || []), newMsg];
      await updateDoc(doc(db, 'pedidos', selectedSaleDetail.id), { messages });
      setChatMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-32">
      <AppHeader showBell />
      
      <div className="max-w-md mx-auto relative">
         {/* BOTÓN VOLVER (ESTILO MÓVIL) */}
         <button 
           onClick={() => navigate(-1)}
           className="absolute top-4 left-4 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-outline/5 active:scale-90 transition-all"
         >
           <ArrowLeft className="w-5 h-5 text-on-surface" />
         </button>

         {/* ENCABEZADO SIMÉTRICO AL ADMIN */}
         <div className="bg-primary pt-16 pb-20 px-8 flex flex-col items-center">
            <div className="w-24 h-24 rounded-[2.5rem] bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-white text-4xl font-black overflow-hidden shadow-2xl mb-4">
               {profile.imageUrl ? (
                  <img src={profile.imageUrl} alt="" className="w-full h-full object-cover" />
               ) : (
                  profile.name[0]
               )}
            </div>
            <h2 className="text-white font-brand font-black text-3xl uppercase tracking-tighter text-center">
               Mi Historial
            </h2>
            <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-2">
               Registro de Actividad y Pedidos
            </p>
         </div>

         {/* CONTENIDO (CALENDARIO + LISTA) */}
         <div className="bg-surface-container-lowest -mt-10 rounded-t-[3.5rem] px-6 sm:px-8 py-12 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative z-10 border-t border-white/20">
            
            {/* HEATMAP CALENDAR */}
            {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
                const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

                const activityMap: Record<number, number> = {};
                userSales.forEach(sale => {
                  const ts = sale.createdAt;
                  if (!ts) return;
                  const date = ts.toDate ? ts.toDate() : new Date(ts);
                  if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    const day = date.getDate();
                    activityMap[day] = (activityMap[day] || 0) + 1;
                  }
                });

                const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

                return (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-8 px-2">
                       <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Días de Pedidos</span>
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60">
                          {monthNames[currentMonth]} {currentYear}
                       </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                       {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                         <div key={d} className="text-[9px] font-black text-secondary/30 text-center uppercase mb-2">{d}</div>
                       ))}
                       {Array.from({ length: firstDayAdjusted }).map((_, i) => <div key={`empty-${i}`} />)}
                       {Array.from({ length: daysInMonth }).map((_, i) => {
                         const day = i + 1;
                         const count = activityMap[day] || 0;
                         const hasActivity = count > 0;
                         return (
                           <div key={day} className="aspect-square flex items-center justify-center">
                             <div className={cn(
                               "w-full h-full rounded-2xl flex flex-col items-center justify-center transition-all",
                               hasActivity ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-secondary/20 bg-surface-container/30"
                             )}>
                                <span className={cn("text-[10px] font-black", !hasActivity && "opacity-40")}>{day}</span>
                                {hasActivity && <span className="text-[7px] font-bold opacity-60 leading-none">{count}</span>}
                             </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                );
            })()}

            {/* MOVEMENTS LIST */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] px-2 mb-6">Pedidos Recientes</h4>
              
              {isLoading ? (
                <div className="flex justify-center p-12"><div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>
              ) : userSales.length === 0 ? (
                <div className="text-center py-16 opacity-30">
                   <History className="w-12 h-12 mx-auto mb-4" />
                   <p className="uppercase font-black text-[10px] tracking-widest">No tienes pedidos en tu historial aún</p>
                </div>
              ) : (
                userSales.map((sale) => (
                  <HistoryMovementCard 
                    key={sale.id}
                    id={sale.id}
                    title={sale.title}
                    total={sale.total || 0}
                    date={sale.hour}
                    paymentMethod={sale.paymentMethod || 'Efectivo'}
                    status={sale.status || 'aceptado'}
                    itemCount={sale.items?.length || 0}
                    onClick={() => setSelectedSaleDetail(sale)}
                  />
                ))
              )}
            </div>
         </div>
      </div>

      <MovementDetailModal 
        isOpen={!!selectedSaleDetail}
        onClose={() => setSelectedSaleDetail(null)}
        data={selectedSaleDetail}
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
