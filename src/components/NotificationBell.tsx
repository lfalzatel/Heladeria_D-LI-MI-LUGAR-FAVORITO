import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, XCircle, MessageCircle, Send, ChevronRight, Clock, Package } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, orderBy, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { notifyAdmins, notifyUser } from '../lib/notifications';

interface PedidoMessage {
  id: string;
  from: string;
  fromName: string;
  text: string;
  timestamp: any;
}

interface Pedido {
  id: string;
  clienteId: string;
  clienteName: string;
  items: any[];
  total: number;
  paymentMethod: string;
  address: string;
  status: 'pendiente' | 'aceptado' | 'rechazado';
  note?: string;
  createdAt: any;
  messages?: PedidoMessage[];
}

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente',           color: 'text-amber-500',   bg: 'bg-amber-50',   ring: 'ring-amber-200', icon: <Clock className="w-4 h-4" /> },
  aceptado:  { label: 'En Preparación',      color: 'text-blue-500',    bg: 'bg-blue-50',    ring: 'ring-blue-200',  icon: <Package className="w-4 h-4" /> },
  celebrado: { label: 'Listo p/ entregar',   color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-200', icon: <Check className="w-4 h-4" /> },
  entregado: { label: 'Entregado',           color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', icon: <Check className="w-4 h-4" /> },
  cancelado: { label: 'Cancelado',           color: 'text-secondary',   bg: 'bg-surface-container', ring: 'ring-outline/10', icon: <XCircle className="w-4 h-4" /> },
  rechazado: { label: 'Rechazado',           color: 'text-red-500',     bg: 'bg-red-50',     ring: 'ring-red-200',    icon: <XCircle className="w-4 h-4" /> },
};

export default function NotificationBell() {
  const { profile } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const prevCount = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedPedido = pedidos.find(p => p.id === selectedId) || null;

  const isCliente = profile?.role === 'cliente';
  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';

  useEffect(() => {
    if (!profile) return;

    let q;
    if (isCliente) {
      // Client sees their own pedidos
      q = query(
        collection(db, 'pedidos'),
        where('clienteId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
    } else if (isStaff) {
      // Staff sees recent pedidos to allow ongoing chat even if delivered
      q = query(
        collection(db, 'pedidos'),
        where('status', 'in', ['pendiente', 'aceptado', 'celebrado', 'entregado']),
        orderBy('createdAt', 'desc'),
        limit(15)
      );
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
      setPedidos(data);
    }, (err) => {
      console.error('Notification bell listener error:', err);
    });

    return unsubscribe;
  }, [profile?.uid, isCliente, isStaff]);

  const unreadCount = isCliente
    ? pedidos.filter(p => p.status !== 'pendiente').length
    : pedidos.filter(p => {
        // Contar como "no leído" si es pendiente O si el último mensaje no es del staff
        const lastMsg = p.messages?.[p.messages.length - 1];
        const hasNewMsg = lastMsg && lastMsg.from !== profile?.uid;
        return p.status === 'pendiente' || hasNewMsg;
      }).length;

  // Manejar visibilidad del badge (solo si aumenta el número)
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setShowBadge(true);
    }
    if (unreadCount === 0) {
      setShowBadge(false);
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleUpdateStatus = async (pedidoId: string, newStatus: string) => {
    try {
      // 1. Update status
      await updateDoc(doc(db, 'pedidos', pedidoId), { status: newStatus });
      
      // 2. If delivered, record as SALE
      if (newStatus === 'entregado' && profile) {
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (pedido) {
          const now = new Date();
          const saleData = {
            items: pedido.items,
            total: pedido.total,
            sellerId: profile.uid,
            sellerName: profile.name,
            soldBy: profile.uid, // Requerido por reglas de seguridad
            tableName: 'Pedido Online',
            status: 'completed',
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
            paymentMethod: pedido.paymentMethod || 'Efectivo',
            date: now.toISOString().split('T')[0],
            hour: now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
            pedidoId: pedido.id,
            type: 'online'
          };
          
          await addDoc(collection(db, 'sales'), saleData);
          
          // Update product sales stats
          const updatePromises = pedido.items.map(item => 
            updateDoc(doc(db, 'products', item.productId), {
              salesCount: increment(item.quantity)
            })
          );
          await Promise.all(updatePromises);
        }
      }

      const labels: Record<string, string> = {
        aceptado: 'Pedido en preparación ✓',
        celebrado: '¡Pedido enviado! 🚀',
        entregado: 'Venta completada ✓',
        rechazado: 'Pedido rechazado',
      };
      toast.success(labels[newStatus] || 'Estado actualizado');

      // Notificar al cliente sobre el cambio de estado
      const statusMessages: Record<string, string> = {
        aceptado: 'Tu pedido ha sido aceptado y está en preparación 🍦',
        celebrado: '¡Tu pedido va en camino! 🚀',
        entregado: '¡Tu pedido ha sido entregado! Disfrútalo ✓',
        rechazado: 'Lo sentimos, tu pedido ha sido rechazado.'
      };

      const pedido = pedidos.find(p => p.id === pedidoId);
      if (statusMessages[newStatus] && pedido?.clienteId) {
        await notifyUser(
          pedido.clienteId,
          `Pedido ${newStatus.toUpperCase()}`,
          statusMessages[newStatus],
          { type: 'order_status', pedidoId, status: newStatus }
        );
      }

      if (newStatus === 'entregado' || newStatus === 'rechazado') setSelectedId(null);
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error('Error al actualizar el pedido');
    }
  };

  const handleSendMessage = async () => {
    const messageText = chatMessage.trim();
    if (!messageText || !selectedPedido || !profile) return;
    setSending(true);
    try {
      const messages = selectedPedido.messages || [];
      const newMsg = {
        id: Math.random().toString(36).substr(2, 9),
        from: profile.uid,
        fromName: profile.name,
        text: messageText,
        timestamp: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'pedidos', selectedPedido.id), {
        messages: [...messages, newMsg]
      });
      setChatMessage('');

      // Notificar según quién escribe
      if (isStaff) {
        await notifyUser(
          selectedPedido.clienteId,
          "💬 Nuevo mensaje de la Boutique",
          `Sobre tu pedido #${selectedPedido.id.slice(-6).toUpperCase()}: "${messageText}"`,
          { type: 'chat_message', pedidoId: selectedPedido.id }
        );
      } else {
        await notifyAdmins(
          `💬 Mensaje de ${profile.name}`,
          `Pedido #${selectedPedido.id.slice(-6).toUpperCase()}: "${messageText}"`,
          { 
            type: 'chat_message',
            pedidoId: selectedPedido.id,
            fromName: profile.name
          }
        );
      }
    } catch (err) {
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => {
          if (!isOpen) setShowBadge(false);
          setIsOpen(!isOpen);
        }}
        className={cn(
          "relative w-10 h-10 flex items-center justify-center rounded-full transition-all",
          isOpen ? "bg-primary text-white" : "bg-surface-container text-secondary hover:bg-primary/10 hover:text-primary"
        )}
      >
        <motion.div
          animate={showBadge ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
        >
          <Bell className="w-5 h-5" />
        </motion.div>
        
        {unreadCount > 0 && showBadge && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ 
              scale: [1, 1.2, 1],
              boxShadow: ["0 0 0 0px rgba(239, 68, 68, 0.4)", "0 0 0 8px rgba(239, 68, 68, 0)", "0 0 0 0px rgba(239, 68, 68, 0)"]
            }}
            transition={{ 
              scale: { duration: 0.3 },
              boxShadow: { repeat: Infinity, duration: 1.5 }
            }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white z-10"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[400px] bg-white rounded-[2.5rem] shadow-2xl border border-outline/30 overflow-hidden z-50"
          >
            {/* Mobile Overlay for better focus */}
            <div className="sm:hidden fixed inset-0 bg-black/20 backdrop-blur-sm -z-10" onClick={() => setIsOpen(false)} />
            {/* Header */}
            <div className="px-6 py-5 border-b border-outline/20 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
              <div>
                <h3 className="font-headline font-bold text-on-surface text-base">Notificaciones</h3>
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-0.5">
                  {isCliente ? 'Estado de tus pedidos' : 'Pedidos pendientes'}
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                  {unreadCount} {isCliente ? 'nueva(s)' : 'pendiente(s)'}
                </span>
              )}
            </div>

            {/* Detail view: order + chat */}
            {selectedPedido ? (
              <div className="flex flex-col max-h-[70vh]">
                {/* Back */}
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex items-center gap-2 px-6 py-3 text-xs font-bold text-secondary hover:text-primary transition-colors border-b border-outline/10"
                >
                  ← Volver a notificaciones
                </button>

                {/* Order info */}
                <div className="px-6 py-4 border-b border-outline/10 bg-surface-container-lowest/50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Pedido</p>
                      <h4 className="font-black text-on-surface text-lg">#{selectedPedido.id.slice(-6).toUpperCase()}</h4>
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ring-1",
                      STATUS_CONFIG[selectedPedido.status].color,
                      STATUS_CONFIG[selectedPedido.status].bg,
                      STATUS_CONFIG[selectedPedido.status].ring
                    )}>
                      {STATUS_CONFIG[selectedPedido.status].icon}
                      {STATUS_CONFIG[selectedPedido.status].label}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatCurrency(selectedPedido.total)}</p>
                  <p className="text-xs text-secondary mt-1 truncate">📍 {selectedPedido.address}</p>

                  {/* Acciones rápidas según el estado */}
                  <div className="flex gap-2 mt-3">
                    {isStaff && selectedPedido.status === 'pendiente' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(selectedPedido.id, 'aceptado')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-success/10 text-success border border-success/20 text-xs font-bold hover:bg-success hover:text-white transition-all"
                        >
                          <Check className="w-3.5 h-3.5" /> Aceptar
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedPedido.id, 'rechazado')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 text-red-500 border border-red-200 text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rechazar
                        </button>
                      </>
                    )}

                    {/* Botón Pedido Enviado: Solo para Staff cuando está aceptado */}
                    {isStaff && selectedPedido.status === 'aceptado' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedPedido.id, 'celebrado')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-200 text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-all"
                      >
                        <Truck className="w-4 h-4" /> Pedido Enviado
                      </button>
                    )}

                    {/* Botón Marcar como Entregado: 
                        - Para el Cliente: Visible desde que se acepta (aceptado) o envía (celebrado).
                        - Para el Staff: Visible principalmente cuando ya se envió (celebrado). 
                    */}
                    {(selectedPedido.status === 'celebrado' || (!isStaff && selectedPedido.status === 'aceptado')) && (
                      <button
                        onClick={() => handleUpdateStatus(selectedPedido.id, 'entregado')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                          selectedPedido.status === 'celebrado' 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                        )}
                      >
                        <Check className="w-4 h-4" /> Marcar como Entregado
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat */}
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 max-h-[220px] min-h-[120px]">
                  {(selectedPedido.messages || []).length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8 opacity-30">
                      <p className="text-xs font-bold text-secondary">Sin mensajes aún</p>
                    </div>
                  ) : (
                    (selectedPedido.messages || []).map((msg, i) => {
                      const isMe = msg.from === profile?.uid;
                      return (
                        <div key={i} className={cn("flex flex-col gap-0.5 max-w-[80%]", isMe ? "self-end items-end" : "self-start")}>
                          <span className="text-[9px] font-bold text-secondary px-1">{msg.fromName}</span>
                          <div className={cn("px-3 py-2 rounded-2xl text-xs font-medium",
                            isMe ? "bg-primary text-white rounded-br-sm" : "bg-surface-container text-on-surface rounded-bl-sm"
                          )}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input */}
                <div className="px-4 py-3 border-t border-outline/10 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-surface-container rounded-full px-4 py-2.5 text-xs font-medium outline-none border border-outline/20 focus:border-primary transition-all"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || sending}
                    className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:scale-110 transition-all shadow-md shadow-primary/30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* List view */
              <div className="max-h-[60vh] overflow-y-auto">
                {pedidos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 opacity-30">
                    <Bell className="w-10 h-10 mb-3" />
                    <p className="text-sm font-bold">Sin notificaciones</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-outline/10">
                    {pedidos.map(pedido => {
                      const config = STATUS_CONFIG[pedido.status];
                      const lastMsg = pedido.messages?.[pedido.messages.length - 1];
                      const isUnreadChat = lastMsg && lastMsg.from !== profile?.uid;

                      return (
                        <button
                          key={pedido.id}
                          onClick={() => setSelectedId(pedido.id)}
                          className={cn(
                            "w-full px-5 py-4 text-left hover:bg-surface-container/50 transition-colors flex items-center gap-4 group relative",
                            isUnreadChat && "bg-primary/5"
                          )}
                        >
                          {isUnreadChat && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                          )}
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ring-1", config.bg, config.ring, config.color)}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-xs font-black text-on-surface flex items-center gap-2">
                                {isStaff ? pedido.clienteName : 'Tu pedido'} #{pedido.id.slice(-6).toUpperCase()}
                                {isUnreadChat && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                              </p>
                              <span className="text-[10px] font-bold text-primary">{formatCurrency(pedido.total)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</p>
                              <p className="text-[9px] text-secondary/50 font-medium">{formatTime(pedido.createdAt)}</p>
                            </div>
                            
                            {/* Vista previa de mensaje estilo WhatsApp */}
                            {lastMsg && (
                              <div className="mt-1.5 flex items-start gap-1.5 bg-surface-container/30 p-2 rounded-lg border border-outline/5">
                                <MessageCircle className={cn("w-3 h-3 mt-0.5 flex-shrink-0", isUnreadChat ? "text-primary" : "text-secondary/40")} />
                                <p className={cn(
                                  "text-[10px] leading-relaxed line-clamp-2 flex-1",
                                  isUnreadChat ? "text-on-surface font-bold" : "text-secondary/70 font-medium"
                                )}>
                                  <span className="opacity-60">{lastMsg.fromName}:</span> {lastMsg.text}
                                </p>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-secondary/30 group-hover:text-primary transition-colors flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
