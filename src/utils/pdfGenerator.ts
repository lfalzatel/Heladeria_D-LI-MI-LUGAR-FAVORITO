import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toJpeg, toPng } from 'html-to-image';

export async function generateDetailedPDF(
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
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const formatMoney = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    // --- ENCABEZADO ---
    pdf.setFontSize(18);
    pdf.setTextColor(219, 39, 119); // text-primary (pink-600)
    pdf.text("D'LI - LUGAR FAVORITO", 105, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Reporte General", 105, 27, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Fecha del reporte: ${dateStr}`, 15, 38);
    pdf.text(`Generado por: ${sellerName}`, 15, 44);

    let startY = 52;

    // --- RESUMEN FINANCIERO ---
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('--- RESUMEN FINANCIERO ---', 15, startY);
    startY += 5;

    autoTable(pdf, {
      startY: startY,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
      },
      body: [
        ['Ingresos Totales', formatMoney(metrics.totalIngresos)],
        ['  - Efectivo', formatMoney(metrics.efectivo)],
        ['  - Tarjeta/Datafono', formatMoney(metrics.tarjeta)],
        ['  - Transferencia/Nequi', formatMoney(metrics.transferencia)],
        ['Ventas a Crédito (No sumadas a caja)', formatMoney(metrics.totalCredito)],
        ['Egresos / Compras', formatMoney(metrics.totalCompras)],
        ['Ganancia Neta (Caja - Compras)', formatMoney(metrics.gananciaNeta)],
        ...(metrics.totalPremiosFidelidad !== undefined ? [['Premios Fidelidad Entregados', `${metrics.totalPremiosFidelidad} uds`]] : [])
      ],
      didParseCell: function(data) {
        if (data.row.index === 0) data.cell.styles.textColor = [22, 163, 74]; // green-600
        if (data.row.index === 4) data.cell.styles.textColor = [194, 65, 12]; // orange-700
        if (data.row.index === 5) data.cell.styles.textColor = [185, 28, 28]; // red-700
        if (data.row.index === 6) data.cell.styles.textColor = [219, 39, 119]; // pink-600
        if (data.row.index === 7) data.cell.styles.textColor = [192, 38, 211]; // fuchsia-600
      }
    });

    startY = (pdf as any).lastAutoTable.finalY + 15;

    // --- TOP 10 PRODUCTOS ---
    pdf.setFont('helvetica', 'bold');
    pdf.text('--- TOP 10 PRODUCTOS MÁS VENDIDOS ---', 15, startY);
    startY += 5;

    const top10 = ranking.slice(0, 10);
    if (top10.length === 0) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(10);
      pdf.text('No hay ventas de productos en este período.', 15, startY + 5);
      startY += 15;
    } else {
      const rankingBody = top10.map(prod => [
        prod.name, 
        prod.units.toString(), 
        formatMoney(prod.revenue)
      ]);

      autoTable(pdf, {
        startY: startY,
        head: [['Producto', 'Unidades Vendidas', 'Ingresos Generados']],
        body: rankingBody,
        theme: 'striped',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
          1: { halign: 'center', textColor: [219, 39, 119], fontStyle: 'bold' },
          2: { halign: 'right' }
        }
      });
      startY = (pdf as any).lastAutoTable.finalY + 15;
    }

    // --- DETALLE DE MOVIMIENTOS ---
    pdf.setFont('helvetica', 'bold');
    pdf.text('--- DETALLE DE MOVIMIENTOS ---', 15, startY);
    startY += 5;

    const movBody = activities.map(a => {
      const isSale = !a.type || a.type === 'sale' || a.type === 'online';
      const typeLabel = isSale ? 'Venta' : 'Compra';
      const dateObj = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) 
                  : a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt))
                  : new Date();
      
      let itemsStr = '-';
      if (isSale && a.items && Array.isArray(a.items)) {
         itemsStr = a.items.map((item: any) => `${item.quantity || 1}x ${item.productName || 'Prod'}`).join(', ');
      }

      return [
        dateObj.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }),
        typeLabel,
        a.clienteName || a.concept || a.description || 'Venta',
        itemsStr,
        a.paymentMethod || '-',
        formatMoney(a.total || 0),
        a.sellerName?.split(' ')[0] || '-'
      ];
    });

    if (movBody.length === 0) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(10);
      pdf.text('No hay movimientos en este período.', 15, startY + 5);
    } else {
      autoTable(pdf, {
        startY: startY,
        head: [['Fecha/Hora', 'Tipo', 'Descripción', 'Productos', 'Pago', 'Total', 'Vend.']],
        body: movBody,
        theme: 'grid',
        headStyles: { fillColor: [219, 39, 119], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 15 },
          2: { cellWidth: 35 },
          3: { cellWidth: 50 },
          4: { cellWidth: 15 },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 18 }
        }
      });
    }

    const blobUrl = URL.createObjectURL(pdf.output('blob'));

    return { 
      success: true, 
      pdf, 
      blobUrl,
      imgData: null // Usaremos otro método para la imagen
    };
  } catch (error) {
    console.error('Error generando PDF:', error);
    return { success: false };
  }
}

export async function captureReportImage(elementId: string): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) return null;
    
    // Temporarily ensure element is visible for capture
    const originalOpacity = element.style.opacity;
    element.style.opacity = '1';
    
    const pngData = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    
    element.style.opacity = originalOpacity;
    return pngData;
  } catch (error) {
    console.error('Error capturando imagen:', error);
    return null;
  }
}
