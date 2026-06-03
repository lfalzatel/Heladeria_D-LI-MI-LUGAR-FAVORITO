import React from 'react';
import { Box, Plus, BarChart3, ChevronRight } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { PurchaseRecord } from './PurchaseModals';

export type PeriodFilter = 'today' | 'week' | 'month';
export const PERIOD_LABELS: Record<PeriodFilter, string> = { today: 'Hoy', week: 'Semana', month: 'Mes' };
export const toDateS = (ts: any): Date | null => { if (!ts) return null; if (ts.toDate) return ts.toDate(); return new Date(ts); };
export const isInPeriod = (ts: any, period: PeriodFilter): boolean => {
  const d = toDateS(ts); if (!d) return false;
  const now = new Date();
  if (period === 'today') return d.toDateString() === now.toDateString();
  if (period === 'week') { const s = new Date(now); s.setDate(now.getDate() - 7); return d >= s; }
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};


/* ─── STAT CARD ─── */
export function StatCard({ icon, label, value, sub, accent, index = 0, numericValue, isCurrency, onOpen }: { icon: React.ReactNode, label: string, value: string, sub?: string, accent: 'primary' | 'orange' | 'blue' | 'slate' | 'amber', index?: number, numericValue?: number, isCurrency?: boolean, onOpen?: () => void }) {
  const map = { primary: 'bg-primary/5 border-primary/10', orange: 'bg-orange-50 border-orange-100', blue: 'bg-blue-50 border-blue-100', slate: 'bg-slate-50 border-slate-100', amber: 'bg-amber-50 border-amber-100' };
  
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

    const delay = index * 80;
    
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
          setDisplayValue(value);
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
      disabled={!onOpen}
      initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(15px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      whileTap={onOpen ? { scale: 0.98 } : undefined}
      transition={{ 
        duration: 0.6, 
        ease: [0.34, 1.56, 0.64, 1],
        delay: index * 0.1
      }}
      className={cn("bg-white text-left w-full rounded-3xl p-4 border flex flex-col gap-2 shadow-sm relative group transition-all", map[accent], onOpen && "hover:shadow-md cursor-pointer")}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm text-on-surface">{icon}</div>
        {onOpen && (
          <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center text-secondary border border-outline/10 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
            <Plus className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 mt-1">
        <p className={cn(
          "font-black text-on-surface leading-none",
          displayValue.length > 18 ? "text-xs" : displayValue.length > 14 ? "text-sm" : displayValue.length > 11 ? "text-base" : "text-lg"
        )}>
          {displayValue}
        </p>
        <div>
          <p className="text-[9px] font-black text-secondary uppercase tracking-widest leading-tight">{label}</p>
          {sub && <p className="text-[9px] text-secondary/60 font-medium mt-0.5 leading-tight">{sub}</p>}
        </div>
      </div>
    </motion.button>
  );
}

/* ─── PURCHASE HISTORY CARD ─── */
export function PurchaseCard({ purchase, onClick, index = 0 }: { purchase: PurchaseRecord, onClick: () => void, index?: number }) {
  const d = toDateS(purchase.createdAt);
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dateStr = d ? `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : '';

  return (
    <motion.button 
      initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(15px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ 
        duration: 0.6, 
        ease: [0.34, 1.56, 0.64, 1],
        delay: Math.min(index * 0.05, 0.5) // Cap delay for long lists
      }}
      onClick={onClick} 
      className="w-full bg-white rounded-2xl border border-outline/10 shadow-sm p-4 text-left hover:shadow-md hover:border-primary/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-black text-sm text-on-surface">{purchase.provider}</p>
          <p className="text-[10px] text-secondary font-bold mt-0.5">{dateStr}</p>
        </div>
        <p className="font-black text-primary text-base">{formatCurrency(purchase.total)}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {purchase.items?.slice(0, 4).map((item, i) => (
          <span key={i} className="px-2 py-0.5 bg-surface-container text-secondary text-[9px] font-bold rounded-lg border border-outline/10">{item.name} ×{item.quantity}</span>
        ))}
        {(purchase.items?.length || 0) > 4 && (
          <span className="px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded-lg">+{purchase.items.length - 4} más</span>
        )}
      </div>
    </motion.button>
  );
}
