import { describe, it, expect } from 'vitest';
import { formatReceiptText, generateWhatsAppReceiptLink } from '../../src/utils/receiptHelpers';
import { formatCurrency } from '../../src/lib/utils';

const sale = {
  id: 'abc123xyz',
  tableName: 'Mesa 2',
  paymentMethod: 'Efectivo',
  clienteName: 'Ana',
  date: '2026-11-01',
  hour: '03:30 p. m.',
  total: 26000,
  items: [
    {
      productName: 'Ensalada de Frutas', variantLabel: 'Pequeña', quantity: 2, unitPrice: 13000, subtotal: 26000,
      flavors: ['Vainilla'], fruitChoices: ['Fresa'], extraFruits: ['Mango', 'Kiwi'],
      additions: ['Adición Fruta x2', 'Queso extra'], notes: 'sin salsa',
    },
  ],
};

describe('Recibo de WhatsApp', () => {
  const text = formatReceiptText(sale);

  it('muestra total, precios y datos de la venta', () => {
    expect(text).toContain(`TOTAL PAGADO: ${formatCurrency(26000)}`);
    expect(text).toContain(`Precio unitario: ${formatCurrency(13000)}`);
    expect(text).toContain('2x Ensalada de Frutas (Pequeña)');
    expect(text).toContain('#123XYZ');
    expect(text).toContain('Mesa 2');
    expect(text).toContain('Ana');
  });

  it('muestra las frutas adicionales que pagó el cliente', () => {
    expect(text).toContain('Fruta [Mango, Kiwi]');
  });

  it('muestra sabores, frutas, otras adiciones y notas', () => {
    expect(text).toContain('Sabores: Vainilla');
    expect(text).toContain('Frutas: Fresa');
    expect(text).toContain('Queso extra');
    expect(text).toContain('Nota: sin salsa');
  });

  it('formatea pesos colombianos sin decimales', () => {
    expect(formatCurrency(4500).replace(/\s/g, ' ')).toBe('$ 4.500');
    expect(formatCurrency(null).replace(/\s/g, ' ')).toBe('$ 0');
  });
});

describe('Enlace de WhatsApp', () => {
  it('agrega el indicativo 57 a celulares de 10 dígitos y limpia símbolos', () => {
    const link = generateWhatsAppReceiptLink('300 119-8206', sale);
    expect(link.startsWith('https://api.whatsapp.com/send?phone=573001198206&text=')).toBe(true);
  });

  it('no duplica el indicativo si ya viene', () => {
    expect(generateWhatsAppReceiptLink('+57 300 119 8206', sale)).toContain('phone=573001198206&');
  });
});
