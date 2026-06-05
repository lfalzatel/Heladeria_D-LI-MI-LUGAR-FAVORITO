import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { Plus, TrendingUp, ChevronLeft, ChevronRight, Banknote, CreditCard, Smartphone, Clock, DollarSign } from 'lucide-react';

// ── UTILS ──
const toDateS = (ts: any): Date | null => { 
  if (!ts) return null; 
  if (ts.toDate) return ts.toDate(); 
  return new Date(ts); 
};

// ── COMPONENTS ──
export function MetricCard({
  icon, label, value, sub, badge, accent, onOpen, index = 0, numericValue, isCurrency
}: {
  icon: React.ReactNode; label: string; value: string;
  sub: string; badge?: { text: string; color: string } | null; 
  accent: 'emerald' | 'orange' | 'amber' | 'blue';
  onOpen: () => void;
  index?: number;
  numericValue?: number;
  isCurrency?: boolean;
}) {
  const accentMap = {
    emerald: 'bg-[#ecfdf5] border-[#d1fae5]',
    orange: 'bg-[#fff7ed] border-[#ffedd5]',
    amber: 'bg-[#fffbeb] border-[#fef3c7]',
    blue: 'bg-[#eff6ff] border-[#dbeafe]'
  };

  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    if (numericValue === undefined) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const start = 0;
    const end = numericValue;
    let startTimestamp: number | null = null;
    let reqId: number;

    const delay = index * 80; // match animationDelay
    
    const startAnim = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeOut * (end - start) + start);
        
        setDisplayValue(isCurrency ? formatCurrency(currentVal) : currentVal.toString());
        
        if (progress < 1) {
          reqId = window.requestAnimationFrame(step);
        } else {
          setDisplayValue(value); // Ensure exact final string formatting
        }
      };
      reqId = window.requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(startAnim);
      if (reqId) window.cancelAnimationFrame(reqId);
    };
  }, [numericValue, isCurrency, index, value]);

  return (
    <motion.button
      onClick={onOpen}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "bg-white text-left w-full rounded-3xl p-4 border flex flex-col gap-2 shadow-sm relative group hover:shadow-md transition-all animate-card-mix opacity-0",
        accentMap[accent]
      )}
      style={{ animationDelay: `${index * 0.08}s` }}
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
          displayValue.length > 18 ? "text-xs" : displayValue.length > 14 ? "text-sm" : displayValue.length > 11 ? "text-base" : "text-xl"
        )}>
          {displayValue}
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

export function TrendChart({ data, color = 'currentColor', label = 'Ventas' }: { data: any[], color?: string, label?: string }) {
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

export function SaleCard({ sale, onClick, index = 0 }: { sale: any, onClick: () => void, index?: number }) {
  const d = toDateS(sale.timestamp || sale.createdAt);
  
  // Format: "Lun 25 · 05:40 a. m."
  const dateStr = d ? d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }) : '';
  const timeStr = d ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  const fullTime = `${dateStr} · ${timeStr}`;

  const cName = sale.clienteName || sale.userName || sale.customerName || sale.nombre || sale.clientName;
  const isTable = !!sale.tableName && (sale.tableName.toLowerCase().includes('mesa') && sale.tableName !== 'Pedido Online' && sale.tableName !== 'Para Llevar');
  const isTakeaway = sale.tableName === 'Para Llevar';
  const isOnline = sale.type === 'online' || sale.tableName === 'Pedido Online';
  
  // Clean label logic
  let originLabel = '';
  if (cName) {
    originLabel = cName;
  } else if (isTable) {
    originLabel = sale.tableName.replace(/mesa/gi, '').trim();
  } else if (isTakeaway) {
    originLabel = ''; // It will say [ PARA LLEVAR ]
  } else if (isOnline) {
    originLabel = 'Web'; // [ ONLINE ] Web
  } else {
    originLabel = sale.sellerName || 'Venta Directa'; // [ VENTA DIRECTA ] Vendedor
  }
  
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
                {isTable ? 'Mesa' : (isTakeaway ? 'Para Llevar' : (isOnline ? 'Online' : 'Venta Directa'))}
              </span>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest truncate max-w-[100px]",
                isTable ? "text-blue-600" : isTakeaway ? "text-emerald-600" : (isOnline ? "text-purple-600" : "text-primary/70")
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

export function CalendarModal({ 
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
  const [viewMode, setViewMode] = useState<'days' | 'months'>('days');
  
  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const headerTitle = viewMode === 'days' 
    ? viewDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    : viewDate.getFullYear().toString();

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

  const changeTime = (offset: number) => {
    const newDate = new Date(viewDate);
    if (viewMode === 'months') {
      newDate.setFullYear(viewDate.getFullYear() + offset);
    } else {
      newDate.setMonth(viewDate.getMonth() + offset);
    }
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
          <button onClick={() => changeTime(-1)} className="p-2 hover:bg-surface rounded-full transition-all text-secondary"><ChevronLeft /></button>
          <button 
            onClick={() => setViewMode(viewMode === 'days' ? 'months' : 'days')} 
            className="font-black text-xs uppercase tracking-widest text-on-surface capitalize hover:text-primary transition-colors px-4 py-1 rounded-full hover:bg-surface"
          >
            {headerTitle}
          </button>
          <button onClick={() => changeTime(1)} className="p-2 hover:bg-surface rounded-full transition-all text-secondary"><ChevronRight /></button>
        </div>

        <div className="p-6 min-h-[320px]">
          {viewMode === 'days' ? (
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[10px] font-black text-secondary/40 py-2">{d}</div>
              ))}
              {blanks.map(i => <div key={`b-${i}`} />)}
              {days.map(d => {
                const count = salesByDay[d] || 0;
                const hasActivity = count > 0;
                const isToday = year === new Date().getFullYear() && month === new Date().getMonth() && d === new Date().getDate();
                return (
                  <button 
                    key={d} 
                    onClick={() => {
                      const sel = new Date(year, month, d);
                      onSelectDate(sel);
                      onClose();
                    }}
                    className={cn(
                      "relative h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all group border",
                      isToday ? "border-primary/50 bg-primary/5" : "border-transparent",
                      hasActivity && !isToday ? "bg-primary/5 border-primary/10 hover:bg-primary/10" : "hover:bg-surface"
                    )}
                  >
                    <span className={cn("text-xs font-black", hasActivity || isToday ? "text-primary" : "text-secondary")}>{d}</span>
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
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
                <button
                  key={m}
                  onClick={() => {
                    const newDate = new Date(viewDate);
                    newDate.setMonth(i);
                    setViewDate(newDate);
                    setViewMode('days');
                  }}
                  className={cn(
                    "h-14 rounded-2xl flex items-center justify-center font-black text-sm transition-all border",
                    i === month 
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                      : "bg-white text-secondary border-outline/10 hover:bg-surface hover:text-primary hover:border-primary/30"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
