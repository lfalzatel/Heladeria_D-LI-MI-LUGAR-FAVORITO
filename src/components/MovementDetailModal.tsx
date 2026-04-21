import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Receipt, MapPin, MessageCircle, Send } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

interface MovementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  profile: any;
  chatMessage?: string;
  setChatMessage?: (msg: string) => void;
  onSendMessage?: () => void;
  isSending?: boolean;
}

const STATUS_CONFIG: Record<string, any> = {
  pendiente: { label: 'Pendiente', color: 'text-amber-500', bg: 'bg-amber-400/10', ring: 'ring-amber-500/20', icon: <Receipt className="w-5 h-5" /> },
  aceptado:  { label: 'Aceptado',  color: 'text-emerald-500', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20', icon: <Receipt className="w-5 h-5" /> },
  rechazado: { label: 'Rechazado', color: 'text-red-500', bg: 'bg-red-400/10', ring: 'ring-red-500/20', icon: <Receipt className="w-5 h-5" /> },
};

export default function MovementDetailModal({
  isOpen,
  onClose,
  data,
  profile,
  chatMessage = '',
  setChatMessage,
  onSendMessage,
  isSending = false
}: MovementDetailModalProps) {
  if (!data) return null;

  const cfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.pendiente;
  const isOnlinePedido = !!data.clienteId;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col h-[95dvh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-outline/10 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                    <h3 className="font-headline font-black text-xl text-on-surface leading-none">Detalle del Movimiento</h3>
                    <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-1">Ref: #{data.id.slice(-6).toUpperCase()}</p>
                 </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-all active:scale-90">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar flex flex-col gap-6">
               {/* Status & Info */}
               <div className="grid grid-cols-2 gap-3">
                  <div className={cn("rounded-3xl p-4 flex flex-col gap-1 ring-1 border shadow-sm", cfg.ring, cfg.bg)}>
                     <p className={cn("text-[9px] font-black uppercase tracking-[0.2em]", cfg.color)}>{cfg.label}</p>
                     <p className="font-headline font-black text-on-surface text-sm uppercase">
                        {data.hour || 'Reciente'}
                     </p>
                  </div>
                  <div className="bg-surface-container/30 rounded-3xl p-4 flex flex-col gap-1 border border-outline/5 shadow-sm">
                     <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Método</p>
                     <p className="font-headline font-bold text-on-surface text-sm capitalize">{data.paymentMethod}</p>
                  </div>
               </div>

               {/* Products List */}
               <section>
                  <h4 className="font-headline font-black text-[10px] uppercase tracking-widest text-secondary/50 mb-3 ml-1">Productos ({data.items?.length || 0})</h4>
                  <div className="flex flex-col gap-2">
                    {data.items?.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex justify-between items-center p-3 sm:p-4 rounded-2xl border border-outline/20 bg-white shadow-sm">
                         <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center font-black text-xs flex-shrink-0">
                               {item.quantity}
                            </div>
                            <div className="flex flex-col min-w-0 pr-2">
                               <span className="font-bold text-sm text-on-surface leading-snug">{item.productName}</span>
                               <div className="flex flex-wrap gap-1 mt-1">
                                  {item.variantLabel && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-surface-container text-secondary text-[8px] font-black uppercase tracking-wider">
                                      {item.variantLabel}
                                    </span>
                                  )}
                                  {item.flavors?.map((f: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-primary/5 text-primary text-[8px] font-bold">{f}</span>
                                  ))}
                                  {item.fruitChoices?.map((f: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 text-[8px] font-bold">{f}</span>
                                  ))}
                                  {item.additions?.map((a: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-success/5 text-success text-[8px] font-bold">+{a}</span>
                                  ))}
                               </div>
                            </div>
                         </div>
                         <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                           <span className="font-black text-primary">
                              {formatCurrency(item.subtotal || 0)}
                           </span>
                           {item.quantity > 1 && (
                             <span className="text-[9px] font-bold text-secondary italic opacity-60">
                               {formatCurrency(item.unitPrice || 0)} c/u
                             </span>
                           )}
                         </div>
                      </div>
                    ))}
                  </div>
               </section>

               {/* Address / Total */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.address && (
                    <div className="bg-surface-container/30 rounded-3xl p-4 flex flex-col gap-1 border border-outline/5 shadow-sm">
                       <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Entrega en</p>
                       <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] font-bold text-on-surface leading-tight">{data.address}</p>
                       </div>
                    </div>
                  )}
                  <div className="bg-primary rounded-3xl p-5 flex flex-col gap-1 shadow-lg shadow-primary/20 col-span-full sm:col-span-1 ml-auto w-full">
                     <p className="text-[10px] text-white/50 font-black uppercase tracking-widest leading-none">Total Cobrado</p>
                     <p className="text-2xl font-headline font-black text-white leading-none mt-1">{formatCurrency(data.total)}</p>
                  </div>
               </div>

               {/* Chat Section (Optional) */}
               {isOnlinePedido && (
                 <section className="bg-surface-container/40 rounded-[2rem] p-5 border border-outline/10 h-[280px] flex flex-col shadow-inner">
                    <div className="flex items-center gap-2 text-secondary mb-4">
                       <MessageCircle className="w-5 h-5 opacity-40" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Chat del Pedido</span>
                    </div>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar pr-1">
                       {(data.messages || []).length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-4">
                            <MessageCircle className="w-8 h-8 mb-2" />
                            <p className="text-[10px] font-bold">Sin mensajes aún.</p>
                         </div>
                       ) : (
                         data.messages!.map((msg: any, i: number) => {
                           const isMe = msg.from === profile?.uid;
                           return (
                             <div key={i} className={cn("flex flex-col gap-1 max-w-[85%]", isMe ? "self-end items-end" : "self-start")}>
                                <div className={cn("px-4 py-2.5 rounded-2xl text-[11px] font-bold shadow-sm leading-relaxed", 
                                  isMe ? "bg-primary text-white rounded-br-none" : "bg-white text-on-surface border border-outline/10 rounded-bl-none"
                                )}>
                                   {msg.text}
                                </div>
                                <div className="px-2 flex items-center gap-1 opacity-40">
                                   <span className="text-[8px] font-black uppercase tracking-tighter">{msg.fromName || 'Usuario'}</span>
                                   <span className="text-[8px]">•</span>
                                   <span className="text-[8px] font-medium">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                             </div>
                           );
                         })
                       )}
                    </div>
                 </section>
               )}
            </div>

            {/* Chat Footer (Optional) */}
            {isOnlinePedido && setChatMessage && onSendMessage && (
              <div className="p-4 bg-white border-t border-outline/10 flex items-center gap-3">
                 <div className="flex-1 bg-surface-container-lowest border border-outline/20 rounded-2xl flex items-center px-4 py-2 group focus-within:ring-2 ring-primary/20 transition-all">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && onSendMessage()}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-transparent text-xs font-bold py-2 outline-none placeholder:text-secondary/30"
                    />
                 </div>
                 <button 
                   onClick={onSendMessage}
                   disabled={!chatMessage.trim() || isSending}
                   className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-all disabled:opacity-30"
                 >
                   <Send className="w-5 h-5" />
                 </button>
              </div>
            )}

            {!isOnlinePedido && (
              <div className="p-6 bg-white border-t border-outline/10">
                <button 
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl bg-on-surface text-white font-headline font-black text-sm uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                >
                  Cerrar Detalle
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
