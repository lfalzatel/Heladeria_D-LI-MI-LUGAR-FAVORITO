import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTableCartStore } from '../stores/useTableCartStore';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Table as TableIcon, 
  DollarSign, 
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  ShoppingCart,
  LayoutDashboard,
  Box,
  BarChart3,
  Clock,
  User as UserIcon,
  Search,
  Receipt,
  Home,
  Calendar,
  Download,
  History,
  X
} from 'lucide-react';

import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useLocation } from 'react-router-dom';
import { PageTitle } from '../components/AppHeader';
import { useHeaderStore } from '../stores/useHeaderStore';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

// ── UTILS ──
const toDateS = (ts: any): Date | null => { 
  if (!ts) return null; 
  if (ts.toDate) return ts.toDate(); 
  return new Date(ts); 
};

interface SaleRecord {
  id: string;
  total: number;
  sellerName: string;
  sellerId: string;
  tableName: string;
  paymentMethod: string;
  hour: string;
  date: string;
  items: any[];
}

export default function Dashboard() {
  const location = useLocation();
  const { profile } = useAuthStore();
  const { carts, initialize } = useTableCartStore();
  const [sales, setSales] = useState<any[]>([]);
  const [pedidosData, setPedidosData] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'month'>('today');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  
  useEffect(() => {
    if (!profile) return;

    // Listen to SALES
    const qSales = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(100));
    const unsubSales = onSnapshot(qSales, snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (loading) setLoading(false);
    });

    // Listen to DELIVERED PEDIDOS
    const qPedidos = query(
      collection(db, 'pedidos'), 
      where('status', '==', 'entregado'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    const unsubPedidos = onSnapshot(qPedidos, snap => {
      setPedidosData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCart = initialize();

    // Listen to CRITICAL SUPPLIES
    const qSupplies = query(collection(db, 'supplies'));
    const unsubSupplies = onSnapshot(qSupplies, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const critical = all.filter((s: any) => s.currentStock <= s.minLimit);
      setSupplies(critical);
    });

    return () => {
      unsubSales();
      unsubPedidos();
      unsubCart();
      unsubSupplies();
    };
  }, [profile, initialize]);

  // Combined and filtered activity
  const { combinedRecent, dailyTotal, txCount } = React.useMemo(() => {
    const items: any[] = [...sales];
    const salesPedidoIds = new Set(sales.map(s => s.pedidoId).filter(Boolean));
    
    pedidosData.forEach(p => {
      if (!salesPedidoIds.has(p.id)) {
        items.push({ 
          ...p, 
          type: 'online', 
          tableName: 'Pedido Online',
          sellerName: 'Sistema Online',
          timestamp: p.updatedAt || p.createdAt
        });
      }
    });

    const todayStr = new Date().toDateString();
    const filtered = items.filter(s => {
      const d = toDateS(s.timestamp || s.updatedAt || s.createdAt);
      if (!d) return false;
      const isToday = d.toDateString() === todayStr;
      
      if (profile?.role === 'vendedor') {
        return isToday && s.sellerId === profile.uid;
      }
      return isToday;
    }).sort((a, b) => {
      const tA = toDateS(a.timestamp || a.updatedAt || a.createdAt)?.getTime() || 0;
      const tB = toDateS(b.timestamp || b.updatedAt || b.createdAt)?.getTime() || 0;
      return tB - tA;
    });

    return {
      combinedRecent: filtered.slice(0, 20),
      dailyTotal: filtered.reduce((sum, s) => sum + (s.total || 0), 0),
      txCount: filtered.length
    };
  }, [sales, pedidosData, profile]);



  const stats = [
    { label: 'Ventas hoy', value: formatCurrency(dailyTotal), label2: 'Hoy', icon: <DollarSign className="w-5 h-5 text-success" />, trend: 'Actualizado' },
    { label: 'Transacciones', value: txCount.toString(), label2: 'Pedidos realizados', icon: <Package className="w-5 h-5 text-primary" />, trend: 'En tiempo real' },
  ];

  // Logic for history stats
  const historyStats = React.useMemo(() => {
    if (activeTab !== 'history' || !profile) return null;
    
    const now = new Date();
    const sellerSales = sales.filter(s => {
      if (s.sellerId !== profile.uid) return false;
      const d = toDateS(s.timestamp);
      if (!d) return false;
      
      if (selectedDate) return d.toDateString() === selectedDate.toDateString();
      
      if (historyFilter === 'today') return d.toDateString() === now.toDateString();
      if (historyFilter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalIncome = sellerSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const avgTicket = sellerSales.length > 0 ? totalIncome / sellerSales.length : 0;
    
    // Find top product
    const productCounts: Record<string, number> = {};
    sellerSales.forEach(s => {
      s.items?.forEach((item: any) => {
        productCounts[item.productName] = (productCounts[item.productName] || 0) + (item.quantity || 0);
      });
    });
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '--';

    return { totalIncome, avgTicket, topProduct, count: sellerSales.length };
  }, [activeTab, historyFilter, sales, profile]);

  const tableStatus = [
    { id: 'mesa1', label: 'M1', status: (carts['mesa1']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
    { id: 'mesa2', label: 'M2', status: (carts['mesa2']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
    { id: 'mesa3', label: 'M3', status: (carts['mesa3']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
  ];

  // Logic for activity heatmap (history tab)
  const activityData = React.useMemo(() => {
    if (activeTab !== 'history') return null;
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const activityMap: Record<number, number> = {};
    
    // Filter sales for the current seller and current month
    const sellerSales = sales.filter(s => s.sellerId === profile?.uid);
    
    sellerSales.forEach(sale => {
      const date = toDateS(sale.timestamp);
      if (date && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        const day = date.getDate();
        activityMap[day] = (activityMap[day] || 0) + 1;
      }
    });

    return activityMap;
  }, [activeTab, sales, profile, viewDate]);

  const { setHeader, clearHeader } = useHeaderStore();

  useEffect(() => {
    if (profile) {
      setHeader({
        title: `Bienvenido, ${profile?.name?.split(' ')[0] || 'Usuario'}`,
        subtitle: profile?.role === 'vendedor' ? "Resumen de tu actividad de hoy" : "Estado de la Heladería hoy"
      });
    }
    return () => clearHeader();
  }, [profile, setHeader, clearHeader]);

  return (
    <>
      <div className="p-4 sm:p-8 max-w-7xl w-full flex flex-col gap-6 sm:gap-8 pb-32 relative">
        {/* Tab Switcher for Sellers */}
        {profile?.role === 'vendedor' && (
          <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner max-w-sm">
            <button 
              onClick={() => setActiveTab('today')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'today' ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high"
              )}
            >
              Ventas de Hoy
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'history' ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high"
              )}
            >
              Mi Historial
            </button>
          </div>
        )}

        {/* Key Metrics (Hidden in history) */}
        {activeTab === 'today' && (
          <>
            {/* Real-time Critical Stock Alert Banner (Top Priority) */}
            {supplies.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setIsStockModalOpen(true)}
                className="bg-orange-50 border border-orange-200 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer group hover:bg-orange-100 transition-all shadow-sm mb-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-200">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-orange-950 leading-tight">
                      {supplies.length} insumos en stock crítico
                    </p>
                    <p className="text-[8px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">Toca para informar al administrador</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-orange-500 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(15px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{ 
                  duration: 0.6, 
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: i * 0.1 
                }}
                className="bg-white rounded-3xl p-4 border border-outline/50 shadow-sm flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center">
                   {stat.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-secondary mb-0.5">{stat.label}</p>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-on-surface tracking-tight">{stat.value}</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-bold">{stat.trend}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            </section>
          </>
        )}

        <div className={cn(
          "grid grid-cols-1 gap-8",
          activeTab === 'today' ? "lg:grid-cols-3" : "lg:grid-cols-1"
        )}>
          {/* Recent Sales List */}
          <div className={cn(
            "bg-white rounded-[2.5rem] p-6 sm:p-8 border border-outline/50 shadow-sm flex flex-col",
            activeTab === 'today' ? "lg:col-span-2" : "lg:col-span-1"
          )}>
            {activeTab === 'today' ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h4 className="font-headline font-bold text-lg text-on-surface">Ventas Recientes</h4>
                    <p className="text-secondary text-[10px] uppercase font-bold tracking-widest mt-1">Corte de hoy</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/5 rounded-full ring-1 ring-success/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[10px] font-black text-success uppercase">En Vivo</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-3 min-h-[400px]">
                  {combinedRecent.length > 0 ? (
                    combinedRecent.map((sale, i) => (
                      <motion.div 
                        key={sale.id}
                        initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(15px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        transition={{ 
                          duration: 0.6, 
                          ease: [0.34, 1.56, 0.64, 1],
                          delay: i * 0.05 
                        }}
                        onClick={() => setSelectedSale(sale)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low/50 hover:bg-white border border-transparent hover:border-primary/10 transition-all group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                            <Receipt className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-on-surface">{sale.tableName}</h4>
                              <span className="text-[9px] px-2 py-0.5 bg-surface-container rounded-full font-black text-secondary uppercase tracking-tighter">
                                  {sale.paymentMethod === 'cash' ? 'Efectivo' : (sale.type === 'online' ? 'Digital' : 'Transf')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <UserIcon className="w-3 h-3 text-secondary/40" />
                              <p className="text-[10px] font-bold text-secondary uppercase tracking-wide">
                                  {sale.sellerName} <span className="mx-1 opacity-20">•</span> {sale.hour}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-black text-on-surface text-base group-hover:text-primary transition-colors">{formatCurrency(sale.total)}</p>
                          <p className="text-[9px] font-bold text-secondary uppercase mt-0.5">{sale.items.length} productos</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center opacity-30">
                      <Receipt className="w-12 h-12 mb-4" />
                      <p className="font-bold">No hay ventas registradas aún</p>
                      <p className="text-xs">Las ventas aparecerán aquí en tiempo real</p>
                    </div>
                  )}
                </div>
                
                {combinedRecent.length > 0 && (
                  <button className="w-full mt-6 py-4 rounded-2xl border-2 border-primary/10 text-primary font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-primary/5 transition-all">
                    Ver Todas las Ventas
                  </button>
                )}
              </>
            ) : (
              /* HISTORY TAB CONTENT */
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-center mb-6 px-1">
                  <div>
                    <h4 className="font-headline font-bold text-lg text-on-surface">Mi Actividad Histórica</h4>
                    <p className="text-secondary text-[10px] uppercase font-bold tracking-widest mt-1">Consulta tu rendimiento</p>
                  </div>
                </div>

                {/* Filter Selector (Hoy / Semana / Mes) */}
                <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner mb-4">
                  {(['today', 'week', 'month'] as const).map(f => (
                    <button 
                      key={f}
                      onClick={() => {
                        setHistoryFilter(f);
                        setSelectedDate(null);
                      }}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        (historyFilter === f && !selectedDate) ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high"
                      )}
                    >
                      {f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Mes'}
                    </button>
                  ))}
                </div>

                {/* Calendar Toggle and Download Row */}
                <div className="flex gap-3 mb-6">
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-3 py-3.5 bg-white border rounded-2xl shadow-sm transition-all font-bold text-[11px] uppercase tracking-widest",
                      selectedDate ? "border-primary text-primary" : "border-outline/50 text-on-surface"
                    )}
                  >
                    <Calendar className="w-4 h-4" />
                    {selectedDate ? selectedDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Calendario'}
                    <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showCalendar ? "rotate-90" : "")} />
                  </button>
                  <button 
                    onClick={() => toast.info('Generando reporte...')}
                    className="w-14 h-14 bg-white border border-outline/50 rounded-2xl flex items-center justify-center text-secondary shadow-sm hover:bg-surface transition-all active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                {/* Collapsable Heatmap */}
                <AnimatePresence>
                  {showCalendar && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <div className="bg-surface-container/30 rounded-[2rem] p-6 border border-outline/5">
                        {/* Heatmap Logic */}
                        {(() => {
                          const currentMonth = viewDate.getMonth();
                          const currentYear = viewDate.getFullYear();
                          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                          const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
                          const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
                          const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                          
                          return (
                            <>
                              <div className="flex items-center justify-between mb-6 px-2">
                                <button onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))} className="p-2 hover:bg-surface-container rounded-full transition-colors text-secondary"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                                <div className="text-center">
                                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-widest">{monthNames[currentMonth]} {currentYear}</h4>
                                </div>
                                <button onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))} disabled={currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()} className="p-2 hover:bg-surface-container rounded-full transition-colors text-secondary disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
                              </div>
                              <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                                {['L','M','X','J','V','S','D'].map((d) => <div key={d} className="text-[8px] font-black text-secondary/30 text-center uppercase">{d}</div>)}
                                {Array.from({ length: firstDayAdjusted }).map((_, i) => <div key={`empty-${i}`} />)}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                  const day = i + 1;
                                  const count = activityData?.[day] || 0;
                                  const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
                                  return (
                                    <div key={day} className="flex flex-col items-center justify-center">
                                      <button 
                                        onClick={() => {
                                          const d = new Date(currentYear, currentMonth, day);
                                          setSelectedDate(isSelected ? null : d);
                                          if (!isSelected) setShowCalendar(false);
                                        }}
                                        className={cn(
                                          'w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all', 
                                          count > 0 ? (isSelected ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-primary/20 text-primary hover:bg-primary/30') : 'bg-surface-container text-secondary/40',
                                          (day === new Date().getDate() && currentMonth === new Date().getMonth() && !isSelected) && 'border border-primary'
                                        )}
                                      >
                                        <span className="text-[9px] font-bold">{day}</span>
                                        {count > 0 && <span className="text-[6px] font-black opacity-60 mt-0.5">{count}</span>}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* History Stats Cards */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-white p-5 rounded-[2rem] border border-outline/50 shadow-sm">
                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center mb-3">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-widest leading-none mb-1">Ingresos</p>
                    <p className="text-lg font-black text-on-surface">{formatCurrency(historyStats?.totalIncome || 0)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-[2rem] border border-outline/50 shadow-sm">
                    <div className="w-10 h-10 bg-success/5 rounded-xl flex items-center justify-center mb-3">
                      <TrendingUp className="w-5 h-5 text-success" />
                    </div>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-widest leading-none mb-1">Producto Estrella</p>
                    <p className="text-sm font-black text-on-surface truncate">{historyStats?.topProduct}</p>
                  </div>
                  <div className="bg-white p-5 rounded-[2rem] border border-outline/50 shadow-sm">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    </div>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-widest leading-none mb-1">Stock Crítico</p>
                    <p className="text-lg font-black text-on-surface">{supplies.length}</p>
                  </div>
                  <div className="bg-white p-5 rounded-[2rem] border border-outline/50 shadow-sm">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-widest leading-none mb-1">Ticket Promedio</p>
                    <p className="text-lg font-black text-on-surface">{formatCurrency(historyStats?.avgTicket || 0)}</p>
                  </div>
                </div>

                {/* Seller's Full History List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2 mb-4">
                    <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Movimientos</h4>
                    <span className="text-[9px] font-black text-primary px-2 py-0.5 bg-primary/5 rounded-full">{historyStats?.count} ventas</span>
                  </div>
                  {sales.filter(s => {
                    if (s.sellerId !== profile?.uid) return false;
                    const d = toDateS(s.timestamp);
                    if (!d) return false;
                    
                    if (selectedDate) return d.toDateString() === selectedDate.toDateString();
                    
                    const now = new Date();
                    if (historyFilter === 'today') return d.toDateString() === now.toDateString();
                    if (historyFilter === 'week') {
                      const weekAgo = new Date(now);
                      weekAgo.setDate(now.getDate() - 7);
                      return d >= weekAgo;
                    }
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).slice(0, 20).map((sale, i) => (
                    <motion.div 
                      key={sale.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedSale(sale)} 
                      className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low/50 border border-transparent hover:border-primary/10 transition-all cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary"><Receipt className="w-5 h-5" /></div>
                        <div>
                          <p className="font-bold text-sm text-on-surface">{sale.tableName}</p>
                          <p className="text-[9px] text-secondary font-bold uppercase">{toDateS(sale.timestamp)?.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="font-black text-on-surface">{formatCurrency(sale.total)}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side Column (Only in Today Tab) */}
          {activeTab === 'today' && (
            <div className="flex flex-col gap-6">
               {/* Tables Status */}
               <div className="bg-white rounded-[2rem] p-6 border border-outline/50 shadow-sm">
                  <h4 className="font-headline font-bold text-sm text-on-surface mb-6 flex items-center justify-between">
                     Estado de Mesas
                     <ChevronRight className="w-4 h-4 text-secondary/40" />
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                     {tableStatus.map(t => (
                        <div key={t.id} className="flex flex-col items-center gap-2">
                           <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                              t.status === 'Ocupada' ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "bg-surface-container text-secondary/40"
                           )}>
                              <TableIcon className="w-5 h-5" />
                           </div>
                           <p className="text-[9px] font-bold text-on-surface">{t.label}</p>
                           <p className={cn("text-[8px] font-black uppercase tracking-widest", t.status === 'Ocupada' ? "text-orange-600" : "text-success")}>
                              {t.status}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL DE DETALLE DE VENTA ── */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSale(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header del Modal */}
              <div className="p-6 sm:p-8 bg-surface-container-low/50 border-b border-outline/10 flex justify-between items-start">
                <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                      <Receipt className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="font-headline font-black text-xl text-on-surface">Detalle de Venta</h3>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">ID: {selectedSale.id.slice(-8).toUpperCase()}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-90"
                >
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>

              {/* Contenido (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                {/* Info de la Venta */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline/5">
                      <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-1">Mesa / Lugar</span>
                      <p className="font-bold text-on-surface flex items-center gap-2">
                        <TableIcon className="w-3.5 h-3.5 text-primary" />
                        {selectedSale.tableName}
                      </p>
                   </div>
                   <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline/5">
                      <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-1">Fecha y Hora</span>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {selectedSale.hour}
                      </p>
                   </div>
                   <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline/5">
                      <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-1">Vendedor</span>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <UserIcon className="w-3.5 h-3.5 text-primary" />
                        {selectedSale.sellerName}
                      </p>
                   </div>
                   <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline/5">
                      <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-1">Pago</span>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        {selectedSale.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                      </p>
                   </div>
                </div>

                <h4 className="font-headline font-bold text-sm text-on-surface mb-4 uppercase tracking-widest">Productos</h4>
                
                <div className="flex flex-col gap-3">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-outline/5 bg-surface-container-lowest/50">
                       <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/5 rounded-md mb-1 inline-block">x{item.quantity}</span>
                            <p className="font-black text-on-surface text-base">{item.productName}</p>
                            {item.variantLabel && <p className="text-[10px] font-bold text-secondary uppercase italic">{item.variantLabel}</p>}
                          </div>
                          <p className="font-brand font-black text-lg text-primary">{formatCurrency(item.subtotal)}</p>
                       </div>
                       
                       {/* Detalles de configuración */}
                       <div className="flex flex-wrap gap-2 mt-3">
                          {item.flavors?.map((f: string) => (
                            <span key={f} className="text-[9px] font-bold bg-white px-2 py-1 rounded-lg border border-outline/5 shadow-sm text-secondary">
                              🍧 {f}
                            </span>
                          ))}
                          {item.fruitChoices?.map((f: string) => (
                            <span key={f} className="text-[9px] font-bold bg-white px-2 py-1 rounded-lg border border-outline/5 shadow-sm text-success">
                              🍓 {f}
                            </span>
                          ))}
                          {item.additions?.map((a: string) => (
                            <span key={a} className="text-[9px] font-bold bg-white px-2 py-1 rounded-lg border border-outline/5 shadow-sm text-primary">
                              ✨ {a}
                            </span>
                          ))}
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer del Modal */}
              <div className="p-6 sm:p-8 bg-surface-container-low border-t border-outline/10">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-1">TOTAL VENTA</p>
                      <h3 className="text-4xl font-brand font-black text-on-surface tracking-tight leading-none">
                        {formatCurrency(selectedSale.total)}
                      </h3>
                   </div>
                   <button 
                     onClick={() => setSelectedSale(null)}
                     className="px-8 py-3 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     Cerrar
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL DE STOCK CRÍTICO ── */}
      <AnimatePresence>
        {isStockModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsStockModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-8 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-headline font-black text-xl text-orange-950 leading-none">Stock Crítico</h3>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-2">Productos por agotarse</p>
                  </div>
                </div>
                <button onClick={() => setIsStockModalOpen(false)} className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-orange-900 transition-all active:scale-90"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-white">
                {supplies.map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-orange-100 bg-orange-50/20 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-on-surface">{item.name}</p>
                      <p className="text-[10px] text-secondary font-medium">Categoría: {item.category || 'Sin categoría'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-orange-600">{item.currentStock} {item.unit}</p>
                      <p className="text-[9px] text-secondary font-bold uppercase">Límite: {item.minLimit}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-8 border-t border-outline/5 bg-surface-container-lowest">
                <button onClick={() => setIsStockModalOpen(false)} className="w-full py-4 bg-on-surface text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-98 transition-all">
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
