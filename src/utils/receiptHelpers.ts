import { formatCurrency } from '../lib/utils';

export interface ReceiptItem {
  productName: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  flavors?: any[];
  fruitChoices?: any[];
  additions?: string[];
  extraFruits?: string[];
  extraFlavors?: string[];
  extraSauces?: string[];
  includedSauces?: string[];
  baseChoice?: string;
  customSelections?: Record<string, string>;
  notes?: string;
}

export interface ReceiptData {
  id?: string;
  tableName?: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  clienteName?: string;
  date?: string;
  hour?: string;
}

/**
 * Formatea una venta en un texto limpio y premium para WhatsApp
 */
export function formatReceiptText(sale: ReceiptData): string {
  const brandName = "🍦 *D'LI Heladería - Lugar Favorito* 🍦";
  const title = "📄 *RECIBO DE PAGO DIGITAL*";
  const dateStr = sale.date ? `${sale.date} ${sale.hour || ''}` : new Date().toLocaleString('es-CO');
  const code = sale.id ? sale.id.slice(-6).toUpperCase() : 'VENTA-POS';
  
  let text = `${brandName}\n${title}\n`;
  text += `------------------------------------------\n`;
  text += `*Código:* #${code}\n`;
  text += `*Fecha:* ${dateStr}\n`;
  if (sale.clienteName) {
    text += `*Cliente:* ${sale.clienteName}\n`;
  }
  if (sale.tableName) {
    text += `*Ubicación:* ${sale.tableName}\n`;
  }
  text += `*Pago:* ${sale.paymentMethod}\n`;
  text += `------------------------------------------\n\n`;

  sale.items.forEach((item, index) => {
    const variantStr = item.variantLabel ? ` (${item.variantLabel})` : '';
    text += `*${index + 1}. ${item.quantity}x ${item.productName}${variantStr}*\n`;
    text += `   _Precio unitario: ${formatCurrency(item.unitPrice)}_\n`;
    text += `   _Subtotal: ${formatCurrency(item.subtotal)}_\n`;

    // Detalles e ingredientes
    const details: string[] = [];

    // Sabores de helado
    const flavors = item.flavors || [];
    if (flavors.length > 0) {
      const names = flavors.map(f => typeof f === 'object' ? f.name || f.label : f).join(', ');
      details.push(`🍦 Sabores: ${names}`);
    }

    // Frutas
    const fruits = item.fruitChoices || [];
    if (fruits.length > 0) {
      const names = fruits.map(f => typeof f === 'object' ? f.name || f.label : f).join(', ');
      details.push(`🍓 Frutas: ${names}`);
    }

    // Salsas incluidas
    const sauces = item.includedSauces || [];
    if (sauces.length > 0) {
      details.push(`🍯 Salsas: ${sauces.join(', ')}`);
    }

    // Base
    if (item.baseChoice) {
      details.push(`🍪 Base: ${item.baseChoice}`);
    }

    // Custom Options
    if (item.customSelections) {
      Object.entries(item.customSelections).forEach(([key, val]) => {
        details.push(`✨ ${key}: ${val}`);
      });
    }

    // Adiciones extra
    const additionsList: string[] = [];
    if (item.extraFrutas && item.extraFrutas.length > 0) {
      additionsList.push(`Fruta [${item.extraFrutas.join(', ')}]`);
    }
    if (item.extraFlavors && item.extraFlavors.length > 0) {
      additionsList.push(`Helado [${item.extraFlavors.join(', ')}]`);
    }
    if (item.extraSauces && item.extraSauces.length > 0) {
      additionsList.push(`Salsa [${item.extraSauces.join(', ')}]`);
    }
    
    const otherAdds = (item.additions || []).filter(a => 
      !a.toLowerCase().includes('adición fruta') && 
      !a.toLowerCase().includes('adición helado') &&
      !a.toLowerCase().includes('adición salsa') &&
      !sauces.includes(a) &&
      !(item.extraSauces || []).includes(a)
    );
    if (otherAdds.length > 0) {
      additionsList.push(...otherAdds);
    }

    if (additionsList.length > 0) {
      details.push(`➕ Adiciones: ${additionsList.join(', ')}`);
    }

    if (item.notes) {
      details.push(`📝 Nota: ${item.notes}`);
    }

    if (details.length > 0) {
      text += details.map(d => `   • ${d}`).join('\n') + '\n';
    }
    text += `\n`;
  });

  text += `------------------------------------------\n`;
  text += `💰 *TOTAL PAGADO: ${formatCurrency(sale.total)}*\n`;
  text += `------------------------------------------\n\n`;
  text += `🛵 *Domicilio:* Valor del envío no incluido (se cancela al recibir).\n\n`;
  text += `¡Muchas gracias por elegir tu Lugar Favorito! ❤️\n`;
  text += `🍦 Heladería D'LI 🍦`;

  return text;
}

/**
 * Genera el enlace de WhatsApp (wa.me) pre-rellenado para el recibo
 */
export function generateWhatsAppReceiptLink(phone: string, sale: ReceiptData): string {
  const formattedText = formatReceiptText(sale);
  
  // Limpiar el número de teléfono
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Si tiene 10 dígitos (estándar de celular en Colombia), añadir el indicativo de país '57'
  if (cleanPhone.length === 10) {
    cleanPhone = '57' + cleanPhone;
  }
  
  // Enlace codificado
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(formattedText)}`;
}
