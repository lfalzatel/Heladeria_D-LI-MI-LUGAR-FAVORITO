import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, DollarSign, CreditCard, TrendingUp, Trophy, Clock,
  AlertTriangle, ShoppingCart, ArrowRight, Box, Banknote,
  Smartphone, ChevronLeft, ShoppingBag
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import MovementDetailModal from './MovementDetailModal';
import { useAuthStore } from '../stores/useAuthStore';

// ── SHARED MODAL WRAPPER ──
function ModalWrapper({ isOpen, onClose, children }: {
  isOpen: boolean; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full sm:max-w-sm bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden"
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-10 h-1 bg-outline/30 rounded-full" />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ModalHeader({ icon, iconBg, title, subtitle, onClose }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string; onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm', iconBg)}>
          {icon}
        </div>
        <div>
          <h3 className="font-headline font-black text-xl text-on-surface leading-tight">{title}</h3>
          <p className="text-[9px] font-black text-secondary uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-all active:scale-90 mt-1"
      >
        <X className="w-4 h-4 text-secondary" />
      </button>
    </div>
  );
}

function ModalFooter({ label = 'CERRAR DETALLE', onClick }: { label?: string; onClick: () => void }) {
  return (
    <div className="px-6 py-4 border-t border-outline/10 flex-shrink-0">
      <button
        onClick={onClick}
        className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-secondary hover:text-on-surface transition-colors"
      >
        {label}
      </button>
    </div>
  );
}

// ── 1. INGRESOS MODAL ──
export function IngresosModal({ isOpen, onClose, filter, efectivo, tarjeta, transferencia }: {
  isOpen: boolean; onClose: () => void; filter: string;
  efectivo: number; tarjeta: number; transferencia: number;
}) {
  const rows = [
    { icon: <Banknote className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', label: 'Efectivo', value: efectivo },
    { icon: <CreditCard className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', label: 'Tarjeta / Datáfono', value: tarjeta },
    { icon: <Smartphone className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50', label: 'Transferencia / Digital', value: transferencia },
  ];
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
        iconBg="bg-emerald-50"
        title="Desglose de Ingresos"
        subtitle={`INGRESOS RECIBIDOS (${filter.toUpperCase()})`}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-2 flex flex-col gap-3">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl border border-outline/10">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', row.bg)}>{row.icon}</div>
              <p className="font-bold text-on-surface text-sm">{row.label}</p>
            </div>
            <p className="font-black text-on-surface">{formatCurrency(row.value)}</p>
          </div>
        ))}
      </div>
      <ModalFooter onClick={onClose} />
    </ModalWrapper>
  );
}

// ── 2. VENTAS A CRÉDITO MODAL ──
export function VentasCreditoModal({ isOpen, onClose, filter, creditPedidos }: {
  isOpen: boolean; onClose: () => void; filter: string; creditPedidos: any[];
}) {
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const { profile } = useAuthStore();
  const [chatMsg, setChatMsg] = useState('');
  const total = creditPedidos.reduce((s, p) => s + (p.total || 0), 0);

  const fmtTime = (p: any) => {
    const ts = p.createdAt || p.timestamp;
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <>
      <ModalWrapper isOpen={isOpen} onClose={onClose}>
        <ModalHeader
          icon={<CreditCard className="w-6 h-6 text-orange-600" />}
          iconBg="bg-orange-50"
          title="Ventas a Crédito"
          subtitle={`MONTO PENDIENTE POR COBRAR (${filter.toUpperCase()})`}
          onClose={onClose}
        />
        <div className="flex-1 overflow-y-auto px-6 pb-2 flex flex-col gap-3">
          <div className="flex gap-3">
            {[{ label: 'Total Créditos', val: formatCurrency(total), icon: <Clock className="w-4 h-4 text-orange-500" /> },
              { label: 'Número de Ventas', val: String(creditPedidos.length), icon: <ShoppingCart className="w-4 h-4 text-orange-500" /> }
            ].map(item => (
              <div key={item.label} className="flex-1 p-3 bg-surface-container-lowest rounded-2xl border border-outline/10 flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">{item.icon}</div>
                <div>
                  <p className="text-[8px] font-black text-secondary uppercase tracking-widest leading-tight">{item.label}</p>
                  <p className="font-black text-on-surface text-sm">{item.val}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">Ventas del Período</p>
            <span className="text-[9px] font-black text-secondary">{creditPedidos.length} totales</span>
          </div>
          <div className="flex flex-col gap-2 pb-2">
            {creditPedidos.length === 0 ? (
              <div className="py-12 flex flex-col items-center opacity-30">
                <ShoppingCart className="w-10 h-10 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Sin ventas a crédito</p>
              </div>
            ) : creditPedidos.map(p => (
              <div key={p.id} className="p-4 bg-white rounded-2xl border border-outline/10 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">{p.clienteName || 'Cliente'}</p>
                      <p className="text-[10px] text-secondary font-bold">{fmtTime(p)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="font-black text-orange-600">{formatCurrency(p.total)}</p>
                    <button
                      onClick={() => setSelectedPedido(p)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-surface-container rounded-xl text-[9px] font-black uppercase tracking-widest text-secondary hover:text-primary transition-all"
                    >
                      Ver <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ModalFooter onClick={onClose} />
      </ModalWrapper>
      <MovementDetailModal
        isOpen={!!selectedPedido}
        onClose={() => setSelectedPedido(null)}
        data={selectedPedido}
        profile={profile}
        chatMessage={chatMsg}
        setChatMessage={setChatMsg}
        onSendMessage={async () => {}}
        isSending={false}
      />
    </>
  );
}

// ── 3. GANANCIA MODAL ──
export function GananciaModal({ isOpen, onClose, filter, totalIngresos, totalCompras, totalCredito }: {
  isOpen: boolean; onClose: () => void; filter: string;
  totalIngresos: number; totalCompras: number; totalCredito: number;
}) {
  const saldoFinal = totalIngresos - totalCompras;
  const costoRef = totalIngresos + totalCredito;
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
        iconBg="bg-emerald-50"
        title="Cálculo de Ganancia"
        subtitle={`FLUJO DE CAJA Y UTILIDAD (${filter.toUpperCase()})`}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-2 flex flex-col gap-3">
        <div className="flex justify-between items-center py-2">
          <p className="text-sm font-bold text-on-surface">Ingresos Recibidos</p>
          <p className="font-black text-emerald-600">+ {formatCurrency(totalIngresos)}</p>
        </div>
        <div className="h-px bg-outline/10" />
        <div className="flex justify-between items-center py-2">
          <p className="text-sm font-bold text-on-surface">Gasto en Compras (Mercancía)</p>
          <p className="font-black text-red-500">- {formatCurrency(totalCompras)}</p>
        </div>
        {totalCredito > 0 && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Ventas a Crédito Pendiente</p>
              <p className="font-black text-red-600">{formatCurrency(totalCredito)}</p>
            </div>
            <p className="text-[10px] text-red-500/80 font-medium leading-snug">
              Dinero aún no recibido. Es una pérdida de flujo hasta que el cliente pague.
            </p>
          </div>
        )}
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Referencia de Costo de Venta</p>
            <p className="font-black text-amber-600">{formatCurrency(costoRef)}</p>
          </div>
          <p className="text-[10px] text-amber-600/70 font-medium leading-snug">
            Valor de lo vendido en este periodo sin considerar inversión en stock.
          </p>
        </div>
        <div className="p-5 bg-on-surface rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Saldo Final (Caja)</p>
            <p className="text-3xl font-black text-white">{formatCurrency(saldoFinal)}</p>
          </div>
          <TrendingUp className={cn('w-7 h-7', saldoFinal >= 0 ? 'text-emerald-400' : 'text-red-400')} />
        </div>
      </div>
      <ModalFooter onClick={onClose} />
    </ModalWrapper>
  );
}

// ── 4. RANKING MODAL ──
export function RankingModal({ isOpen, onClose, filter, ranking }: {
  isOpen: boolean; onClose: () => void; filter: string;
  ranking: { name: string; units: number; revenue: number }[];
}) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        icon={<Trophy className="w-6 h-6 text-amber-600" />}
        iconBg="bg-amber-50"
        title="Ranking de Productos"
        subtitle={`TOP 20 • ${filter.toUpperCase()}`}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {ranking.length === 0 ? (
          <div className="py-16 flex flex-col items-center opacity-30">
            <ShoppingBag className="w-12 h-12 mb-3" />
            <p className="text-xs font-bold uppercase tracking-widest">Sin datos de ventas</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-1 px-3 pb-2">
              <p className="col-span-1 text-[8px] font-black text-secondary uppercase">#</p>
              <p className="col-span-6 text-[8px] font-black text-secondary uppercase">Producto</p>
              <p className="col-span-2 text-[8px] font-black text-secondary uppercase text-right">Uds</p>
              <p className="col-span-3 text-[8px] font-black text-secondary uppercase text-right">Ingreso</p>
            </div>
            <div className="flex flex-col gap-1 pb-2">
              {ranking.map((item, i) => (
                <div key={item.name} className={cn(
                  'grid grid-cols-12 gap-1 items-center p-3 rounded-2xl',
                  i === 0 ? 'bg-amber-50 border border-amber-100' : 'bg-surface-container-lowest border border-outline/5'
                )}>
                  <span className={cn('col-span-1 text-xs font-black', i === 0 ? 'text-amber-600' : 'text-secondary/40')}>{i + 1}</span>
                  <p className="col-span-6 text-xs font-bold text-on-surface truncate">{item.name}</p>
                  <p className="col-span-2 text-xs font-black text-on-surface text-right">{item.units}</p>
                  <p className="col-span-3 text-[10px] font-black text-primary text-right">{formatCurrency(item.revenue)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <ModalFooter onClick={onClose} />
    </ModalWrapper>
  );
}

// ── 5. DEUDA CLIENTES MODAL ──
export function DeudaClientesModal({ isOpen, onClose, deudaByClient, totalDeuda }: {
  isOpen: boolean; onClose: () => void; totalDeuda: number;
  deudaByClient: { clienteId: string; name: string; total: number; pedidos: any[] }[];
}) {
  const [selectedClient, setSelectedClient] = useState<typeof deudaByClient[0] | null>(null);

  const fmtDate = (p: any) => {
    const ts = p.createdAt || p.timestamp;
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      {/* Level 2 */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute inset-0 bg-white z-10 flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-6 pt-5 pb-4 flex-shrink-0 border-b border-outline/10">
              <button onClick={() => setSelectedClient(null)} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-secondary" />
              </button>
              <div>
                <h3 className="font-bold text-base text-on-surface">{selectedClient.name}</h3>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Deuda: {formatCurrency(selectedClient.total)}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
              {selectedClient.pedidos.map(p => (
                <div key={p.id} className="p-4 bg-surface-container-lowest rounded-2xl border border-outline/10">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-sm text-on-surface">Pedido a Crédito</p>
                      <p className="text-[10px] text-secondary font-bold">{fmtDate(p)}</p>
                    </div>
                    <p className="font-black text-orange-600">{formatCurrency(p.total)}</p>
                  </div>
                  {p.items?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.items.slice(0, 3).map((item: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-white rounded-lg text-[9px] font-bold text-secondary border border-outline/10">
                          {item.productName} ×{item.quantity}
                        </span>
                      ))}
                      {p.items.length > 3 && <span className="px-2 py-0.5 bg-primary/5 rounded-lg text-[9px] font-bold text-primary">+{p.items.length - 3} más</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <ModalFooter onClick={() => setSelectedClient(null)} label="← VOLVER" />
          </motion.div>
        )}
      </AnimatePresence>

      <ModalHeader
        icon={<Clock className="w-6 h-6 text-orange-600" />}
        iconBg="bg-orange-50"
        title="Deuda Clientes"
        subtitle="CARTERA HISTÓRICA TOTAL"
        onClose={onClose}
      />
      <div className="px-6 pb-3 flex-shrink-0">
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex justify-between items-center">
          <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Total en Cartera</p>
          <p className="font-black text-orange-600 text-xl">{formatCurrency(totalDeuda)}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-2 flex flex-col gap-2">
        {deudaByClient.length === 0 ? (
          <div className="py-12 flex flex-col items-center opacity-30">
            <Clock className="w-10 h-10 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Sin deudas registradas</p>
          </div>
        ) : deudaByClient.map(client => (
          <button
            key={client.clienteId}
            onClick={() => setSelectedClient(client)}
            className="w-full p-4 bg-white rounded-2xl border border-outline/10 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-base">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-on-surface">{client.name}</p>
                  <p className="text-[9px] text-secondary font-bold">{client.pedidos.length} pedido{client.pedidos.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-black text-orange-600">{formatCurrency(client.total)}</p>
                <ArrowRight className="w-4 h-4 text-secondary/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </button>
        ))}
      </div>
      <ModalFooter onClick={onClose} />
    </ModalWrapper>
  );
}

// ── 6. STOCK CRÍTICO MODAL ──
export function StockCriticoModal({ isOpen, onClose, criticalSupplies }: {
  isOpen: boolean; onClose: () => void; criticalSupplies: any[];
}) {
  const navigate = useNavigate();
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
        iconBg="bg-orange-50"
        title="Stock Crítico"
        subtitle={`${criticalSupplies.length} PRODUCTOS CON 5 UNIDADES O MENOS`}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-2 flex flex-col gap-2">
        {criticalSupplies.length === 0 ? (
          <div className="py-12 flex flex-col items-center opacity-30">
            <Box className="w-10 h-10 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">¡Todo el stock en niveles normales!</p>
          </div>
        ) : criticalSupplies.map(s => {
          const isCero = s.currentStock === 0;
          return (
            <div key={s.id} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-outline/10 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center flex-shrink-0 overflow-hidden">
                {s.imageUrl ? (
                  <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <Box className="w-6 h-6 text-secondary/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-on-surface truncate">{s.name}</p>
                <span className="text-[9px] font-black text-secondary uppercase tracking-widest">{s.category || 'Insumo'}</span>
              </div>
              <div className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest',
                isCero ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
              )}>
                Stock: {s.currentStock}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-6 py-4 border-t border-outline/10 flex gap-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-2xl border border-outline/30 text-secondary text-xs font-black uppercase tracking-widest hover:bg-surface-container transition-all"
        >
          Cerrar
        </button>
        <button
          onClick={() => { onClose(); navigate('/admin/supplies'); }}
          className="flex-1 py-3 rounded-2xl bg-on-surface text-white text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <ShoppingCart className="w-4 h-4" /> Ir a Comprar
        </button>
      </div>
    </ModalWrapper>
  );
}
