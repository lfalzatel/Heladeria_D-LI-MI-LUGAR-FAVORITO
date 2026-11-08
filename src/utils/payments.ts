/**
 * Las ventas solo aceptan estos métodos de pago (así lo exigen las reglas de Firestore).
 * Los pedidos a domicilio guardan el método en minúscula ('efectivo', 'transferencia', 'datafono'),
 * así que hay que convertirlo antes de registrar la venta o la venta se rechaza.
 */
export type SalePaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Mixto' | 'credito';

export function toSalePaymentMethod(method: unknown): SalePaymentMethod {
  const m = String(method ?? '').trim().toLowerCase();
  if (m.startsWith('transfer') || m === 'nequi' || m === 'daviplata') return 'Transferencia';
  if (m === 'tarjeta' || m === 'datafono' || m === 'datáfono') return 'Tarjeta';
  if (m === 'mixto') return 'Mixto';
  if (m === 'credito' || m === 'crédito' || m === 'debe' || m === 'fiado') return 'credito';
  return 'Efectivo';
}
