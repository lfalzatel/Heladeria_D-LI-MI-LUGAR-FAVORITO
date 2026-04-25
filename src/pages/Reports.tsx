import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Calendar, Download, TrendingUp, DollarSign, CreditCard,
  Trophy, Clock, ChevronDown, AlertTriangle, Plus, Banknote, Smartphone, History
} from 'lucide-react';
import MovementDetailModal from '../components/MovementDetailModal';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppHeader, { PageTitle } from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useAuthStore } from '../stores/useAuthStore';
import AdminSidebar from '../components/AdminSidebar';
import { isInPeriod } from './Supplies';
import {
  IngresosModal,
  VentasCreditoModal,
  GananciaModal,
  RankingModal,
  DeudaClientesModal,
  StockCriticoModal,
} from '../components/ReportsModals';

type DateFilter = 'hoy' | 'semana' | 'mes';
const FILTER_LABEL: Record<DateFilter, string> = { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' };
const PERIOD_MAP: Record<DateFilter, 'today' | 'week' | 'month'> = {
  hoy: 'today', semana: 'week', mes: 'month'
};

// ── UTILS ──
const toDateS = (ts: any): Date | null => { 
  if (!ts) return null; 
  if (ts.toDate) return ts.toDate(); 
  return new Date(ts); 
};

// ── COMPONENTS ──
function MetricCard({
  icon, label, value, sub, badge, accent, onOpen
}: {
  icon: React.ReactNode; label: string; value: string;
  sub: string; badge?: { text: string; color: string } | null; 
  accent: 'emerald' | 'orange' | 'amber' | 'blue';
  onOpen: () => void;
}) {
  const accentMap = {
    emerald: 'bg-emerald-50/50 border-emerald-100',
    orange: 'bg-orange-50/50 border-orange-100',
    amber: 'bg-amber-50/50 border-amber-100',
    blue: 'bg-blue-50/50 border-blue-100'
  };

  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "bg-white text-left w-full rounded-3xl p-4 border flex flex-col gap-2 shadow-sm relative group hover:shadow-md transition-all",
        accentMap[accent]
      )}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm text-on-surface">
          {icon}
        </div>
        <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center text-secondary border border-outline/10 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
          <Plus className="w-3.5 h-3.5" />
        </div>
      </div>
      
      <div className="flex flex-col gap-0.5 mt-1">
        <p className="text-xl font-black text-on-surface leading-none tracking-tight">{value}</p>
        <div className="flex flex-col">
          <p className="text-[9px] font-black text-secondary uppercase tracking-widest leading-tight">{label}</p>
          {sub && <p className="text-[9px] text-secondary/50 font-bold leading-tight">{sub}</p>}
        </div>
      </div>

      {badge && (
        <div className="mt-1">
          <span className={cn('text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block', badge.color)}>
            {badge.text}
          </span>
        </div>
      )}
    </motion.button>
  );
}

// ── TREND CHART (SMOOTH LINE) ──
function TrendChart({ data, color = 'currentColor', label = 'Ventas' }: { data: any[], color?: string, label?: string }) {
  const W = 320, H = 140, PAD = 20;
  
  if (data.length === 0) return (
    <div className="h-32 flex flex-col items-center justify-center opacity-20 bg-surface-container/30 rounded-3xl border border-dashed border-outline/30">
      <TrendingUp className="w-8 h-8 mb-2" />
      <p className="text-[10px] font-black uppercase tracking-widest">Sin datos suficientes</p>
    </div>
  );

  // Group by day (last 7 days)
  const byDay: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    byDay[d.toLocaleDateString('es-CO')] = 0;
  }

  data.forEach(s => {
    const d = toDateS(s.timestamp || s.createdAt);
    if (d) {
      const k = d.toLocaleDateString('es-CO');
      if (byDay[k] !== undefined) byDay[k] += s.total || 0;
    }
  });

  const entries = Object.entries(byDay);
  const vals = entries.map(e => e[1]);
  const max = Math.max(...vals, 1000);
  
  // Points calculation
  const points = entries.map(([, val], i) => ({
    x: PAD + (i * (W - PAD * 2) / (entries.length - 1)),
    y: H - PAD - (val / max * (H - PAD * 2))
  }));

  // Bezier Path
  const path = points.reduce((acc, p, i, a) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 2;
    return `${acc} C ${cp1x} ${prev.y}, ${cp1x} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const gradId = `grad-${label.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32 overflow-visible">
        {/* Grid lines */}
        {[0, 0.5, 1].map(v => (
          <line 
            key={v} 
            x1={PAD} y1={H - PAD - v * (H - PAD * 2)} 
            x2={W - PAD} y2={H - PAD - v * (H - PAD * 2)} 
            className="stroke-outline/10 stroke-[1]" 
            strokeDasharray="4 4"
          />
        ))}
        
        {/* Area fill */}
        <path
          d={`${path} L ${points[points.length - 1].x} ${H - PAD} L ${points[0].x} ${H - PAD} Z`}
          fill={`url(#${gradId})`}
          className="opacity-20"
        />
        
        {/* Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle 
            key={i} cx={p.x} cy={p.y} r="3" 
            className="fill-white stroke-current stroke-[2]"
            style={{ color }}
          />
        ))}

        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="white" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* X Axis Labels */}
      <div className="flex justify-between px-1 mt-2">
        {entries.map(([date], i) => {
          const d = date.split('/');
          return (
            <span key={i} className="text-[8px] font-bold text-secondary/40 uppercase">
              {i % 2 === 0 ? `${d[0]} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(d[1])-1]}` : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── SALE CARD ──
function SaleCard({ sale, onClick, index = 0 }: { sale: any, onClick: () => void, index?: number }) {
  const d = toDateS(sale.timestamp || sale.createdAt);
  
  // Format: "Lun 25 · 05:40 a. m."
  const dateStr = d ? d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }) : '';
  const timeStr = d ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  const fullTime = `${dateStr} · ${timeStr}`;

  const cName = sale.clienteName || sale.userName || sale.customerName || sale.nombre || sale.clientName;
  const isTable = !!sale.tableName && sale.tableName !== 'Pedido Online';
  const isOnline = sale.type === 'online' || sale.tableName === 'Pedido Online';
  
  // Prioridad: 1. Nombre Cliente, 2. Mesa (valor directo), 3. Online, 4. Venta Directa
  const originLabel = cName || (isTable ? sale.tableName : (isOnline ? 'Pedido Online' : 'Venta Directa'));
  
  const pmIcon = {
    efectivo: <Banknote className="w-3.5 h-3.5 text-emerald-600" />,
    cash: <Banknote className="w-3.5 h-3.5 text-emerald-600" />,
    datafono: <CreditCard className="w-3.5 h-3.5 text-blue-600" />,
    tarjeta: <CreditCard className="w-3.5 h-3.5 text-blue-600" />,
    transferencia: <Smartphone className="w-3.5 h-3.5 text-purple-600" />,
    digital: <Smartphone className="w-3.5 h-3.5 text-purple-600" />,
    credito: <Clock className="w-3.5 h-3.5 text-orange-600" />,
  }[(sale.paymentMethod || '').toLowerCase()] || <DollarSign className="w-3.5 h-3.5 text-secondary" />;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-outline/10 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-all group animate-card-mix opacity-0"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-surface-container rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
          {pmIcon}
          {/* Subtle indicator if it has items */}
          {sale.items?.length > 0 && (
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-primary rounded-bl-sm" />
          )}
        </div>
        <div className="text-left min-w-0 pr-2">
          <div className="flex flex-col">
            <p className="font-black text-sm text-on-surface leading-none">{formatCurrency(sale.total)}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider ring-1",
                isTable ? "bg-blue-50 text-blue-500 ring-blue-500/20" : 
                (isOnline ? "bg-purple-50 text-purple-600 ring-purple-500/20" : "bg-primary/5 text-primary ring-primary/20")
              )}>
                {isTable ? 'Mesa' : (isOnline ? 'Online' : 'POS')}
              </span>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest truncate max-w-[100px]",
                isTable ? "text-blue-600" : (isOnline ? "text-purple-600" : "text-secondary/40")
              )}>
                {originLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-secondary uppercase tracking-widest">{sale.paymentMethod || 'Venta'}</span>
            <span className="w-1 h-1 rounded-full bg-outline/40" />
            <span className="text-[9px] font-bold text-secondary/50 capitalize">{fullTime}</span>
          </div>
        </div>
      </div>
      <Plus className="w-4 h-4 text-secondary/30 group-hover:text-primary transition-colors" />
    </button>
  );
}

export default function Reports() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DateFilter>('hoy');

  // Data state
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [creditPedidos, setCreditPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  
  const open = (name: string) => setOpenModal(name);
  const close = () => setOpenModal(null);
  
  const period = PERIOD_MAP[filter];

  // ── SALES listener (period-filtered) ──
  useEffect(() => {
    if (!profile) return;
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    if (filter === 'semana') startDate.setDate(startDate.getDate() - 7);
    else if (filter === 'mes') startDate.setMonth(startDate.getMonth() - 1);

    // Buscamos ventas que tengan timestamp O createdAt >= startDate
    // Para simplificar y asegurar que traemos todo lo de hoy, traemos una lista más amplia 
    // y filtramos en memoria para evitar errores de índices compuestos complejos de Firestore
    const q = query(
      collection(db, 'sales'),
      orderBy('timestamp', 'desc')
    );
    
    const unsub = onSnapshot(q, snap => {
      const allSales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filtramos en memoria para ser 100% precisos con el periodo
      const filteredSales = allSales.filter(s => isInPeriod(s.timestamp || s.createdAt, period));
      setSales(filteredSales);
      setLoading(false);
    }, err => { 
      console.error(err); 
      setLoading(false); 
      toast.error("Error al cargar ventas");
    });
    return unsub;
  }, [filter, profile, period]);

  // ── SUPPLIES listener ──
  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(query(collection(db, 'supplies'), orderBy('name', 'asc')), snap => {
      setSupplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [profile]);

  // ── SUPPLY PURCHASES listener ──
  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(query(collection(db, 'supplyPurchases'), orderBy('createdAt', 'desc')), snap => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [profile]);

  // ── CREDIT PEDIDOS listener (all-time) ──
  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'pedidos'),
      where('paymentMethod', '==', 'credito'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setCreditPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => { console.error('Credit pedidos error:', err); });
    return unsub;
  }, [profile]);

  // ── COMPUTED METRICS ──
  

  // Ingresos (POS sales, non-credit)
  const ingresosSales = sales.filter(s => {
    const pm = (s.paymentMethod || '').toLowerCase();
    return pm !== 'credito';
  });
  const totalIngresos = ingresosSales.reduce((s, x) => s + (x.total || 0), 0);
  
  const getMethodTotal = (methods: string[]) => 
    ingresosSales
      .filter(s => methods.includes((s.paymentMethod || '').toLowerCase()))
      .reduce((s, x) => s + (x.total || 0), 0);

  const efectivo = getMethodTotal(['cash', 'efectivo', 'cash/efectivo']);
  const tarjeta = getMethodTotal(['datafono', 'card', 'tarjeta', 'débito', 'crédito']);
  const transferencia = getMethodTotal(['transfer', 'transferencia', 'digital', 'nequi', 'daviplata']);

  // Credit pedidos for current period
  const creditPedidosPeriod = creditPedidos.filter(p => isInPeriod(p.createdAt, period));
  const totalCredito = creditPedidosPeriod.reduce((s, p) => s + (p.total || 0), 0);

  // Supply purchases for current period
  const purchasesPeriod = purchases.filter(p => isInPeriod(p.createdAt, period));
  const totalCompras = purchasesPeriod.reduce((s, p) => s + (p.total || 0), 0);

  // Ganancia
  const gananciaNeta = totalIngresos - totalCompras;
  const isPositive = gananciaNeta >= 0;

  // Product ranking
  const productMap: Record<string, { name: string; units: number; revenue: number }> = {};
  sales.forEach(s => {
    s.items?.forEach((item: any) => {
      const k = item.productName || 'Desconocido';
      if (!productMap[k]) productMap[k] = { name: k, units: 0, revenue: 0 };
      productMap[k].units += item.quantity || 0;
      productMap[k].revenue += item.subtotal || 0;
    });
  });
  const ranking = Object.values(productMap).sort((a, b) => b.units - a.units).slice(0, 20);
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

  const filterLabel = FILTER_LABEL[filter];

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen relative pb-32">
        <AppHeader showBell />
        <PageTitle title="Reportes & BI" subtitle="Análisis Operativo" />

        <main className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full">

          {/* ── FILTERS ── */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex p-1 bg-surface-container rounded-2xl border border-outline/30 w-full sm:w-auto">
              {(['hoy', 'semana', 'mes'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'flex-1 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    filter === f ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-on-surface'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-2xl border border-outline/50 shadow-sm text-xs font-bold text-secondary">
                <Calendar className="w-4 h-4" />
                Calendario
                <ChevronDown className="w-4 h-4 opacity-30" />
              </button>
              <button
                onClick={() => toast.info('Generando reporte...')}
                className="flex items-center justify-center w-12 h-12 bg-white rounded-2xl border border-outline/50 shadow-sm text-secondary hover:text-primary transition-all"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── 2×3 METRIC GRID ── */}
          <section className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
              accent="emerald"
              label="Ingresos Recibidos"
              value={loading ? '...' : formatCurrency(totalIngresos)}
              sub={filterLabel}
              onOpen={() => open('ingresos')}
            />
            <MetricCard
              icon={<CreditCard className="w-5 h-5 text-orange-600" />}
              accent="orange"
              label="Ventas a Crédito"
              value={loading ? '...' : formatCurrency(totalCredito)}
              sub={filterLabel}
              onOpen={() => open('credito')}
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
              accent="emerald"
              label="Ganancia Neta"
              value={loading ? '...' : formatCurrency(gananciaNeta)}
              sub={filterLabel}
              badge={totalIngresos > 0 ? {
                text: isPositive ? '↑ Positivo' : '↓ Negativo',
                color: isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              } : null}
              onOpen={() => open('ganancia')}
            />
            <MetricCard
              icon={<Trophy className="w-5 h-5 text-amber-600" />}
              accent="amber"
              label="Producto Estrella"
              value={starProduct ? starProduct.name.length > 12 ? starProduct.name.slice(0, 12) + '…' : starProduct.name : 'N/A'}
              sub={starProduct ? `${starProduct.units} unidades` : 'Sin ventas'}
              onOpen={() => open('ranking')}
            />
            <MetricCard
              icon={<Clock className="w-5 h-5 text-orange-600" />}
              accent="orange"
              label="Deuda Clientes"
              value={formatCurrency(totalDeuda)}
              sub="Cartera histórica"
              onOpen={() => open('deuda')}
            />
            <MetricCard
              icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
              accent="orange"
              label="Stock Crítico"
              value={criticalSupplies.length.toString()}
              sub="Por debajo del límite"
              onOpen={() => open('stock')}
            />
          </section>

          {/* ── CHARTS ── */}
          <div className="flex flex-col gap-4">
            {/* Sales Trend */}
            <section className="bg-white rounded-[2.5rem] border border-outline/10 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-on-surface/5 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-on-surface" />
                  </div>
                  <div>
                    <h4 className="font-headline font-black text-lg text-on-surface leading-tight">Tendencia de Ventas</h4>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mt-0.5">Últimos 7 días</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-on-surface" />
                  <span className="text-[9px] font-black text-on-surface uppercase tracking-widest">Ingresos</span>
                </div>
              </div>
              <TrendChart data={sales} color="#1c1b1f" label="Ingresos" />
            </section>

            {/* Investment Trend */}
            <section className="bg-white rounded-[2.5rem] border border-outline/10 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-headline font-black text-lg text-on-surface leading-tight">Tendencia de Inversión</h4>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mt-0.5">Historial de Compras</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Egresos</span>
                </div>
              </div>
              <TrendChart data={purchases} color="#ff4d8d" label="Egresos" />
            </section>
          </div>

          {/* ── ACTIVITY LIST ── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-surface-container rounded-xl flex items-center justify-center">
                  <History className="w-4 h-4 text-secondary" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Actividad</h3>
              </div>
              <span className="px-3 py-1 bg-surface-container text-secondary rounded-full text-[9px] font-black uppercase tracking-widest">
                {sales.length} Ventas
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {sales.length === 0 ? (
                <div className="py-12 flex flex-col items-center opacity-20 text-center">
                  <History className="w-10 h-10 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Sin actividad en este período</p>
                </div>
              ) : (
                sales.slice(0, 15).map((sale, index) => (
                  <SaleCard 
                    key={sale.id} 
                    sale={sale} 
                    index={index}
                    onClick={() => setSelectedSale(sale)} 
                  />
                ))
              )}
              {sales.length > 10 && (
                <button className="py-3 text-[9px] font-black text-secondary uppercase tracking-widest hover:text-primary transition-colors">
                  Ver todas las ventas del período
                </button>
              )}
            </div>
          </section>

          {/* ── HINT ── */}
          <p className="text-center text-[9px] font-black text-secondary/40 uppercase tracking-widest mt-4">
            Toca una tarjeta o actividad para ver el detalle completo
          </p>

        </main>

        <BottomNav />
      </div>

      {/* ── MODALS ── */}
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
        isOpen={openModal === 'stock'}
        onClose={close}
        criticalSupplies={criticalSupplies}
      />

      {/* Sale Detail Modal */}
      <MovementDetailModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        data={selectedSale}
        profile={profile}
        chatMessage={chatMsg}
        setChatMessage={setChatMsg}
        onSendMessage={async () => {}}
        isSending={false}
      />
    </div>
  );
}
