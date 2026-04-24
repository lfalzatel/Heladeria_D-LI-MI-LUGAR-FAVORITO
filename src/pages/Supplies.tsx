import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Box, Plus, Package, AlertTriangle, ShoppingCart, Download, Calendar, Wallet, BarChart3, Edit3, Layers } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';
import AppHeader, { PageTitle } from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useAuthStore } from '../stores/useAuthStore';
import AdminSidebar from '../components/AdminSidebar';
import SupplyFormModal from '../components/SupplyFormModal';
import { PurchaseModal, PurchaseDetailModal, Supply, PurchaseItem, PurchaseRecord } from '../components/PurchaseModals';

export type PeriodFilter = 'today' | 'week' | 'month';
export const PERIOD_LABELS: Record<PeriodFilter, string> = { today: 'Hoy', week: 'Semana', month: 'Mes' };
export const toDateS = (ts: any): Date | null => { if (!ts) return null; if (ts.toDate) return ts.toDate(); return new Date(ts); };
export const isInPeriod = (ts: any, period: PeriodFilter): boolean => {
  const d = toDateS(ts); if (!d) return false;
  const now = new Date();
  if (period === 'today') return d.toDateString() === now.toDateString();
  if (period === 'week') { const s = new Date(now); s.setDate(now.getDate() - 7); return d >= s; }
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

/* ─── SVG TREND CHART ─── */
export function TrendChart({ purchases, period }: { purchases: PurchaseRecord[], period: PeriodFilter }) {
  const W = 320, H = 100, PAD = 10;
  if (purchases.length === 0) return (
    <div className="h-24 flex items-center justify-center opacity-20">
      <BarChart3 className="w-8 h-8" />
    </div>
  );

  // Group by day
  const byDay: Record<string, number> = {};
  purchases.forEach(p => {
    const d = toDateS(p.createdAt);
    if (d) { const k = d.toLocaleDateString('es-CO'); byDay[k] = (byDay[k] || 0) + p.total; }
  });
  const entries = Object.entries(byDay).slice(-14);
  const max = Math.max(...entries.map(e => e[1]), 1);
  const barW = Math.min(28, (W - PAD * 2) / Math.max(entries.length, 1) - 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
      {entries.map(([day, val], i) => {
        const bh = Math.max(4, ((val / max) * (H - PAD * 2 - 16)));
        const x = PAD + i * ((W - PAD * 2) / entries.length) + (W - PAD * 2) / entries.length / 2 - barW / 2;
        const y = H - PAD - bh - 16;
        return (
          <g key={day}>
            <rect x={x} y={y} width={barW} height={bh} rx={barW / 3} fill="url(#barGrad)" opacity="0.85" />
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b30069" />
          <stop offset="100%" stopColor="#b30069" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── STAT CARD ─── */
export function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode, label: string, value: string, sub?: string, accent: 'primary' | 'orange' | 'blue' | 'slate' }) {
  const map = { primary: 'bg-primary/5 border-primary/10', orange: 'bg-orange-50 border-orange-100', blue: 'bg-blue-50 border-blue-100', slate: 'bg-slate-50 border-slate-100' };
  return (
    <div className={cn("bg-white rounded-3xl p-4 border flex flex-col gap-2 shadow-sm", map[accent])}>
      <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">{icon}</div>
      <p className="text-lg font-black text-on-surface leading-none">{value}</p>
      <div>
        <p className="text-[9px] font-black text-secondary uppercase tracking-widest leading-tight">{label}</p>
        {sub && <p className="text-[9px] text-secondary/60 font-medium mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── PURCHASE HISTORY CARD ─── */
export function PurchaseCard({ purchase, onClick }: { purchase: PurchaseRecord, onClick: () => void }) {
  const d = toDateS(purchase.createdAt);
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dateStr = d ? `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : '';

  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl border border-outline/10 shadow-sm p-4 text-left hover:shadow-md hover:border-primary/20 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-black text-sm text-on-surface">{purchase.provider}</p>
          <p className="text-[10px] text-secondary font-bold mt-0.5">{dateStr}</p>
        </div>
        <p className="font-black text-primary text-base">{formatCurrency(purchase.total)}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {purchase.items?.slice(0, 4).map((item, i) => (
          <span key={i} className="px-2 py-0.5 bg-surface-container text-secondary text-[9px] font-bold rounded-lg border border-outline/10">{item.name} ×{item.quantity}</span>
        ))}
        {(purchase.items?.length || 0) > 4 && (
          <span className="px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded-lg">+{purchase.items.length - 4} más</span>
        )}
      </div>
    </button>
  );
}

/* ─── MAIN PAGE ─── */
export default function Supplies() {
  const { profile } = useAuthStore();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [activeTab, setActiveTab] = useState<'compras' | 'catalogo'>('compras');
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseRecord | null>(null);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [supplyToEdit, setSupplyToEdit] = useState<Supply | null>(null);

  useEffect(() => {
    if (!profile) return;
    const u1 = onSnapshot(query(collection(db, 'supplies'), orderBy('name', 'asc')), snap => setSupplies(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Supply[]));
    const u2 = onSnapshot(query(collection(db, 'supplyPurchases'), orderBy('createdAt', 'desc')), snap => setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PurchaseRecord[]));
    return () => { u1(); u2(); };
  }, [profile]);

  const filtered = purchases.filter(p => isInPeriod(p.createdAt, period));
  const periodTotal = filtered.reduce((a, p) => a + (p.total || 0), 0);
  const totalUnits = filtered.reduce((a, p) => a + (p.items?.reduce((b, i) => b + (i.quantity || 0), 0) || 0), 0);
  const activeDays = new Set(filtered.map(p => toDate(p.createdAt)?.toDateString()).filter(Boolean)).size;
  const avgPerPurchase = filtered.length > 0 ? periodTotal / filtered.length : 0;
  const lowStock = supplies.filter(s => s.currentStock <= s.minLimit).length;

  const handleConfirmPurchase = async (provider: string, items: PurchaseItem[]) => {
    const total = items.reduce((a, i) => a + i.cost * i.quantity, 0);
    await addDoc(collection(db, 'supplyPurchases'), { provider, items, total, createdAt: serverTimestamp() });
    for (const item of items) {
      await updateDoc(doc(db, 'supplies', item.supplyId), { currentStock: increment(item.quantity) });
    }
    toast.success('¡Compra registrada y stock actualizado!');
  };

  const handleSaveSupply = async (data: Partial<Supply>) => {
    if (supplyToEdit) {
      await updateDoc(doc(db, 'supplies', supplyToEdit.id), { ...data, updatedAt: serverTimestamp() });
      toast.success('Insumo actualizado');
    } else {
      await addDoc(collection(db, 'supplies'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast.success('Insumo creado');
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen relative pb-32">
        <AppHeader backTo="/admin/management" showBell={false} />
        <PageTitle title="Compras" subtitle="Dashboard de abastecimiento y gastos" />

        <main className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-5 w-full">
          {/* Tab switcher */}
          <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner">
            {(['compras', 'catalogo'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={cn("flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === t ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high")}>
                {t === 'compras' ? 'Compras & Historial' : 'Catálogo Base'}
              </button>
            ))}
          </div>

          {activeTab === 'compras' ? (
            <>
              {/* Period filter */}
              <div className="flex gap-1.5 p-1 bg-surface-container rounded-xl text-[10px] font-black uppercase">
                {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={cn("px-4 py-2 rounded-lg transition-all flex-1", period === p ? "bg-on-surface text-white shadow-sm" : "text-secondary hover:bg-surface")}>
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>


              {/* Register + Download */}
              <div className="flex gap-3">
                <button onClick={() => setIsPurchaseOpen(true)}
                  className="flex-1 py-4 bg-on-surface text-white rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all">
                  <Plus className="w-5 h-5 stroke-[3]" /> Registrar Compra
                </button>
                <button onClick={() => toast.info('Exportando informe...')}
                  className="w-14 h-14 bg-surface-container text-secondary rounded-2xl flex items-center justify-center border border-outline/20 hover:bg-surface hover:text-on-surface transition-all">
                  <Download className="w-5 h-5" />
                </button>
              </div>

              {/* 4 Stat cards */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<Wallet className="w-5 h-5 text-primary" />} label="Inversión" value={formatCurrency(periodTotal)} sub={`Gasto total en ${PERIOD_LABELS[period].toLowerCase()}`} accent="primary" />
                <StatCard icon={<Package className="w-5 h-5 text-blue-500" />} label="Productos Ingresados" value={totalUnits.toString()} sub="Total unidades compradas" accent="blue" />
                <StatCard icon={<Calendar className="w-5 h-5 text-orange-500" />} label="Días de Actividad" value={activeDays.toString()} sub="Días con registros de compra" accent="orange" />
                <StatCard icon={<ShoppingCart className="w-5 h-5 text-secondary" />} label="Promedio por Compra" value={formatCurrency(avgPerPurchase)} sub="Costo promedio de abastecimiento" accent="slate" />
              </div>


              {/* Low stock alert */}
              {lowStock > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <p className="text-xs font-bold text-orange-700">{lowStock} insumo{lowStock > 1 ? 's' : ''} con stock crítico. Considera abastecer pronto.</p>
                </div>
              )}

              {/* Trend chart */}
              <div className="bg-white rounded-[2rem] border border-outline/10 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center"><Wallet className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h4 className="font-black text-base text-on-surface">Tendencia de Inversión</h4>
                    <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Historial de gastos en mercancía</p>
                  </div>
                </div>
                <TrendChart purchases={filtered} period={period} />
              </div>

              {/* Purchase history */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Actividad</h3>
                  <span className="px-2.5 py-0.5 bg-surface-container text-secondary rounded-full text-[10px] font-black">{filtered.length} compras</span>
                </div>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-20">
                    <ShoppingCart className="w-12 h-12 mb-3" />
                    <p className="text-sm font-bold">Sin compras en este período</p>
                  </div>
                ) : (
                  filtered.map(p => <PurchaseCard key={p.id} purchase={p} onClick={() => setDetailPurchase(p)} />)
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setSupplyToEdit(null); setIsSupplyModalOpen(true); }}
                className="w-full py-4 bg-on-surface text-white rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all">
                <Plus className="w-5 h-5 stroke-[3]" /> Añadir Insumo Base
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {supplies.map(s => {
                  const isLow = s.currentStock <= s.minLimit;
                  return (
                    <div key={s.id} className={cn("bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-all hover:border-primary/30", isLow && "border-orange-200")}>
                      <div className="flex justify-between items-start mb-3">
                        <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", isLow ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary")}>
                          {isLow && '⚠ '}{s.category || 'Varios'}
                        </span>
                        <button onClick={() => { setSupplyToEdit(s); setIsSupplyModalOpen(true); }}
                          className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-all">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-bold text-base text-on-surface leading-tight mb-4">{s.name}</h4>
                      <div className="flex border-t border-outline/10 pt-4">
                        <div className="flex-1">
                          <p className="text-[10px] text-secondary font-black uppercase tracking-widest">En Stock</p>
                          <p className={cn("text-xl font-black", isLow ? "text-orange-500" : "text-on-surface")}>{s.currentStock} <span className="text-sm font-bold opacity-60">{s.unit}</span></p>
                        </div>
                        <div className="flex-1 text-right border-l border-outline/10 pl-4">
                          <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Alerta en</p>
                          <p className="text-sm font-bold text-secondary mt-1">{s.minLimit ?? 0} {s.unit}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {supplies.length === 0 && (
                <div className="py-20 flex flex-col items-center opacity-30 text-center">
                  <Layers className="w-16 h-16 mb-4" />
                  <p className="font-bold">No hay insumos base creados.</p>
                </div>
              )}
            </>
          )}
        </main>

        <SupplyFormModal isOpen={isSupplyModalOpen} onClose={() => setIsSupplyModalOpen(false)} supplyToEdit={supplyToEdit} onSave={handleSaveSupply} />
        <PurchaseModal isOpen={isPurchaseOpen} onClose={() => setIsPurchaseOpen(false)} supplies={supplies} onConfirm={handleConfirmPurchase} />
        <PurchaseDetailModal purchase={detailPurchase} onClose={() => setDetailPurchase(null)} />
        <BottomNav />
      </div>
    </div>
  );
}
