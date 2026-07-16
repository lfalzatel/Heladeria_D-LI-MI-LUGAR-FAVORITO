import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Check, XCircle, MessageCircle, ChevronRight, Clock, Package } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, addDoc, serverTimestamp, orderBy, increment, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { notifyAdmins, notifyUser, playNotificationSound } from '../lib/notifications';
import { deductInventory } from '../utils/inventory';
import MovementDetailModal from './MovementDetailModal';

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
  phone?: string;
  status: 'pendiente' | 'aceptado' | 'celebrado' | 'entregado' | 'cancelado' | 'rechazado';
  note?: string;
  createdAt: any;
  updatedAt: any;
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
  const isInitialLoad = useRef(true);
  const prevPedidos = useRef<Pedido[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedPedido = pedidos.find(p => p.id === selectedId) || null;
  // El modal se abre cuando hay un pedido seleccionado (independiente del panel)
  const isDetailOpen = !!selectedPedido;

  const [seenMap, setSeenMap] = useState<Record<string, { status: string, messagesCount: number }>>({});

  // Cargar visto al montar e isOpen
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dli_seen_pedidos');
      if (stored) {
        setSeenMap(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  // Marcar pedido seleccionado como visto
  useEffect(() => {
    if (selectedPedido) {
      try {
        const stored = localStorage.getItem('dli_seen_pedidos');
        const seen = stored ? JSON.parse(stored) : {};
        
        seen[selectedPedido.id] = {
          status: selectedPedido.status,
          messagesCount: selectedPedido.messages?.length || 0
        };
        
        localStorage.setItem('dli_seen_pedidos', JSON.stringify(seen));
        setSeenMap(seen);
      } catch (e) {
        console.error(e);
      }
    }
  }, [selectedId, selectedPedido?.status, selectedPedido?.messages?.length]);

  const isCliente = profile?.role === 'cliente';
  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';

  const triggerAlert = (title: string, body: string) => {
    // 1. Toast
    toast.info(title, {
      description: body,
      duration: 5000,
    });

    // 2. Vibración
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // 3. Sonido
    playNotificationSound();
  };

  useEffect(() => {
    if (!profile) return;

    let q;
    if (isCliente) {
      q = query(
        collection(db, 'pedidos'),
        where('clienteId', '==', profile.uid),
        orderBy('updatedAt', 'desc')
      );
    } else if (isStaff) {
      q = query(
        collection(db, 'pedidos'),
        orderBy('updatedAt', 'desc'),
        limit(40)
      );
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
      
      // Detección de cambios para alertas inmediatas
      if (!isInitialLoad.current) {
        // 1. Detectar nuevos pedidos (solo para Staff)
        if (isStaff) {
          const newOrders = data.filter(p => !prevPedidos.current.find(old => old.id === p.id));
          if (newOrders.length > 0) {
            triggerAlert('🛒 ¡Nuevo Pedido!', `Has recibido ${newOrders.length} pedido(s) nuevo(s)`);
          }
        }

        // 2. Detectar nuevos mensajes en pedidos existentes
        data.forEach(p => {
          const oldP = prevPedidos.current.find(old => old.id === p.id);
          if (oldP) {
            const newCount = p.messages?.length || 0;
            const oldCount = oldP.messages?.length || 0;
            if (newCount > oldCount) {
              const lastMsg = p.messages![newCount - 1];
              // Alertar solo si el mensaje NO es mío
              if (lastMsg.from !== profile.uid) {
                triggerAlert(`💬 ${lastMsg.fromName}`, lastMsg.text);
              }
            }
          }
        });
      }

      isInitialLoad.current = false;
      setPedidos(data);
      prevPedidos.current = data;
    }, (err) => {
      console.error('Notification bell listener error:', err);
    });

    return unsubscribe;
  }, [profile?.uid, isCliente, isStaff]);

  const unreadCount = pedidos.filter(p => {
    const lastMsg = p.messages?.[p.messages.length - 1];
    const hasNewMsg = lastMsg && lastMsg.from !== profile?.uid;
    
    // Si está seleccionado y actualmente abierto, no lo contamos como no leído
    if (selectedId === p.id) return false;

    const seen = seenMap[p.id];

    if (isStaff) {
      if (!seen) {
        // Pedidos pendientes totalmente nuevos
        return p.status === 'pendiente';
      }
      // Si ya lo vio antes, solo es unread si volvió a pendiente o hay mensajes nuevos
      const isPendienteNuevo = p.status === 'pendiente' && seen.status !== 'pendiente';
      const newMessagesCount = p.messages?.length || 0;
      const hasNewMessages = newMessagesCount > seen.messagesCount && hasNewMsg;
      return isPendienteNuevo || hasNewMessages;
    } else {
      // Cliente
      if (!seen) {
        // El cliente solo lo ve si ya no es pendiente
        return p.status !== 'pendiente';
      }
      const statusChanged = p.status !== seen.status;
      const newMessagesCount = p.messages?.length || 0;
      const hasNewMessages = newMessagesCount > seen.messagesCount && hasNewMsg;
      return statusChanged || hasNewMessages;
    }
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

  const handleUpdateStatus = async (pedidoId: string, newStatus: string, _e?: React.MouseEvent) => {
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
          
          const saleDocRef = await addDoc(collection(db, 'sales'), saleData);
          
          // Fetch client email to send the receipt
          let clientEmail = '';
          try {
            const userSnap = await getDoc(doc(db, 'users', pedido.clienteId));
            if (userSnap.exists()) {
              clientEmail = userSnap.data().email || '';
            }
          } catch (e) {
            console.error('Error fetching client email for receipt:', e);
          }

          if (clientEmail) {
            const completedSale = {
              id: saleDocRef.id,
              items: pedido.items,
              total: pedido.total,
              paymentMethod: pedido.paymentMethod || 'Efectivo',
              tableName: 'Pedido Online',
              clienteName: pedido.clienteName,
              date: saleData.date,
              hour: saleData.hour
            };

            // Trigger the serverless API endpoint in the background
            fetch('/api/send-receipt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: clientEmail, sale: completedSale })
            }).then(async (res) => {
              const resData = await res.json();
              if (res.ok) {
                if (resData.simulated) {
                  console.log('Recibo de correo enviado (simulado)');
                } else {
                  console.log('Recibo de correo enviado exitosamente');
                }
              }
            }).catch(err => console.error('Error sending receipt:', err));
          }

          // Update product sales stats
          const updatePromises = pedido.items.map(item => 
            updateDoc(doc(db, 'products', item.productId), {
              salesCount: increment(item.quantity)
            })
          );
          await Promise.all(updatePromises);
          
          // Deduct inventory
          await deductInventory(pedido.items);
        }
      }

      const labels: Record<string, string> = {
        aceptado: 'Pedido en preparación ✓',
        celebrado: '¡Pedido enviado! 🚀',
        entregado: 'Venta completada ✓',
        rechazado: 'Pedido rechazado',
      };
      toast.success(labels[newStatus] || 'Estado actualizado');

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

  // Función para manejar toggle de ítem preparado (reusada del modal)
  const handleToggleItemPrepared = async (itemId: string, currentPrepared: boolean) => {
    if (!selectedPedido) return;
    const updatedItems = (selectedPedido.items || []).map((it: any) =>
      it.id === itemId ? { ...it, prepared: !currentPrepared } : it
    );
    await updateDoc(doc(db, 'pedidos', selectedPedido.id), { items: updatedItems });
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
        messages: [...messages, newMsg],
        updatedAt: serverTimestamp()
      });
      setChatMessage('');

      // Notificar según quién escribe
      if (isStaff) {
        await notifyUser(
          selectedPedido.clienteId,
          "💬 Nuevo mensaje de la Heladería",
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

      {/* Backdrop — se monta fuera del header via portal, queda bajo el header (z-[50] < z-[60]) */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="bell-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-on-surface/40 backdrop-blur-[6px] z-[50]"
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Panel — solo la lista */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[400px] bg-white dark:bg-surface-container rounded-[2.5rem] shadow-2xl border border-outline/30 overflow-hidden z-[200]"
          >

            {/* Header */}
            <div className="px-6 py-5 border-b border-outline/20 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
              <div>
                <h3 className="font-headline font-bold text-on-surface text-base">Notificaciones</h3>
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-0.5">
                  {isCliente ? 'Estado de tus pedidos' : 'Gestión de pedidos'}
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                  {unreadCount} {isCliente ? 'nueva(s)' : 'pendiente(s)'}
                </span>
              )}
            </div>

            {/* Lista de pedidos */}
            <div className="max-h-[70vh] overflow-y-auto">
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
                        onClick={() => {
                          setSelectedId(pedido.id);
                          setIsOpen(false); // cierra el panel, el modal lo muestra
                        }}
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
                          {lastMsg && (
                            <div className="mt-1.5 flex items-start gap-1.5 bg-surface-container/30 p-2 rounded-lg border border-outline/5">
                              <MessageCircle className={cn("w-3 h-3 mt-0.5 flex-shrink-0", isUnreadChat ? "text-primary" : "text-secondary/40")} />
                              <p className={cn(
                                "text-[10px] leading-relaxed line-clamp-2 flex-1",
                                isUnreadChat ? "text-on-surface font-bold" : "text-secondary/70 font-medium"
                              )}>
                                <span className="opacity-60">{lastMsg.fromName}:</span>{' '}
                                {lastMsg.text?.startsWith('[IMG]') ? '📷 Comprobante de pago' : lastMsg.text}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de detalle unificado — fuera del panel de la campana */}
      <MovementDetailModal
        isOpen={isDetailOpen}
        onClose={() => setSelectedId(null)}
        data={selectedPedido}
        profile={profile}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
        onSendMessage={handleSendMessage}
        isSending={sending}
        onUpdateStatus={isStaff ? handleUpdateStatus : undefined}
        onToggleItemPrepared={isStaff ? handleToggleItemPrepared : undefined}
      />
    </div>
  );
}

