import React from 'react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { Clock, Check, XCircle, Banknote, Smartphone, CreditCard, Hash } from 'lucide-react';

const STATUS_CONFIG: Record<string, any> = {
  pendiente: { label: 'Pendiente', color: 'text-amber-500', bg: 'bg-amber-400/10', ring: 'ring-amber-500/20', dot: 'bg-amber-400', icon: <Clock className="w-5 h-5" /> },
  aceptado:  { label: 'Aceptado',  color: 'text-emerald-500', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20', dot: 'bg-emerald-500', icon: <Check className="w-5 h-5" /> },
  rechazado: { label: 'Rechazado', color: 'text-red-500', bg: 'bg-red-400/10', ring: 'ring-red-500/20', dot: 'bg-red-400', icon: <XCircle className="w-5 h-5" /> },
  entregado: { label: 'Entregado', color: 'text-emerald-500', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20', dot: 'bg-emerald-500', icon: <Check className="w-5 h-5" /> },
};

const PAYMENT_ICONS: Record<string, any> = {
  efectivo: <Banknote className="w-4 h-4" />,
  transferencia: <Smartphone className="w-4 h-4" />,
  tarjeta: <CreditCard className="w-4 h-4" />,
  datafono: <CreditCard className="w-4 h-4" />,
};

interface HistoryMovementCardProps {
  id: string;
  total: number;
  date: string;
  paymentMethod: string;
  status: string;
  itemCount: number;
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
  title,
  onClick 
}: HistoryMovementCardProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
  const paymentKey = paymentMethod?.toLowerCase() || 'efectivo';

  return (
    <motion.button
      layout
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="w-full text-left bg-white rounded-[2rem] p-5 sm:p-6 border border-outline/10 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-4">
         <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm", cfg.bg, cfg.color)}>
               {cfg.icon}
            </div>
            <div className="flex flex-col">
               <p className="text-[10px] text-secondary font-black uppercase tracking-widest leading-none mb-1">
                  {title || 'Orden'}
               </p>
               <h4 className="font-brand font-black text-on-surface text-lg leading-tight uppercase truncate max-w-[120px]">
                  #{id.slice(-6).toUpperCase()}
               </h4>
            </div>
         </div>
         <div className="text-right">
            <p className="font-brand font-black text-primary text-xl leading-none">{formatCurrency(total)}</p>
            <p className="text-[10px] text-secondary font-bold uppercase mt-1 tracking-tighter">{date}</p>
         </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-outline/5 mt-2">
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full ring-1 ring-outline/5">
               {PAYMENT_ICONS[paymentKey] || <Hash className="w-3.5 h-3.5" />}
               <span className="text-[9px] font-black text-secondary uppercase tracking-tighter">
                  {paymentMethod}
               </span>
            </div>
            <span className="text-[10px] font-bold text-secondary/40 uppercase">
               {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
         </div>
         <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-2 shadow-sm", cfg.ring, cfg.bg)}>
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cfg.dot)} />
            <span className={cn("text-[9px] font-black uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
         </div>
      </div>
    </motion.button>
  );
}
