import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Plus, Download, Share2, RefreshCw, Trash2, Printer, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTableCartStore } from '../stores/useTableCartStore';
import { formatCurrency, cn } from '../lib/utils';
import { TableMeta, createTable, renameTable, regenerateTableKey, deleteTable, sortTables, tableQrUrl } from '../lib/tableOrders';

/** Tarjeta imprimible: nombre de la mesa + QR + instrucción */
async function makeQrCard(table: TableMeta): Promise<string> {
  const url = tableQrUrl(table.id, table.qrKey!, table.label);
  const qr = await QRCode.toDataURL(url, { width: 520, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#3b0a2a', light: '#ffffff' } });
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 860;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#db2777';
  ctx.fillRect(0, 0, canvas.width, 18);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3b0a2a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(table.label, 320, 104);
  ctx.fillStyle = '#db2777';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Escanea y pide desde tu mesa', 320, 152);
  const img = new Image();
  img.src = qr;
  await img.decode();
  ctx.drawImage(img, 60, 184, 520, 520);
  ctx.fillStyle = '#6b7280';
  ctx.font = '26px sans-serif';
  ctx.fillText('Sin registrarte · Pagas en caja', 320, 752);
  ctx.fillStyle = '#3b0a2a';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText("D'LI Heladería — Mi Lugar Favorito", 320, 810);
  return canvas.toDataURL('image/png');
}

function fileName(table: TableMeta) {
  return `QR_${table.label.replace(/\s+/g, '_')}.png`;
}

function QrPreview({ table }: { table: TableMeta }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    if (table.qrKey) {
      QRCode.toDataURL(tableQrUrl(table.id, table.qrKey, table.label), { width: 240, margin: 1, color: { dark: '#3b0a2a', light: '#ffffff' } })
        .then(u => alive && setSrc(u));
    }
    return () => { alive = false; };
  }, [table.id, table.qrKey, table.label]);
  return src
    ? <img src={src} alt={`QR ${table.label}`} className="w-28 h-28 rounded-xl border border-outline/10 bg-white" />
    : <div className="w-28 h-28 rounded-xl bg-surface-container animate-pulse" />;
}

/** Gestión → Operación → Mesas: crear, renombrar, eliminar mesas y descargar sus QR */
export default function TablesManager() {
  const { tableMeta, carts, initialize, isInitialized } = useTableCartStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => initialize(), [initialize]);

  const tables = sortTables(Object.values(tableMeta));

  const act = async (id: string, fn: () => Promise<any>, ok?: string) => {
    setBusy(id);
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo completar la acción');
    } finally {
      setBusy(null);
    }
  };

  const download = (t: TableMeta) => act(t.id, async () => {
    const a = document.createElement('a');
    a.href = await makeQrCard(t);
    a.download = fileName(t);
    a.click();
  });

  const share = (t: TableMeta) => act(t.id, async () => {
    const blob = await (await fetch(await makeQrCard(t))).blob();
    const file = new File([blob], fileName(t), { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `QR ${t.label}` });
    } else {
      await download(t);
    }
  });

  const printAll = () => act('print', async () => {
    const cards = await Promise.all(tables.map(makeQrCard));
    const w = window.open('', '_blank');
    if (!w) throw new Error('Permite las ventanas emergentes para imprimir');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR de mesas</title>
      <style>body{margin:0;font-family:sans-serif}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8mm;padding:8mm}
      img{width:100%;border:1px dashed #ccc;break-inside:avoid}@media print{.grid{padding:0}}</style></head>
      <body><div class="grid">${cards.map(c => `<img src="${c}">`).join('')}</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    w.document.close();
  });

  const itemsIn = (id: string) => (carts[id]?.items || []).reduce((n, i) => n + i.quantity, 0);
  const totalIn = (id: string) => (carts[id]?.items || []).reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 w-full">
        <button onClick={() => act('new', async () => { const m = await createTable(Object.values(tableMeta)); toast.success(`${m.label} creada con su QR`); })}
          disabled={busy === 'new'}
          className="flex-1 py-4 bg-primary text-white rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all">
          <Plus className="w-5 h-5" /> Agregar mesa
        </button>
        <button onClick={printAll} disabled={busy === 'print' || tables.length === 0}
          className="px-5 py-4 bg-white text-on-surface border border-outline/20 rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-sm flex items-center gap-2 disabled:opacity-50">
          <Printer className="w-5 h-5" /> <span className="hidden sm:inline">Imprimir todos</span>
        </button>
      </div>

      <p className="text-[11px] text-secondary font-bold px-1">
        Cada mesa tiene su QR. El cliente lo escanea, ve el catálogo y su pedido llega al Punto de Venta para que lo aceptes.
      </p>

      {!isInitialized ? (
        <div className="h-32 rounded-3xl bg-surface-container animate-pulse" />
      ) : tables.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-outline/30 p-8 text-center text-sm font-bold text-secondary">
          Aún no hay mesas. Toca "Agregar mesa".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tables.map(t => {
            const count = itemsIn(t.id);
            const isEditing = editing?.id === t.id;
            const disabled = busy === t.id;
            return (
              <div key={t.id} className="bg-white rounded-3xl border border-outline/10 shadow-sm p-4 flex gap-4">
                <QrPreview table={t} />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input autoFocus value={editing.label} onChange={e => setEditing({ id: t.id, label: e.target.value })} maxLength={30}
                        className="flex-1 min-w-0 bg-surface-container rounded-xl px-3 py-1.5 text-sm font-black outline-none border border-primary/40" />
                      <button disabled={!editing.label.trim()} onClick={() => act(t.id, () => renameTable(t.id, editing.label), 'Nombre actualizado. Vuelve a imprimir su QR').then(() => setEditing(null))}
                        className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-black text-lg text-on-surface truncate">{t.label}</h4>
                      <button onClick={() => setEditing({ id: t.id, label: t.label })} className="text-secondary hover:text-primary" title="Cambiar nombre">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <span className={cn('self-start text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                    count > 0 ? 'bg-primary/10 text-primary' : 'bg-emerald-50 text-emerald-700')}>
                    {count > 0 ? `Ocupada · ${formatCurrency(totalIn(t.id))}` : 'Libre'}
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    <button disabled={disabled} onClick={() => download(t)} className="px-2.5 py-1.5 rounded-xl bg-surface-container text-[11px] font-bold flex items-center gap-1 disabled:opacity-50">
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </button>
                    <button disabled={disabled} onClick={() => share(t)} className="px-2.5 py-1.5 rounded-xl bg-surface-container text-[11px] font-bold flex items-center gap-1 disabled:opacity-50">
                      <Share2 className="w-3.5 h-3.5" /> Compartir
                    </button>
                    <button disabled={disabled} title="Genera un QR nuevo: el anterior deja de funcionar"
                      onClick={() => window.confirm(`¿Cambiar el QR de ${t.label}? El QR impreso actual dejará de funcionar y tendrás que imprimir el nuevo.`) && act(t.id, () => regenerateTableKey(t.id), 'QR cambiado. Imprime el nuevo')}
                      className="px-2.5 py-1.5 rounded-xl bg-surface-container text-[11px] font-bold flex items-center gap-1 disabled:opacity-50">
                      <RefreshCw className="w-3.5 h-3.5" /> Cambiar QR
                    </button>
                    <button disabled={disabled} title="Eliminar mesa"
                      onClick={() => window.confirm(`¿Eliminar ${t.label}? Su QR dejará de funcionar. El historial de ventas no se borra.`) && act(t.id, () => deleteTable(t.id, count), `${t.label} eliminada`)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
