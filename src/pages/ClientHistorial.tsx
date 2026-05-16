import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  X,
  Calendar,
  History,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  BarChart3,
  CreditCard,
  Wifi,
  Utensils,
  ShoppingBag,
  Play,
  Search
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
  
  const [activeTab, setActiveTab] = useState<'gastos' | 'historial' | 'reportes'>('gastos');
  const [userSales, setUserSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!profile) return;
    setHeader({
      title: "Gastos",
      subtitle: activeTab === 'gastos' ? "Mis Gastos" : activeTab === 'historial' ? "Historial de Pedidos" : "Reportes"
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, profile, activeTab]);

  useEffect(() => {
    if (!profile || activeTab !== 'gastos') return;

    const gastosQ = query(
      collection(db, 'gastos'),
      where('userId', '==', profile.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(gastosQ, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data();
        const dateObj = item.date ? (item.date.toDate ? item.date.toDate() : new Date(item.date)) : new Date();
        return {
          id: doc.id,
          ...item,
          dateObj
        };
      });
      setExpenses(data);
    }, (error) => {
      console.error("Error fetching expenses:", error);
    });

    return () => unsubscribe();
  }, [profile, activeTab]);

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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'netflix': return <Play className="w-5 h-5" />;
      case 'facturas': return <CreditCard className="w-5 h-5" />;
      case 'servicios publicos': return <Wifi className="w-5 h-5" />;
      case 'alimentación': return <Utensils className="w-5 h-5" />;
      default: return <ShoppingBag className="w-5 h-5" />;
    }
  };

  const combinedActivities = [
    ...expenses.map(g => ({
      id: g.id,
      type: 'gasto',
      description: g.description || g.category,
      amount: g.amount,
      category: g.category,
      date: g.dateObj,
      raw: g
    })),
    ...userSales.map(p => ({
      id: p.id,
      type: 'pedido',
      description: `Pedido #${p.id.slice(-6).toUpperCase()}`,
      amount: p.total || 0,
      category: 'Heladería',
      date: p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt),
      raw: p
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredActivities = combinedActivities.filter(act => {
    const matchesSearch = act.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         act.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMonth = act.date.getMonth() === selectedMonth.getMonth() && 
                         act.date.getFullYear() === selectedMonth.getFullYear();
    return matchesSearch && matchesMonth;
  });

  const totalSum = filteredActivities.reduce((acc, act) => acc + act.amount, 0);

  const formatMonth = (date: Date) => {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  return (
    <div className="max-w-4xl mx-auto w-full relative">
        <div className="p-4 sm:p-6 lg:p-8">

          {/* TABS */}
          <div className="flex gap-2 mb-6 bg-surface-container-low p-1.5 rounded-full w-fit mx-auto border border-outline/5">
            {[
              { id: 'gastos', label: 'Mis Gastos', icon: <Receipt className="w-4 h-4" /> },
              { id: 'historial', label: 'Historial', icon: <History className="w-4 h-4" /> },
              { id: 'reportes', label: 'Reportes', icon: <BarChart3 className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-secondary hover:bg-surface-container-high"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* CONTENIDO */}
          <div className="bg-surface-container-lowest rounded-[2.5rem] px-6 sm:px-8 py-8 relative z-10 border border-outline/10">
            
            {activeTab === 'gastos' && (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-[#0B1528] text-white rounded-[1.5rem] p-5 mb-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
                  <div className="relative z-10 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Tus Gastos</p>
                      <p className="text-3xl font-headline font-black">${totalSum.toLocaleString('es-CO')}</p>
                    </div>
                    {profile?.uid && (
                      <div className="bg-[#14213d] rounded-lg px-3 py-1.5 flex items-center gap-2 border border-white/5">
                        <CreditCard className="w-3 h-3 text-primary" />
                        <span className="font-bold text-xs text-white">{profile.uid.slice(-6).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-3 mb-6">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-surface-container rounded-full px-4 py-2.5 flex items-center gap-2 border border-outline/5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <Search className="w-4 h-4 text-secondary/50" />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent outline-none text-sm text-on-surface placeholder:text-secondary/30 w-full"
                      />
                    </div>
                    <div className="bg-surface-container rounded-full px-4 py-2.5 flex items-center gap-2 border border-outline/5 cursor-pointer hover:bg-surface-container-high transition-colors">
                      <Calendar className="w-4 h-4 text-secondary/50" />
                      <span className="text-xs font-bold text-on-surface uppercase">{formatMonth(selectedMonth)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsGastoModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-full text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Gasto
                  </button>
                </div>

                {filteredActivities.length === 0 ? (
                  <div className="text-center py-16 opacity-30">
                     <Receipt className="w-12 h-12 mx-auto mb-4" />
                     <p className="uppercase font-black text-[10px] tracking-widest">No hay gastos o compras registradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActivities.map((activity) => (
                      <div 
                        key={activity.id} 
                        onClick={() => {
                          if (activity.type === 'pedido') {
                            setSelectedSaleDetail(activity.raw);
                          } else {
                            setSelectedExpenseDetail(activity);
                          }
                        }}
                        className="bg-white rounded-[2rem] p-4 flex items-center justify-between border border-outline/10 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            activity.type === 'pedido' ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                          )}>
                            {activity.type === 'pedido' ? <ShoppingBag className="w-5 h-5" /> : getCategoryIcon(activity.category)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-on-surface text-sm leading-tight truncate">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-secondary/50 font-bold">{activity.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-secondary/40">{activity.category}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className={cn(
                            "font-brand font-black text-lg leading-none",
                            activity.type === 'pedido' ? "text-secondary" : "text-primary"
                          )}>
                            ${activity.amount.toLocaleString('es-CO')}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-secondary/50">
                            <span className="text-[9px] font-bold uppercase">{activity.type === 'pedido' ? 'Compra' : 'Gasto'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'historial' && (
              <>
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
              </>
            )}

            {activeTab === 'reportes' && (
              <div className="text-center py-16 opacity-30">
                 <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                 <p className="uppercase font-black text-[10px] tracking-widest">Próximamente: Gráficos y Reportes</p>
              </div>
            )}

         </div>
        </div>

        {/* MODAL REGISTRAR GASTO */}
        <AnimatePresence>
          {isGastoModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface-container-lowest rounded-[2rem] w-full max-width-md p-6 border border-outline/10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Finanzas</p>
                    <h3 className="text-lg font-headline font-bold text-on-surface">Registrar Gasto</h3>
                  </div>
                  <button
                    onClick={() => setIsGastoModalOpen(false)}
                    className="p-2 hover:bg-surface-container rounded-full transition-colors text-secondary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const description = (form.elements.namedItem('description') as HTMLInputElement).value;
                  const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
                  const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                  const category = (form.elements.namedItem('category') as HTMLSelectElement).value;
                  const customCategory = (form.elements.namedItem('customCategory') as HTMLInputElement)?.value;
                  const finalCategory = category === 'otra' ? customCategory : category;

                  if (!amount || !finalCategory || !date) return;

                  try {
                    await addDoc(collection(db, 'gastos'), {
                      userId: profile.uid,
                      description,
                      amount,
                      category: finalCategory,
                      date: date,
                      createdAt: serverTimestamp()
                    });
                    setIsGastoModalOpen(false);
                  } catch (error) {
                    console.error("Error adding expense:", error);
                  }
                }}>
                  <div>
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Descripción</label>
                    <input
                      name="description"
                      type="text"
                      placeholder="Ej. Netflix, Factura Luz..."
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline/10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Monto</label>
                    <input
                      name="amount"
                      type="number"
                      placeholder="0"
                      required
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline/10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Fecha</label>
                    <input
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline/10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Categoría</label>
                    <select
                      name="category"
                      required
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline/10"
                      onChange={(e) => {
                        const customInput = document.getElementById('custom-category-container');
                        if (e.target.value === 'otra') {
                          customInput?.classList.remove('hidden');
                        } else {
                          customInput?.classList.add('hidden');
                        }
                      }}
                    >
                      <option value="Facturas">Facturas</option>
                      <option value="Netflix">Netflix</option>
                      <option value="Servicios Publicos">Servicios Públicos</option>
                      <option value="Alimentación">Alimentación</option>
                      <option value="otra">Otra...</option>
                    </select>
                  </div>

                  <div id="custom-category-container" className="hidden">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Nueva Categoría</label>
                    <input
                      name="customCategory"
                      type="text"
                      placeholder="Ej. Transporte"
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline/10"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 mt-6"
                  >
                    Guardar Gasto
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL DETALLE GASTO */}
        <AnimatePresence>
          {selectedExpenseDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedExpenseDetail(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 border border-outline/10 shadow-2xl flex flex-col gap-4"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-headline font-black text-xl text-on-surface leading-none">Detalle del Gasto</h3>
                      <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-1">Ref: #{selectedExpenseDetail.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedExpenseDetail(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-all active:scale-90"
                  >
                    <X className="w-5 h-5 text-secondary" />
                  </button>
                </div>

                <div className="bg-surface-container/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 border border-outline/5 shadow-sm">
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Monto del Gasto</p>
                  <p className="text-3xl font-headline font-black text-primary">${selectedExpenseDetail.amount.toLocaleString('es-CO')}</p>
                </div>

                <div className="bg-surface-container/30 rounded-2xl p-4 flex flex-col gap-3 border border-outline/5 shadow-sm">
                  <div>
                    <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Descripción</p>
                    <p className="font-bold text-sm text-on-surface">{selectedExpenseDetail.description}</p>
                  </div>
                  <div className="border-t border-outline/10 pt-2 flex justify-between">
                    <div>
                      <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Categoría</p>
                      <p className="font-bold text-xs text-on-surface">{selectedExpenseDetail.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Fecha</p>
                      <p className="font-bold text-xs text-on-surface">{selectedExpenseDetail.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedExpenseDetail(null)}
                  className="w-full py-4 rounded-2xl bg-on-surface text-white font-headline font-black text-sm uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all mt-2"
                >
                  Cerrar Detalle
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
