import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, Package, Plus, Minus, Trash2, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, Receipt, MapPin } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

export interface Supply { id: string; name: string; currentStock: number; unit: string; minLimit: number; category: string; }
export interface PurchaseItem { supplyId: string; name: string; unit: string; quantity: number; cost: number; margin: number; category: string; }
export interface PurchaseRecord { id: string; provider: string; items: PurchaseItem[]; total: number; createdAt: any; }

const PROVIDERS = ['Colacteos', 'Frubana', 'DPA', 'Distribuidora El Heladero', 'Otro'];

function toDate(ts: any): Date | null { if (!ts) return null; if (ts.toDate) return ts.toDate(); return new Date(ts); }
function fmtDate(ts: any) { const d = toDate(ts); if (!d) return ''; return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

/* ─── PURCHASE DETAIL MODAL ─── */
export function PurchaseDetailModal({ purchase, onClose }: { purchase: PurchaseRecord | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {purchase && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85dvh]"
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-outline/20 rounded-full" /></div>
            <div className="px-6 pt-4 pb-4 border-b border-outline/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center"><Receipt className="w-5 h-5 text-primary" /></div>
                <div>
                  <h3 className="font-black text-base text-on-surface">Detalle de Compra</h3>
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">{purchase.provider} · {fmtDate(purchase.createdAt)}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
              {purchase.items?.map((item, i) => {
                const subtotal = (item.cost || 0) * (item.quantity || 1);
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
                      <div><p className="text-[9px] text-secondary font-black uppercase">Cantidad</p><p className="font-bold text-sm">{item.quantity}</p></div>
                      <div><p className="text-[9px] text-secondary font-black uppercase">Costo Unit.</p><p className="font-bold text-sm">{formatCurrency(item.cost || 0)}</p></div>
                      {item.margin > 0 && <div><p className="text-[9px] text-secondary font-black uppercase">Margen</p><p className="font-bold text-sm">{item.margin}%</p></div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-outline/10 bg-primary rounded-b-[2.5rem]">
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
  onConfirm: (provider: string, items: PurchaseItem[]) => Promise<void>;
}

export function PurchaseModal({ isOpen, onClose, supplies, onConfirm }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => { setStep(1); setProvider(''); setSelected(new Set()); setItems([]); setSaving(false); };
  const handleClose = () => { reset(); onClose(); };

  // Sort: critical stock first, then alphabetically
  const sortedSupplies = [...supplies].sort((a, b) => {
    const aLow = a.currentStock <= a.minLimit;
    const bLow = b.currentStock <= b.minLimit;
    if (aLow && !bLow) return -1;
    if (!aLow && bLow) return 1;
    return a.name.localeCompare(b.name);
  });

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
    const newItems = sortedSupplies
      .filter(s => selected.has(s.id))
      .map(s => ({ supplyId: s.id, name: s.name, unit: s.unit, quantity: 1, cost: 0, margin: 0, category: s.category }));
    setItems(newItems);
    setStep(2);
  };

  const updateItem = (id: string, field: keyof PurchaseItem, val: number) => {
    setItems(prev => prev.map(i => i.supplyId === id ? { ...i, [field]: val } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.supplyId !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const total = items.reduce((acc, i) => acc + (i.cost * i.quantity), 0);
  const pvp = (item: PurchaseItem) => item.cost > 0 ? Math.round(item.cost * (1 + item.margin / 100)) : 0;

  const handleConfirm = async () => {
    if (!provider || items.length === 0) return;
    setSaving(true);
    try { await onConfirm(provider, items); reset(); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col h-[90dvh] sm:h-[85vh]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-outline/20 rounded-full" /></div>

            {/* Header */}
            <div className="px-6 pt-3 pb-4 border-b border-outline/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    {selected.size > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">{selected.size}</span>}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-on-surface">{step === 1 ? 'Abastecer Tienda' : 'Revisar Compra'}</h3>
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

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div className="px-6 pt-4 pb-2">
                  <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full h-11 bg-surface-container rounded-2xl border border-outline/20 px-4 font-bold text-sm focus:border-primary outline-none transition-all">
                    <option value="">Seleccionar proveedor...</option>
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
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
                <div className="px-6 py-4 border-t border-outline/10 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div><p className="text-[9px] text-secondary font-black uppercase tracking-widest">Items Totales</p><p className="font-black text-lg">{selected.size} uds</p></div>
                  </div>
                  <button onClick={goToStep2} disabled={selected.size === 0 || !provider}
                    className="w-full py-4 rounded-2xl bg-on-surface text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 hover:opacity-90 active:scale-[0.98] transition-all">
                    Continuar al Resumen ({selected.size}) <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  {items.map(item => {
                    const subtotal = item.cost * item.quantity;
                    const pvpVal = pvp(item);
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
                            <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">Cantidad</p>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => updateItem(item.supplyId, 'quantity', Math.max(1, item.quantity - 1))} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                              <span className="font-black text-base w-8 text-center">{item.quantity}</span>
                              <button onClick={() => updateItem(item.supplyId, 'quantity', item.quantity + 1)} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                          {/* Cost */}
                          <div>
                            <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">Costo Unit.</p>
                            <div className="flex items-center bg-surface-container rounded-xl px-3 h-9 border border-outline/20 focus-within:border-primary transition-all">
                              <span className="text-secondary text-xs mr-1">$</span>
                              <input type="number" value={item.cost || ''} onChange={e => updateItem(item.supplyId, 'cost', parseFloat(e.target.value) || 0)} placeholder="0" className="flex-1 bg-transparent text-sm font-black outline-none w-full" />
                            </div>
                          </div>
                          {/* Margin */}
                          <div>
                            <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">Margen %</p>
                            <div className="flex items-center bg-surface-container rounded-xl px-3 h-9 border border-outline/20 focus-within:border-primary transition-all">
                              <input type="number" value={item.margin || ''} onChange={e => updateItem(item.supplyId, 'margin', parseFloat(e.target.value) || 0)} placeholder="0" className="flex-1 bg-transparent text-sm font-black outline-none w-full" />
                              <span className="text-secondary text-xs ml-1">%</span>
                            </div>
                          </div>
                          {/* PVP */}
                          <div>
                            <p className="text-[9px] text-secondary font-black uppercase tracking-widest mb-1">PVP Final</p>
                            <div className={cn("flex items-center rounded-xl px-3 h-9 border", pvpVal > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-container border-outline/20')}>
                              <span className={cn("text-sm font-black", pvpVal > 0 ? 'text-emerald-700' : 'text-secondary')}>{pvpVal > 0 ? formatCurrency(pvpVal) : '—'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end pt-2 border-t border-outline/5">
                          <p className="text-[10px] text-secondary font-bold">Subtotal: <span className="font-black text-on-surface">{formatCurrency(subtotal)}</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-6 py-4 border-t border-outline/10 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div><p className="text-[9px] text-secondary font-black uppercase tracking-widest">Monto Inversión</p><p className="text-2xl font-black text-on-surface">{formatCurrency(total)}</p></div>
                    <div className="text-right"><p className="text-[9px] text-secondary font-black uppercase tracking-widest">Items Totales</p><p className="text-2xl font-black text-on-surface">{items.length} uds</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-2xl border border-outline/30 text-on-surface font-black text-xs uppercase tracking-widest hover:bg-surface-container transition-all flex items-center justify-center gap-2">
                      <ChevronLeft className="w-4 h-4" /> Editar
                    </button>
                    <button onClick={handleConfirm} disabled={saving || items.length === 0 || total === 0}
                      className="flex-[2] py-3.5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/30">
                      <CheckCircle2 className="w-4 h-4" /> {saving ? 'Guardando...' : 'Confirmar y Abastecer'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
