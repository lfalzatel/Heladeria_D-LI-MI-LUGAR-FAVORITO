import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Receipt, MapPin, MessageCircle, Send, Calendar, Clock, Banknote, CreditCard, Smartphone, Check, Truck, IceCream, Paperclip, ImageIcon, Edit3, Trash2, AlertTriangle, ShoppingBag, Plus, Minus, Save, ArrowLeftRight } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useTableCartStore } from '../stores/useTableCartStore';
import { compressImage } from '../utils/imageCompressor';
import { doc, updateDoc, deleteDoc, increment, deleteField, collection, query, where, getDocs, setDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { restoreInventory } from '../utils/inventory';
import { toast } from 'sonner';

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
  if (m.includes('credito') || m.includes('debe')) return <Clock className="w-4 h-4 text-orange-500" />;
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
  onToggleItemPrepared,
  triggerAbonoOpen = false
}: MovementDetailModalProps & { triggerAbonoOpen?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'edit' | 'delete' | null>(null);

  const [isEditingPackaging, setIsEditingPackaging] = useState(false);
  const [packagingSearch, setPackagingSearch] = useState('');
  const [allPackaging, setAllPackaging] = useState<any[]>([]);
  const [editingPackagingData, setEditingPackagingData] = useState<any[]>([]);
  const [isSavingPackaging, setIsSavingPackaging] = useState(false);

  // Abonos state
  const [showAbonoForm, setShowAbonoForm] = useState(false);
  const [abonoMonto, setAbonoMonto] = useState('');
  const [abonoMetodo, setAbonoMetodo] = useState<'Efectivo' | 'Transferencia' | 'Mixto'>('Efectivo');
  const [splitAbono, setSplitAbono] = useState({ efectivo: '', transferencia: '' });
  const [isSavingAbono, setIsSavingAbono] = useState(false);

  React.useEffect(() => {
    if (triggerAbonoOpen && data) {
      const pending = data.total - (data.totalAbonado || 0);
      setAbonoMonto(pending.toString());
      setAbonoMetodo('Efectivo');
      setShowAbonoForm(true);
    } else {
      setShowAbonoForm(false);
    }
  }, [triggerAbonoOpen, data]);

  // Load packaging supply names when modal opens (for name resolution in the list)
  React.useEffect(() => {
    if (!data || !data.packagingSupplies?.length) return;
    // Only fetch if any supply is missing its name
    const needsLookup = data.packagingSupplies.some((p: any) => !p.name);
    if (!needsLookup && allPackaging.length > 0) return;
    const fetchPackaging = async () => {
      try {
        const q = query(collection(db, 'supplies'), where('category', '==', 'Desechables'));
        const snap = await getDocs(q);
        const packs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((s: any) => s.status !== 'inactivo');
        setAllPackaging(packs.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error('Error loading packaging names:', e);
      }
    };
    fetchPackaging();
  }, [data?.id]);

  const handleSaveAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const amount = Number(abonoMonto) || 0;
    const pending = data.total - (data.totalAbonado || 0);
    
    if (amount <= 0) {
      toast.error('El monto del abono debe ser mayor a cero');
      return;
    }
    if (amount > pending) {
      toast.error(`El abono no puede superar el saldo pendiente ($${pending.toLocaleString('es-CO')})`);
      return;
    }

    setIsSavingAbono(true);
    try {
      const newAbonado = (data.totalAbonado || 0) + amount;

      // Build payment info
      let paymentMethodSaved: string = abonoMetodo;
      let splitDetails: { efectivo: number; transferencia: number } | null = null;
      if (abonoMetodo === 'Mixto') {
        const ef = Number(splitAbono.efectivo) || 0;
        const tr = Number(splitAbono.transferencia) || 0;
        if (ef + tr !== amount) {
          toast.error(`La suma de Efectivo y Transferencia debe ser igual al monto ($${amount.toLocaleString('es-CO')})`);
          setIsSavingAbono(false);
          return;
        }
        paymentMethodSaved = 'Mixto';
        splitDetails = { efectivo: ef, transferencia: tr };
      }
      
      // Save abono document
      await addDoc(collection(db, 'abonos'), {
        clienteId: data.clienteId,
        clienteName: data.clienteName || data.userName || data.customerName || 'Cliente',
        pedidoId: data.id,
        monto: amount,
        paymentMethod: paymentMethodSaved,
        isMixto: abonoMetodo === 'Mixto',
        splitDetails,
        createdAt: serverTimestamp(),
        date: new Date().toISOString().split('T')[0],
        hour: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
      });

      // Update original sale or pedido
      const colName = data.isDirectPedido ? 'pedidos' : 'sales';
      await updateDoc(doc(db, colName, data.id), {
        totalAbonado: newAbonado
      });

      // Update local state directly so the UI responds immediately
      data.totalAbonado = newAbonado;

      toast.success('¡Abono registrado con éxito! ✓');
      setShowAbonoForm(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al registrar abono: ' + err.message);
    } finally {
      setIsSavingAbono(false);
    }
  };

  const handleStartEditingPackaging = async () => {
    setIsEditingPackaging(true);
    setPackagingSearch('');
    setEditingPackagingData(data.packagingSupplies || []);
    try {
      const q = query(collection(db, 'supplies'), where('category', '==', 'Desechables'));
      const snap = await getDocs(q);
      const packs = snap.docs.map(d => ({id: d.id, ...d.data()})).filter((s: any) => s.status !== 'inactivo');
      setAllPackaging(packs.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      toast.error('Error cargando empaques');
    }
  };

  const handleUpdatePackagingQuantity = (supplyId: string, delta: number) => {
    setEditingPackagingData(prev => {
      const existing = prev.find(p => p.supplyId === supplyId);
      const supply = allPackaging.find(p => p.id === supplyId);
      if (!supply) return prev;
      
      const currentQty = existing ? existing.quantity : 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (newQty === 0) {
        return prev.filter(p => p.supplyId !== supplyId);
      }
      
      if (existing) {
        return prev.map(p => p.supplyId === supplyId ? { ...p, quantity: newQty } : p);
      } else {
        return [...prev, { supplyId, name: supply.name, unitPrice: supply.lastPurchasePrice || 0, quantity: newQty }];
      }
    });
  };

  const handleSavePackaging = async () => {
    if (!data.id) return;
    setIsSavingPackaging(true);
    try {
      const oldPacks = data.packagingSupplies || [];
      const newPacks = editingPackagingData;
      
      const diffs: Record<string, number> = {}; 
      oldPacks.forEach((o: any) => {
        diffs[o.supplyId] = (diffs[o.supplyId] || 0) - o.quantity;
      });
      newPacks.forEach(n => {
        diffs[n.supplyId] = (diffs[n.supplyId] || 0) + n.quantity;
      });

      const batchPromises: Promise<void>[] = [];
      Object.entries(diffs).forEach(([supplyId, delta]) => {
        if (delta !== 0) {
          batchPromises.push(
            updateDoc(doc(db, 'supplies', supplyId), {
              stock: increment(-delta)
            })
          );
        }
      });
      await Promise.all(batchPromises);

      const isPedido = data.isDirectPedido || (data.type === 'online' && data.status !== 'entregado');
      const collectionName = isPedido ? 'pedidos' : 'sales';
      await updateDoc(doc(db, collectionName, data.id), {
        packagingSupplies: newPacks
      });
      
      toast.success('Empaques actualizados y stock ajustado');
      data.packagingSupplies = newPacks; // update local for UI
      setIsEditingPackaging(false);
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar empaques');
    } finally {
      setIsSavingPackaging(false);
    }
  };

  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editEfectivo, setEditEfectivo] = useState(0);

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateTimeStr, setEditDateTimeStr] = useState('');
  const [isSavingDate, setIsSavingDate] = useState(false);

  const handleStartEditingDate = () => {
    setIsEditingDate(true);
    if (data?.createdAt) {
      const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setEditDateTimeStr(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEditDateTimeStr(new Date().toISOString().slice(0, 16));
    }
  };

  const handleSaveDate = async () => {
    if (!editDateTimeStr || !data?.id) return;
    setIsSavingDate(true);
    try {
      const newDateObj = new Date(editDateTimeStr);
      if (isNaN(newDateObj.getTime())) {
        toast.error('Fecha u hora inválida');
        setIsSavingDate(false);
        return;
      }
      const isPedido = data.isDirectPedido || (data.type === 'online' && data.status !== 'entregado');
      const collectionName = isPedido ? 'pedidos' : 'sales';

      const dateIsoStr = editDateTimeStr.split('T')[0];
      const hourStr = newDateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
      const timestampVal = Timestamp.fromDate(newDateObj);

      await updateDoc(doc(db, collectionName, data.id), {
        createdAt: timestampVal,
        timestamp: timestampVal,
        date: dateIsoStr,
        hour: hourStr,
      });

      data.createdAt = timestampVal;
      data.date = dateIsoStr;
      data.hour = hourStr;

      toast.success('¡Fecha y hora de la venta actualizadas!');
      setIsEditingDate(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al guardar fecha: ' + err.message);
    } finally {
      setIsSavingDate(false);
    }
  };

  if (!data) return null;

  const isStaff = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor';
  const isPedido = data.isDirectPedido || (data.type === 'online' && data.status !== 'entregado');
  const isSale = !isPedido;
  const cfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.pendiente;
  const isOnlinePedido = !!data.clienteId;
  const isToday = data?.createdAt && new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toDateString() === new Date().toDateString();
  const canEditPayment = profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'administrador';

  const handleSavePayment = async () => {
    try {
      const isPedido = data.isDirectPedido || (data.type === 'online' && data.status !== 'entregado');
      const collectionName = isPedido ? 'pedidos' : 'sales';
      
      const isMixto = editPaymentMethod === 'Mixto';
      
      const updateData: any = {
        paymentMethod: editPaymentMethod,
        isMixto,
      };

      if (isMixto) {
        const total = Number(data.total) || 0;
        updateData.splitDetails = {
          efectivo: Number(editEfectivo) || 0,
          transferencia: Math.max(0, total - (Number(editEfectivo) || 0))
        };
      } else {
        updateData.splitDetails = deleteField();
      }

      let saved = false;
      let lastError = null;
      for (let i = 0; i < 2; i++) {
        try {
          await updateDoc(doc(db, collectionName, data.id), updateData);
          saved = true;
          break;
        } catch (e: any) {
          lastError = e;
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (!saved) {
        throw lastError;
      }

      data.paymentMethod = editPaymentMethod;
      data.isMixto = isMixto;
      if (isMixto) {
        data.splitDetails = updateData.splitDetails;
      } else {
        delete data.splitDetails;
      }
      setIsEditingPayment(false);
      toast.success('Pago actualizado correctamente');
    } catch (e) {
      console.error(e);
      alert('Error guardando pago. Por favor intenta de nuevo.');
    }
  };

  const executeDeleteSale = async () => {
    setIsDeleting(true);
    try {
      if (data.items?.length > 0) {
         await restoreInventory(data.items, data.packagingSupplies || []);
         const updatePromises = data.items.map((item: any) => 
           updateDoc(doc(db, 'products', item.productId), {
             salesCount: increment(-item.quantity)
           })
         );
         if (data.clienteId) {
           let pointsChange = -1;
           const hasReward = data.items.some((item: any) => item.isLoyaltyReward);
           if (hasReward) pointsChange += 9;
           updatePromises.push(
             updateDoc(doc(db, 'users', data.clienteId), {
               loyaltyPoints: increment(pointsChange)
             })
           );
         }
         await Promise.all(updatePromises).catch(e => console.error('Error restaurando extras', e));
      }

      const collectionName = data.isDirectPedido ? 'pedidos' : 'sales';
      await deleteDoc(doc(db, collectionName, data.id));

      toast.success('Venta eliminada y el inventario ha sido restaurado');
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error('Error al eliminar: ' + e.message);
    } finally {
      setIsDeleting(false);
      setConfirmAction(null);
    }
  };

  const executeEditSale = async () => {
    setIsDeleting(true);
    try {
      let targetTable = data.tableId || 'directa';
      const cartsState = useTableCartStore.getState().carts;
      const currentCart = cartsState[targetTable];
      
      if (currentCart && currentCart.items && currentCart.items.length > 0) {
        const directaCart = cartsState['directa'];
        if (!directaCart || !directaCart.items || directaCart.items.length === 0) {
          targetTable = 'directa';
          toast.info(`La mesa original (${data.tableName || targetTable}) está ocupada, cargando en Venta Directa.`);
        } else {
          toast.error(`La mesa original y Venta Directa están ocupadas. Por favor despeja un carrito antes de editar.`);
          setIsDeleting(false);
          setConfirmAction(null);
          return;
        }
      }

      if (data.items?.length > 0) {
         await restoreInventory(data.items, data.packagingSupplies || []);
         const updatePromises = data.items.map((item: any) => 
           updateDoc(doc(db, 'products', item.productId), {
             salesCount: increment(-item.quantity)
           })
         );
         if (data.clienteId) {
           let pointsChange = -1;
           const hasReward = data.items.some((item: any) => item.isLoyaltyReward);
           if (hasReward) pointsChange += 9;
           updatePromises.push(
             updateDoc(doc(db, 'users', data.clienteId), {
               loyaltyPoints: increment(pointsChange)
             })
           );
         }
         await Promise.all(updatePromises).catch(e => console.error('Error restaurando extras', e));
      }

      const collectionName = data.isDirectPedido ? 'pedidos' : 'sales';
      await deleteDoc(doc(db, collectionName, data.id));

      const newCart = {
        items: data.items || [],
        note: data.note || '',
        isLocked: false,
        isTakeout: data.tableName?.toLowerCase().includes('llevar') || false,
        packagingSupplies: data.packagingSupplies || [],
        openedAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : new Date().toISOString()
      };

      await setDoc(doc(db, 'tables', targetTable), { currentCart: newCart }, { merge: true });
      useTableCartStore.setState({ activeTable: targetTable });

      toast.success('Venta cargada para edición');
      onClose();
      window.location.hash = '#/';
    } catch (e) {
      console.error(e);
      toast.error('Error al editar la venta');
    } finally {
      setIsDeleting(false);
      setConfirmAction(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data?.id || !profile) return;

    setIsUploadingImage(true);
    try {
      const base64Image = await compressImage(file, 800, 800, 0.6);

      if (setChatMessage && onSendMessage) {
        setChatMessage(`[IMG]${base64Image}`);
        setTimeout(() => onSendMessage(), 100);
      }
    } catch (err) {
      console.error('Error procesando imagen:', err);
      alert('No se pudo procesar la imagen.');
    } finally {
      setIsUploadingImage(false);
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
              <div className="flex items-center gap-2">
                {(profile?.role === 'admin' || profile?.role === 'propietario') && isSale && (
                  <button 
                    onClick={() => setConfirmAction('edit')} 
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-bold text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar Venta</span>
                  </button>
                )}
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-all active:scale-90">
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar flex flex-col gap-4">
               {(() => {
                 const { date, time } = formatDateTime(data.createdAt);
                 return (
                   <div className="grid grid-cols-2 gap-3">
                      <div className={cn("rounded-2xl px-4 py-2 flex items-center justify-between ring-1 border shadow-sm col-span-2", cfg.ring, cfg.bg)}>
                        <p className={cn("text-[9px] font-black uppercase tracking-[0.2em]", cfg.color)}>Estado</p>
                        <p className={cn("font-headline font-black text-sm", cfg.color)}>{cfg.label}</p>
                      </div>

                     {(() => {
                        const cName = data.clienteName || data.userName || data.customerName || data.nombre || data.clientName;
                        const tName = data.tableName || data.mesa;
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
                          if (tName === 'Venta Directa') {
                            sub = 'Atención en mostrador';
                            icon = <Check className="w-3.5 h-3.5 text-primary" />;
                            colorClass = "text-primary";
                          } else if (tName === 'Para Llevar') {
                            sub = 'Empacado para llevar';
                            icon = <Truck className="w-3.5 h-3.5 text-emerald-600" />;
                            colorClass = "text-emerald-600";
                          } else {
                            sub = 'Consumo en local';
                            icon = <Check className="w-3.5 h-3.5 text-blue-600" />;
                            colorClass = "text-blue-600";
                          }
                        } else if (tName === 'Pedido Online' || isOnline) {
                          label = 'Pedido Online';
                          sub = 'Venta por App/Web';
                          icon = <Smartphone className="w-3.5 h-3.5 text-purple-600" />;
                          colorClass = "text-purple-600";
                        }

                         return (
                           <div className="bg-surface-container/30 rounded-2xl px-4 py-3 flex flex-col gap-2 border border-outline/5 shadow-sm col-span-2">
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
                             {(data.sellerName || data.staffName || data.vendorName || data.atendidoPor) && (
                               <div className="border-t border-outline/10 pt-2">
                                 <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Atendido por</p>
                                 <p className="font-bold text-xs text-on-surface mt-0.5">{data.sellerName || data.staffName || data.vendorName || data.atendidoPor}</p>
                               </div>
                             )}
                           </div>
                         );
                      })()}
                     <div className={cn("bg-surface-container/30 rounded-2xl p-3 flex flex-col gap-1 border border-outline/5 shadow-sm relative", data.paymentMethod === 'credito' && "col-span-2")}>
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-secondary font-black uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</p>
                          {canEditPayment && !isEditingDate && (
                            <button 
                              onClick={handleStartEditingDate}
                              className="text-secondary/50 hover:text-primary transition-colors cursor-pointer"
                              title="Editar fecha y hora"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        
                        {!isEditingDate ? (
                          <>
                            <p className="font-headline font-bold text-on-surface text-xs mt-0.5">{date}</p>
                            <p className="text-[9px] text-secondary flex items-center gap-1"><Clock className="w-3 h-3" />{time}</p>
                          </>
                        ) : (
                          <div className="flex flex-col gap-2 mt-1">
                            <input
                              type="datetime-local"
                              value={editDateTimeStr}
                              onChange={(e) => setEditDateTimeStr(e.target.value)}
                              className="bg-white border border-outline/10 rounded-lg text-xs p-1.5 outline-none focus:ring-1 focus:ring-primary w-full cursor-pointer"
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => setIsEditingDate(false)}
                                className="px-2 py-1 rounded-lg bg-surface-container text-secondary text-[10px] font-bold"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveDate}
                                disabled={isSavingDate}
                                className="px-2 py-1 rounded-lg bg-primary text-white text-[10px] font-bold flex items-center gap-1 shadow-sm"
                              >
                                {isSavingDate ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                                Guardar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                     <div className={cn("bg-surface-container/30 rounded-2xl p-3 flex flex-col gap-1 border border-outline/5 shadow-sm relative", data.paymentMethod === 'credito' && "col-span-2")}>
                       <div className="flex items-center justify-between">
                         <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Pago</p>
                         {canEditPayment && !isEditingPayment && (
                           <button onClick={() => {
                              setIsEditingPayment(true);
                              setEditPaymentMethod(data.paymentMethod || 'Efectivo');
                              setEditEfectivo(data.splitDetails?.efectivo || data.total || 0);
                           }} className="text-secondary/50 hover:text-primary transition-colors cursor-pointer">
                             <Edit3 className="w-3.5 h-3.5" />
                           </button>
                         )}
                       </div>
                       
                       {!isEditingPayment ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <PaymentIcon method={data.paymentMethod} />
                            <p className="font-headline font-bold text-on-surface text-xs capitalize">{data.paymentMethod === 'credito' ? 'Debe' : (data.paymentMethod || 'Efectivo')}</p>
                            {data.isMixto && data.splitDetails && (
                              <span className="text-[9px] text-secondary font-bold ml-1">
                                (Efe: {formatCurrency(data.splitDetails.efectivo)} / Trans: {formatCurrency(data.splitDetails.transferencia)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 mt-1">
                            <select
                              value={editPaymentMethod}
                              onChange={(e) => setEditPaymentMethod(e.target.value)}
                              className="bg-white border border-outline/10 rounded-lg text-xs p-1.5 outline-none focus:ring-1 focus:ring-primary w-full cursor-pointer"
                            >
                              <option value="Efectivo">Efectivo</option>
                              <option value="Nequi">Nequi</option>
                              <option value="Daviplata">Daviplata</option>
                              <option value="Tarjeta">Tarjeta</option>
                              <option value="Transferencia">Transferencia</option>
                              <option value="Mixto">Mixto</option>
                              <option value="credito">Debe (Crédito)</option>
                            </select>
                            
                            {editPaymentMethod === 'Mixto' && (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex flex-col gap-0.5">
                                  <label className="text-[8px] font-black uppercase text-secondary/60">Monto Efectivo</label>
                                  <input
                                    type="number"
                                    value={editEfectivo}
                                    onChange={(e) => setEditEfectivo(Number(e.target.value) || 0)}
                                    className="bg-white border border-outline/10 rounded-lg text-xs p-1.5 outline-none focus:ring-1 focus:ring-primary w-full"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <label className="text-[8px] font-black uppercase text-secondary/60">Monto Transferencia (Calculado)</label>
                                  <input
                                    type="number"
                                    disabled
                                    value={data.total - editEfectivo}
                                    className="bg-surface-container border border-outline/10 rounded-lg text-xs p-1.5 w-full text-secondary"
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => setIsEditingPayment(false)}
                                className="flex-1 py-1.5 text-[9px] font-bold text-secondary bg-surface-container rounded-md hover:bg-surface-container-high cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSavePayment}
                                className="flex-1 py-1.5 text-[9px] font-bold text-white bg-primary rounded-md hover:bg-primary/90 cursor-pointer"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        )}

                        {data.paymentMethod === 'credito' && (
                          <div className="mt-2.5 pt-2.5 border-t border-outline/10 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-secondary font-bold">Total Deuda:</span>
                              <span className="font-black text-on-surface">{formatCurrency(data.total)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-secondary font-bold">Total Abonado:</span>
                              <span className="font-black text-emerald-600">{formatCurrency(data.totalAbonado || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-secondary font-bold">Saldo Pendiente:</span>
                              <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                                {formatCurrency(data.total - (data.totalAbonado || 0))}
                              </span>
                            </div>
                            {data.total - (data.totalAbonado || 0) > 0 && !showAbonoForm && (
                              <button
                                onClick={() => {
                                  setAbonoMonto((data.total - (data.totalAbonado || 0)).toString());
                                  setAbonoMetodo('Efectivo');
                                  setShowAbonoForm(true);
                                }}
                                className="w-full mt-1.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-orange-500/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
                              >
                                <Clock className="w-4 h-4" />
                                Registrar Abono
                              </button>
                            )}
                          </div>
                        )}
                     </div>
                   </div>
                 );
               })()}

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

                {data.packagingSupplies && data.packagingSupplies.filter((p: any) => p.quantity > 0).length > 0 && (
                  <section className="mt-2 mb-2">
                    <div className="flex items-center justify-between mb-3 ml-1">
                      <h4 className="font-headline font-black text-[10px] uppercase tracking-widest text-indigo-500/80">Empaques / Desechables</h4>
                    </div>
                    <div className="flex flex-col gap-2">
                      {data.packagingSupplies.filter((p: any) => p.quantity > 0).map((supply: any, idx: number) => (
                        <div key={supply.supplyId || idx} className="flex justify-between items-center p-2.5 rounded-2xl border border-indigo-50 bg-indigo-50/20 shadow-sm">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-indigo-100 flex-shrink-0">
                              <ShoppingBag className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-xs text-indigo-950 truncate">
                                {supply.name || allPackaging.find((p: any) => p.id === supply.supplyId)?.name || 'Insumo de empaque'}
                              </span>
                              <span className="text-[9px] text-indigo-400 font-medium">Empaque / Desechable</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-indigo-100/50 px-2.5 py-1 rounded-xl border border-indigo-100 flex-shrink-0">
                            <span className="text-[10px] font-black text-indigo-900">Cant:</span>
                            <span className="font-black text-indigo-950 text-xs">{supply.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

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

               {(profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'administrador') && (
                 <div className="px-4 sm:px-8 mt-6 pb-4">
                   <button 
                     onClick={() => setConfirmAction('delete')}
                     disabled={isDeleting}
                     className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold text-[11px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     <AlertTriangle className="w-4 h-4" />
                     {isDeleting ? 'Eliminando y Restaurando...' : 'Eliminar Venta Permanentemente'}
                   </button>
                 </div>
               )}

               {(data.status === 'entregado' || data.status === 'completed' || data.type === 'sale') && (data.isTakeout || data.tableName === 'Para Llevar') && (
                 <div className="px-4 sm:px-8 mt-2 pb-4">
                   <button 
                     onClick={() => { setPackagingSearch(''); handleStartEditingPackaging(); }}
                     className="w-full py-4 rounded-2xl bg-indigo-50 text-indigo-600 font-bold text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                   >
                     <ShoppingBag className="w-4 h-4" />
                     Modificar Empaques (Para Llevar)
                   </button>
                 </div>
               )}
            </div>

            {data && (
              (data.status !== 'entregado' && data.status !== 'rechazado' && data.status !== 'completed') ||
              (data.status === 'rechazado' && isStaff)
            ) && (onUpdateStatus || !isStaff) && (
              <div className="p-4 bg-white border-t border-outline/10 flex gap-2 rounded-b-[2.5rem]">

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

                {onUpdateStatus && data.status === 'aceptado' && (
                  <button
                    onClick={(e) => { onUpdateStatus(data.id, 'celebrado', e); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95 shadow-md shadow-blue-200"
                  >
                    <Truck className="w-4 h-4" /> Pedido En Camino
                  </button>
                )}

                {onUpdateStatus && data.status === 'celebrado' && (
                  <button
                    onClick={(e) => { onUpdateStatus(data.id, 'entregado', e); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 shadow-md shadow-emerald-200"
                  >
                    <Check className="w-4 h-4 stroke-[3]" /> Marcar Entregado
                  </button>
                )}

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

            {isOnlinePedido && setChatMessage && onSendMessage && (
              <div className="p-4 bg-white border-t border-outline/10 flex items-center gap-2 rounded-b-[2.5rem]">
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
                  className="w-full py-4 rounded-2xl bg-on-surface text-white font-headline font-black text-sm uppercase tracking-widestáshadow-xl active:scale-[0.98] transition-all"
                >
                  Cerrar Detalle
                </button>
              </div>
            )}

             <AnimatePresence>
               {isEditingPackaging && (
                 <motion.div 
                   initial={{ opacity: 0, y: 50 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 50 }}
                   className="absolute inset-0 bg-surface-container-lowest z-50 flex flex-col rounded-[2.5rem] overflow-hidden"
                 >
                   <div className="p-5 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                     <div>
                       <h3 className="font-black text-indigo-900 text-lg">Modificar Empaques</h3>
                       <p className="text-xs text-indigo-600">Ajusta los desechables de esta venta</p>
                     </div>
                     <button onClick={() => setIsEditingPackaging(false)} className="p-2 bg-white rounded-full text-indigo-400 hover:text-indigo-600">
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                   
                   <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2">
                     <ShoppingBag className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                     <input
                       type="text"
                       placeholder="Buscar empaques..."
                       value={packagingSearch}
                       onChange={(e) => setPackagingSearch(e.target.value)}
                       className="flex-1 bg-white border border-indigo-100 rounded-xl text-xs px-3 py-2 outline-none focus:border-indigo-300 shadow-sm placeholder:text-slate-400"
                     />
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-4 space-y-2">
                     {allPackaging
                       .filter(s => s.name.toLowerCase().includes(packagingSearch.toLowerCase()))
                       .map(supply => {
                       const qty = editingPackagingData.find(p => p.supplyId === supply.id)?.quantity || 0;
                       return (
                         <div 
                           key={supply.id} 
                           onClick={() => handleUpdatePackagingQuantity(supply.id, 1)}
                           className={cn(
                             "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none",
                             qty > 0 
                               ? "bg-indigo-50/60 border-indigo-200 shadow-md" 
                               : "bg-white border-indigo-50/30 opacity-70 hover:opacity-100 shadow-sm"
                           )}
                         >
                           <div>
                             <p className={cn("text-sm font-bold", qty > 0 ? "text-indigo-950" : "text-slate-500")}>{supply.name}</p>
                             <p className="text-[10px] text-indigo-400">{supply.stock} en inventario</p>
                           </div>
                           <div 
                             onClick={(e) => e.stopPropagation()}
                             className="flex items-center gap-3 bg-indigo-50/50 rounded-xl p-1 border border-indigo-100"
                           >
                             <button onClick={() => handleUpdatePackagingQuantity(supply.id, -1)} disabled={qty <= 0} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-indigo-600 disabled:opacity-30">
                               <Minus className="w-4 h-4" />
                             </button>
                             <span className="font-black text-indigo-900 w-4 text-center">{qty}</span>
                             <button onClick={() => handleUpdatePackagingQuantity(supply.id, 1)} className="w-8 h-8 flex items-center justify-center bg-indigo-500 rounded-lg shadow-sm text-white">
                               <Plus className="w-4 h-4" />
                             </button>
                           </div>
                         </div>
                       );
                     })}
                   </div>

                   <div className="p-4 border-t border-outline/10 bg-white">
                     <button 
                       onClick={handleSavePackaging}
                       disabled={isSavingPackaging}
                       className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
                     >
                       <Save className="w-4 h-4" />
                       {isSavingPackaging ? 'Guardando...' : 'Guardar Cambios'}
                     </button>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             <AnimatePresence>
                {confirmAction && (
                  <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setConfirmAction(null)}
                      className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center gap-4 border border-outline/5 z-[260]"
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center",
                        confirmAction === 'edit' ? "bg-primary/10 text-primary" : "bg-red-50 text-red-500"
                      )}>
                        {confirmAction === 'edit' ? <Edit3 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                      </div>
                      
                      <div>
                        <h4 className="font-headline font-black text-lg text-on-surface">
                          {confirmAction === 'edit' ? '¿Deseas editar esta venta?' : '¿Eliminar esta venta?'}
                        </h4>
                        <p className="text-xs text-secondary font-semibold mt-2 leading-relaxed px-2">
                          {confirmAction === 'edit' 
                            ? 'Los productos volverán a la caja para agregar o modificar ítems. Al cobrar, se conservará la fecha y hora original de la venta.'
                            : 'Esta acción no se puede deshacer. Se restaurarán los insumos al inventario y se eliminará el registro monetario definitivamente.'
                          }
                        </p>
                      </div>

                      <div className="flex gap-3 w-full mt-2">
                        <button
                          onClick={() => setConfirmAction(null)}
                          disabled={isDeleting}
                          className="flex-1 h-12 rounded-xl border border-outline/10 text-xs font-bold text-secondary hover:bg-surface-container transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={confirmAction === 'edit' ? executeEditSale : executeDeleteSale}
                          disabled={isDeleting}
                          className={cn(
                            "flex-1 h-12 rounded-xl text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all",
                            confirmAction === 'edit' 
                              ? "bg-primary hover:scale-[1.02] shadow-primary/15" 
                              : "bg-red-600 hover:scale-[1.02] shadow-red-600/15"
                          )}
                        >
                          {isDeleting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            confirmAction === 'edit' ? 'Sí, Editar' : 'Sí, Eliminar'
                          )}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Modal para Registrar Abono */}
              <AnimatePresence>
                {showAbonoForm && (
                  <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowAbonoForm(false)}
                      className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 border border-outline/5 z-[260]"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-outline/5">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-orange-500" />
                          <h3 className="font-headline font-black text-lg text-on-surface">Registrar Abono</h3>
                        </div>
                        <button 
                          onClick={() => setShowAbonoForm(false)} 
                          className="p-1 rounded-full hover:bg-surface-container text-secondary transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveAbono} className="flex flex-col gap-4">
                        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex flex-col gap-1">
                          <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest">Saldo Pendiente Actual</p>
                          <p className="text-xl font-headline font-black text-orange-950">
                            {formatCurrency(data.total - (data.totalAbonado || 0))}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-secondary tracking-wide">Monto a Abonar ($) *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max={data.total - (data.totalAbonado || 0)}
                            value={abonoMonto}
                            onChange={e => setAbonoMonto(e.target.value)}
                            placeholder="Ej. 5000"
                            className="w-full bg-surface-container-low border border-outline/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 font-bold text-on-surface outline-none transition-all"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-secondary tracking-wide">Método de Pago *</label>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setAbonoMetodo('Efectivo')}
                              className={cn(
                                "py-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all",
                                abonoMetodo === 'Efectivo' 
                                  ? "border-primary bg-primary/5 text-primary" 
                                  : "border-outline/10 text-secondary hover:bg-surface-container"
                              )}
                            >
                              <Banknote className="w-4 h-4" />
                              Efectivo
                            </button>
                            <button
                              type="button"
                              onClick={() => setAbonoMetodo('Transferencia')}
                              className={cn(
                                "py-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all",
                                abonoMetodo === 'Transferencia' 
                                  ? "border-primary bg-primary/5 text-primary" 
                                  : "border-outline/10 text-secondary hover:bg-surface-container"
                              )}
                            >
                              <Smartphone className="w-4 h-4" />
                              Transfer.
                            </button>
                            <button
                              type="button"
                              onClick={() => setAbonoMetodo('Mixto')}
                              className={cn(
                                "py-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all",
                                abonoMetodo === 'Mixto' 
                                  ? "border-primary bg-primary/5 text-primary" 
                                  : "border-outline/10 text-secondary hover:bg-surface-container"
                              )}
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                              Mixto
                            </button>
                          </div>

                          {abonoMetodo === 'Mixto' && (
                            <div className="mt-2 flex flex-col gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black uppercase text-secondary/60">Monto Efectivo</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={splitAbono.efectivo}
                                  onChange={e => setSplitAbono(prev => ({ ...prev, efectivo: e.target.value, transferencia: String(Math.max(0, (Number(abonoMonto) || 0) - (Number(e.target.value) || 0))) }))}
                                  placeholder="0"
                                  className="w-full bg-surface-container-low border border-outline/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 font-bold text-on-surface outline-none transition-all text-sm"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black uppercase text-secondary/60">Monto Transferencia</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={splitAbono.transferencia}
                                  onChange={e => setSplitAbono(prev => ({ ...prev, transferencia: e.target.value, efectivo: String(Math.max(0, (Number(abonoMonto) || 0) - (Number(e.target.value) || 0))) }))}
                                  placeholder="0"
                                  className="w-full bg-surface-container-low border border-outline/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 font-bold text-on-surface outline-none transition-all text-sm"
                                />
                              </div>
                              {(() => {
                                const ef = Number(splitAbono.efectivo) || 0;
                                const tr = Number(splitAbono.transferencia) || 0;
                                const total = Number(abonoMonto) || 0;
                                const diff = ef + tr - total;
                                if (total > 0 && diff !== 0) {
                                  return (
                                    <p className={cn("text-[10px] font-bold", diff > 0 ? "text-red-500" : "text-amber-500")}>
                                      {diff > 0 ? `Excede por ${formatCurrency(diff)}` : `Faltan ${formatCurrency(-diff)}`}
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <button
                            type="button"
                            disabled={isSavingAbono}
                            onClick={() => setShowAbonoForm(false)}
                            className="py-3.5 px-4 rounded-xl border border-outline/10 text-on-surface font-bold text-xs hover:bg-surface-container-low transition-all disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingAbono}
                            className="py-3.5 px-4 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs transition-all flex items-center justify-center disabled:opacity-50"
                          >
                            {isSavingAbono ? 'Registrando...' : 'Registrar'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

