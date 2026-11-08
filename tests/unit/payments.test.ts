import { describe, it, expect } from 'vitest';
import { toSalePaymentMethod } from '../../src/utils/payments';

describe('Método de pago de los pedidos a domicilio al pasar a venta', () => {
  it('convierte lo que guarda el pedido a lo que acepta la venta', () => {
    expect(toSalePaymentMethod('efectivo')).toBe('Efectivo');
    expect(toSalePaymentMethod('transferencia')).toBe('Transferencia');
    expect(toSalePaymentMethod('datafono')).toBe('Tarjeta');
    expect(toSalePaymentMethod('credito')).toBe('credito');
  });

  it('respeta los que ya vienen bien', () => {
    for (const m of ['Efectivo', 'Transferencia', 'Tarjeta', 'Mixto'] as const) expect(toSalePaymentMethod(m)).toBe(m);
  });

  it('si no hay método, queda en efectivo', () => {
    expect(toSalePaymentMethod(undefined)).toBe('Efectivo');
    expect(toSalePaymentMethod('')).toBe('Efectivo');
  });
});
