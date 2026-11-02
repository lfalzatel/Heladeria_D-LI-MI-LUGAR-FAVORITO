import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: {} }));

import {
  nextTableNumber, sortTables, tableLabelFromId, tableQrUrl,
  saveTableSession, getTableSession, clearTableSession, TableMeta,
} from '../../src/lib/tableOrders';

const mesa = (n: number, active = true, label = `Mesa ${n}`): TableMeta => ({ id: `mesa${n}`, label, order: n, active, qrKey: `k${n}` });

describe('Numeración de mesas', () => {
  it('la siguiente mesa es la primera libre', () => {
    expect(nextTableNumber([])).toBe(1);
    expect(nextTableNumber([mesa(1), mesa(2), mesa(3)])).toBe(4);
  });

  it('reutiliza el número de una mesa eliminada', () => {
    expect(nextTableNumber([mesa(1), mesa(2, false), mesa(3)])).toBe(2);
  });

  it('el punto de venta muestra solo las activas, en orden', () => {
    expect(sortTables([mesa(3), mesa(1), mesa(2, false)]).map(t => t.id)).toEqual(['mesa1', 'mesa3']);
  });

  it('nombre por defecto a partir del id', () => {
    expect(tableLabelFromId('mesa7')).toBe('Mesa 7');
  });
});

describe('Enlace del QR', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'https://heladeria.example' } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lleva la mesa, la clave y el nombre (codificado)', () => {
    expect(tableQrUrl('mesa4', 'clave123', 'Terraza 1')).toBe('https://heladeria.example/mesa/mesa4?k=clave123&n=Terraza%201');
  });
});

describe('Sesión de mesa del cliente', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T15:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('se guarda al escanear y se recupera', () => {
    saveTableSession('mesa2', 'clave', 'Mesa 2');
    expect(getTableSession()).toMatchObject({ tableId: 'mesa2', key: 'clave', label: 'Mesa 2' });
  });

  it('sin nombre en el QR usa "Mesa N"', () => {
    saveTableSession('mesa5', 'clave', null);
    expect(getTableSession()?.label).toBe('Mesa 5');
  });

  it('vence a las 6 horas (el cliente ya no está en el local)', () => {
    saveTableSession('mesa2', 'clave', 'Mesa 2');
    vi.setSystemTime(new Date('2026-11-01T20:59:00Z'));
    expect(getTableSession()).not.toBeNull();
    vi.setSystemTime(new Date('2026-11-01T21:01:00Z'));
    expect(getTableSession()).toBeNull();
  });

  it('"No estoy en el local" la borra', () => {
    saveTableSession('mesa2', 'clave', 'Mesa 2');
    clearTableSession();
    expect(getTableSession()).toBeNull();
  });
});
