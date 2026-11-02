import React, { useState } from 'react';
import { Check, X, BellRing, ChefHat, QrCode, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { TableRequest, acceptTableRequest, setTableRequestStatus } from '../lib/tableOrders';

function minutesAgo(req: TableRequest) {
  const ms = req.createdAt?.toMillis?.();
  if (!ms) return 'ahora';
  const min = Math.floor((Date.now() - ms) / 60000);
  return min < 1 ? 'ahora' : `hace ${min} min`;
}

/** Pedidos y llamados que llegan por el QR de la mesa activa en el Punto de Venta */
export default function TableRequestsPanel({ requests, staffUid }: { requests: TableRequest[]; staffUid: string }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (req: TableRequest, action: () => Promise<void>, okMsg: string) => {
    setBusyId(req.id);
    try {
      await action();
      toast.success(okMsg);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo actualizar el pedido');
    } finally {
      setBusyId(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 px-1">
      <AnimatePresence initial={false}>
        {requests.map(req => {
          const busy = busyId === req.id;
          const who = req.customerName || 'Cliente';

          if (req.kind === 'llamada') {
            return (
              <motion.div key={req.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-amber-950 truncate">{who} te está llamando</p>
                    <p className="text-[11px] font-bold text-amber-800">{req.tableLabel} · {minutesAgo(req)}</p>
                  </div>
                </div>
                <button disabled={busy} onClick={() => run(req, () => setTableRequestStatus(req.id, 'atendido', staffUid), 'Llamado atendido')}
                  className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 flex-shrink-0">
                  Atendido
                </button>
              </motion.div>
            );
          }

          const pending = req.status === 'pendiente';
          return (
            <motion.div key={req.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              className={cn('rounded-2xl border-2 p-3 flex flex-col gap-2', pending ? 'border-primary bg-primary/5 shadow-md' : 'border-emerald-300 bg-emerald-50')}>
              <header className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', pending ? 'bg-primary text-white' : 'bg-emerald-500 text-white')}>
                    {pending ? <QrCode className="w-5 h-5" /> : <ChefHat className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-on-surface truncate">
                      {pending ? 'Pedido por QR' : 'En preparación'} · {who}
                    </p>
                    <p className="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                      {req.tableLabel} · {minutesAgo(req)}
                      {req.isTakeout && <span className="inline-flex items-center gap-0.5 text-amber-700"><ShoppingBag className="w-3 h-3" />Para llevar</span>}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-primary flex-shrink-0">{formatCurrency(req.total)}</span>
              </header>

              <ul className="flex flex-col gap-1 pl-1">
                {req.items.map((it, i) => (
                  <li key={i} className="text-xs text-on-surface">
                    <span className="font-black">{it.quantity}×</span> {it.productName}
                    {it.variantLabel ? <span className="text-secondary"> ({it.variantLabel})</span> : null}
                    {[...(it.flavors || []), ...(it.fruitChoices || []), ...(it.additions || [])].length > 0 && (
                      <span className="block text-[11px] text-secondary pl-4">
                        {[...(it.flavors || []), ...(it.fruitChoices || []), ...(it.additions || [])].join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {req.note && <p className="text-[11px] font-bold text-secondary bg-white/70 rounded-lg px-2 py-1">📝 {req.note}</p>}

              {pending ? (
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => run(req, () => setTableRequestStatus(req.id, 'rechazado', staffUid), 'Pedido rechazado')}
                    className="px-3 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white text-xs font-black uppercase tracking-wider flex items-center gap-1 disabled:opacity-50">
                    <X className="w-4 h-4" /> Rechazar
                  </button>
                  <button disabled={busy} onClick={() => run(req, () => acceptTableRequest(req, staffUid), `Agregado a ${req.tableLabel}`)}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50">
                    <Check className="w-4 h-4" /> Aceptar y pasar a la mesa
                  </button>
                </div>
              ) : (
                <button disabled={busy} onClick={() => run(req, () => setTableRequestStatus(req.id, 'listo', staffUid), 'El cliente verá que su pedido está listo')}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <Check className="w-4 h-4" /> Marcar como listo
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </section>
  );
}
