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
  ChevronLeft,
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
  X,
  Trophy
} from 'lucide-react';

import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useLocation } from 'react-router-dom';
import { PageTitle } from '../components/AppHeader';
import { useHeaderStore } from '../stores/useHeaderStore';
import { generateDailyReportPDF } from '../utils/pdfGenerator';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  IngresosModal, 
  RankingModal, 
  StockCriticoModal 
} from '../components/ReportsModals';
import HistoryMovementCard from '../components/HistoryMovementCard';
import MovementDetailModal from '../components/MovementDetailModal';
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Generador de PDF
  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    const dateStr = selectedDate ? selectedDate.toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO');
    const sellerName = profile?.name || 'Vendedor';
    
    const success = await generateDailyReportPDF('dashboard-pdf-container', sellerName, dateStr);
    
    setIsGeneratingPDF(false);
    if (success) {
      alert('Reporte de cierre de caja descargado con éxito.');
    } else {
      alert('Error generando PDF. Por favor ejecuta: npm install jspdf html2canvas');
    }
  };
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'month'>('today');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  
  // Modals for history
  const [openModal, setOpenModal] = useState<string | null>(null);
  const open = (name: string) => setOpenModal(name);
  const close = () => setOpenModal(null);
  
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
      const d = toDateS(s.timestamp || s.updatedAt || s.createdAt);
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
  }, [activeTab, historyFilter, sales, profile, selectedDate]);

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
      <div id="dashboard-pdf-container" className="p-4 sm:p-8 max-w-7xl w-full flex flex-col gap-6 sm:gap-8 pb-32 relative bg-surface-container-lowest">
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
                    <button
                      onClick={handleGeneratePDF}
                      disabled={isGeneratingPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase shadow-sm hover:scale-105 active:scale-95 transition-all no-print disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" /> {isGeneratingPDF ? 'Generando...' : 'Cerrar Caja'}
                    </button>
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



                {/* History Stats Cards (Premium Style) */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => open('ingresos')}
                    className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-[2rem] shadow-sm flex flex-col gap-3 text-left group hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-1">Ingresos</p>
                      <p className="text-xl font-black text-on-surface">{formatCurrency(historyStats?.totalIncome || 0)}</p>
                    </div>
                  </motion.button>

                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => open('ranking')}
                    className="bg-amber-50/50 border border-amber-100 p-5 rounded-[2rem] shadow-sm flex flex-col gap-3 text-left group hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-none mb-1">Prod. Estrella</p>
                      <p className="text-sm font-black text-on-surface truncate">{historyStats?.topProduct}</p>
                    </div>
                  </motion.button>

                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsStockModalOpen(true)}
                    className="bg-orange-50/50 border border-orange-100 p-5 rounded-[2rem] shadow-sm flex flex-col gap-3 text-left group hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-orange-700 uppercase tracking-widest leading-none mb-1">Stock Crítico</p>
                      <p className="text-xl font-black text-on-surface">{supplies.length}</p>
                    </div>
                  </motion.button>

                  <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-[2rem] shadow-sm flex flex-col gap-3 text-left">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest leading-none mb-1">Ticket Promedio</p>
                      <p className="text-xl font-black text-on-surface">{formatCurrency(historyStats?.avgTicket || 0)}</p>
                    </div>
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
                    const d = toDateS(s.timestamp || s.updatedAt || s.createdAt);
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
                    <HistoryMovementCard 
                      key={sale.id}
                      id={sale.id}
                      total={sale.total}
                      date={toDateS(sale.timestamp || sale.updatedAt || sale.createdAt)?.toLocaleDateString() || ''}
                      paymentMethod={sale.paymentMethod || 'Efectivo'}
                      status={sale.status || 'completed'}
                      itemCount={sale.items?.length || 0}
                      items={sale.items}
                      title={sale.tableName}
                      customerName={sale.clienteName}
                      onClick={() => setSelectedSale(sale)}
                    />
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



      {/* ── MODAL DE CALENDARIO ── */}
      <AnimatePresence>
        {showCalendar && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowCalendar(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
            >
              {(() => {
                const currentMonth = viewDate.getMonth();
                const currentYear = viewDate.getFullYear();
                return (
                  <>
                    <div className="p-8 bg-white border-b border-rose-50/50">
                      <div className="flex items-center justify-between">
                        <button onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))} className="w-10 h-10 rounded-full hover:bg-rose-50 flex items-center justify-center text-secondary transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                        <h4 className="font-headline font-black text-on-surface uppercase tracking-widest text-sm">
                          {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth))}
                        </h4>
                        <button onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))} disabled={currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()} className="w-10 h-10 rounded-full hover:bg-rose-50 flex items-center justify-center text-secondary transition-colors disabled:opacity-10"><ChevronRight className="w-5 h-5" /></button>
                      </div>
                    </div>

                    <div className="p-8">
                      <div className="grid grid-cols-7 gap-2 mb-6">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                          <div key={d} className="text-center text-[11px] font-black text-secondary/30 uppercase tracking-tighter">{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                        {Array.from({ length: (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7 }).map((_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }).map((_, i) => {
                          const day = i + 1;
                          const count = activityData?.[day] || 0;
                          const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
                          
                          return (
                            <button 
                              key={day}
                              onClick={() => {
                                const d = new Date(currentYear, currentMonth, day);
                                setSelectedDate(d);
                                setShowCalendar(false);
                              }}
                              className={cn(
                                "flex flex-col items-center justify-center transition-all py-1.5",
                                count > 0 ? "bg-rose-50/50 rounded-[1.5rem] border border-rose-100/50" : "",
                                isSelected ? "bg-rose-500 text-white shadow-lg shadow-rose-200 scale-110 z-10 border-none" : "text-on-surface"
                              )}
                            >
                              <span className={cn("text-sm font-black", isSelected ? "text-white" : count > 0 ? "text-rose-500" : "text-secondary/60")}>
                                {day}
                              </span>
                              {count > 0 && (
                                <div className="flex flex-col items-center mt-0.5">
                                  <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-rose-500")} />
                                  <span className={cn("text-[8px] font-black mt-0.5", isSelected ? "text-white/80" : "text-rose-400")}>
                                    {count}
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="p-8 pt-0 flex justify-center">
                <button 
                  onClick={() => setShowCalendar(false)}
                  className="w-full py-4 rounded-2xl bg-surface-container-low text-secondary font-black text-[10px] uppercase tracking-[0.2em] shadow-sm active:scale-95 transition-all hover:bg-surface-container"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <IngresosModal
        isOpen={openModal === 'ingresos'}
        onClose={close}
        filter={selectedDate ? selectedDate.toLocaleDateString() : historyFilter}
        efectivo={(() => {
          const s = sales.filter(s => {
            if (s.sellerId !== profile?.uid) return false;
            const d = toDateS(s.timestamp || s.updatedAt || s.createdAt);
            if (!d) return false;
            if (selectedDate) return d.toDateString() === selectedDate.toDateString();
            if (historyFilter === 'today') return d.toDateString() === new Date().toDateString();
            return true;
          }).filter(s => s.paymentMethod === 'cash' || s.paymentMethod === 'efectivo');
          return s.reduce((sum, x) => sum + (Number(x.total) || 0), 0);
        })()}
        tarjeta={0}
        transferencia={(() => {
          const s = sales.filter(s => {
            if (s.sellerId !== profile?.uid) return false;
            const d = toDateS(s.timestamp || s.updatedAt || s.createdAt);
            if (!d) return false;
            if (selectedDate) return d.toDateString() === selectedDate.toDateString();
            return true;
          }).filter(s => s.paymentMethod !== 'cash' && s.paymentMethod !== 'efectivo');
          return s.reduce((sum, x) => sum + (Number(x.total) || 0), 0);
        })()}
      />
      <RankingModal
        isOpen={openModal === 'ranking'}
        onClose={close}
        filter={selectedDate ? selectedDate.toLocaleDateString() : historyFilter}
        ranking={(() => {
          const productCounts: Record<string, { name: string; units: number; revenue: number }> = {};
          sales.filter(s => {
            if (s.sellerId !== profile?.uid) return false;
            const d = toDateS(s.timestamp || s.updatedAt || s.createdAt);
            if (!d) return false;
            if (selectedDate) return d.toDateString() === selectedDate.toDateString();
            return true;
          }).forEach(s => {
            s.items?.forEach((item: any) => {
              if (!item.productName) return;
              if (!productCounts[item.productName]) productCounts[item.productName] = { name: item.productName, units: 0, revenue: 0 };
              productCounts[item.productName].units += Number(item.quantity) || 0;
              productCounts[item.productName].revenue += Number(item.subtotal) || 0;
            });
          });
          return Object.values(productCounts).sort((a, b) => b.units - a.units).slice(0, 10);
        })()}
      />
      
      <MovementDetailModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        data={selectedSale}
        profile={profile}
        onToggleItemPrepared={async (itemId, currentPrepared) => {
          if (!selectedSale) return;
          try {
            const collectionName = selectedSale.type === 'online' ? 'pedidos' : 'sales';
            const updatedItems = selectedSale.items.map((item: any) => 
              item.id === itemId || (!item.id && item.productId === itemId) ? { ...item, prepared: !currentPrepared } : item
            );
            
            // Update local state for immediate feedback
            setSelectedSale({ ...selectedSale, items: updatedItems });
            
            // Update Firebase
            const { doc, updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, collectionName, selectedSale.id), {
              items: updatedItems
            });
          } catch (error) {
            console.error("Error updating item preparation state:", error);
            toast.error("Error al actualizar el estado de preparación");
          }
        }}
      />

      {/* ── MODAL DE STOCK CRÍTICO ── */}
      <StockCriticoModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        criticalSupplies={supplies}
      />
    </>
  );
}
