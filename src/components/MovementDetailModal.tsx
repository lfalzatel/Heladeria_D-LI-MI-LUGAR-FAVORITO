import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Receipt, MapPin, MessageCircle, Send, Calendar, Clock, Banknote, CreditCard, Smartphone, Check, Truck, IceCream, Paperclip, ImageIcon } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { compressImage } from '../utils/imageCompressor';

function formatDateTime(ts: any) {
  if (!ts) return { date: 'Reciente', time: '—' };
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
  if (m.includes('efectivo') || m.includes('cash')) return <Banknote className="w-4 h-4" />;
  if (m.includes('nequi') || m.includes('daviplata') || m.includes('pse')) return <Smartphone className="w-4 h-4" />;
  return <CreditCard className="w-4 h-4" />;
}

interface MovementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  profile: any;
  chatMessage?: string;
  setChatMessage?: (msg: string) => void;
  onSendMessage?: () => void;
  isSending?: boolean;
  onUpdateStatus?: (id: string, status: string, e?: React.MouseEvent) => void;
  onToggleItemPrepared?: (itemId: string, currentPrepared: boolean) => void;
}

const STATUS_CONFIG: Record<string, any> = {
  pendiente: { label: 'Pendiente de aceptar', color: 'text-amber-500', bg: 'bg-amber-400/10', ring: 'ring-amber-500/20' },
  aceptado:  { label: 'En Preparación',       color: 'text-blue-500',  bg: 'bg-blue-400/10',  ring: 'ring-blue-500/20'  },
  celebrado: { label: 'Listo para entregar',  color: 'text-emerald-500', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20' },
  entregado: { label: 'Entregado',            color: 'text-emerald-600', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20' },
  completed: { label: 'Venta Completada',     color: 'text-emerald-600', bg: 'bg-emerald-400/10', ring: 'ring-emerald-500/20' },
  rechazado: { label: 'Rechazado',            color: 'text-red-500',   bg: 'bg-red-400/10',   ring: 'ring-red-500/20'   },
};

export default function MovementDetailModal({
  isOpen,
  onClose,
  data,
  profile,
  chatMessage = '',
  setChatMessage,
  onSendMessage,
  isSending = false,
  onUpdateStatus,
  onToggleItemPrepared
}: MovementDetailModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  if (!data) return null;

  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';
  const cfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.pendiente;
  const isOnlinePedido = !!data.clienteId;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data?.id || !profile) return;

    setIsUploadingImage(true);
    try {
      // Comprimir la imagen localmente a un string Base64 liviano (máximo 800px, calidad 0.6)
      const base64Image = await compressImage(file, 800, 800, 0.6);

      // Enviar el mensaje con la imagen en base64
      if (setChatMessage && onSendMessage) {
        setChatMessage(`[IMG]${base64Image}`);
        // Pequeño delay para que el estado se actualice
        setTimeout(() => onSendMessage(), 100);
      }
    } catch (err) {
      console.error('Error procesando imagen:', err);
      alert('No se pudo procesar la imagen.');
    } finally {
      setIsUploadingImage(false);
      // Reset el input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
            className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden"
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

            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar flex flex-col gap-4">
               {/* Status & Info */}
               {(() => {
                 const { date, time } = formatDateTime(data.createdAt);
                 return (
                   <div className="grid grid-cols-2 gap-3">
                     {/* Estado */}
                      <div className={cn("rounded-2xl px-4 py-2 flex items-center justify-between ring-1 border shadow-sm col-span-2", cfg.ring, cfg.bg)}>
                        <p className={cn("text-[9px] font-black uppercase tracking-[0.2em]", cfg.color)}>Estado</p>
                        <p className={cn("font-headline font-black text-sm", cfg.color)}>{cfg.label}</p>
                      </div>

                     {/* Origen (Cliente, Mesa o POS) */}
                     {(() => {
                        const cName = data.clienteName || data.userName || data.customerName || data.nombre || data.clientName;
                        const tName = data.tableName || data.mesa;

                        // Detectar si es pedido a domicilio
                        const isDelivery = data.type === 'domicilio' || data.orderType === 'domicilio' || (!!data.address && data.address.trim().length > 0);
                        const isOnline   = data.type === 'online' || data.tableName === 'Pedido Online';

                        let label = 'Venta Directa POS';
                        let sub = 'Atención en mostrador';
                        let icon = <Receipt className="w-3.5 h-3.5 text-secondary/40" />;
                        let colorClass = "text-secondary/40";

                        if (cName) {
                          label = cName;
                          if (isDelivery) {
                            sub = 'Pedido a Domicilio';
                            icon = <Truck className="w-3.5 h-3.5 text-blue-600" />;
                            colorClass = "text-blue-600";
                          } else if (isOnline) {
                            sub = 'Pedido Online';
                            icon = <Smartphone className="w-3.5 h-3.5 text-purple-600" />;
                            colorClass = "text-purple-600";
                          } else if (tName && tName !== 'Pedido Online') {
                            sub = tName;
                            icon = <Check className="w-3.5 h-3.5 text-primary" />;
                            colorClass = "text-primary";
                          } else {
                            sub = 'Venta Directa POS';
                            icon = <Check className="w-3.5 h-3.5 text-primary" />;
                            colorClass = "text-primary";
                          }
                        } else if (tName && tName !== 'Pedido Online') {
                          label = tName;
                          sub = 'Consumo en local';
                          icon = <Check className="w-3.5 h-3.5 text-blue-600" />;
                          colorClass = "text-blue-600";
                        } else if (tName === 'Pedido Online' || isOnline) {
                          label = 'Pedido Online';
                          sub = 'Venta por App/Web';
                          icon = <Smartphone className="w-3.5 h-3.5 text-purple-600" />;
                          colorClass = "text-purple-600";
                        }

                         return (
                           <div className="bg-surface-container/30 rounded-2xl px-4 py-3 flex flex-col gap-2 border border-outline/5 shadow-sm col-span-2">
                             {/* Origen de venta */}
                             <div>
                               <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Origen de Venta</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <div className="w-5 h-5 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                                    {icon}
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                   <span className={cn("font-black text-sm truncate leading-none", colorClass)}>{label}</span>
                                   <span className="text-[8px] text-secondary/50 font-black uppercase tracking-widest mt-0.5">{sub}</span>
                                 </div>
                               </div>
                             </div>
                             {/* Atendido por — en su propia fila para no desbordar */}
                             {(data.sellerName || data.staffName || data.vendorName || data.atendidoPor) && (
                               <div className="border-t border-outline/10 pt-2">
                                 <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Atendido por</p>
                                 <p className="font-bold text-xs text-on-surface mt-0.5">{data.sellerName || data.staffName || data.vendorName || data.atendidoPor}</p>
                               </div>
                             )}
                           </div>
                         );
                      })()}
                     {/* Fecha y hora */}
                     <div className="bg-surface-container/30 rounded-2xl p-3 flex flex-col gap-0.5 border border-outline/5 shadow-sm">
                       <p className="text-[9px] text-secondary font-black uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</p>
                       <p className="font-headline font-bold text-on-surface text-xs">{date}</p>
                       <p className="text-[9px] text-secondary flex items-center gap-1"><Clock className="w-3 h-3" />{time}</p>
                     </div>
                     {/* Método de pago */}
                     <div className="bg-surface-container/30 rounded-2xl p-3 flex flex-col gap-0.5 border border-outline/5 shadow-sm">
                       <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Pago</p>
                       <div className="flex items-center gap-1.5 mt-0.5">
                         <PaymentIcon method={data.paymentMethod} />
                         <p className="font-headline font-bold text-on-surface text-xs capitalize">{data.paymentMethod || 'Efectivo'}</p>
                       </div>
                     </div>
                   </div>
                 );
               })()}

               {/* Nota General */}
               {data.note && (
                 <div className="bg-orange-500/10 rounded-2xl p-4 border border-orange-500/20 shadow-sm mb-4">
                   <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                     Nota General del Pedido
                   </p>
                   <p className="font-medium text-orange-900 text-sm leading-snug">{data.note}</p>
                 </div>
               )}

               <section>
                  <div className="flex items-center justify-between mb-3 ml-1">
                    <h4 className="font-headline font-black text-[10px] uppercase tracking-widest text-secondary/50">Productos ({data.items?.length || 0})</h4>
                    {onToggleItemPrepared && data.items?.length > 0 && (
                      <span className="text-[10px] font-bold text-secondary">
                        {data.items.filter((i: any) => i.prepared).length} / {data.items.length} preparados
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {data.items?.map((item: any, idx: number) => (
                      <div key={item.id || idx} className={cn(
                        "flex justify-between items-center p-2.5 rounded-2xl border transition-colors shadow-sm",
                        item.prepared ? "bg-surface border-success/30 opacity-70" : "bg-white border-outline/10 hover:border-primary/20"
                      )}>
                         <div className="flex items-center gap-3 min-w-0 flex-1">
                            {onToggleItemPrepared && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleItemPrepared(item.id, !!item.prepared);
                                }}
                                className={cn(
                                  "w-6 h-6 rounded-lg border-2 flex flex-shrink-0 items-center justify-center transition-colors",
                                  item.prepared ? "bg-success border-success text-white" : "border-outline/20 bg-surface-container"
                                )}
                              >
                                {item.prepared && <Check className="w-4 h-4" />}
                              </button>
                            )}
                            <div className="relative flex-shrink-0">
                               <div className={cn(
                                 "w-10 h-10 rounded-xl bg-surface-container overflow-hidden flex items-center justify-center border border-outline/5 transition-all",
                                 item.prepared && "grayscale"
                               )}>
                                  {item.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <IceCream className="w-5 h-5 text-secondary/30" />
                                  )}
                               </div>
                               <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-black text-[9px] shadow-sm ring-2 ring-white">
                                  {item.quantity}
                               </div>
                            </div>
                            <div className="flex flex-col min-w-0 pr-2">
                               <span className={cn(
                                 "font-bold text-xs leading-tight transition-all",
                                 item.prepared ? "text-secondary line-through" : "text-on-surface"
                               )}>{item.productName}</span>
                               <div className={cn("flex flex-wrap gap-1 mt-1", item.prepared && "opacity-60")}>
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
                           const isImage = msg.text?.startsWith('[IMG]');
                           const imgUrl = isImage ? msg.text.replace('[IMG]', '') : null;
                           return (
                             <div key={i} className={cn("flex flex-col gap-1 max-w-[85%]", isMe ? "self-end items-end" : "self-start")}>
                                {isImage ? (
                                  <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block">
                                    <img 
                                      src={imgUrl} 
                                      alt="Comprobante de pago" 
                                      className={cn(
                                        "max-w-[220px] rounded-2xl shadow-md border-2 object-cover cursor-zoom-in hover:opacity-90 transition-opacity",
                                        isMe ? "rounded-br-none border-primary/30" : "rounded-bl-none border-outline/20"
                                      )} 
                                    />
                                    <span className="text-[9px] text-secondary/60 font-bold mt-1 flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" /> Toca para ver en grande
                                    </span>
                                  </a>
                                ) : (
                                  <div className={cn("px-4 py-2.5 rounded-2xl text-[11px] font-bold shadow-sm leading-relaxed", 
                                    isMe ? "bg-primary text-white rounded-br-none" : "bg-white text-on-surface border border-outline/10 rounded-bl-none"
                                  )}>
                                     {msg.text}
                                  </div>
                                )}
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

            {/* Botones de acción */}
            {data && (
              (data.status !== 'entregado' && data.status !== 'rechazado' && data.status !== 'completed') ||
              (data.status === 'rechazado' && isStaff)
            ) && (onUpdateStatus || !isStaff) && (
              <div className="p-4 bg-white border-t border-outline/10 flex gap-2 rounded-b-[2.5rem]">

                {/* STAFF: pendiente → Aceptar + Rechazar */}
                {onUpdateStatus && data.status === 'pendiente' && (
                  <>
                    <button
                      onClick={(e) => { onUpdateStatus(data.id, 'aceptado', e); onClose(); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[11px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                    >
                      <Check className="w-4 h-4 stroke-[3]" /> Aceptar
                    </button>
                    <button
                      onClick={(e) => {
                        if (window.confirm('¿Estás seguro de que deseas rechazar este pedido?')) {
                          onUpdateStatus(data.id, 'rechazado', e);
                          onClose();
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-red-50 text-red-500 border border-red-200 text-[11px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    >
                      <X className="w-4 h-4 stroke-[3]" /> Rechazar
                    </button>
                  </>
                )}

                {/* STAFF: rechazado → Revertir Rechazo (Aceptar) */}
                {onUpdateStatus && data.status === 'rechazado' && isStaff && (
                  <button
                    onClick={(e) => {
                      if (window.confirm('¿Deseas revertir el rechazo de este pedido y cambiar su estado a Aceptado (En Preparación)?')) {
                        onUpdateStatus(data.id, 'aceptado', e);
                        onClose();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-amber-600 transition-all active:scale-95 shadow-md shadow-amber-200"
                  >
                    <Check className="w-4 h-4 stroke-[3]" /> Revertir Rechazo (Aceptar)
                  </button>
                )}

                {/* STAFF: aceptado → Pedido Enviado (→ celebrado) */}
                {onUpdateStatus && data.status === 'aceptado' && (
                  <button
                    onClick={(e) => { onUpdateStatus(data.id, 'celebrado', e); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95 shadow-md shadow-blue-200"
                  >
                    <Truck className="w-4 h-4" /> Pedido En Camino
                  </button>
                )}

                {/* STAFF: celebrado → Marcar Entregado */}
                {onUpdateStatus && data.status === 'celebrado' && (
                  <button
                    onClick={(e) => { onUpdateStatus(data.id, 'entregado', e); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 shadow-md shadow-emerald-200"
                  >
                    <Check className="w-4 h-4 stroke-[3]" /> Marcar Entregado
                  </button>
                )}

                {/* CLIENTE: puede confirmar entrega cuando está aceptado o celebrado */}
                {!onUpdateStatus && (data.status === 'aceptado' || data.status === 'celebrado') && (
                  <button
                    onClick={(e) => onClose()}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95",
                      data.status === 'celebrado'
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-200 hover:bg-emerald-600"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                    )}
                  >
                    <Check className="w-4 h-4" /> {data.status === 'celebrado' ? 'Confirmar Recibido' : 'En Preparación...'}
                  </button>
                )}
              </div>
            )}


            {/* Chat footer */}
            {isOnlinePedido && setChatMessage && onSendMessage && (
              <div className="p-4 bg-white border-t border-outline/10 flex items-center gap-2 rounded-b-[2.5rem]">
                 {/* Botón adjuntar imagen */}
                 <input
                   ref={fileInputRef}
                   type="file"
                   accept="image/*"
                   className="hidden"
                   onChange={handleImageUpload}
                 />
                 <button
                   onClick={() => fileInputRef.current?.click()}
                   disabled={isUploadingImage || isSending}
                   title="Adjuntar comprobante de pago"
                   className="w-11 h-11 rounded-2xl bg-surface-container border border-outline/20 flex items-center justify-center text-secondary hover:text-primary hover:border-primary/30 transition-all active:scale-90 disabled:opacity-40 flex-shrink-0"
                 >
                   {isUploadingImage ? (
                     <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <Paperclip className="w-4 h-4" />
                   )}
                 </button>

                 <div className="flex-1 bg-surface-container-lowest border border-outline/20 rounded-2xl flex items-center px-4 py-2 group focus-within:ring-2 ring-primary/20 transition-all">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !chatMessage.startsWith('[IMG]') && onSendMessage()}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-transparent text-xs font-bold py-2 outline-none placeholder:text-secondary/30"
                    />
                 </div>
                 <button 
                   onClick={onSendMessage}
                   disabled={!chatMessage.trim() || isSending || isUploadingImage}
                   className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-all disabled:opacity-30 flex-shrink-0"
                 >
                   <Send className="w-5 h-5" />
                 </button>
              </div>
            )}

            {!isOnlinePedido && (
              <div className="p-6 bg-white border-t border-outline/10 rounded-b-[2.5rem]">
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

  return createPortal(modalContent, document.body);
}

