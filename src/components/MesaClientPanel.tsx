import React, { useEffect, useState } from 'react';
import { BellRing, Check, ChefHat, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, cn } from '../lib/utils';
import { notifyAdmins } from '../lib/notifications';
import { TableRequest, TableSession, listenMyTableRequests, sendTableRequest, clearTableSession } from '../lib/tableOrders';

const STATUS: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pendiente: { label: 'Enviado, esperando confirmación', icon: <Clock className="w-3.5 h-3.5" />, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  aceptado: { label: 'Recibido, en preparación', icon: <ChefHat className="w-3.5 h-3.5" />, cls: 'text-sky-700 bg-sky-50 border-sky-200' },
  listo: { label: '¡Listo!', icon: <Check className="w-3.5 h-3.5" />, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  rechazado: { label: 'No se pudo atender, pregunta en caja', icon: <X className="w-3.5 h-3.5" />, cls: 'text-red-700 bg-red-50 border-red-200' },
};

/** Encabezado del catálogo cuando el cliente entró por el QR de una mesa */
export default function MesaClientPanel({ session, customerName, refreshKey, onLeave }: {
  session: TableSession;
  customerName: string;
  refreshKey: number;
  onLeave: () => void;
}) {
  const [requests, setRequests] = useState<TableRequest[]>([]);
  const [calling, setCalling] = useState(false);

  useEffect(() => listenMyTableRequests(session.tableId, setRequests), [session.tableId, refreshKey]);

  const orders = requests.filter(r => r.kind === 'pedido');
  const bill = orders.filter(r => r.status === 'aceptado' || r.status === 'listo').reduce((s, r) => s + r.total, 0);

  const callStaff = async () => {
    setCalling(true);
    try {
      await sendTableRequest({ session, kind: 'llamada', customerName });
      notifyAdmins(`🔔 ${session.label}`, `${customerName || 'Un cliente'} te está llamando`).catch(() => {});
      toast.success('Listo, ya avisamos al personal 🙌');
    } catch (e: any) {
      console.error(e);
      toast.error('No pudimos avisar. Escanea de nuevo el QR de tu mesa o acércate a la caja.');
    } finally {
      setCalling(false);
    }
  };

  const leave = () => {
    clearTableSession();
    onLeave();
  };

  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-amber-50 to-primary/5 p-3 sm:p-4 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-xl flex-shrink-0">🍦</div>
          <div className="min-w-0">
            <p className="text-base font-black text-on-surface leading-tight">Estás en la {session.label}</p>
            <p className="text-[11px] text-secondary font-bold">Escoge, configura y envía: te lo llevamos a la mesa. Pagas en caja.</p>
          </div>
        </div>
        <button onClick={callStaff} disabled={calling}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-primary/30 text-primary text-xs font-black shadow-sm disabled:opacity-50 active:scale-95 transition-all">
          <BellRing className="w-4 h-4" /> Llamar
        </button>
      </div>

      {orders.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {orders.map(r => {
            const st = STATUS[r.status] || STATUS.pendiente;
            return (
              <div key={r.id} className={cn('flex items-center justify-between gap-2 rounded-xl border px-3 py-2', st.cls)}>
                <span className="text-xs font-bold flex items-center gap-1.5 min-w-0">
                  {st.icon}
                  <span className="truncate">{r.items.reduce((n, i) => n + i.quantity, 0)} producto(s) · {st.label}</span>
                </span>
                <span className="text-xs font-black flex-shrink-0">{formatCurrency(r.total)}</span>
              </div>
            );
          })}
          {bill > 0 && (
            <p className="text-right text-xs font-black text-on-surface pr-1">Tu cuenta hasta ahora: {formatCurrency(bill)}</p>
          )}
        </div>
      )}

      <button onClick={leave} className="self-start text-[10px] font-bold text-secondary underline">
        No estoy en el local
      </button>
    </section>
  );
}
