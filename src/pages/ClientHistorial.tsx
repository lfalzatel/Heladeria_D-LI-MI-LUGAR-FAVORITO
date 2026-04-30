import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  X,
  Calendar,
  History,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useHeaderStore } from '../stores/useHeaderStore';
import { useAuthStore } from '../stores/useAuthStore';
import OrderCard from '../components/OrderCard';
import MovementDetailModal from '../components/MovementDetailModal';
import { notifyAdmins, notifyUser } from '../lib/notifications';

export default function ClientHistorial() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { setHeader, clearHeader } = useHeaderStore();
  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';
  
  const [userSales, setUserSales] = useState<any[]>([]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (!profile) return;
    setHeader({
      title: "Mi Historial",
      subtitle: "Actividad Reciente"
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, profile]);

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
        const ts = item.createdAt;
        const dateObj = ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : new Date();
        const hourStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dayStr = dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

        return { 
          id: doc.id, 
          ...item, 
          hour: `${dayStr} - ${hourStr}`,
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
    const messageText = chatMessage.trim();
    if (!messageText || !selectedSaleDetail || !profile) return;
    setSending(true);
    try {
      const newMsg = {
        id: Math.random().toString(36).substr(2, 9),
        from: profile.uid,
        fromName: profile.name,
        text: messageText,
        timestamp: new Date().toISOString(),
      };
      const messages = [...(selectedSaleDetail.messages || []), newMsg];
      await updateDoc(doc(db, 'pedidos', selectedSaleDetail.id), { 
        messages,
        updatedAt: serverTimestamp()
      });
      setChatMessage('');

      // Notificar según quién escribe
      if (isStaff) {
        // Staff respondió al cliente — notificar al cliente
        await notifyUser(
          selectedSaleDetail.clienteId,
          "💬 Nuevo mensaje de la Heladería",
          `Sobre tu pedido #${selectedSaleDetail.id.slice(-6).toUpperCase()}: "${messageText}"`,
          { type: 'chat_message', pedidoId: selectedSaleDetail.id }
        );
      } else {
        // Cliente le escribe al admin — notificar a staff
        await notifyAdmins(
          `💬 Mensaje de ${profile.name}`,
          `Pedido #${selectedSaleDetail.id.slice(-6).toUpperCase()}: "${messageText}"`,
          { 
            type: 'chat_message',
            pedidoId: selectedSaleDetail.id,
            fromName: profile.name
          }
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full relative">
        <div className="p-4 sm:p-6 lg:p-8">

          {/* CONTENIDO (CALENDARIO + LISTA) */}
          <div className="bg-surface-container-lowest rounded-[2.5rem] px-6 sm:px-8 py-8 relative z-10 border border-outline/10">
            
            {/* HEATMAP CALENDAR */}
            {(() => {
                const currentMonth = viewDate.getMonth();
                const currentYear = viewDate.getFullYear();
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

                const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
                const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                
                const days = Array.from({ length: firstDayAdjusted }, () => null).concat(
                   Array.from({ length: daysInMonth }, (_, i) => i + 1)
                );

                const handlePrevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
                const handleNextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

                return (
                  <div className="mb-12 max-w-sm mx-auto">
                    {/* Calendar Header with Controls */}
                    <div className="flex items-center justify-between mb-6 px-2">
                       <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-container rounded-full transition-colors text-secondary">
                          <ChevronLeft className="w-4 h-4" />
                       </button>
                       <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Calendario</p>
                          <h4 className="text-sm font-bold text-on-surface">
                             {monthNames[currentMonth]} {currentYear}
                          </h4>
                       </div>
                       <button 
                          onClick={handleNextMonth} 
                          disabled={currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()}
                          className="p-2 hover:bg-surface-container rounded-full transition-colors text-secondary disabled:opacity-20"
                       >
                          <ChevronRight className="w-4 h-4" />
                       </button>
                    </div>

                    <div className="flex flex-col items-center">
                       <div className="grid grid-cols-7 gap-1 w-fit">
                          {daysOfWeek.map(day => (
                             <div key={day} className="w-8 h-8 flex items-center justify-center">
                                <span className="text-[10px] font-black text-secondary/40 uppercase">{day}</span>
                             </div>
                          ))}
                          {days.map((day, i) => {
                             const count = day ? activityMap[day] : 0;
                             const hasActivity = count > 0;
                             const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                             return (
                                <div 
                                   key={i} 
                                   className={cn(
                                      "w-7 h-9 rounded-lg flex flex-col items-center justify-center text-[9px] font-bold transition-all relative",
                                      hasActivity ? "bg-primary text-white shadow-md shadow-primary/20" : 
                                      day ? "bg-surface-container text-on-surface" : "opacity-0",
                                      isToday && !hasActivity && "ring-1 ring-primary ring-inset"
                                   )}
                                >
                                   <span>{day}</span>
                                   {hasActivity && (
                                      <span className="text-[6px] font-black opacity-60 leading-none mt-0.5">{count}</span>
                                   )}
                                </div>
                             );
                          })}
                       </div>
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
                  <OrderCard 
                    key={sale.id}
                    pedido={sale}
                    isStaff={false}
                    userId={profile.uid}
                    onOpen={() => setSelectedSaleDetail(sale)}
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
    </div>
    );
}
