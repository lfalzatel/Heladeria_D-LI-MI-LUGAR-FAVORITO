import React from 'react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { 
  Clock, Check, XCircle, Banknote, Smartphone, 
  CreditCard, Hash, ShoppingBag, IceCream 
} from 'lucide-react';

const STATUS_CONFIG: Record<string, any> = {
  pendiente: { label: 'Pendiente', color: 'text-amber-500', bg: 'bg-amber-400/10', ring: 'ring-amber-500/20', dot: 'bg-amber-400', icon: <Clock className="w-5 h-5" /> },
  aceptado:  { label: 'Aceptado',  color: 'text-blue-500',  bg: 'bg-blue-400/10',  ring: 'ring-blue-500/20',  dot: 'bg-blue-500',  icon: <Check className="w-5 h-5" /> },
  rechazado: { label: 'Rechazado', color: 'text-red-500', bg: 'bg-red-400/10', ring: 'ring-red-500/20', dot: 'bg-red-400', icon: <XCircle className="w-5 h-5" /> },
  entregado: { label: 'Entregado', color: 'text-emerald-500', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20', dot: 'bg-emerald-500', icon: <Check className="w-5 h-5" /> },
  celebrado: { label: 'Listo',     color: 'text-emerald-500', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20', dot: 'bg-emerald-500', icon: <Check className="w-5 h-5" /> },
};

const PAYMENT_ICONS: Record<string, any> = {
  efectivo: <Banknote className="w-3.5 h-3.5" />,
  transferencia: <Smartphone className="w-3.5 h-3.5" />,
  tarjeta: <CreditCard className="w-3.5 h-3.5" />,
  datafono: <CreditCard className="w-3.5 h-3.5" />,
};

interface HistoryMovementCardProps {
  id: string;
  total: number;
  date: string;
  paymentMethod: string;
  status: string;
  itemCount: number;
  items?: any[];
  title?: string;
  onClick: () => void;
}

export default function HistoryMovementCard({ 
  id, 
  total, 
  date, 
  paymentMethod, 
  status, 
  itemCount, 
  items,
  title,
  onClick 
}: HistoryMovementCardProps) {
  const cfg = STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.pendiente;
  const paymentKey = paymentMethod?.toLowerCase() || 'efectivo';
  
  const firstItem = items && items.length > 0 ? items[0] : null;

  return (
    <motion.button
      layout
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }}
      className="w-full text-left bg-white rounded-[2rem] p-5 border border-outline/10 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group relative overflow-hidden active:scale-[0.98]"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm",
          cfg.bg, cfg.color
        )}>
          {firstItem ? <IceCream className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <p className="text-[10px] text-secondary font-black uppercase tracking-widest leading-none mb-1 opacity-60">
                {title || 'Orden'}
              </p>
              <h4 className="font-brand font-black text-on-surface text-base sm:text-lg leading-tight uppercase line-clamp-2">
                {firstItem ? firstItem.productName : `Order #${id.slice(-6).toUpperCase()}`}
              </h4>
              {itemCount > 1 && (
                <p className="text-[10px] text-primary font-bold mt-1">
                  + {itemCount - 1} {itemCount - 1 === 1 ? 'producto adicional' : 'productos adicionales'}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-brand font-black text-primary text-xl leading-none">{formatCurrency(total)}</p>
              <div className="flex items-center justify-end gap-1.5 mt-1.5 text-secondary/40">
                {PAYMENT_ICONS[paymentKey] || <Hash className="w-3.5 h-3.5" />}
                <span className="text-[9px] font-black uppercase tracking-tighter">{paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-outline/5 mt-1">
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 shadow-sm", cfg.ring, cfg.bg)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", (status === 'pendiente' || status === 'aceptado') && "animate-pulse", cfg.dot)} />
            <span className={cn("text-[9px] font-black uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
          </div>
          <span className="text-[10px] font-black text-secondary/60 uppercase tracking-tight">
            {date}
          </span>
        </div>
        <span className="text-[9px] font-mono text-secondary/20 font-bold">
          ID: {id.slice(-8).toUpperCase()}
        </span>
      </div>
    </motion.button>
  );
}
