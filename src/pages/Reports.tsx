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
import { useAuthStore } from '../stores/useAuthStore';
import { useHeaderStore } from '../stores/useHeaderStore';
import { isInPeriod } from './Supplies';
import {
  IngresosModal,
  VentasCreditoModal,
  GananciaModal,
  RankingModal,
  DeudaClientesModal,
  StockCriticoModal,
} from '../components/ReportsModals';

type DateFilter = 'hoy' | 'semana' | 'mes' | 'custom';
const FILTER_LABEL: Record<DateFilter, string> = { hoy: 'Hoy', semana: 'Semana', mes: 'Mes', custom: 'Fecha' };
const PERIOD_MAP: Record<DateFilter, 'today' | 'week' | 'month' | 'custom'> = {
  hoy: 'today', semana: 'week', mes: 'month', custom: 'custom'
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
        <p className={cn(
          "font-black text-on-surface leading-tight tracking-tight",
          value.length > 18 ? "text-xs" : value.length > 14 ? "text-sm" : value.length > 11 ? "text-base" : "text-xl"
        )}>
          {value}
        </p>
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
  const isTable = !!sale.tableName && (sale.tableName.toLowerCase().includes('mesa') && sale.tableName !== 'Pedido Online' && sale.tableName !== 'Para Llevar');
  const isTakeaway = sale.tableName === 'Para Llevar';
  const isOnline = sale.type === 'online' || sale.tableName === 'Pedido Online';
  
  // Clean label logic: Remove redundant "Mesa" if it exists in the name
  let cleanOrigin = '';
  if (cName) {
    cleanOrigin = cName;
  } else if (isTable) {
    cleanOrigin = sale.tableName.replace(/mesa/gi, '').trim();
  } else if (isTakeaway) {
    cleanOrigin = 'Para Llevar';
  } else if (isOnline) {
    cleanOrigin = 'Pedido Online';
  } else {
    cleanOrigin = 'Venta Directa';
  }
  
  const originLabel = cleanOrigin;
  
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
                isTakeaway ? "bg-emerald-50 text-emerald-600 ring-emerald-500/20" :
                (isOnline ? "bg-purple-50 text-purple-600 ring-purple-500/20" : "bg-primary/5 text-primary ring-primary/20")
              )}>
                {isTable ? 'Mesa' : (isTakeaway ? 'Llevar' : (isOnline ? 'Online' : 'POS'))}
              </span>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest truncate max-w-[100px]",
                isTable ? "text-blue-600" : isTakeaway ? "text-emerald-600" : (isOnline ? "text-purple-600" : "text-secondary/40")
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

import { ChevronLeft, ChevronRight, X as CloseIcon } from 'lucide-react';

function CalendarModal({ 
  isOpen, 
  onClose, 
  allActivity, 
  onSelectDate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  allActivity: any[]; 
  onSelectDate: (date: Date) => void 
}) {
  const [viewDate, setViewDate] = useState(new Date());
  
  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  // Pre-calculate sales per day
  const salesByDay: Record<number, number> = {};
  allActivity.forEach(sale => {
    const d = toDateS(sale.timestamp || sale.updatedAt || sale.createdAt);
    if (d && d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      salesByDay[day] = (salesByDay[day] || 0) + 1;
    }
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => i); // Start on Monday

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + offset);
    setViewDate(newDate);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-6 bg-surface-container-low flex items-center justify-between border-b border-outline/10">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-surface rounded-full transition-all text-secondary"><ChevronLeft /></button>
          <h3 className="font-black text-xs uppercase tracking-widest text-on-surface capitalize">{monthName}</h3>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-surface rounded-full transition-all text-secondary"><ChevronRight /></button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-secondary/40 py-2">{d}</div>
            ))}
            {blanks.map(i => <div key={`b-${i}`} />)}
            {days.map(d => {
              const count = salesByDay[d] || 0;
              const hasActivity = count > 0;
              return (
                <button 
                  key={d} 
                  onClick={() => {
                    const sel = new Date(year, month, d);
                    onSelectDate(sel);
                    onClose();
                  }}
                  className={cn(
                    "relative h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all group border border-transparent",
                    hasActivity ? "bg-primary/5 border-primary/10 hover:bg-primary/10" : "hover:bg-surface"
                  )}
                >
                  <span className={cn("text-xs font-black", hasActivity ? "text-primary" : "text-secondary")}>{d}</span>
                  {hasActivity && (
                    <div className="flex flex-col items-center">
                      <div className="w-1 h-1 bg-primary rounded-full mb-0.5 shadow-[0_0_8px_rgba(179,0,105,0.6)]" />
                      <span className="text-[7px] font-black text-primary/60">{count}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Reports() {
  const { profile } = useAuthStore();
  const { setHeader, clearHeader } = useHeaderStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DateFilter>('hoy');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Data state
  const [sales, setSales] = useState<any[]>([]);
  const [pedidosData, setPedidosData] = useState<any[]>([]);
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

  useEffect(() => {
    setHeader({
      title: 'Reportes & BI',
      subtitle: 'Análisis Operativo'
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  // ── SALES & PEDIDOS listeners (period-filtered) ──
  useEffect(() => {
    if (!profile) return;
    
    // Listen to SALES
    const qSales = query(collection(db, 'sales'), orderBy('timestamp', 'desc'));
    const unsubSales = onSnapshot(qSales, snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (loading) setLoading(false);
    });

    // Listen to DELIVERED PEDIDOS (that might not be in sales yet)
    const qPedidos = query(
      collection(db, 'pedidos'), 
      where('status', '==', 'entregado'),
      orderBy('updatedAt', 'desc')
    );
    const unsubPedidos = onSnapshot(qPedidos, snap => {
      setPedidosData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubSales();
      unsubPedidos();
    };
  }, [profile]);

  // Combined and de-duplicated activity
  const combinedActivity = React.useMemo(() => {
    // 1. All sales
    const items = [...sales];
    
    // 2. Add delivered pedidos that ARE NOT already in sales (check pedidoId)
    const salesPedidoIds = new Set(sales.map(s => s.pedidoId).filter(Boolean));
    
    pedidosData.forEach(p => {
      if (!salesPedidoIds.has(p.id)) {
        items.push({ ...p, type: 'online', isDirectPedido: true });
      }
    });

    // 3. Filter by period and Sort
    return items
      .filter(item => {
        const timestamp = item.timestamp || item.updatedAt || item.createdAt;
        if (filter === 'custom' && customDate) {
          const d = toDateS(timestamp);
          return d?.toDateString() === customDate.toDateString();
        }
        return isInPeriod(timestamp, period);
      })
      .sort((a, b) => {
        const tA = toDateS(a.timestamp || a.updatedAt || a.createdAt)?.getTime() || 0;
        const tB = toDateS(b.timestamp || b.updatedAt || b.createdAt)?.getTime() || 0;
        return tB - tA;
      });
  }, [sales, pedidosData, period, filter, customDate]);

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
  
  // Ingresos (Combined sales & delivered pedidos, non-credit)
  const ingresosSales = combinedActivity.filter(s => {
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
  const creditPedidosPeriod = creditPedidos.filter(p => {
    if (filter === 'custom' && customDate) {
      return toDateS(p.createdAt)?.toDateString() === customDate.toDateString();
    }
    return isInPeriod(p.createdAt, period);
  });
  const totalCredito = creditPedidosPeriod.reduce((s, p) => s + (p.total || 0), 0);

  // Supply purchases for current period
  const purchasesPeriod = purchases.filter(p => {
    if (filter === 'custom' && customDate) {
      return toDateS(p.createdAt)?.toDateString() === customDate.toDateString();
    }
    return isInPeriod(p.createdAt, period);
  });
  const totalCompras = purchasesPeriod.reduce((s, p) => s + (p.total || 0), 0);

  // Ganancia
  const gananciaNeta = totalIngresos - totalCompras;
  const isPositive = gananciaNeta >= 0;

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

  const filterLabel = filter === 'custom' && customDate 
    ? customDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' }).replace(',', '')
    : FILTER_LABEL[filter];
 
   return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full pb-32">

          {/* ── FILTERS ── */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex p-1 bg-surface-container rounded-2xl border border-outline/30 w-full sm:w-auto">
              {(['hoy', 'semana', 'mes'] as const).map(f => (
                <button
                   key={f}
                   onClick={() => {
                     setFilter(f);
                     setCustomDate(null);
                   }}
                   className={cn(
                     'flex-1 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                     filter === f ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-on-surface'
                   )}
                >
                  {FILTER_LABEL[f]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setIsCalendarOpen(true)}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border transition-all shadow-sm text-xs font-black",
                  filter === 'custom' ? "bg-primary/5 text-primary border-primary/20" : "bg-white text-secondary border-outline/50 hover:bg-surface"
                )}
              >
                <Calendar className="w-4 h-4" />
                {filter === 'custom' && customDate 
                  ? customDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '') 
                  : 'Calendario'}
                <ChevronDown className={cn("w-4 h-4 transition-transform", isCalendarOpen && "rotate-180")} />
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
              value={starProduct ? starProduct.name : 'N/A'}
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
              <TrendChart data={combinedActivity} color="#1c1b1f" label="Ingresos" />
            </section>

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

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-surface-container rounded-xl flex items-center justify-center">
                  <History className="w-4 h-4 text-secondary" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Actividad</h3>
              </div>
              <span className="px-3 py-1 bg-surface-container text-secondary rounded-full text-[9px] font-black uppercase tracking-widest">
                {combinedActivity.length} Actividades
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {combinedActivity.length === 0 ? (
                <div className="py-12 flex flex-col items-center opacity-20 text-center">
                  <History className="w-10 h-10 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Sin actividad en este período</p>
                </div>
              ) : (
                combinedActivity.slice(0, 20).map((sale, index) => (
                  <SaleCard 
                    key={sale.id} 
                    sale={sale} 
                    index={index}
                    onClick={() => setSelectedSale(sale)} 
                  />
                ))
              )}
            </div>
          </section>

          <p className="text-center text-[9px] font-black text-secondary/40 uppercase tracking-widest mt-4">
            Toca una tarjeta o actividad para ver el detalle completo
          </p>

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

      <MovementDetailModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        data={selectedSale}
        profile={profile}
        chatMessage={chatMsg}
        setChatMessage={setChatMsg}
        onSendMessage={async () => {}}
        isSending={false}
        onToggleItemPrepared={async (itemId, currentPrepared) => {
          if (!selectedSale) return;
          try {
            const collectionName = selectedSale.type === 'online' || selectedSale.isDirectPedido ? 'pedidos' : 'sales';
            const updatedItems = selectedSale.items.map((item: any) => 
              item.id === itemId || (!item.id && item.productId === itemId) ? { ...item, prepared: !currentPrepared } : item
            );
            
            setSelectedSale({ ...selectedSale, items: updatedItems });
            
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
      
      <CalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        allActivity={[...sales, ...pedidosData]}
        onSelectDate={(date) => {
          setCustomDate(date);
          setFilter('custom');
        }}
      />
      </div>
    );
}
