import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Las pruebas simulan un celular en Colombia (UTC-5), donde ocurría el error
const originalTZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/Bogota'; });
afterAll(() => { process.env.TZ = originalTZ; vi.useRealTimers(); });

import { localDateStr, parseLocalDate } from '../../src/utils/dates';

describe('Fechas locales (Colombia)', () => {
  it('una venta a las 9 p. m. queda con la fecha de HOY, no de mañana', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T02:00:00Z')); // 7-nov 9:00 p. m. en Colombia
    expect(localDateStr()).toBe('2026-11-07');
    // Así fallaba antes:
    expect(new Date().toISOString().split('T')[0]).toBe('2026-11-08');
    vi.useRealTimers();
  });

  it('un gasto con fecha "2026-11-07" se muestra el 7, no el 6', () => {
    const d = parseLocalDate('2026-11-07');
    expect(d.getDate()).toBe(7);
    expect(d.getMonth()).toBe(10);
    // Así fallaba antes:
    expect(new Date('2026-11-07').getDate()).toBe(6);
  });

  it('acepta fechas de Firestore (Timestamp), Date y vacías', () => {
    const ts = { toDate: () => new Date(2026, 10, 7, 15, 0) };
    expect(parseLocalDate(ts).getDate()).toBe(7);
    expect(parseLocalDate(new Date(2026, 0, 31)).getDate()).toBe(31);
    expect(parseLocalDate(null)).toBeInstanceOf(Date);
  });

  it('editar un gasto viejo (fecha Timestamp) llena el campo de fecha', () => {
    const viejo = { toDate: () => new Date('2026-07-23T17:00:00Z') };
    expect(localDateStr(parseLocalDate(viejo))).toBe('2026-07-23');
  });

  it('el primer día del mes no se pasa al mes anterior', () => {
    expect(parseLocalDate('2026-12-01').getMonth()).toBe(11);
    expect(localDateStr(parseLocalDate('2026-01-01'))).toBe('2026-01-01');
  });
});
