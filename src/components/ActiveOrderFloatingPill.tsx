import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';
import { IceCream, Truck, Clock, ChevronRight, Bell } from 'lucide-react';
import MovementDetailModal from './MovementDetailModal';
import { useNavigate } from 'react-router-dom';

interface Pedido {
  id: string;
  clienteId: string;
  clienteName: string;
  items: any[];
  total: number;
  status: 'pendiente' | 'aceptado' | 'celebrado' | 'entregado' | 'rechazado' | 'cancelado';
  createdAt: any;
  paymentMethod: string;
  messages?: any[];
}

export default function ActiveOrderFloatingPill() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [activeClientPedido, setActiveClientPedido] = useState<Pedido | null>(null);
  const [pendingStaffCount, setPendingStaffCount] = useState<number>(0);
  const [selectedPedidoModal, setSelectedPedidoModal] = useState<Pedido | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';

  // Listener para Clientes: Obtener su pedido activo más reciente
  useEffect(() => {
    if (!profile?.uid || isStaff) {
      setActiveClientPedido(null);
      return;
    }

    const q = query(
      collection(db, 'pedidos'),
      where('clienteId', '==', profile.uid),
      where('status', 'in', ['pendiente', 'aceptado', 'celebrado'])
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setActiveClientPedido(null);
      } else {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
        // Sort by newest
        docs.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tB - tA;
        });
        setActiveClientPedido(docs[0]);
      }
    }, (err) => {
      console.warn('Error escuchando pedido activo del cliente:', err);
    });

    return unsub;
  }, [profile?.uid, isStaff]);

  // Listener para Staff: Conteo de pedidos online pendientes de aceptar
  useEffect(() => {
    if (!isStaff) {
      setPendingStaffCount(0);
      return;
    }

    const q = query(
      collection(db, 'pedidos'),
      where('status', '==', 'pendiente')
    );

    const unsub = onSnapshot(q, (snap) => {
      setPendingStaffCount(snap.size);
    }, (err) => {
      console.warn('Error escuchando pedidos pendientes staff:', err);
    });

    return unsub;
  }, [isStaff]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedPedidoModal || !profile) return;
    setIsSending(true);
    try {
      const { doc, updateDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore');
      const newMsg = {
        from: profile.uid,
        fromName: profile.name,
        text: chatMessage.trim(),
        timestamp: Date.now(),
      };
      await updateDoc(doc(db, 'pedidos', selectedPedidoModal.id), {
        messages: arrayUnion(newMsg),
        updatedAt: serverTimestamp(),
      });
      setSelectedPedidoModal((prev: any) => prev ? ({
        ...prev,
        messages: [...(prev.messages || []), newMsg]
      }) : null);
      setChatMessage('');
    } catch (e) {
      console.error('Error enviando mensaje chat desde píldora:', e);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pendiente':
        return {
          icon: <Clock className="w-4 h-4 text-amber-500 animate-spin" />,
          text: 'Pendiente de Aceptar',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
          dot: 'bg-amber-500',
        };
      case 'aceptado':
        return {
          icon: <IceCream className="w-4 h-4 text-blue-500 animate-bounce" />,
          text: 'En Preparación 🍦',
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-700',
          dot: 'bg-blue-500',
        };
      case 'celebrado':
        return {
          icon: <Truck className="w-4 h-4 text-emerald-500 animate-pulse" />,
          text: '¡En Camino a Tu Dirección! 🚀',
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
          dot: 'bg-emerald-500',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-secondary" />,
          text: status,
          bg: 'bg-surface-container border-outline/10 text-secondary',
          dot: 'bg-secondary',
        };
    }
  };

  return (
    <>
      <AnimatePresence>
        {/* Render para Clientes con Pedido Activo */}
        {!isStaff && activeClientPedido && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="sticky top-14 sm:top-16 z-[55] w-full px-3 sm:px-6 pt-2 pb-1 bg-white/80 backdrop-blur-md border-b border-primary/10"
          >
            {(() => {
              const cfg = getStatusDisplay(activeClientPedido.status);
              return (
                <div
                  onClick={() => setSelectedPedidoModal(activeClientPedido)}
                  className={`max-w-4xl mx-auto flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl border ${cfg.bg} shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      {cfg.icon}
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${cfg.dot} animate-ping`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider font-headline">
                          Pedido #{activeClientPedido.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest hidden sm:inline">
                          • {cfg.text}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium opacity-90 truncate">
                        <span className="sm:hidden font-bold">{cfg.text} • </span>
                        {activeClientPedido.items?.length || 1} producto(s) · Toca para ver chat o detalles 💬
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="px-2.5 py-1 rounded-xl bg-white/80 font-black text-[10px] uppercase tracking-wider text-primary shadow-xs group-hover:scale-105 transition-transform flex items-center gap-1">
                      Ver Estado <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Render para Staff cuando hay pedidos pendientes */}
        {isStaff && pendingStaffCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="sticky top-14 sm:top-16 z-[55] w-full px-3 sm:px-6 pt-2 pb-1 bg-white/80 backdrop-blur-md border-b border-amber-500/20"
          >
            <div
              onClick={() => navigate('/cliente/pedidos')}
              className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl border bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border-amber-500/30 text-amber-900 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 animate-bounce">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider font-headline text-amber-900">
                    ¡{pendingStaffCount} Nuevo{pendingStaffCount > 1 ? 's' : ''} Pedido{pendingStaffCount > 1 ? 's' : ''} Online!
                  </span>
                  <p className="text-[10px] text-amber-800 font-medium truncate">
                    Pendientes de aceptar. Toca aquí para ir a la gestión de pedidos ⚡
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider shadow-xs group-hover:scale-105 transition-transform flex items-center gap-1">
                Atender <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalle/Chat al hacer clic en la píldora del cliente */}
      {selectedPedidoModal && (
        <MovementDetailModal
          isOpen={!!selectedPedidoModal}
          onClose={() => setSelectedPedidoModal(null)}
          data={selectedPedidoModal}
          profile={profile}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          autoFocusChat={true}
        />
      )}
    </>
  );
}
