import { describe, it, expect, vi } from 'vitest';

// El cálculo no necesita Firebase; se evita inicializar la conexión real
vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: {} }));

import {
  findMatchingSupply, calculateRecipeCost, calculateItemCostAndProfit, calculateSaleCostAndProfit,
} from '../../src/utils/costCalculator';

const supply = (id: string, name: string, price: number | undefined, category = 'General') =>
  ({ id, name, category, purchaseUnit: 'und', lastPurchasePrice: price, stockQuantity: 10, stockMinimum: 1 }) as any;

const supplies = [
  supply('helado', 'Helado de vainilla', 100, 'Helados'),
  supply('queso', 'Queso rallado', 50, 'Lácteos'),
  supply('salsa', 'Salsa de mora', 30, 'Salsas'),
  supply('fresa', 'Fresa', 40, 'Frutas'),
  supply('mango', 'Mango', 20, 'Frutas'),
  supply('vaso10', 'Vaso 10 onzas', 300, 'Desechables'),
  supply('vaso16', 'Vaso 16 onzas', 500, 'Desechables'),
  supply('tapa10', 'Tapa vaso 10 onzas', 120, 'Desechables'),
  supply('barquillo', 'Barquillo', 200, 'Adiciones'),
  supply('sinprecio', 'Lecherita', undefined, 'Lácteos'),
];

const ing = (supplyId: string, name: string, quantity: number) => ({ supplyId, name, quantity, unit: 'g' });

describe('findMatchingSupply: encontrar el insumo de cada ingrediente', () => {
  it('por id cuando tiene precio', () => {
    expect(findMatchingSupply('queso', supplies)?.id).toBe('queso');
  });

  it('por nombre, sin importar mayúsculas, tildes ni plural', () => {
    expect(findMatchingSupply('QUESO RALLADO', supplies)?.id).toBe('queso');
    expect(findMatchingSupply('Fresas', supplies)?.id).toBe('fresa');
  });

  it('no confunde tamaños de vaso ni tapas con vasos', () => {
    expect(findMatchingSupply('Vaso 16 onzas', supplies)?.id).toBe('vaso16');
    expect(findMatchingSupply('vasos 10 onza', supplies)?.id).toBe('vaso10');
    expect(findMatchingSupply('Tapa 10 onzas', supplies)?.id).toBe('tapa10');
  });
});

describe('calculateRecipeCost: costo de una receta', () => {
  const recipe = [ing('helado', 'Helado', 2), ing('queso', 'Queso', 1), ing('salsa', 'Salsa', 1)];

  it('suma precio × cantidad de cada ingrediente', () => {
    expect(calculateRecipeCost(recipe, supplies)).toBe(2 * 100 + 50 + 30);
  });

  it('receta vacía o insumo sin precio cuestan 0', () => {
    expect(calculateRecipeCost([], supplies)).toBe(0);
    expect(calculateRecipeCost(undefined, supplies)).toBe(0);
    expect(calculateRecipeCost([ing('sinprecio', 'Lecherita', 3)], supplies)).toBe(0);
  });

  it('busca por nombre si el ingrediente no tiene id', () => {
    expect(calculateRecipeCost([ing('', 'Queso rallado', 2)], supplies)).toBe(100);
  });

  it('"Sin helado" y "Sin salsa" no cuentan esos ingredientes', () => {
    expect(calculateRecipeCost(recipe, supplies, { flavors: ['Sin Helado'] })).toBe(50 + 30);
    expect(calculateRecipeCost(recipe, supplies, { includedSauces: ['Sin salsa'] })).toBe(200 + 50);
  });

  it('las notas "sin queso" quitan el queso', () => {
    expect(calculateRecipeCost(recipe, supplies, { notes: 'por favor sin queso' })).toBe(200 + 30);
  });

  it('solo cuenta las frutas que el cliente escogió', () => {
    const frutas = [ing('fresa', 'Fresa', 1), ing('mango', 'Mango', 1)];
    expect(calculateRecipeCost(frutas, supplies)).toBe(60);
    expect(calculateRecipeCost(frutas, supplies, { fruitChoices: ['Mango'] })).toBe(20);
  });
});

describe('calculateItemCostAndProfit: costo y ganancia de un producto vendido', () => {
  const products = [
    {
      id: 'copa', name: 'Copa', recipe: [ing('helado', 'Helado', 1)],
      variants: [
        { label: 'Pequeña', price: 8000, recipe: [ing('helado', 'Helado', 1)] },
        { label: 'Grande', price: 12000, recipe: [ing('helado', 'Helado', 3)] },
      ],
    },
    { id: 'add-barquillo', name: 'Barquillo', recipe: [ing('barquillo', 'Barquillo', 1)] },
  ] as any[];

  it('usa la receta de la presentación elegida y multiplica por la cantidad', () => {
    const r = calculateItemCostAndProfit({ productId: 'copa', variantLabel: 'Grande', quantity: 2, unitPrice: 12000, subtotal: 24000 }, products, supplies);
    expect(r.unitCost).toBe(300);
    expect(r.itemCost).toBe(600);
    expect(r.unitProfit).toBe(11700);
    expect(r.itemProfit).toBe(23400);
  });

  it('suma el costo de las adiciones', () => {
    const r = calculateItemCostAndProfit({ productId: 'copa', variantLabel: 'Pequeña', quantity: 1, subtotal: 9000, additions: ['+Barquillo'] }, products, supplies);
    expect(r.unitCost).toBe(100 + 200);
    expect(r.itemProfit).toBe(9000 - 300);
  });

  it('respeta el costo guardado al momento de la venta (no lo recalcula con precios nuevos)', () => {
    const r = calculateItemCostAndProfit({ productId: 'copa', quantity: 1, subtotal: 8000, unitCost: 2500, itemCost: 2500 }, products, supplies);
    expect(r.unitCost).toBe(2500);
    expect(r.itemProfit).toBe(5500);
  });

  it('un producto que ya no existe no rompe el cálculo', () => {
    const r = calculateItemCostAndProfit({ productId: 'borrado', quantity: 1, subtotal: 5000 }, products, supplies);
    expect(r).toEqual({ unitCost: 0, itemCost: 0, unitProfit: 5000, itemProfit: 5000 });
  });
});

describe('calculateSaleCostAndProfit: costo y ganancia de una venta completa', () => {
  const products = [{ id: 'cono', name: 'Cono', recipe: [ing('helado', 'Helado', 1)] }] as any[];

  it('suma productos + empaques y calcula la ganancia', () => {
    const sale = {
      total: 10000,
      items: [{ productId: 'cono', quantity: 2, subtotal: 9000 }],
      packagingSupplies: [{ supplyId: 'vaso10', quantity: 2 }],
    };
    const r = calculateSaleCostAndProfit(sale, products, supplies);
    expect(r.packagingCost).toBe(600);
    expect(r.totalCost).toBe(200 + 600);
    expect(r.totalProfit).toBe(10000 - 800);
  });

  it('respeta el costo y la ganancia guardados en ventas antiguas', () => {
    const r = calculateSaleCostAndProfit({ total: 10000, items: [], productionCost: 3000, profit: 7000 }, products, supplies);
    expect(r.totalCost).toBe(3000);
    expect(r.totalProfit).toBe(7000);
  });

  it('venta vacía o nula da cero', () => {
    expect(calculateSaleCostAndProfit(null, products, supplies).totalCost).toBe(0);
  });
});
