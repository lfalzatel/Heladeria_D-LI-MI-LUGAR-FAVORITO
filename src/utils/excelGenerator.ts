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
    ['Egresos / Compras', metrics.totalCompras],
    ['Ganancia Neta (Caja - Compras)', metrics.gananciaNeta],
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
