import React from 'react';

interface ReportTemplateProps {
  sellerName: string;
  dateStr: string;
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
  };
  ranking: { name: string; units: number; revenue: number }[];
}

export const DetailedReportTemplate: React.FC<ReportTemplateProps> = ({
  sellerName,
  dateStr,
  metrics,
  ranking
}) => {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const top10 = ranking.slice(0, 10);

  return (
    <div 
      id="image-report-container"
      className="bg-white p-8 w-[800px] text-slate-800"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="text-center mb-8 border-b-2 border-primary pb-4">
        <h1 className="text-3xl font-bold text-primary mb-2">D'LI - LUGAR FAVORITO</h1>
        <h2 className="text-xl text-slate-600 font-semibold mb-4">Reporte de Resumen Financiero</h2>
        <div className="flex justify-between text-sm text-slate-500">
          <p><strong>Fecha del reporte:</strong> {dateStr}</p>
          <p><strong>Generado por:</strong> {sellerName}</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold text-slate-800 mb-4 bg-slate-100 p-2 rounded">--- RESUMEN FINANCIERO ---</h3>
        <table className="w-full text-left border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-2 font-semibold">Ingresos Totales</td>
              <td className="py-2 text-right font-bold text-green-600">{formatMoney(metrics.totalIngresos)}</td>
            </tr>
            <tr className="text-slate-600 text-sm">
              <td className="py-1 pl-4">- Efectivo</td>
              <td className="py-1 text-right">{formatMoney(metrics.efectivo)}</td>
            </tr>
            <tr className="text-slate-600 text-sm">
              <td className="py-1 pl-4">- Tarjeta/Datafono</td>
              <td className="py-1 text-right">{formatMoney(metrics.tarjeta)}</td>
            </tr>
            <tr className="text-slate-600 text-sm border-b border-slate-200">
              <td className="py-1 pl-4 pb-2">- Transferencia/Nequi</td>
              <td className="py-1 pb-2 text-right">{formatMoney(metrics.transferencia)}</td>
            </tr>
            
            <tr className="border-b border-slate-200 bg-orange-50">
              <td className="py-2 text-orange-700">Ventas a Crédito (No sumadas a caja)</td>
              <td className="py-2 text-right font-semibold text-orange-700">{formatMoney(metrics.totalCredito)}</td>
            </tr>
            <tr className="border-b border-slate-200 bg-red-50">
              <td className="py-2 text-red-700">Gastos en Compras (Mercancía)</td>
              <td className="py-2 text-right font-semibold text-red-700">{formatMoney(metrics.totalCompras)}</td>
            </tr>
            {metrics.totalGastosOperativos !== undefined && (
              <tr className="border-b border-slate-200 bg-red-50">
                <td className="py-2 text-red-700">Gastos Operativos (Fijos/Var.)</td>
                <td className="py-2 text-right font-semibold text-red-700">{formatMoney(metrics.totalGastosOperativos)}</td>
              </tr>
            )}
            <tr className="bg-primary/10">
              <td className="py-3 font-bold text-primary text-lg">Ganancia Neta (Caja - Compras - Gastos)</td>
              <td className="py-3 text-right font-bold text-primary text-lg">{formatMoney(metrics.gananciaNeta)}</td>
            </tr>
            {metrics.totalPremiosFidelidad !== undefined && (
              <tr className="border-t border-slate-200 bg-fuchsia-50">
                <td className="py-2 text-fuchsia-700 font-semibold">Premios de Fidelidad Entregados</td>
                <td className="py-2 text-right font-bold text-fuchsia-700">{metrics.totalPremiosFidelidad} uds</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 bg-slate-100 p-2 rounded">--- TOP 10 PRODUCTOS MÁS VENDIDOS ---</h3>
        {top10.length === 0 ? (
          <p className="text-slate-500 italic text-center py-4">No hay ventas de productos registradas en este período.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 text-slate-600">
                <th className="py-2 font-semibold">Producto</th>
                <th className="py-2 font-semibold text-center">Unidades Vendidas</th>
                <th className="py-2 font-semibold text-right">Ingresos Generados</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((prod, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="py-2 text-slate-800">{prod.name}</td>
                  <td className="py-2 text-center font-medium text-primary">{prod.units}</td>
                  <td className="py-2 text-right text-slate-700">{formatMoney(prod.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-slate-400 pt-4 border-t border-slate-200">
        <p>Reporte generado automáticamente por Sistema Heladería D'LI</p>
      </div>
    </div>
  );
};
