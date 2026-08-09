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
  addDoc,
  deleteDoc
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
  Search,
  IceCream,
  Smartphone,
  Banknote,
  Music,
  Cloud,
  MonitorPlay,
  Droplet,
  Zap,
  Flame,
  Home,
  Clock
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
  const [expenses, setExpenses] = useState<any[]>([]);
  const [userSales, setUserSales] = useState<any[]>([]);

  const clientDebtSummary = React.useMemo(() => {
    let totalDebt = 0;
    let totalPaid = 0;
    userSales.forEach(s => {
      const pm = (s.paymentMethod || '').toLowerCase();
      if (pm === 'credito' || pm === 'debe') {
        totalDebt += s.total || 0;
        totalPaid += s.totalAbonado || 0;
      }
    });
    return {
      totalDebt,
      totalPaid,
      pending: totalDebt - totalPaid
    };
  }, [userSales]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<any | null>(null);
  const [gastoToEdit, setGastoToEdit] = useState<any | null>(null);
  const [gastoCategory, setGastoCategory] = useState<string>('Facturas');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(null);

  const handlePrevMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    setSelectedMonth(newMonth);
    setSelectedDateFilter(null);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    setSelectedMonth(newMonth);
    setSelectedDateFilter(null);
  };

  const formatCurrency = (val: number) => {
    return '$' + val.toLocaleString('es-CO');
  };

  const PaymentIcon = ({ method }: { method: string }) => {
    const m = (method || '').toLowerCase();
    if (m.includes('efectivo') || m.includes('cash')) return <Banknote className="w-3 h-3" />;
    if (m.includes('nequi') || m.includes('daviplata') || m.includes('pse')) return <Smartphone className="w-3 h-3" />;
    if (m.includes('credito') || m.includes('debe')) return <Clock className="w-3 h-3 text-orange-500" />;
    return <CreditCard className="w-3.5 h-3.5 text-secondary" />;
  };

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
    let pedidosRaw: any[] = [];
    let salesRaw: any[] = [];

    const updateMergedSales = () => {
      const merged = [...pedidosRaw, ...salesRaw].sort((a, b) => {
        const tA = (a.createdAt || a.timestamp)?.toDate ? (a.createdAt || a.timestamp).toDate().getTime() : new Date(a.createdAt || a.timestamp).getTime();
        const tB = (b.createdAt || b.timestamp)?.toDate ? (b.createdAt || b.timestamp).toDate().getTime() : new Date(b.createdAt || b.timestamp).getTime();
        return tB - tA;
      });
      setUserSales(merged);
    };

    const qP = query(
      collection(db, 'pedidos'),
      where('clienteId', '==', profile.uid)
    );
    const unsubP = onSnapshot(qP, (snap) => {
      pedidosRaw = snap.docs.map(doc => {
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
      updateMergedSales();
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user history pedidos:", error);
      setIsLoading(false);
    });

    const qS = query(
      collection(db, 'sales'),
      where('clienteId', '==', profile.uid)
    );
    const unsubS = onSnapshot(qS, (snap) => {
      salesRaw = snap.docs.map(doc => {
        const item = doc.data();
        const ts = item.timestamp;
        const dateObj = ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : new Date();
        const hourStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dayStr = dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

        return { 
          id: doc.id, 
          ...item, 
          hour: `${dayStr} - ${hourStr}`,
          title: item.tableName || 'Venta POS'
        };
      });
      updateMergedSales();
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user history sales:", error);
      setIsLoading(false);
    });

    return () => {
      unsubP();
      unsubS();
    };
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
      case 'netflix': return <MonitorPlay className="w-5 h-5" />;
      case 'youtube music': return <Music className="w-5 h-5" />;
      case 'google one': return <Cloud className="w-5 h-5" />;
      case 'agua': return <Droplet className="w-5 h-5" />;
      case 'luz': return <Zap className="w-5 h-5" />;
      case 'gas': return <Flame className="w-5 h-5" />;
      case 'claro hogar': return <Home className="w-5 h-5" />;
      case 'claro movil': return <Smartphone className="w-5 h-5" />;
      case 'facturas': return <CreditCard className="w-5 h-5" />;
      case 'servicios publicos': return <Wifi className="w-5 h-5" />;
      case 'alimentación': return <Utensils className="w-5 h-5" />;
      default: return <Receipt className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'netflix': 
      case 'youtube music': 
      case 'claro hogar': 
      case 'claro movil': return "bg-red-50 text-red-500";
      case 'google one': 
      case 'agua': return "bg-blue-50 text-blue-500";
      case 'luz': return "bg-yellow-50 text-yellow-500";
      case 'gas': return "bg-orange-50 text-orange-500";
      case 'facturas': return "bg-indigo-50 text-indigo-500";
      case 'servicios publicos': return "bg-cyan-50 text-cyan-600";
      case 'alimentación': return "bg-emerald-50 text-emerald-600";
      default: return "bg-slate-50 text-slate-500";
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

  // Agrupar actividades por día para el mapa de calor (conteo de transacciones)
  const currentMonth = selectedMonth.getMonth();
  const currentYear = selectedMonth.getFullYear();
  const dailyActivityCount: Record<number, number> = {};
  
  combinedActivities.forEach(act => {
    if (act.date.getMonth() === currentMonth && act.date.getFullYear() === currentYear) {
      const day = act.date.getDate();
      dailyActivityCount[day] = (dailyActivityCount[day] || 0) + 1;
    }
  });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const calendarDays = Array.from({ length: firstDayAdjusted }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-surface-container text-secondary/30 hover:bg-surface-container-high";
    if (count === 1) return "bg-primary/10 text-primary border border-primary/10 hover:bg-primary/20";
    if (count <= 3) return "bg-primary/30 text-primary font-black border border-primary/25 hover:bg-primary/45";
    return "bg-primary text-white shadow-sm shadow-primary/20 hover:opacity-90 font-black";
  };

  const filteredActivities = combinedActivities.filter(act => {
    const matchesSearch = act.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         act.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedDateFilter) {
      return matchesSearch && 
             act.date.getDate() === selectedDateFilter.getDate() &&
             act.date.getMonth() === selectedDateFilter.getMonth() &&
             act.date.getFullYear() === selectedDateFilter.getFullYear();
    } else {
      return matchesSearch && 
             act.date.getMonth() === selectedMonth.getMonth() && 
             act.date.getFullYear() === selectedMonth.getFullYear();
    }
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

                {/* Deuda / Abonos Summary Card */}
                {clientDebtSummary.totalDebt > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-orange-50 border border-orange-200 rounded-[1.5rem] p-4 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest text-orange-600 mb-1">Saldo Pendiente (Debe)</p>
                      <p className="text-xl font-headline font-black text-orange-950">
                        {formatCurrency(clientDebtSummary.pending)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-4 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Abonado</p>
                      <p className="text-xl font-headline font-black text-emerald-950">
                        {formatCurrency(clientDebtSummary.totalPaid)}
                      </p>
                    </div>
                  </div>
                )}

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
                    <button
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={cn(
                        "bg-surface-container rounded-full px-4 py-2.5 flex items-center gap-2 border hover:bg-surface-container-high transition-all active:scale-95 cursor-pointer",
                        showHeatmap ? "border-primary/50 ring-2 ring-primary/10" : "border-outline/5"
                      )}
                    >
                      <Calendar className={cn("w-4 h-4", showHeatmap ? "text-primary" : "text-secondary/50")} />
                      <span className={cn("text-xs font-bold uppercase", showHeatmap ? "text-primary" : "text-on-surface")}>
                        {selectedDateFilter 
                          ? selectedDateFilter.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) 
                          : formatMonth(selectedMonth)
                        }
                      </span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setGastoToEdit(null);
                      setGastoCategory('Facturas');
                      setIsGastoModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-full text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Gasto
                  </button>
                </div>

                {/* CALENDARIO DE CALOR COLLAPSIBLE */}
                <AnimatePresence>
                  {showHeatmap && (
                    <>
                      <div className="fixed inset-0 z-[15]" onClick={() => setShowHeatmap(false)} />
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="overflow-hidden bg-white/90 backdrop-blur-md rounded-[2rem] p-5 border border-outline/10 shadow-lg relative z-[20] mb-6"
                      >
                      {/* Cabecera del Calendario */}
                      <div className="flex items-center justify-between mb-4">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            handlePrevMonth();
                          }} 
                          className="p-2 hover:bg-surface-container rounded-full transition-colors text-secondary cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-0.5">Densidad de Gastos</p>
                          <h4 className="text-sm font-bold text-on-surface">
                            {formatMonth(selectedMonth)}
                          </h4>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            handleNextMonth();
                          }} 
                          disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}
                          className="p-2 hover:bg-surface-container rounded-full transition-colors text-secondary disabled:opacity-20 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Cuadrícula de Días */}
                      <div className="flex flex-col items-center">
                        <div className="grid grid-cols-7 gap-1 w-full max-w-sm">
                          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                            <div key={day} className="h-8 flex items-center justify-center">
                              <span className="text-[10px] font-black text-secondary/40 uppercase">{day}</span>
                            </div>
                          ))}
                          {calendarDays.map((day, i) => {
                            if (!day) return <div key={`empty-${i}`} className="opacity-0" />;
                            
                            const count = dailyActivityCount[day] || 0;
                            const isSelected = selectedDateFilter && 
                                              selectedDateFilter.getDate() === day &&
                                              selectedDateFilter.getMonth() === currentMonth &&
                                              selectedDateFilter.getFullYear() === currentYear;
                            
                            const isToday = day === new Date().getDate() && 
                                            currentMonth === new Date().getMonth() && 
                                            currentYear === new Date().getFullYear();

                            return (
                              <button
                                key={`day-${day}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (isSelected) {
                                    setSelectedDateFilter(null);
                                  } else {
                                    setSelectedDateFilter(new Date(currentYear, currentMonth, day));
                                  }
                                }}
                                className={cn(
                                  "h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-all relative border border-transparent cursor-pointer z-[21]",
                                  getHeatmapColor(count),
                                  isSelected && "ring-2 ring-primary ring-offset-2 scale-[1.08] z-[22]",
                                  isToday && !isSelected && "border-primary/50"
                                )}
                                title={`Día ${day}: ${count} movimiento${count !== 1 ? 's' : ''}`}
                              >
                                <span>{day}</span>
                                {count > 0 && (
                                  <span className={cn(
                                    "text-[7px] font-black leading-none mt-0.5 opacity-80",
                                    count > 3 ? "text-white" : "text-primary"
                                  )}>
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Leyenda y Acciones */}
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-3 border-t border-outline/5 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="text-secondary/50 font-bold">Menos</span>
                          <div className="w-3.5 h-3.5 rounded bg-surface-container" />
                          <div className="w-3.5 h-3.5 rounded bg-primary/10 border border-primary/10" />
                          <div className="w-3.5 h-3.5 rounded bg-primary/30 border border-primary/25" />
                          <div className="w-3.5 h-3.5 rounded bg-primary" />
                          <span className="text-secondary/50 font-bold">Más</span>
                        </div>
                        {selectedDateFilter && (
                          <button
                            onClick={() => setSelectedDateFilter(null)}
                            className="text-primary font-black uppercase hover:underline cursor-pointer tracking-widest text-[9px]"
                          >
                            Limpiar Filtro de Día
                          </button>
                        )}
                      </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {filteredActivities.length === 0 ? (
                  <div className="text-center py-16 opacity-30">
                     <Receipt className="w-12 h-12 mx-auto mb-4" />
                     <p className="uppercase font-black text-[10px] tracking-widest">No hay gastos o compras registradas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredActivities.map((activity) => {
                      if (activity.type === 'pedido') {
                        const pedidoObj = activity.raw;
                        const singleItem = pedidoObj.items?.length === 1 ? pedidoObj.items[0] : null;
                        const multiCount = pedidoObj.items?.length || 0;
                        
                        return (
                          <div 
                            key={activity.id} 
                            onClick={() => setSelectedSaleDetail(pedidoObj)}
                            className="bg-white rounded-[2rem] p-4 sm:p-5 flex flex-col border border-outline/10 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                {singleItem ? (
                                  <>
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
                                  </>
                                ) : (
                                  <>
                                    <p className="font-black text-on-surface text-sm leading-tight">
                                      Pedido de {multiCount} productos
                                    </p>
                                    <p className="text-[10px] text-secondary/60 font-bold mt-1">
                                      Ver detalle del pedido →
                                    </p>
                                  </>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-brand font-black text-secondary text-lg leading-none">
                                  ${activity.amount.toLocaleString('es-CO')}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-1.5 text-secondary/50">
                                  <PaymentIcon method={pedidoObj.paymentMethod} />
                                  <span className="text-[9px] font-bold capitalize">{pedidoObj.paymentMethod || 'Efectivo'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex items-center justify-between pt-3 border-t border-outline/5 mt-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="px-2.5 py-0.5 rounded-full flex items-center gap-1.5 bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 text-[9px] font-black uppercase tracking-widest">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Compra</span>
                                </div>
                                <span className="text-[9px] text-secondary/50 font-bold">
                                  {activity.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-secondary/40">
                                  · {pedidoObj.tableName || 'Pedido Online'}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-secondary/25 font-bold">
                                #{pedidoObj.id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div 
                            key={activity.id} 
                            onClick={() => setSelectedExpenseDetail(activity)}
                            className="bg-white rounded-[2rem] p-4 sm:p-5 flex flex-col border border-outline/10 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                getCategoryColor(activity.category)
                              )}>
                                {getCategoryIcon(activity.category)}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="font-black text-on-surface text-sm leading-tight">
                                  {activity.description}
                                </p>
                                <p className="text-[10px] text-secondary/60 font-bold mt-1">
                                  Registrado como gasto manual
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-brand font-black text-primary text-lg leading-none">
                                  ${activity.amount.toLocaleString('es-CO')}
                                </p>
                                <span className="text-[9px] font-bold text-secondary/40 block mt-1">COP</span>
                              </div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex items-center justify-between pt-3 border-t border-outline/5 mt-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="px-2.5 py-0.5 rounded-full flex items-center gap-1.5 bg-amber-50 text-amber-600 ring-1 ring-amber-200 text-[9px] font-black uppercase tracking-widest">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>Gasto</span>
                                </div>
                                <span className="text-[9px] text-secondary/50 font-bold">
                                  {activity.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-secondary/40">
                                  · {activity.category}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-secondary/25 font-bold">
                                #{activity.id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    })}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface-container-lowest rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 border border-outline/10 shadow-2xl"
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
                  const amountRaw = (form.elements.namedItem('amount') as HTMLInputElement).value;
                  const amount = parseFloat(amountRaw);
                  const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                  const category = (form.elements.namedItem('category') as HTMLInputElement).value;
                  const customCategory = (form.elements.namedItem('customCategory') as HTMLInputElement)?.value;
                  const finalCategory = category === 'otra' ? customCategory : category;

                  if (isNaN(amount) || amount <= 0) {
                    alert('Por favor, ingresa un monto válido mayor a 0.');
                    return;
                  }
                  if (!finalCategory) {
                    alert('Por favor, especifica una categoría.');
                    return;
                  }
                  if (!date) {
                    alert('Por favor, selecciona una fecha.');
                    return;
                  }

                  try {
                    if (gastoToEdit) {
                      await updateDoc(doc(db, 'gastos', gastoToEdit.id), {
                        description,
                        amount,
                        category: finalCategory,
                        date: date
                      });
                    } else {
                      await addDoc(collection(db, 'gastos'), {
                        userId: profile?.uid || '',
                        description,
                        amount,
                        category: finalCategory,
                        date: date,
                        createdAt: serverTimestamp()
                      });
                    }
                    setIsGastoModalOpen(false);
                    setGastoToEdit(null);
                  } catch (error: any) {
                    console.error("Error adding/updating expense:", error);
                    alert("Error al guardar el gasto: " + error.message);
                  }
                }}>
                  <div>
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Descripción</label>
                    <input
                      name="description"
                      type="text"
                      defaultValue={gastoToEdit?.description || ''}
                      placeholder="Ej. Netflix, Factura Luz..."
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline/10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Monto</label>
                    <input
                      name="amount"
                      type="number"
                      defaultValue={gastoToEdit?.amount || ''}
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
                      defaultValue={gastoToEdit?.date || new Date().toISOString().split('T')[0]}
                      required
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline/10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Categoría</label>
                    <input type="hidden" name="category" value={gastoCategory} />
                    <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 hide-scrollbar">
                      {['Facturas', 'Netflix', 'Youtube Music', 'Google One', 'Agua', 'Luz', 'Gas', 'Claro Hogar', 'Claro Movil', 'Alimentación', 'otra'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setGastoCategory(cat);
                            if (cat !== 'otra') {
                              const customInput = document.getElementById('custom-category-container');
                              customInput?.classList.add('hidden');
                            } else {
                              const customInput = document.getElementById('custom-category-container');
                              customInput?.classList.remove('hidden');
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl border whitespace-nowrap transition-all flex-shrink-0",
                            gastoCategory === cat 
                              ? "bg-primary/10 border-primary text-primary" 
                              : "bg-surface-container-low border-outline/10 text-secondary hover:bg-surface-container hover:border-outline/20"
                          )}
                        >
                          {cat !== 'otra' && (
                            <div className={gastoCategory === cat ? "text-primary" : "opacity-60"}>
                              {getCategoryIcon(cat)}
                            </div>
                          )}
                          <span className={cn("text-xs font-bold", gastoCategory === cat ? "text-primary font-black" : "")}>
                            {cat === 'otra' ? 'Otra...' : cat}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div id="custom-category-container" className={gastoCategory === 'otra' ? '' : 'hidden'}>
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 block">Nueva Categoría</label>
                    <input
                      name="customCategory"
                      type="text"
                      defaultValue={gastoToEdit && !['Facturas', 'Netflix', 'Youtube Music', 'Google One', 'Agua', 'Luz', 'Gas', 'Claro Hogar', 'Claro Movil', 'Alimentación'].includes(gastoToEdit.category) ? gastoToEdit.category : ''}
                      placeholder="Ej. Transporte"
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline/10"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 mt-6"
                  >
                    {gastoToEdit ? 'Actualizar Gasto' : 'Guardar Gasto'}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
              onClick={() => setSelectedExpenseDetail(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 border border-outline/10 shadow-2xl flex flex-col gap-4"
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
                  className="w-full py-4 rounded-2xl bg-on-surface text-white font-headline font-black text-sm uppercase tracking-widestáshadow-xl active:scale-[0.98] transition-all mt-2"
                >
                  Cerrar Detalle
                </button>

                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => {
                      setGastoToEdit(selectedExpenseDetail);
                      const knownCategories = ['Facturas', 'Netflix', 'Youtube Music', 'Google One', 'Agua', 'Luz', 'Gas', 'Claro Hogar', 'Claro Movil', 'Alimentación'];
                      setGastoCategory(knownCategories.includes(selectedExpenseDetail.category) ? selectedExpenseDetail.category : 'otra');
                      setSelectedExpenseDetail(null);
                      setIsGastoModalOpen(true);
                    }}
                    className="flex-1 py-3 rounded-2xl bg-primary/10 text-primary font-headline font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.')) {
                        try {
                          await deleteDoc(doc(db, 'gastos', selectedExpenseDetail.id));
                          setSelectedExpenseDetail(null);
                        } catch (error) {
                          console.error("Error al eliminar gasto:", error);
                          alert("Hubo un error al eliminar el gasto.");
                        }
                      }
                    }}
                    className="flex-1 py-3 rounded-2xl bg-red-50 text-red-600 font-headline font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all"
                  >
                    Eliminar
                  </button>
                </div>
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
