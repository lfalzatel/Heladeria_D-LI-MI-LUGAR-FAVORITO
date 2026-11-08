import { describe, it, expect } from 'vitest';
import { isBusinessExpense } from '../../src/utils/expenses';

describe('Gastos del negocio vs gastos personales de clientes', () => {
  it('los gastos registrados en Gestión cuentan en los reportes', () => {
    expect(isBusinessExpense({ categoryId: 'pago-trabajadoras', categoryName: 'Pago trabajadoras', amount: 235000 } as any)).toBe(true);
  });

  it('siguen contando aunque quien los registró ahora sea cliente (caso de Lina)', () => {
    // El rol no importa: solo dónde se registró el gasto
    expect(isBusinessExpense({ categoryId: 'aseo', userId: 'cuenta-que-ahora-es-cliente' } as any)).toBe(true);
  });

  it('los gastos de "Mis Gastos" de un cliente no cuentan', () => {
    expect(isBusinessExpense({ category: 'Netflix', amount: 64900 } as any)).toBe(false);
    expect(isBusinessExpense({ category: 'Helado', origen: 'personal' } as any)).toBe(false);
  });

  it('un gasto marcado como personal no cuenta aunque traiga categoría', () => {
    expect(isBusinessExpense({ categoryId: 'x', origen: 'personal' })).toBe(false);
  });

  it('datos vacíos no rompen nada', () => {
    expect(isBusinessExpense(null)).toBe(false);
    expect(isBusinessExpense(undefined)).toBe(false);
  });
});
