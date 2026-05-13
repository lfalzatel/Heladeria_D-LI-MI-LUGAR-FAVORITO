import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateDailyReportPDF(elementId: string, sellerName: string, dateStr: string) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Elemento no encontrado para PDF:', elementId);
      return false;
    }

    // Ocultar botones o elementos que no deban salir en el PDF
    const noPrintElements = element.querySelectorAll('.no-print');
    noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');

    const canvas = await html2canvas(element, {
      scale: 2, // Mejor resolución
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Restaurar los elementos ocultos
    noPrintElements.forEach(el => (el as HTMLElement).style.display = '');

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Título y Cabecera del PDF
    pdf.setFontSize(18);
    pdf.setTextColor(40, 40, 40);
    pdf.text("D'LI - LUGAR FAVORITO", pdfWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Reporte de Cierre de Caja", pdfWidth / 2, 28, { align: 'center' });

    pdf.setFontSize(10);
    pdf.text(`Fecha: ${dateStr}`, 15, 40);
    pdf.text(`Generado por: ${sellerName}`, 15, 46);

    // Insertar la captura del canvas
    pdf.addImage(imgData, 'JPEG', 15, 55, pdfWidth - 30, (pdfWidth - 30) * (canvas.height / canvas.width));

    pdf.save(`Cierre_Caja_${dateStr.replace(/\//g, '-')}_${sellerName}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generando PDF:', error);
    return false;
  }
}
