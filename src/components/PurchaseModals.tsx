import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, ShoppingCart, Package, Plus, Minus, Trash2, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, Receipt, MapPin } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useProvidersStore } from '../stores/useProvidersStore';
import confetti from 'canvas-confetti';

export interface Supply { 
  id: string; 
  name: string; 
  currentStock: number; 
  unit: string; 
  minLimit: number; 
  category: string; 
  yieldDetails?: string; 
  yieldPerSize?: { mini?: number; small?: number; medium?: number; large?: number; };
  lastPurchaseQuantity?: number;
  lastPurchaseCost?: number;
  lastPurchasePrice?: number;
  lastPurchasePortions?: number;
  portionsPerUnit?: number;
}
export interface PurchaseItem { supplyId: string; name: string; unit: string; quantity: number; cost: number; portions: number; category: string; }
export interface PurchaseRecord { id: string; provider: string; items: PurchaseItem[]; total: number; createdAt: any; paymentMethod?: 'Efectivo' | 'Transferencia' | 'Mixto'; splitDetails?: { efectivo: number; transferencia: number; }; }

const PROVIDERS = ['Colacteos', 'Frubana', 'DPA', 'Distribuidora El Heladero', 'Otro'];

function toDate(ts: any): Date | null { if (!ts) return null; if (ts.toDate) return ts.toDate(); return new Date(ts); }
function fmtDate(ts: any) { const d = toDate(ts); if (!d) return ''; return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

/* ─── PURCHASE DETAIL MODAL ─── */
export function PurchaseDetailModal({ purchase, onClose, onDelete, onEdit, onEditPaymentMethod }: { purchase: PurchaseRecord | null; onClose: () => void; onDelete?: (id: string) => void; onEdit?: (purchase: PurchaseRecord) => void; onEditPaymentMethod?: (id: string, newMethod: 'Efectivo' | 'Transferencia' | 'Mixto', splitDetails?: {efectivo: number; transferencia: number}) => void }) {
  const [editedMethod, setEditedMethod] = React.useState<'Efectivo' | 'Transferencia' | 'Mixto' | null>(null);
  const [editedSplit, setEditedSplit] = React.useState<{efectivo: number; transferencia: number} | null>(null);

  React.useEffect(() => {
    if (purchase) {
      setEditedMethod(purchase.paymentMethod || 'Efectivo');
      setEditedSplit(purchase.splitDetails || { efectivo: 0, transferencia: purchase.total });
    }
  }, [purchase]);

  const hasChanges = editedMethod !== (purchase?.paymentMethod || 'Efectivo') || 
    (editedMethod === 'Mixto' && (editedSplit?.efectivo !== (purchase?.splitDetails?.efectivo || 0)));

  const handleSave = () => {
    if (purchase && onEditPaymentMethod && editedMethod) {
      onEditPaymentMethod(purchase.id, editedMethod, editedMethod === 'Mixto' && editedSplit ? editedSplit : undefined);
    }
  };
  return (
    <AnimatePresence>
      {purchase && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] max-h-[90vh]"
          >

            <div className="px-6 pt-4 pb-4 border-b border-outline/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center"><Receipt className="w-5 h-5 text-primary" /></div>
                <div>
                  <h3 className="font-black text-base text-on-surface">Detalle de Compra</h3>
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">{purchase.provider} · {fmtDate(purchase.createdAt)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {onEdit && (
                  <button onClick={() => { if (purchase) onEdit(purchase); }} className="w-9 h-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-3"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
                )}
                {onDelete && (
                  <button onClick={() => { if (window.confirm('¿Seguro que deseas eliminar esta compra? Se restará el stock ingresado del inventario.')) onDelete(purchase.id); }} className="w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                )}
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-all"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
              {purchase.items?.map((item, i) => {
                const subtotal = item.cost || 0; // Costo es el total ahora
                return (
                  <div key={i} className="bg-surface-container/40 rounded-2xl p-4 border border-outline/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-black text-sm text-on-surface">{item.name}</p>
                        <div className="flex gap-2 mt-1">
                          {item.category && <span className="px-2 py-0.5 bg-primary/8 text-primary text-[9px] font-black rounded-lg uppercase">{item.category}</span>}
                          <span className="text-[10px] text-secondary font-bold">{item.unit}</span>
                        </div>
                      </div>
                      <p className="font-black text-primary">{formatCurrency(subtotal)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline/5">
                      <div><p className="text-[9px] text-secondary font-black uppercase">Cant. ({item.unit})</p><p className="font-bold text-sm">{item.quantity}</p></div>
                      <div><p className="text-[9px] text-secondary font-black uppercase">Costo Total</p><p className="font-bold text-sm">{formatCurrency(item.cost || 0)}</p></div>
                      {(item.portions || 0) > 0 && <div><p className="text-[9px] text-secondary font-black uppercase">Porciones</p><p className="font-bold text-sm">{item.portions} uds</p></div>}
                    </div>
                    {(item.portions || 0) > 0 && (item.cost || 0) > 0 && (
                      <div className="mt-2 pt-2 border-t border-outline/5 flex items-center justify-between">
                        <p className="text-[9px] text-secondary font-black uppercase">Costo por porción</p>
                        <p className="font-black text-emerald-600 text-sm">{formatCurrency((item.cost || 0) / (item.portions || 1))}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-outline/10 bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Método de Pago</p>
                {hasChanges && (
                  <button onClick={handleSave} className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all">
                    GUARDAR
                  </button>
                )}
              </div>
              {onEditPaymentMethod ? (
                <>
                  <select 
                    value={editedMethod || 'Efectivo'} 
                    onChange={e => setEditedMethod(e.target.value as 'Efectivo' | 'Transferencia' | 'Mixto')} 
                    className="w-full text-sm font-bold text-on-surface bg-transparent border-none focus:ring-0 p-0 mb-2"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Mixto">Mixto</option>
                  </select>
                  {editedMethod === 'Mixto' && (
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1">
                        <label className="text-[9px] text-secondary font-bold">Efectivo</label>
                        <input 
                          type="number" 
                          className="w-full h-8 px-2 rounded-lg border border-outline/20 text-sm font-bold" 
                          value={editedSplit?.efectivo || ''} 
                          onChange={e => { 
                            const val = parseFloat(e.target.value) || 0; 
                            setEditedSplit({ efectivo: val, transferencia: (purchase?.total || 0) - val }); 
                          }} 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] text-secondary font-bold">Transferencia</label>
                        <div className="h-8 flex items-center px-2 bg-surface-container rounded-lg text-sm font-bold">
                          {formatCurrency(editedSplit?.transferencia || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-on-surface">{purchase.paymentMethod || 'Efectivo'}</p>
              )}
            </div><div className="px-6 py-4 border-t border-outline/10 bg-primary rounded-b-[2.5rem]">
              <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">Total Compra</p>
              <p className="text-2xl font-black text-white">{formatCurrency(purchase.total)}</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─── 2-STEP PURCHASE MODAL ─── */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplies: Supply[];
  onConfirm: (provider: string, items: PurchaseItem[], paymentMethod: 'Efectivo' | 'Transferencia' | 'Mixto', splitDetails?: {efectivo: number; transferencia: number}, date?: string) => Promise<void>;
  purchaseToEdit?: PurchaseRecord | null;
}

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function PurchaseModal({ isOpen, onClose, supplies, onConfirm, purchaseToEdit }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Mixto'>('Efectivo');
  const [splitEfectivo, setSplitEfectivo] = useState(0);
  const [date, setDate] = useState<string>(getTodayString());
  const [unitModes, setUnitModes] = useState<Record<string, 'base' | 'kilo'>>({});
  
  const { providers } = useProvidersStore();
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (purchaseToEdit) {
        setStep(2); // In edit mode, we can start at step 2 or 1, let's start at 2
        setProvider(purchaseToEdit.provider || '');
        setPaymentMethod(purchaseToEdit.paymentMethod || 'Efectivo');
        setSplitEfectivo(purchaseToEdit.splitDetails?.efectivo || 0);
        
        const d = purchaseToEdit.createdAt?.toDate ? purchaseToEdit.createdAt.toDate() : (purchaseToEdit.createdAt ? new Date(purchaseToEdit.createdAt) : new Date());
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dNum = String(d.getDate()).padStart(2, '0');
        setDate(`${y}-${m}-${dNum}`);

        const itemSet = new Set(purchaseToEdit.items.map((i: any) => i.supplyId));
        setSelected(itemSet);
        setItems(purchaseToEdit.items.map((i: any) => ({ ...i })));
      } else {
        setStep(1); setProvider(''); setPaymentMethod('Efectivo'); setSelected(new Set()); setItems([]); setSaving(false); setSearchTerm(''); setDate(getTodayString()); setUnitModes({});
      }
    }
  }, [isOpen, purchaseToEdit]);

  const reset = () => { setStep(1); setProvider(''); setPaymentMethod('Efectivo'); setSelected(new Set()); setItems([]); setSaving(false); setSearchTerm(''); setDate(getTodayString()); setUnitModes({}); };
  const handleClose = () => { reset(); onClose(); };

  // Sort: critical stock first, then alphabetically (solo insumos físicos reales)
  const sortedSupplies = supplies.filter(s => !s.isVirtual).sort((a, b) => {
    const aLow = a.currentStock <= a.minLimit;
    const bLow = b.currentStock <= b.minLimit;
    if (aLow && !bLow) return -1;
    if (!aLow && bLow) return 1;
    return a.name.localeCompare(b.name);
  }).filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.category?.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleSelect = (s: Supply) => {
    const next = new Set(selected);
    if (next.has(s.id)) {
      next.delete(s.id);
    } else {
      next.add(s.id);
    }
    setSelected(next);
  };

  const goToStep2 = () => {
    setItems(prevItems => {
      const existingMap = new Map(prevItems.map(i => [i.supplyId, i]));

      return supplies
        .filter(s => selected.has(s.id))
        .map(s => {
          // Si ya existía un ítem editado por el usuario en esta sesión, PRESERVARLO
          if (existingMap.has(s.id)) {
            return existingMap.get(s.id)!;
          }

          // Si es un ítem recién seleccionado, pre-cargar su historial o valores por defecto
          const defaultQty = s.lastPurchaseQuantity ?? (s.unit === 'g' || s.unit === 'ml' ? 1000 : 1);
          const defaultCost = s.lastPurchaseCost ?? (s.lastPurchasePrice ? (s.lastPurchasePrice * defaultQty) : 0);
          const defaultPortions = s.lastPurchasePortions ?? (s.portionsPerUnit ?? 0);

          return {
            supplyId: s.id,
            name: s.name,
            unit: s.unit,
            quantity: defaultQty,
            cost: defaultCost,
            portions: defaultPortions,
            category: s.category
          };
        });
    });
    setStep(2);
  };

  const updateItem = (id: string, field: keyof PurchaseItem, val: number) => {
    setItems(prev => prev.map(i => {
      if (i.supplyId !== id) return i;
      
      const updated = { ...i, [field]: val };
      
      // Si cambia la cantidad, recalcular proporcionalmente el Costo Total
      if (field === 'quantity') {
        const newQty = val;
        const oldQty = i.quantity;
        const supply = supplies.find(s => s.id === id);
        
        // Obtener costo unitario de referencia
        const unitPrice = (oldQty > 0 && i.cost > 0)
          ? (i.cost / oldQty)
          : (supply?.lastPurchasePrice || 0);

        if (unitPrice > 0) {
          updated.cost = Math.round(newQty * unitPrice);
        }
      }

      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.supplyId !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const total = items.reduce((acc, i) => acc + i.cost, 0); // Costo ya es el total por item
  const costPerPortion = (item: PurchaseItem) => item.portions > 0 && item.cost > 0 ? item.cost / item.portions : 0;

  const handleFinalConfirm = async () => {
    if (items.length === 0 || total === 0) return;
    if (paymentMethod === 'Mixto' && (splitEfectivo < 0 || splitEfectivo > total)) return;

    // Advertencia de cantidades sospechosamente bajas en gramos o mililitros (ej: <= 25 g o ml)
    const suspiciousItems = items.filter(item => {
      const isWeight = (item.unit || '').toLowerCase() === 'g' || (item.unit || '').toLowerCase() === 'gramos';
      const isLiquid = (item.unit || '').toLowerCase() === 'ml' || (item.unit || '').toLowerCase() === 'mililitros';
      const mode = unitModes[item.supplyId] || 'base';
      return (isWeight || isLiquid) && mode === 'base' && item.quantity > 0 && item.quantity <= 25;
    });

    if (suspiciousItems.length > 0) {
      const list = suspiciousItems.map(it => {
        const isW = (it.unit || '').toLowerCase() === 'g' || (it.unit || '').toLowerCase() === 'gramos';
        const unitName = isW ? 'Kilos' : 'Litros';
        return `• ${it.name}: ${it.quantity} ${it.unit} (¿Quisiste ingresar ${it.quantity} ${unitName} = ${it.quantity * 1000} ${it.unit}?)`;
      }).join('\n');

      const ok = window.confirm(
        `⚠️ ADVERTENCIA DE CANTIDAD:\n\nDetectamos insumos con cantidades sospechosamente bajas:\n\n${list}\n\n¿Estás seguro de que deseas registrar solo esos gramos/mililitros y NO Kilos o Litros?\n\n• Si compraste KILOS o LITROS: pulsa CANCELAR y cambia a [Kg] o [L] (o toca la advertencia amarilla en el ítem).\n• Si realmente compraste esa cantidad exacta en gramos/ml: pulsa ACEPTAR.`
      );
      if (!ok) return;
    }

    const finalProvider = provider.trim() === '' ? 'Desconocido' : provider;
    setSaving(true);
    try { 
      await onConfirm(
        finalProvider, 
        items, 
        paymentMethod, 
        paymentMethod === 'Mixto' ? { efectivo: splitEfectivo, transferencia: total - splitEfectivo } : undefined, 
        date
      ); 
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 9999
        });
      } catch (e) {
        // Confetti optional
      }
      reset(); 
      onClose(); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] max-h-[90vh]"
          >


            {/* Header */}
            <div className="px-6 pt-3 pb-4 border-b border-outline/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    {selected.size > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">{selected.size}</span>}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-on-surface">{purchaseToEdit ? (step === 1 ? 'Editar Selección' : 'Editar Compra') : (step === 1 ? 'Abastecer Heladería' : 'Revisar Compra')}</h3>
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">
                      {selected.size} productos · {step === 1 ? 'Selección' : 'Detalles finales'}
                    </p>
                  </div>
                </div>
                <button onClick={handleClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              {/* Step indicator */}
              <div className="flex gap-2 mt-3">
                {[1, 2].map(s => (
                  <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", s <= step ? 'bg-primary' : 'bg-outline/20')} />
                ))}
              </div>
            </div>

            {/* STEP 1 — solo selección de productos */}
            {step === 1 && (
              <>
                <div className="px-6 py-2">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-secondary/40 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar insumo..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full h-11 bg-surface-container rounded-2xl border border-outline/20 pl-10 pr-10 font-bold text-sm focus:border-primary outline-none transition-all"
                    />
                    {searchTerm.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 w-6 h-6 rounded-full bg-outline/20 hover:bg-outline/30 flex items-center justify-center transition-all text-secondary"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col gap-2">
                  {sortedSupplies.map(s => {
                    const isLow = s.currentStock <= s.minLimit;
                    const isChosen = selected.has(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleSelect(s)}
                        className={cn("flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all",
                          isChosen ? 'bg-on-surface border-on-surface' : 'bg-white border-outline/10 hover:border-primary/30'
                        )}
                      >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                          isChosen ? 'bg-white/10' : isLow ? 'bg-orange-50' : 'bg-surface-container'
                        )}>
                          {isChosen ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Package className={cn("w-5 h-5", isLow ? 'text-orange-500' : 'text-secondary')} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-black text-sm leading-tight", isChosen ? 'text-white' : 'text-on-surface')}>{s.name}</p>
                          <p className={cn("text-[10px] font-bold mt-0.5", isChosen ? 'text-white/50' : isLow ? 'text-orange-500' : 'text-secondary')}>
                            {isLow && !isChosen && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            Stock: {s.currentStock} {s.unit}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="px-6 py-4 border-t border-outline/10 bg-white rounded-b-[2.5rem]">
                  {paymentMethod === 'Mixto' && (<div className="flex gap-2 mb-3"><div className="flex-1"><label className="text-[9px] text-secondary font-bold uppercase mb-1 block">Efectivo</label><input type="number" value={splitEfectivo || ''} onChange={e => setSplitEfectivo(parseFloat(e.target.value)||0)} className="w-full h-10 px-3 rounded-xl border border-outline/20 text-sm font-bold focus:border-primary focus:ring-1" placeholder="Monto en efectivo" /></div><div className="flex-1"><label className="text-[9px] text-secondary font-bold uppercase mb-1 block">Transferencia</label><div className="w-full h-10 px-3 rounded-xl bg-surface-container flex items-center text-sm font-bold">{formatCurrency(total - splitEfectivo)}</div></div></div>)}<div className="flex items-center justify-between mb-3">
                    <div><p className="text-[9px] text-secondary font-black uppercase tracking-widest">Items Totales</p><p className="font-black text-lg">{selected.size} uds</p></div>
                  </div>
                  <button onClick={goToStep2} disabled={selected.size === 0}
                    className="w-full py-4 rounded-2xl bg-on-surface text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 hover:opacity-90 active:scale-[0.98] transition-all">
                    Continuar al Resumen ({selected.size}) <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 — proveedor + detalles */}
            {step === 2 && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  {/* Proveedor y Fecha */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[9px] text-secondary font-black uppercase tracking-widest">Proveedor</p>
                        <button onClick={() => setIsCreatingProvider(true)} className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors">
                          <Plus className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Nuevo</span>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full h-11 bg-surface-container rounded-2xl border border-outline/20 px-3 font-bold text-xs focus:border-primary outline-none transition-all truncate">
                          <option value="">Seleccionar...</option>
                          {providers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1.5">Fecha de Compra</p>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full h-11 bg-surface-container rounded-2xl border border-outline/20 px-3 font-bold text-xs focus:border-primary outline-none transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                  {items.map(item => {
                    const subtotal = item.cost;
                    return (
                      <div key={item.supplyId} className="bg-white border border-outline/10 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-black text-sm text-on-surface">{item.name}</p>
                            <div className="flex gap-2 mt-1">
                              {item.category && <span className="px-2 py-0.5 bg-primary/8 text-primary text-[9px] font-black rounded-lg uppercase">{item.category}</span>}
                              <span className="text-[10px] text-secondary font-bold">{item.unit}</span>
                            </div>
                          </div>
                          <button onClick={() => removeItem(item.supplyId)} className="w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {/* Quantity */}
                          <div>
                            {(() => {
                              const isWeight = (item.unit || '').toLowerCase() === 'g' || (item.unit || '').toLowerCase() === 'gramos';
                              const isLiquid = (item.unit || '').toLowerCase() === 'ml' || (item.unit || '').toLowerCase() === 'mililitros';
                              const isConvertible = isWeight || isLiquid;
                              const mode = unitModes[item.supplyId] || 'base';
                              const isKiloOrLiter = mode === 'kilo';

                              return (
                                <>
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-[9px] text-secondary font-black uppercase tracking-widest">
                                      Cant. ({isKiloOrLiter ? (isWeight ? 'Kg' : 'Litros') : item.unit})
                                    </p>
                                    {isConvertible && (
                                      <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-outline/10 text-[9px] font-black">
                                        <button
                                          type="button"
                                          onClick={() => setUnitModes(prev => ({ ...prev, [item.supplyId]: 'base' }))}
                                          className={cn("px-1.5 py-0.5 rounded-md transition-all", !isKiloOrLiter ? "bg-primary text-white shadow-xs" : "text-secondary hover:text-on-surface")}
                                        >
                                          {isWeight ? 'g' : 'ml'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setUnitModes(prev => ({ ...prev, [item.supplyId]: 'kilo' }))}
                                          className={cn("px-1.5 py-0.5 rounded-md transition-all", isKiloOrLiter ? "bg-primary text-white shadow-xs" : "text-secondary hover:text-on-surface")}
                                        >
                                          {isWeight ? 'Kg' : 'L'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        const step = isKiloOrLiter ? 1000 : 10;
                                        updateItem(item.supplyId, 'quantity', Math.max(0, item.quantity - step));
                                      }} 
                                      className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center hover:bg-outline/20 transition-colors"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input 
                                      type="number" 
                                      step={isKiloOrLiter ? "0.1" : "1"}
                                      value={isKiloOrLiter ? (item.quantity > 0 ? parseFloat((item.quantity / 1000).toFixed(3)) : '') : (item.quantity || '')} 
                                      onChange={e => {
                                        const val = parseFloat(e.target.value) || 0;
                                        updateItem(item.supplyId, 'quantity', isKiloOrLiter ? val * 1000 : val);
                                      }} 
                                      className="font-black text-base w-14 text-center bg-transparent outline-none border-b border-outline/20" 
                                    />
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        const step = isKiloOrLiter ? 1000 : 10;
                                        updateItem(item.supplyId, 'quantity', item.quantity + step);
                                      }} 
                                      className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center hover:bg-outline/20 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {(!isKiloOrLiter && item.quantity > 0 && item.quantity <= 25) ? (
                                    <div 
                                      onClick={() => {
                                        setUnitModes(prev => ({ ...prev, [item.supplyId]: 'kilo' }));
                                        updateItem(item.supplyId, 'quantity', item.quantity * 1000);
                                      }}
                                      className="mt-1.5 p-1.5 bg-amber-50 border border-amber-300 rounded-xl cursor-pointer hover:bg-amber-100 transition-all flex items-start gap-1"
                                      title="Toca para convertir a Kilos"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                      <p className="text-[8px] text-amber-800 font-bold leading-tight">
                                        ¿Solo <span className="font-black text-amber-950">{item.quantity} {item.unit}</span>? ¿Quisiste decir <span className="underline font-black text-primary">{item.quantity} {isWeight ? 'Kg' : 'L'} ({item.quantity * 1000} {item.unit})</span>? Toca para corregir.
                                      </p>
                                    </div>
                                  ) : isKiloOrLiter ? (
                                    <p className="text-[8px] text-emerald-600 font-bold leading-tight mt-1">
                                      ✓ {parseFloat((item.quantity / 1000).toFixed(3))} {isWeight ? 'Kg' : 'L'} = <span className="font-black">{item.quantity} {item.unit}</span> en inventario
                                    </p>
                                  ) : isWeight ? (
                                    <p className="text-[8px] text-secondary font-bold leading-tight mt-1">
                                      Ej: 500g = 500 (o activa Kg)
                                    </p>
                                  ) : isLiquid ? (
                                    <p className="text-[8px] text-secondary font-bold leading-tight mt-1">
                                      Ej: 1000ml = 1000 (o activa L)
                                    </p>
                                  ) : null}
                                </>
                              );
                            })()}
                          </div>
                          {/* Cost */}
                          <div>
                            <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">Costo Total</p>
                            <div className="flex items-center bg-surface-container rounded-xl px-3 h-9 border border-outline/20 focus-within:border-primary transition-all">
                              <span className="text-secondary text-xs mr-1">$</span>
                              <input type="number" value={item.cost || ''} onChange={e => updateItem(item.supplyId, 'cost', parseFloat(e.target.value) || 0)} placeholder="0" className="flex-1 bg-transparent text-sm font-black outline-none w-full" />
                            </div>
                          </div>
                          {(() => {
                            const supply = supplies.find(s => s.id === item.supplyId);
                            const hasMultipleYields = supply?.yieldPerSize?.mini || supply?.yieldPerSize?.small || supply?.yieldPerSize?.medium || supply?.yieldPerSize?.large;

                            if (hasMultipleYields) {
                              return (
                                <div className="col-span-2">
                                  <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">Rendimiento</p>
                                  <div className="flex items-center bg-amber-50 rounded-xl px-3 h-9 border border-amber-200">
                                    <span className="text-xs font-bold text-amber-700">Rendimiento variable (por tamaños) ya configurado en catálogo.</span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <>
                                {/* Portions */}
                                <div>
                                  <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">Porciones / Unidad</p>
                                  <div className="flex items-center bg-surface-container rounded-xl px-3 h-9 border border-outline/20 focus-within:border-primary transition-all">
                                    <input type="number" value={item.portions || ''} onChange={e => updateItem(item.supplyId, 'portions', parseFloat(e.target.value) || 0)} placeholder="ej: 80" className="flex-1 bg-transparent text-sm font-black outline-none w-full" />
                                    <span className="text-secondary text-xs ml-1">uds</span>
                                  </div>
                                </div>
                                {/* Cost/portion auto-calculated */}
                                <div>
                                  <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">Costo / Porción</p>
                                  <div className={cn("flex items-center rounded-xl px-3 h-9 border", costPerPortion(item) > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-container border-outline/20')}>
                                    <span className={cn("text-sm font-black", costPerPortion(item) > 0 ? 'text-emerald-700' : 'text-secondary')}>{costPerPortion(item) > 0 ? formatCurrency(costPerPortion(item)) : '—'}</span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex items-center justify-end pt-2 border-t border-outline/5">
                          <p className="text-[10px] text-secondary font-bold">Subtotal: <span className="font-black text-on-surface">{formatCurrency(subtotal)}</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-6 py-4 border-t border-outline/10 bg-white rounded-b-[2.5rem]">
                  <div className="flex flex-col gap-3 mb-4">
                    <div>
                      <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-2">Método de Pago</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => setPaymentMethod('Efectivo')}
                          className={`py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${paymentMethod === 'Efectivo' ? 'bg-primary text-white shadow-md' : 'bg-surface-container text-on-surface hover:bg-outline/10'}`}
                        >
                          Efectivo
                        </button>
                        <button 
                          onClick={() => setPaymentMethod('Transferencia')}
                          className={`py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${paymentMethod === 'Transferencia' ? 'bg-primary text-white shadow-md' : 'bg-surface-container text-on-surface hover:bg-outline/10'}`}
                        >
                          Transf.</button><button onClick={() => setPaymentMethod('Mixto')} className={`py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${paymentMethod === 'Mixto' ? 'bg-primary text-white shadow-md' : 'bg-surface-container text-on-surface hover:bg-outline/10'}`}>Mixto</button>
                      </div>
                    </div>
                  </div>
                  
                  {paymentMethod === 'Mixto' && (<div className="flex gap-2 mb-3"><div className="flex-1"><label className="text-[9px] text-secondary font-bold uppercase mb-1 block">Efectivo</label><input type="number" value={splitEfectivo || ''} onChange={e => setSplitEfectivo(parseFloat(e.target.value)||0)} className="w-full h-10 px-3 rounded-xl border border-outline/20 text-sm font-bold focus:border-primary focus:ring-1" placeholder="Monto en efectivo" /></div><div className="flex-1"><label className="text-[9px] text-secondary font-bold uppercase mb-1 block">Transferencia</label><div className="w-full h-10 px-3 rounded-xl bg-surface-container flex items-center text-sm font-bold">{formatCurrency(total - splitEfectivo)}</div></div></div>)}<div className="flex items-center justify-between mb-3">
                    <div><p className="text-[9px] text-secondary font-black uppercase tracking-widest">Monto Inversión</p><p className="text-2xl font-black text-on-surface">{formatCurrency(total)}</p></div>
                    <div className="text-right"><p className="text-[9px] text-secondary font-black uppercase tracking-widest">Items Totales</p><p className="text-2xl font-black text-on-surface">{items.length} uds</p></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-2xl border border-outline/30 text-on-surface font-black text-xs uppercase tracking-widest hover:bg-surface-container transition-all flex items-center justify-center gap-2">
                      <ChevronLeft className="w-4 h-4" /> Editar Selección
                    </button>
                    <button 
                      onClick={handleFinalConfirm} 
                      disabled={saving || items.length === 0 || total === 0 || (paymentMethod === 'Mixto' && (splitEfectivo < 0 || splitEfectivo > total))}
                      className="flex-[2] py-3.5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
                    >
                      <CheckCircle2 className="w-4 h-4" /> {saving ? 'Guardando...' : (purchaseToEdit ? 'Guardar Cambios' : 'Confirmar y Abastecer')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    
    {isCreatingProvider && (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-on-surface/60 backdrop-blur-md" onClick={() => setIsCreatingProvider(false)} />
        <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
          <h3 className="font-black text-lg text-on-surface mb-4">Nuevo Proveedor</h3>
          <p className="text-sm text-secondary mb-4">Agrega un proveedor a tu lista. Lo podrÃƒ¡s seleccionar enseguida.</p>
          <div className="mb-6">
            <label className="text-[11px] font-black uppercase tracking-widest text-secondary block mb-1">Nombre</label>
            <input id="newProviderName" type="text" autoFocus className="w-full h-12 px-4 rounded-xl border border-outline/20 outline-none focus:border-primary focus:ring-1" placeholder="Ej. Distribuidora XYZ" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsCreatingProvider(false)} className="flex-1 py-3 rounded-xl border border-outline/20 text-on-surface font-bold">Cancelar</button>
            <button 
              onClick={async () => {
                const name = (document.getElementById('newProviderName') as HTMLInputElement).value;
                if (!name.trim()) return;
                // Import would be needed here normally, but useProvidersStore provides an add method
                await useProvidersStore.getState().addProvider(name.trim());
                setProvider(name.trim());
                setIsCreatingProvider(false);
              }}
              className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}



