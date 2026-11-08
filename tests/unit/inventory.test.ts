import { describe, it, expect, vi, beforeEach } from 'vitest';

// Firestore simulado: insumos y productos en memoria; se registran los descuentos aplicados
const supplies: Record<string, any> = {
  's-fresa': { name: 'Fresa', category: 'Frutas', currentStock: 1000 },
  's-arequipe': { name: 'Arequipe', category: 'Salsas', currentStock: 1000 },
  's-helado': { name: 'Helado', category: 'Helados', currentStock: 1000 },
  's-vaso': { name: 'Vaso 10 onzas', category: 'Desechables', currentStock: 100 },
};
const products: Record<string, any> = {
  ensalada: { name: 'Ensalada de Frutas', recipe: [{ supplyId: 's-helado', name: 'Helado', quantity: 1, unit: 'bola' }] },
  oblea: { name: 'Oblea Tradicional', recipe: [{ supplyId: 's-arequipe', name: 'Arequipe', quantity: 20, unit: 'g' }] },
};
const applied: Record<string, number> = {};

vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (_db: unknown, col: string, id: string) => ({ col, id }),
  getDocs: async () => ({ docs: Object.entries(supplies).map(([id, data]) => ({ id, data: () => data })) }),
  getDoc: async (ref: { id: string }) => ({ exists: () => !!products[ref.id], data: () => products[ref.id] }),
  increment: (n: number) => ({ inc: n }),
  updateDoc: async (ref: { id: string }, data: { currentStock: { inc: number } }) => {
    applied[ref.id] = (applied[ref.id] || 0) + data.currentStock.inc;
  },
}));

import { deductInventory, restoreInventory } from '../../src/utils/inventory';

const item = (over: Record<string, unknown>) => ({
  id: 'i1', productId: 'ensalada', productName: 'Ensalada de Frutas', variantLabel: 'Pequeña', description: '',
  flavors: [], fruitChoices: [], additions: [], quantity: 1, unitPrice: 12000, subtotal: 12000, ...over,
}) as any;

describe('Descuento de inventario al vender', () => {
  beforeEach(() => {
    for (const k of Object.keys(applied)) delete applied[k];
    vi.restoreAllMocks();
  });

  it('una ensalada con fruta escogida SÍ descuenta inventario (antes fallaba en silencio)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await deductInventory([item({ fruitChoices: ['Fresa'] })], [{ supplyId: 's-vaso', quantity: 1 }]);
    expect(errors).not.toHaveBeenCalled();
    expect(applied['s-helado']).toBeLessThan(0);
    expect(applied['s-fresa']).toBeLessThan(0);
    expect(applied['s-vaso']).toBe(-1);
  });

  it('una oblea con salsa incluida no descuenta dos veces la misma salsa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await deductInventory([item({ productId: 'oblea', productName: 'Oblea Tradicional', variantLabel: '', includedSauces: ['Arequipe'] })]);
    expect(applied['s-arequipe']).toBe(-20);
  });

  it('borrar una venta devuelve al inventario lo mismo que descontó', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const venta = [item({ fruitChoices: ['Fresa'], quantity: 2 })];
    await deductInventory(venta, [{ supplyId: 's-vaso', quantity: 2 }]);
    const descontado = { ...applied };
    for (const k of Object.keys(applied)) delete applied[k];
    await restoreInventory(venta, [{ supplyId: 's-vaso', quantity: 2 }]);
    for (const [id, n] of Object.entries(descontado)) expect(applied[id]).toBe(-n);
  });
});
