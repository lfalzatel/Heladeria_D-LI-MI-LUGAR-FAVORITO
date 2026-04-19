import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Box, Plus, Minus, Package, Truck, Calendar, 
  AlertTriangle, CheckCircle2, Trash2, X, Download,
  ChevronDown, ChevronUp, BarChart3, ShoppingCart
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import AppHeader, { PageTitle } from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useAuthStore } from '../stores/useAuthStore';

interface Supply {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  minLimit: number;
  category: string;
}

interface PurchaseItem {
  supplyId: string;
  name: string;
  unit: string;
  quantity: number;
  cost: number;
}

interface PurchaseRecord {
  id: string;
  provider: string;
  items: PurchaseItem[];
  total: number;
  createdAt: any;
}

type PeriodFilter = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes'
};

const PROVIDERS = ['Colacteos', 'Frubana', 'DPA', 'Distribuidora El Heladero', 'Otro'];

const toDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
};

const isInPeriod = (ts: any, period: PeriodFilter): boolean => {
  const d = toDate(ts);
  if (!d) return false;
  const now = new Date();
  if (period === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return d >= start;
  }
  if (period === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
};

export default function Supplies() {
  const { profile } = useAuthStore();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [supplySearch, setSupplySearch] = useState('');

  useEffect(() => {
    if (!profile) return;

    const qSupplies = query(collection(db, 'supplies'), orderBy('name', 'asc'));
    const unsubS = onSnapshot(qSupplies, snap => {
      setSupplies(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Supply[]);
    });

    const qPurchases = query(collection(db, 'supplyPurchases'), orderBy('createdAt', 'desc'));
    const unsubP = onSnapshot(qPurchases, snap => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PurchaseRecord[]);
    });

    return () => { unsubS(); unsubP(); };
  }, [profile]);

  const filteredPurchases = purchases.filter(p => isInPeriod(p.createdAt, period));
  const periodTotal = filteredPurchases.reduce((acc, p) => acc + (p.total || 0), 0);

  // Dashboard stats
  const totalSupplies = supplies.length;
  const lowStockCount = supplies.filter(s => s.currentStock <= s.minLimit).length;
  const completedInPeriod = filteredPurchases.length;

  // Purchase modal helpers
  const addItem = (supply: Supply) => {
    if (purchaseItems.some(i => i.supplyId === supply.id)) return;
    setPurchaseItems(prev => [...prev, { supplyId: supply.id, name: supply.name, unit: supply.unit, quantity: 1, cost: 0 }]);
  };

  const updateItem = (id: string, field: 'quantity' | 'cost', value: number) => {
    setPurchaseItems(prev => prev.map(i => i.supplyId === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => {
    setPurchaseItems(prev => prev.filter(i => i.supplyId !== id));
  };

  const purchaseTotal = purchaseItems.reduce((acc, i) => acc + (i.cost * i.quantity), 0);

  const handleCompletePurchase = async () => {
    if (!selectedProvider || purchaseItems.length === 0) {
      toast.error('Selecciona un proveedor y agrega insumos');
      return;
    }
    try {
      await addDoc(collection(db, 'supplyPurchases'), {
        provider: selectedProvider,
        items: purchaseItems,
        total: purchaseTotal,
        createdAt: serverTimestamp()
      });
      for (const item of purchaseItems) {
        await updateDoc(doc(db, 'supplies', item.supplyId), {
          currentStock: increment(item.quantity)
        });
      }
      toast.success('¡Compra registrada exitosamente!');
      setIsPurchaseModalOpen(false);
      setPurchaseItems([]);
      setSelectedProvider('');
    } catch (err) {
      toast.error('Error al registrar la compra');
    }
  };

  const formatDate = (ts: any) => {
    const d = toDate(ts);
    if (!d) return '';
    return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const filteredSuppliesForModal = supplies.filter(s =>
    s.name.toLowerCase().includes(supplySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-container-lowest to-surface-container/20 pb-32">
      <AppHeader backTo="/admin/dashboard" showBell={false} />
      <PageTitle title="Compras" subtitle="Gestión de Insumos" />

      <main className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-5">
        {/* Dashboard stats */}
        <section className="grid grid-cols-3 gap-3">
          <StatCard icon={<Package className="w-5 h-5 text-primary" />} label="Insumos" value={totalSupplies.toString()} accent="primary" />
          <StatCard icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} label="Bajo Stock" value={lowStockCount.toString()} accent="orange" />
          <StatCard icon={<ShoppingCart className="w-5 h-5 text-secondary" />} label="Compras" value={completedInPeriod.toString()} accent="slate" />
        </section>

        {/* Period selector */}
        <div className="bg-white rounded-2xl border border-outline/10 shadow-sm p-1.5 flex gap-1">
          {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                period === p
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-secondary hover:text-on-surface"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Action toolbar */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all",
              isCalendarOpen ? "bg-primary/10 border-primary/20 text-primary" : "bg-white border-outline/20 text-secondary hover:border-primary/20"
            )}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Calendario</span>
          </button>
          <button
            onClick={() => toast.info('Exportando informe...')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-outline/20 text-secondary text-xs font-bold hover:border-primary/20 hover:text-primary transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar</span>
          </button>
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:scale-[1.02] active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            Registrar Compra
          </button>
        </div>

        {/* Calendar mini – actividad */}
        <AnimatePresence>
          {isCalendarOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-white rounded-2xl border border-outline/10 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4">
                <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-3">Días con actividad</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(purchases.map(p => {
                    const d = toDate(p.createdAt);
                    return d ? d.toLocaleDateString('es-CO') : null;
                  }).filter(Boolean))).map(day => (
                    <span key={day} className="px-3 py-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-xs font-bold">
                      {day}
                    </span>
                  ))}
                  {purchases.length === 0 && <p className="text-xs text-secondary font-medium">Sin registros</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary card */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
            Total invertido — {PERIOD_LABELS[period]}
          </p>
          <p className="text-3xl font-black tracking-tight">{formatCurrency(periodTotal)}</p>
          <p className="text-[11px] opacity-60 mt-1">{filteredPurchases.length} compra{filteredPurchases.length !== 1 ? 's' : ''} registrada{filteredPurchases.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Purchase history */}
        <div className="flex flex-col gap-3">
          {filteredPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-25">
              <ShoppingCart className="w-14 h-14 mb-3" />
              <p className="text-sm font-bold">Sin compras en este período</p>
            </div>
          ) : filteredPurchases.map(purchase => (
            <div key={purchase.id} className="bg-white rounded-2xl border border-outline/10 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Proveedor</p>
                  <p className="font-bold text-on-surface">{purchase.provider}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-primary text-lg">{formatCurrency(purchase.total)}</p>
                  <p className="text-[10px] text-secondary">{formatDate(purchase.createdAt)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {purchase.items?.map((item, i) => (
                  <span key={i} className="px-2.5 py-1 bg-surface-container text-secondary text-[10px] font-bold rounded-lg border border-outline/10">
                    {item.name} × {item.quantity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Purchase Modal — Rediseñado */}
      <AnimatePresence>
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPurchaseModalOpen(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-outline/20 rounded-full" />
              </div>

              {/* Modal header */}
              <div className="px-6 pt-4 pb-4 flex items-start justify-between border-b border-outline/10">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-primary" />
                    {purchaseItems.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {purchaseItems.length}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-on-surface">Mi Lista de Compra</h3>
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Tu selección</p>
                  </div>
                </div>
                <button onClick={() => setIsPurchaseModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                {/* Provider */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Proveedor</label>
                  <select
                    value={selectedProvider}
                    onChange={e => setSelectedProvider(e.target.value)}
                    className="w-full h-12 bg-surface-container rounded-2xl border-2 border-outline/20 px-4 font-bold text-sm focus:border-primary transition-all outline-none"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Supply search + add */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Agregar Insumo</label>
                  <input
                    type="text"
                    placeholder="Buscar insumo..."
                    value={supplySearch}
                    onChange={e => setSupplySearch(e.target.value)}
                    className="w-full h-12 bg-surface-container rounded-2xl border-2 border-outline/20 px-4 font-medium text-sm focus:border-primary transition-all outline-none"
                  />
                  {supplySearch && (
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto bg-white border border-outline/10 rounded-2xl shadow-sm">
                      {filteredSuppliesForModal.slice(0, 8).map(s => (
                        <button
                          key={s.id}
                          onClick={() => { addItem(s); setSupplySearch(''); }}
                          disabled={purchaseItems.some(i => i.supplyId === s.id)}
                          className="flex items-center justify-between px-4 py-2.5 text-left hover:bg-primary/5 transition-colors border-b border-outline/5 last:border-none disabled:opacity-40"
                        >
                          <div>
                            <p className="text-xs font-bold text-on-surface">{s.name}</p>
                            <p className="text-[10px] text-secondary">{s.unit}</p>
                          </div>
                          {purchaseItems.some(i => i.supplyId === s.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <Plus className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items list */}
                <div className="flex flex-col gap-3">
                  {purchaseItems.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center opacity-25 border-2 border-dashed border-outline rounded-3xl">
                      <Package className="w-8 h-8 mb-2" />
                      <p className="text-xs font-bold">Busca y agrega insumos arriba</p>
                    </div>
                  ) : (
                    purchaseItems.map(item => (
                      <div key={item.supplyId} className="flex items-center gap-3 bg-surface-container/50 rounded-2xl p-3 border border-outline/10">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-on-surface truncate">{item.name}</p>
                          <p className="text-[10px] text-secondary">{item.unit}</p>
                        </div>
                        {/* Qty */}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateItem(item.supplyId, 'quantity', Math.max(1, item.quantity - 1))} className="w-7 h-7 rounded-full bg-white border border-outline/20 flex items-center justify-center hover:border-primary/30 transition-all">
                            <Minus className="w-3 h-3 text-secondary" />
                          </button>
                          <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateItem(item.supplyId, 'quantity', item.quantity + 1)} className="w-7 h-7 rounded-full bg-white border border-outline/20 flex items-center justify-center hover:border-primary/30 transition-all">
                            <Plus className="w-3 h-3 text-secondary" />
                          </button>
                        </div>
                        {/* Price */}
                        <div className="w-24">
                          <input
                            type="number"
                            value={item.cost}
                            onChange={e => updateItem(item.supplyId, 'cost', parseFloat(e.target.value) || 0)}
                            placeholder="$ precio"
                            className="w-full h-8 bg-white border border-outline/20 rounded-xl px-2 text-xs font-black text-center focus:border-primary outline-none transition-all"
                          />
                        </div>
                        <button onClick={() => removeItem(item.supplyId)} className="text-outline hover:text-red-500 transition-colors flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-5 border-t border-outline/10 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Total Estimado</p>
                  <p className="text-2xl font-black text-on-surface">{formatCurrency(purchaseTotal)}</p>
                </div>
                <button
                  onClick={handleCompletePurchase}
                  disabled={purchaseItems.length === 0 || !selectedProvider}
                  className="w-full py-4 rounded-2xl bg-on-surface text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Registrar Compra <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode, label: string, value: string, accent: 'primary' | 'orange' | 'slate' }) {
  const accentMap = {
    primary: 'bg-primary/5 border-primary/10',
    orange: 'bg-orange-50 border-orange-100',
    slate: 'bg-slate-50 border-slate-100'
  };
  return (
    <div className={cn("bg-white rounded-2xl p-4 border flex flex-col gap-2", accentMap[accent])}>
      <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <p className="text-xl font-black text-on-surface leading-none">{value}</p>
      <p className="text-[9px] font-bold text-secondary uppercase tracking-widest leading-tight">{label}</p>
    </div>
  );
}
