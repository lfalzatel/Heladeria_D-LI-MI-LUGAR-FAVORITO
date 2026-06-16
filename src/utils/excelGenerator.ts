import * as XLSX from 'xlsx';

export function generateDashboardExcel(
  sellerName: string, 
  dateStr: string,
  metrics: {
    totalIngresos: number;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    totalCredito: number;
    totalCompras: number;
    totalGastosOperativos?: number;
    gananciaNeta: number;
    totalPremiosFidelidad?: number;
  },
  activities: any[],
  ranking: { name: string; units: number; revenue: number }[] = []
) {
  // Hoja 1: Resumen y Movimientos Integrados
  const reportData: any[][] = [
    ['REPORTE DE SISTEMA D\'LI - LUGAR FAVORITO'],
    [],
    ['Fecha del reporte:', dateStr],
    ['Generado por:', sellerName],
    [],
    ['--- RESUMEN FINANCIERO ---'],
    ['Ingresos Totales', metrics.totalIngresos],
    ['  - Efectivo', metrics.efectivo],
    ['  - Tarjeta/Datafono', metrics.tarjeta],
    ['  - Transferencia/Nequi', metrics.transferencia],
    ['Ventas a Crédito (No sumadas a caja)', metrics.totalCredito],
    ['Egresos / Gastos en Compras (Mercancía)', metrics.totalCompras],
    ...(metrics.totalGastosOperativos !== undefined ? [['Gastos Operativos (Fijos/Var.)', metrics.totalGastosOperativos]] : []),
    ['Ganancia Neta (Caja - Compras - Gastos)', metrics.gananciaNeta],
    ...(metrics.totalPremiosFidelidad !== undefined ? [['Premios Fidelidad Entregados', `${metrics.totalPremiosFidelidad} uds`]] : []),
    [],
    ['--- TOP 10 PRODUCTOS MÁS VENDIDOS ---'],
    ['Producto', 'Unidades Vendidas', 'Ingresos Generados']
  ];

  // Agregar el ranking (Top 10)
  const top10 = ranking.slice(0, 10);
  if (top10.length === 0) {
    reportData.push(['No hay ventas de productos en este período', '', '']);
  } else {
    top10.forEach(prod => {
      reportData.push([prod.name, prod.units, prod.revenue]);
    });
  }

  reportData.push([]);
  reportData.push(['--- DETALLE DE MOVIMIENTOS ---']);
  reportData.push(['Fecha/Hora', 'Tipo de Movimiento', 'Descripción / Cliente', 'Productos Vendidos', 'Método de Pago', 'Total', 'Vendedor']);

  // Agregar los movimientos
  activities.forEach(a => {
    const isSale = !a.type || a.type === 'sale' || a.type === 'online';
    const typeLabel = isSale ? 'Venta/Ingreso' : 'Compra/Egreso';
    const dateObj = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) 
                : a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt))
                : new Date();
    
    // Construir la cadena de productos si es venta
    let itemsStr = 'N/A';
    if (isSale && a.items && Array.isArray(a.items)) {
       itemsStr = a.items.map((item: any) => `${item.quantity || 1}x ${item.productName || 'Prod'}`).join(', ');
    }

    reportData.push([
      dateObj.toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      typeLabel,
      a.clienteName || a.concept || a.description || 'Venta',
      itemsStr,
      a.isMixto || a.splitDetails ? 'Mixto' : (a.paymentMethod || 'N/A'),
      a.total || 0,
      a.sellerName || 'N/A'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(reportData);

  // Ajustar anchos de columnas
  ws['!cols'] = [
    { wch: 25 }, // Fecha/Hora o Títulos
    { wch: 20 }, // Tipo o Valores
    { wch: 30 }, // Desc / Cliente
    { wch: 45 }, // Productos Vendidos
    { wch: 15 }, // Método de Pago
    { wch: 15 }, // Total
    { wch: 20 }  // Vendedor
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte General');

  const fileName = `Reporte_Excel_${dateStr.replace(/\//g, '-')}_${sellerName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function generatePurchasesExcel(
  sellerName: string, 
  dateStr: string,
  purchases: any[],
  totalGastado: number,
  ranking: any[] = []
) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const reportData: any[][] = [
    ['REPORTE DE COMPRAS D\'LI - LUGAR FAVORITO'],
    [],
    ['Fecha del reporte:', dateStr],
    ['Generado por:', sellerName],
    [],
    ['--- RESUMEN DE GASTOS ---'],
    ['Total Gastado en Compras', totalGastado],
    [],
    ['--- TOP INSUMOS COMPRADOS ---'],
    ['Insumo', 'Inversión']
  ];

  if (ranking.length === 0) {
    reportData.push(['No hay ranking en este período', '']);
  } else {
    ranking.slice(0, 10).forEach(r => {
      reportData.push([r.name, r.amount || r.revenue || 0]);
    });
  }

  reportData.push([]);
  reportData.push(['--- DETALLE DE COMPRAS ---']);
  reportData.push(['Fecha/Hora', 'Proveedor', 'Insumos', 'Pago', 'Total']);

  if (purchases.length === 0) {
    reportData.push(['No hay compras registradas en este período', '', '', '', '']);
  } else {
    purchases.forEach(p => {
      const dateObj = p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate() : (p.createdAt.seconds ? new Date(p.createdAt.seconds * 1000) : new Date(p.createdAt))) : new Date();
      
      let itemsStr = 'N/A';
      if (p.items && Array.isArray(p.items)) {
         itemsStr = p.items.map((i: any) => `${i.quantity}x ${i.name} (${formatMoney(i.cost)})`).join(', ');
      }

      reportData.push([
        dateObj.toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        p.provider || 'Proveedor Gral',
        itemsStr,
        p.paymentMethod || 'Efectivo',
        p.total || 0
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(reportData);

  ws['!cols'] = [
    { wch: 25 }, // Fecha/Hora
    { wch: 25 }, // Proveedor
    { wch: 60 }, // Insumos
    { wch: 15 }, // Pago
    { wch: 15 }  // Total
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Compras');

  const fileName = `Compras_Excel_${dateStr.replace(/\//g, '-')}_${sellerName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function generateExpenseExcel(
  sellerName: string, 
  dateStr: string,
  gastos: any[],
  totalGastado: number,
  ranking: any[] = []
) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const reportData: any[][] = [
    ['REPORTE DE GASTOS D\'LI - LUGAR FAVORITO'],
    [],
    ['Fecha del reporte:', dateStr],
    ['Generado por:', sellerName],
    [],
    ['--- RESUMEN DE GASTOS ---'],
    ['Total Gastado', totalGastado],
    [],
    ['--- TOP CATEGORÍAS ---'],
    ['Categoría', 'Total']
  ];

  if (ranking.length === 0) {
    reportData.push(['No hay ranking en este período', '']);
  } else {
    ranking.slice(0, 10).forEach(r => {
      reportData.push([`${r.emoji || ''} ${r.name}`, r.amount]);
    });
  }

  reportData.push([]);
  reportData.push(['--- DETALLE DE GASTOS ---']);
  reportData.push(['Fecha/Hora', 'Categoría', 'Descripción', 'Usuario', 'Pago', 'Monto']);

  if (gastos.length === 0) {
    reportData.push(['No hay gastos registrados en este período', '', '', '', '', '']);
  } else {
    gastos.forEach(g => {
      const dateObj = g.dateObj || (g.createdAt ? (g.createdAt.toDate ? g.createdAt.toDate() : (g.createdAt.seconds ? new Date(g.createdAt.seconds * 1000) : new Date(g.createdAt))) : new Date());
      
      reportData.push([
        dateObj.toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        `${g.categoryEmoji || ''} ${g.categoryName || 'Sin Categoría'}`,
        g.description || 'N/A',
        g.userName || 'Usuario',
        g.paymentMethod || 'Efectivo',
        g.amount || 0
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(reportData);

  ws['!cols'] = [
    { wch: 25 }, // Fecha/Hora
    { wch: 25 }, // Categoría
    { wch: 45 }, // Descripción
    { wch: 20 }, // Usuario
    { wch: 15 }, // Pago
    { wch: 15 }  // Monto
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Gastos');

  const fileName = `Gastos_Excel_${dateStr.replace(/\//g, '-')}_${sellerName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
