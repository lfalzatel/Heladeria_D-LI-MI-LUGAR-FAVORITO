import React from 'react';
import { 
  IceCream, ShoppingBag, Banknote, CreditCard, Smartphone, 
  ChevronRight, Check, X, Truck, Trash2, Clock, MessageCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';

interface OrderCardProps {
  pedido: {
    id: string;
    items: any[];
    total: number;
    status: string;
    createdAt: any;
    paymentMethod: string;
    clienteName?: string;
    clienteId?: string;
    sellerName?: string;
  };
  isStaff: boolean;
  userId: string;
  onOpen: () => void;
  onUpdateStatus?: (id: string, status: string, e?: React.MouseEvent) => void;
  isUpdating?: boolean;
}

const ACTIVE_STATUSES = ['pendiente', 'aceptado', 'celebrado'];

function formatOrderDate(ts: any): { date: string; time: string } {
  if (!ts) return { date: 'Hoy', time: '—' };
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return {
    date: `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`,
    time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
  };
}

function PaymentIcon({ method }: { method: string }) {
  const m = (method || '').toLowerCase();
  if (m.includes('efectivo') || m.includes('cash')) return <Banknote className="w-3 h-3" />;
  if (m.includes('nequi') || m.includes('daviplata') || m.includes('pse')) return <Smartphone className="w-3 h-3" />;
  if (m.includes('credito') || m.includes('debe')) return <Clock className="w-3 h-3 text-orange-500" />;
  return <CreditCard className="w-3 h-3" />;
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'pendiente':  return { label: 'Pendiente',           color: 'text-amber-500',   bg: 'bg-amber-50',   dot: 'bg-amber-400',   ring: 'ring-amber-200' };
    case 'aceptado':   return { label: 'En Preparación',      color: 'text-blue-500',    bg: 'bg-blue-50',    dot: 'bg-blue-400',    ring: 'ring-blue-200' };
    case 'celebrado':  return { label: 'Listo p/ entregar',   color: 'text-emerald-500', bg: 'bg-emerald-50', dot: 'bg-emerald-400', ring: 'ring-emerald-200' };
    case 'entregado':  return { label: 'Entregado',           color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', ring: 'ring-emerald-200' };
    case 'cancelado':  return { label: 'Cancelado',           color: 'text-secondary',   bg: 'bg-surface-container', dot: 'bg-secondary/40', ring: 'ring-outline/10' };
    case 'rechazado':  return { label: 'Rechazado',           color: 'text-red-500',     bg: 'bg-red-50',     dot: 'bg-red-400',     ring: 'ring-red-200' };
    default:           return { label: status,                color: 'text-secondary',   bg: 'bg-surface-container', dot: 'bg-secondary', ring: 'ring-outline/10' };
  }
}

export default function OrderCard({
  pedido, isStaff, userId, onOpen, onUpdateStatus, isUpdating, onDeletePedido
}: OrderCardProps & { onDeletePedido?: (id: string, e?: React.MouseEvent) => void }) {
  const [showConfirmDelivered, setShowConfirmDelivered] = React.useState(false);
  const cfg = getStatusConfig(pedido.status);
  const isCredit = (pedido.paymentMethod || '').toLowerCase() === 'credito' || (pedido.paymentMethod || '').toLowerCase() === 'debe';
  const pending = (pedido.total || 0) - ((pedido as any).totalAbonado || 0);
  const { date, time } = formatOrderDate(pedido.createdAt);
  const singleItem = pedido.items?.length === 1 ? pedido.items[0] : null;
  const multiCount = pedido.items?.length || 0;
  const isActive = ACTIVE_STATUSES.includes(pedido.status);
  const isOwner = pedido.clienteId === userId;
  const canMarkDelivered = isStaff || isOwner;

  const chatMsgs = (pedido as any).chatMessages || (pedido as any).messages || [];
  const hasUnread = Array.isArray(chatMsgs) && chatMsgs.some((m: any) => !m.read && m.senderId !== userId);
  const hasChat = Array.isArray(chatMsgs) && chatMsgs.length > 0;

  const handleConfirmDelivered = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowConfirmDelivered(false);
    onUpdateStatus?.(pedido.id, 'entregado', e);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "bg-white rounded-[2rem] overflow-hidden border border-outline/10 shadow-sm hover:shadow-md transition-all w-full relative",
          hasUnread && "border-fuchsia-400 ring-2 ring-fuchsia-500/60 shadow-[0_0_25px_rgba(217,70,239,0.35)] animate-pulse",
          hasChat && !hasUnread && "border-fuchsia-300/40 ring-1 ring-fuchsia-400/20",
          isUpdating && "opacity-60 pointer-events-none",
          !isActive && "opacity-75"
        )}
      >
        <div className="p-4 sm:p-5 cursor-pointer" onClick={onOpen}>
          {singleItem ? (
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <IceCream className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
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
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-brand font-black text-primary text-lg leading-none">{formatCurrency(pedido.total)}</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-secondary/50">
                  <PaymentIcon method={pedido.paymentMethod} />
                  <span className="text-[9px] font-bold capitalize">{pedido.paymentMethod === 'credito' ? 'Debe' : (pedido.paymentMethod || 'Efectivo')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-on-surface text-sm">{multiCount} productos</p>
                <p className="text-[10px] text-secondary font-bold">Ver detalle →</p>
              </div>
              <div className="text-right">
                <p className="font-brand font-black text-primary text-lg leading-none">{formatCurrency(pedido.total)}</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-secondary/50">
                  <PaymentIcon method={pedido.paymentMethod} />
                  <span className="text-[9px] font-bold capitalize">{pedido.paymentMethod === 'credito' ? 'Debe' : (pedido.paymentMethod || 'Efectivo')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-outline/5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={cn("px-2.5 py-1 rounded-full flex items-center gap-1.5 ring-1", cfg.bg, cfg.ring)}>
                <div className={cn("w-1.5 h-1.5 rounded-full", isActive && "animate-pulse", cfg.dot)} />
                <span className={cn("text-[9px] font-black uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
              </div>

              {isCredit && (
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ring-1",
                  pending > 0 ? "bg-orange-50 border-orange-200 text-orange-600 ring-orange-500/10" : "bg-emerald-50 border-emerald-200 text-emerald-600 ring-emerald-500/10"
                )}>
                  {pending > 0 ? `Pendiente: ${formatCurrency(pending)}` : 'Pagado'}
                </div>
              )}

              {hasUnread && (
                <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-md shadow-fuchsia-500/20 animate-bounce">
                  <MessageCircle className="w-3 h-3" /> Chat Mensaje Nuevo
                </span>
              )}

              {!hasUnread && hasChat && (
                <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-600 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 border border-fuchsia-500/20">
                  <MessageCircle className="w-3 h-3" /> Chat
                </span>
              )}

              <span className="text-[9px] text-secondary/50 font-bold">{date} · {time}</span>
              {isStaff && pedido.clienteName && (
                <span className="text-[9px] text-secondary/50 font-bold">· {pedido.clienteName}</span>
              )}
              {pedido.sellerName && (
                <span className="text-[9px] text-secondary/50 font-bold">· Atendido por: {pedido.sellerName}</span>
              )}
            </div>
            <span className="text-[9px] font-mono text-secondary/25 font-bold">#{pedido.id.slice(-6).toUpperCase()}</span>
          </div>
        </div>

        {(isActive || ((pedido.status === 'rechazado' || pedido.status === 'cancelado') && isStaff)) && onUpdateStatus && (
          <div className="border-t border-outline/5 px-4 py-2.5 flex gap-2 bg-surface-container-lowest/40">
            {isStaff ? (
              <>
                {pedido.status === 'pendiente' && (
                  <button
                    onClick={(e) => onUpdateStatus(pedido.id, 'aceptado', e)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Aceptar
                  </button>
                )}
                {pedido.status === 'aceptado' && (
                  <button
                    onClick={(e) => onUpdateStatus(pedido.id, 'celebrado', e)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95"
                  >
                    <Truck className="w-3.5 h-3.5" /> En Camino
                  </button>
                )}
                {pedido.status === 'celebrado' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirmDelivered(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Marcar Entregado
                  </button>
                )}
                {pedido.status === 'rechazado' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('¿Deseas revertir el rechazo de este pedido y cambiar su estado a Aceptado (En Preparación)?')) {
                        onUpdateStatus(pedido.id, 'aceptado', e);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-amber-600 transition-all active:scale-95 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Revertir Rechazo (Aceptar)
                  </button>
                )}
                {(pedido.status === 'rechazado' || pedido.status === 'cancelado') && onDeletePedido && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('¿Eliminar permanentemente este pedido? Esta acción no se puede deshacer.')) {
                        onDeletePedido(pedido.id, e);
                      }
                    }}
                    className="w-10 flex items-center justify-center py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2]" />
                  </button>
                )}
                {pedido.status !== 'rechazado' && pedido.status !== 'cancelado' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('¿Estás seguro de que deseas rechazar este pedido?')) {
                        onUpdateStatus(pedido.id, 'rechazado', e);
                      }
                    }}
                    className="w-10 flex items-center justify-center py-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                    title="Rechazar pedido"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                  </button>
                )}
                <button
                  onClick={onOpen}
                  className="w-10 flex items-center justify-center py-2 rounded-xl bg-surface-container text-secondary hover:bg-surface-container-high transition-all active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {pedido.status === 'pendiente' && (
                  <button
                    onClick={(e) => onUpdateStatus(pedido.id, 'cancelado', e)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-400 text-[11px] font-black uppercase tracking-wider hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" /> Cancelar
                  </button>
                )}
                {canMarkDelivered && (pedido.status === 'aceptado' || pedido.status === 'celebrado') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirmDelivered(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Confirmar Recepción
                  </button>
                )}
                {!canMarkDelivered && pedido.status !== 'pendiente' && (
                  <p className="text-[10px] text-secondary/40 font-bold italic px-1">Ya en preparación · No cancelable</p>
                )}
                <button
                  onClick={onOpen}
                  className="ml-auto w-10 flex items-center justify-center py-2 rounded-xl bg-surface-container text-secondary hover:bg-surface-container-high transition-all active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Modal de confirmación mutua de entrega */}
      {showConfirmDelivered && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm"
            onClick={() => setShowConfirmDelivered(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl z-[260] flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-headline font-black text-lg text-on-surface">¿Confirmar Entrega del Pedido?</h3>
              <p className="text-xs text-secondary font-medium mt-1">
                Se registrará la venta oficialmente en el sistema y el pedido pasará a estado completado.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button
                onClick={() => setShowConfirmDelivered(false)}
                className="py-3 rounded-xl border border-outline/20 font-bold text-xs hover:bg-surface-container transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelivered}
                className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md active:scale-95"
              >
                Sí, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
