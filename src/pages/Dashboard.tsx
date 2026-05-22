import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTableCartStore } from '../stores/useTableCartStore';
import { useHeaderStore } from '../stores/useHeaderStore';
import { 
  DollarSign, 
  CreditCard,
  Trophy,
  AlertCircle,
  Calendar,
  Download,
  Table as TableIcon,
  ChevronRight,
  ChevronLeft,
  X,
  TrendingDown,
  Users
} from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { generateDailyReportPDF } from '../utils/pdfGenerator';
import { toast } from 'sonner';

import {
  MetricCard,
  TrendChart,
  SaleCard,
  CalendarModal
} from '../components/DashboardComponents';

import { 
  IngresosModal, 
  RankingModal, 
  StockCriticoModal,
  VentasCreditoModal,
  GananciaModal,
  DeudaClientesModal
} from '../components/ReportsModals';
import MovementDetailModal from '../components/MovementDetailModal';

type DateFilter = 'today' | 'week' | 'month';

// ── UTILS ──
const toDateS = (ts: any): Date | null => { 
  if (!ts) return null; 
  if (ts.toDate) return ts.toDate(); 
  return new Date(ts); 
};

const isInPeriod = (timestamp: any, period: DateFilter, customDate?: Date | null, customMonth?: Date) => {
  const d = toDateS(timestamp);
  if (!d) return false;
  if (customDate) return d.toDateString() === customDate.toDateString();
  const now = new Date();
  if (period === 'today') return d.toDateString() === now.toDateString();
  if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }
  if (period === 'month') {
    const m = customMonth || now;
    return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
  }
  return true;
};

export default function Dashboard() {
  const { profile } = useAuthStore();
  const { carts, initialize } = useTableCartStore();
  const { setHeader, clearHeader } = useHeaderStore();

  const [dashboardFilter, setDashboardFilter] = useState<DateFilter>('today');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // Data state
  const [sales, setSales] = useState<any[]>([]);
  const [pedidosData, setPedidosData] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [creditPedidos, setCreditPedidos] = useState<any[]>([]);
  
  // Modals state
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  const open = (name: string) => setOpenModal(name);
  const close = () => setOpenModal(null);

  // Export
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    // Listen to SALES
    const qSales = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(1000));
    const unsubSales = onSnapshot(qSales, snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to DELIVERED PEDIDOS
    const qPedidos = query(
      collection(db, 'pedidos'), 
      where('status', '==', 'entregado'),
      orderBy('updatedAt', 'desc'),
      limit(1000)
    );
    const unsubPedidos = onSnapshot(qPedidos, snap => {
      setPedidosData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to SUPPLIES
    const qSupplies = query(collection(db, 'supplies'));
    const unsubSupplies = onSnapshot(qSupplies, snap => {
      setSupplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to PURCHASES (Egresos)
    const unsubPurchases = onSnapshot(query(collection(db, 'supplyPurchases'), orderBy('createdAt', 'desc'), limit(1000)), snap => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to CREDIT PEDIDOS
    const qCredit = query(
      collection(db, 'pedidos'),
      where('paymentMethod', '==', 'credito'),
      orderBy('createdAt', 'desc'),
      limit(1000)
    );
    const unsubCredit = onSnapshot(qCredit, snap => {
      setCreditPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCart = initialize();

    return () => {
      unsubSales();
      unsubPedidos();
      unsubSupplies();
      unsubPurchases();
      unsubCredit();
      unsubCart();
    };
  }, [profile, initialize]);

  // All Activity unfiltered by date (for calendar colors)
  const allUnfilteredActivity = React.useMemo(() => {
    const items = [...sales];
    const salesPedidoIds = new Set(sales.map(s => s.pedidoId).filter(Boolean));
    
    pedidosData.forEach(p => {
      if (!salesPedidoIds.has(p.id)) {
        items.push({ ...p, type: 'online', isDirectPedido: true });
      }
    });

    return items.filter(item => {
      // Enforce Seller Role Filtering
      if (profile?.role === 'vendedor' && item.sellerId !== profile.uid) {
        return false;
      }
      return true;
    });
  }, [sales, pedidosData, profile]);

  // Combined Activity filtered
  const combinedActivity = React.useMemo(() => {
    return allUnfilteredActivity
      .filter(item => {
        const timestamp = item.timestamp || item.updatedAt || item.createdAt;
        return isInPeriod(timestamp, dashboardFilter, selectedDate, selectedMonth);
      })
      .sort((a, b) => {
        const tA = toDateS(a.timestamp || a.updatedAt || a.createdAt)?.getTime() || 0;
        const tB = toDateS(b.timestamp || b.updatedAt || b.createdAt)?.getTime() || 0;
        return tB - tA;
      });
  }, [allUnfilteredActivity, dashboardFilter, selectedDate, selectedMonth]);

  // ── COMPUTED METRICS ──
  const ingresosSales = combinedActivity.filter(s => (s.paymentMethod || '').toLowerCase() !== 'credito');
  const totalIngresos = ingresosSales.reduce((s, x) => s + (x.total || 0), 0);
  
  const getMethodTotal = (methods: string[]) => 
    ingresosSales
      .filter(s => methods.includes((s.paymentMethod || '').toLowerCase()))
      .reduce((s, x) => s + (x.total || 0), 0);

  const efectivo = getMethodTotal(['cash', 'efectivo', 'cash/efectivo']);
  const tarjeta = getMethodTotal(['datafono', 'card', 'tarjeta', 'débito', 'crédito']);
  const transferencia = getMethodTotal(['transfer', 'transferencia', 'digital', 'nequi', 'daviplata']);

  // Credit pedidos for current period
  const creditPedidosPeriod = creditPedidos.filter(p => isInPeriod(p.createdAt, dashboardFilter, selectedDate));
  const totalCredito = creditPedidosPeriod.reduce((s, p) => s + (p.total || 0), 0);

  // Supply purchases for current period
  const purchasesPeriod = purchases.filter(p => isInPeriod(p.createdAt, dashboardFilter, selectedDate));
  const totalCompras = purchasesPeriod.reduce((s, p) => s + (p.total || 0), 0);

  // Ganancia
  const gananciaNeta = totalIngresos - totalCompras;

  // Product ranking
  const productMap: Record<string, { name: string; units: number; revenue: number }> = {};
  combinedActivity.forEach(s => {
    s.items?.forEach((item: any) => {
      const k = item.productName || 'Desconocido';
      if (!productMap[k]) productMap[k] = { name: k, units: 0, revenue: 0 };
      productMap[k].units += item.quantity || 0;
      productMap[k].revenue += item.subtotal || 0;
    });
  });
  const ranking = Object.values(productMap).sort((a, b) => b.units - a.units).slice(0, 10);
  const starProduct = ranking[0];

  // Critical stock
  const criticalSupplies = supplies.filter(s => s.currentStock <= s.minLimit);

  // Deuda by client (all-time)
  const deudaMap: Record<string, { clienteId: string; name: string; total: number; pedidos: any[] }> = {};
  creditPedidos.forEach(p => {
    const k = p.clienteId || p.clienteName || 'desconocido';
    if (!deudaMap[k]) deudaMap[k] = { clienteId: k, name: p.clienteName || 'Cliente', total: 0, pedidos: [] };
    deudaMap[k].total += p.total || 0;
    deudaMap[k].pedidos.push(p);
  });
  const deudaByClient = Object.values(deudaMap).sort((a, b) => b.total - a.total);
  const totalDeuda = creditPedidos.reduce((s, p) => s + (p.total || 0), 0);

  const filterLabel = selectedDate 
    ? selectedDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' }).replace(',', '')
    : dashboardFilter === 'today' ? 'Hoy' 
    : dashboardFilter === 'week' ? 'Semana' 
    : selectedMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (profile) {
      setHeader({
        title: `Bienvenido, ${profile?.name?.split(' ')[0] || 'Usuario'}`,
        subtitle: profile?.role === 'vendedor' 
          ? `Resumen de tu actividad (${filterLabel})` 
          : `Estado de la Heladería (${filterLabel})`,
        actions: (
          <div className="flex items-center gap-2 relative z-50">
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm",
                showCalendar || selectedDate ? "bg-primary text-white" : "bg-white border border-outline/20 text-secondary hover:text-primary hover:border-primary/50"
              )}
              title="Calendario"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleExport()}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm",
                isGeneratingPDF ? "bg-primary/50 text-white cursor-wait" : "bg-white border border-outline/20 text-secondary hover:text-primary hover:border-primary/50"
              )}
              title="Descargar Reporte"
              disabled={isGeneratingPDF}
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        )
      });
    }
    return () => clearHeader();
  }, [profile, setHeader, clearHeader, showCalendar, selectedDate, dashboardFilter, isGeneratingPDF, filterLabel]);

  const handleExport = async () => {
    setIsGeneratingPDF(true);
    const dateStr = selectedDate 
      ? selectedDate.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) 
      : new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
    const sellerName = profile?.name || 'Vendedor';
    
    try {
      const result = await generateDailyReportPDF('dashboard-pdf-container', sellerName, dateStr, false);
      if (result.success && result.pdf) {
        result.pdf.save(`Reporte_${dateStr.replace(/\//g, '-')}_${sellerName}.pdf`);
        toast.success('PDF descargado con éxito');
      } else {
        toast.error('Error generando reporte');
      }
    } catch (e) {
      console.error(e);
      toast.error('Ocurrió un error al procesar');
    }
    setIsGeneratingPDF(false);
  };

  const tableStatus = [
    { id: 'mesa1', label: 'M1', status: (carts['mesa1']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
    { id: 'mesa2', label: 'M2', status: (carts['mesa2']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
    { id: 'mesa3', label: 'M3', status: (carts['mesa3']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
  ];

  return (
    <>
      <div id="dashboard-pdf-container" className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full pb-32">
        {/* FILTERS */}
        {selectedDate ? (
          <div className="flex items-center justify-between bg-primary/10 rounded-2xl p-3 w-full sm:max-w-sm border border-primary/20">
            <span className="text-sm font-bold text-primary capitalize">
              {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={() => { setSelectedDate(null); setDashboardFilter('today'); }}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-primary shadow-sm hover:bg-primary hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full sm:max-w-sm">
            <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner w-full">
              {(['today', 'week', 'month'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => {
                    setDashboardFilter(f);
                    setSelectedDate(null);
                    if (f === 'month') setSelectedMonth(new Date());
                  }}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    (dashboardFilter === f) ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high"
                  )}
                >
                  {f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>

            {/* Month Selector */}
            {dashboardFilter === 'month' && (
              <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-outline/10">
                <button 
                  onClick={() => {
                    const newD = new Date(selectedMonth);
                    newD.setMonth(newD.getMonth() - 1);
                    setSelectedMonth(newD);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-on-surface capitalize tracking-wide">
                  {selectedMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => {
                    const newD = new Date(selectedMonth);
                    newD.setMonth(newD.getMonth() + 1);
                    setSelectedMonth(newD);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Ingresos"
            value={formatCurrency(totalIngresos)}
            sub={filterLabel}
            accent="emerald"
            onOpen={() => open('ingresos')}
          />
          <MetricCard
            icon={<CreditCard className="w-5 h-5" />}
            label="Vtas. a Crédito"
            value={formatCurrency(totalCredito)}
            sub={filterLabel}
            accent="orange"
            onOpen={() => open('credito')}
          />
          {profile?.role !== 'vendedor' && (
            <MetricCard
              icon={<TrendingDown className="w-5 h-5" />}
              label="Egresos/Compras"
              value={formatCurrency(totalCompras)}
              sub={filterLabel}
              accent="amber"
              onOpen={() => { /* Implement Egresos Modal if needed */ }}
            />
          )}
          {profile?.role !== 'vendedor' && (
            <MetricCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Ganancia Neta"
              value={formatCurrency(gananciaNeta)}
              sub={filterLabel}
              badge={{ text: gananciaNeta >= 0 ? '+ RENTABLE' : '- PÉRDIDA', color: gananciaNeta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700' }}
              accent="blue"
              onOpen={() => open('ganancia')}
            />
          )}
          <MetricCard
            icon={<Trophy className="w-5 h-5" />}
            label="Estrella"
            value={starProduct?.name || 'N/A'}
            sub={`${starProduct?.units || 0} uds`}
            accent="amber"
            onOpen={() => open('ranking')}
          />
          {profile?.role !== 'vendedor' && (
            <MetricCard
              icon={<Users className="w-5 h-5" />}
              label="Deuda Clientes"
              value={formatCurrency(totalDeuda)}
              sub="Total Histórico"
              accent="orange"
              onOpen={() => open('deuda')}
            />
          )}
          <MetricCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Stock"
            value={criticalSupplies.length.toString()}
            sub="Items críticos"
            badge={criticalSupplies.length > 0 ? { text: 'REVISAR', color: 'bg-red-100 text-red-700' } : null}
            accent="orange"
            onOpen={() => setIsStockModalOpen(true)}
          />
        </div>

        {/* CHARTS (Admin Only) */}
        {profile?.role !== 'vendedor' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[2rem] p-6 border border-outline/10 shadow-sm relative overflow-hidden">
              <h4 className="font-bold text-xs uppercase tracking-widest text-secondary mb-4">Ingresos (7 días)</h4>
              <TrendChart data={sales} color="#10b981" label="Ingresos" />
            </div>
            <div className="bg-white rounded-[2rem] p-6 border border-outline/10 shadow-sm relative overflow-hidden">
              <h4 className="font-bold text-xs uppercase tracking-widest text-secondary mb-4">Compras (7 días)</h4>
              <TrendChart data={purchases} color="#f59e0b" label="Egresos" />
            </div>
          </div>
        )}

        {/* RECENT SALES & TABLE STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-headline font-bold text-lg text-on-surface">Movimientos</h4>
              <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">{combinedActivity.length} regs</span>
            </div>
            <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
              {combinedActivity.length > 0 ? (
                combinedActivity.slice(0, 20).map((sale, i) => (
                  <SaleCard 
                    key={sale.id}
                    sale={sale}
                    onClick={() => setSelectedSale(sale)}
                    index={i}
                  />
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-outline/10 shadow-sm">
                  <DollarSign className="w-12 h-12 text-secondary/20 mb-4" />
                  <p className="text-sm font-bold text-secondary">No hay movimientos</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] p-6 border border-outline/50 shadow-sm h-full">
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
        </div>
      </div>

      <CalendarModal 
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        allActivity={allUnfilteredActivity}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setDashboardFilter('today');
        }}
      />

      <IngresosModal
        isOpen={openModal === 'ingresos'}
        onClose={close}
        filter={filterLabel}
        efectivo={efectivo}
        tarjeta={tarjeta}
        transferencia={transferencia}
      />
      <VentasCreditoModal
        isOpen={openModal === 'credito'}
        onClose={close}
        filter={filterLabel}
        creditPedidos={creditPedidosPeriod}
      />
      <GananciaModal
        isOpen={openModal === 'ganancia'}
        onClose={close}
        filter={filterLabel}
        totalIngresos={totalIngresos}
        totalCompras={totalCompras}
        totalCredito={totalCredito}
      />
      <RankingModal
        isOpen={openModal === 'ranking'}
        onClose={close}
        filter={filterLabel}
        ranking={ranking}
      />
      <DeudaClientesModal
        isOpen={openModal === 'deuda'}
        onClose={close}
        deudaByClient={deudaByClient}
        totalDeuda={totalDeuda}
      />
      <StockCriticoModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        criticalSupplies={criticalSupplies}
      />

      <MovementDetailModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        data={selectedSale}
        profile={profile}
        onToggleItemPrepared={() => {}}
      />
    </>
  );
}
