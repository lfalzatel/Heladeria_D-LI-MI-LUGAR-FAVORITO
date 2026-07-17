import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTableCartStore } from '../stores/useTableCartStore';
import { useHeaderStore } from '../stores/useHeaderStore';
import { 
  DollarSign, 
  CreditCard,
  Trophy,
  AlertCircle,
  Calendar,
  Download,
  Table as TableIcon,
  ChevronRight,
  ChevronLeft,
  X,
  TrendingDown,
  Users
} from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { generateDetailedPDF, captureReportImage } from '../utils/pdfGenerator';
import { DetailedReportTemplate } from '../components/DetailedReportTemplate';
import { generateDashboardExcel } from '../utils/excelGenerator';
import { toast } from 'sonner';

import {
  MetricCard,
  TrendChart,
  SaleCard,
  CalendarModal
} from '../components/DashboardComponents';

import { 
  IngresosModal, 
  RankingModal, 
  StockCriticoModal,
  VentasCreditoModal,
  GananciaModal,
  EgresosModal,
  DeudaClientesModal,
  PremiosModal
} from '../components/ReportsModals';
import MovementDetailModal from '../components/MovementDetailModal';
import ReportPreviewModal from '../components/ReportPreviewModal';

import { PeriodFilter, PERIOD_LABELS, toDateS, isInPeriod, getWeekBoundaries } from '../lib/dateUtils';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { carts, initialize } = useTableCartStore();
  const { setHeader, clearHeader } = useHeaderStore();

  const [dashboardFilter, setDashboardFilter] = useState<PeriodFilter>('today');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // Data state
  const [sales, setSales] = useState<any[]>([]);
  const [pedidosData, setPedidosData] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [gastosOperativos, setGastosOperativos] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [creditPedidos, setCreditPedidos] = useState<any[]>([]);
  
  // Modals state
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  const open = (name: string) => setOpenModal(name);
  const close = () => setOpenModal(null);

  // Export
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previewType, setPreviewType] = useState<'pdf' | 'excel' | 'image' | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    // Listen to SALES
    const qSales = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(1000));
    const unsubSales = onSnapshot(qSales, snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to DELIVERED PEDIDOS
    const qPedidos = query(
      collection(db, 'pedidos'), 
      where('status', '==', 'entregado'),
      orderBy('updatedAt', 'desc'),
      limit(1000)
    );
    const unsubPedidos = onSnapshot(qPedidos, snap => {
      setPedidosData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to SUPPLIES
    const qSupplies = query(collection(db, 'supplies'));
    const unsubSupplies = onSnapshot(qSupplies, snap => {
      setSupplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to PURCHASES (Egresos)
    const unsubPurchases = onSnapshot(query(collection(db, 'supplyPurchases'), orderBy('createdAt', 'desc'), limit(1000)), snap => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to GASTOS
    const unsubGastos = onSnapshot(query(collection(db, 'gastos'), orderBy('date', 'desc'), limit(1000)), snap => {
      setGastosOperativos(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          dateObj: data.date?.toDate ? data.date.toDate() : new Date(data.date)
        };
      }));
    });

    // Listen to CREDIT PEDIDOS
    const qCredit = query(
      collection(db, 'pedidos'),
      where('paymentMethod', '==', 'credito'),
      orderBy('createdAt', 'desc'),
      limit(1000)
    );
    const unsubCredit = onSnapshot(qCredit, snap => {
      setCreditPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCart = initialize();

    return () => {
      unsubSales();
      unsubPedidos();
      unsubSupplies();
      unsubPurchases();
      unsubGastos();
      unsubCredit();
      unsubCart();
    };
  }, [profile, initialize]);

  // All Activity unfiltered by date (for calendar colors)
  const allUnfilteredActivity = React.useMemo(() => {
    const items = [...sales];
    const salesPedidoIds = new Set(sales.map(s => s.pedidoId).filter(Boolean));
    
    pedidosData.forEach(p => {
      if (!salesPedidoIds.has(p.id)) {
        items.push({ ...p, type: 'online', isDirectPedido: true });
      }
    });

    return items.filter(item => {
      // Enforce Seller Role Filtering
      if (profile?.role === 'vendedor' && item.sellerId !== profile.uid) {
        return false;
      }
      return true;
    });
  }, [sales, pedidosData, profile]);

  // Combined Activity filtered
  const combinedActivity = React.useMemo(() => {
    return allUnfilteredActivity
      .filter(item => {
        const timestamp = item.timestamp || item.updatedAt || item.createdAt;
        return isInPeriod(timestamp, dashboardFilter, selectedDate, selectedMonth, selectedWeek);
      })
      .sort((a, b) => {
        const tA = toDateS(a.timestamp || a.updatedAt || a.createdAt)?.getTime() || 0;
        const tB = toDateS(b.timestamp || b.updatedAt || b.createdAt)?.getTime() || 0;
        return tB - tA;
      });
  }, [allUnfilteredActivity, dashboardFilter, selectedDate, selectedMonth, selectedWeek]);

  // â”€â”€ COMPUTED METRICS â”€â”€
  const ingresosSales = combinedActivity.filter(s => (s.paymentMethod || '').toLowerCase() !== 'credito');
  const totalIngresos = ingresosSales.reduce((s, x) => s + (x.total || 0), 0);
  
  let efectivo = 0;
  let tarjeta = 0;
  let transferencia = 0;

  ingresosSales.forEach(s => {
    if (s.isMixto || s.splitDetails) {
      efectivo += (s.splitDetails?.efectivo || 0);
      transferencia += (s.splitDetails?.transferencia || 0);
    } else {
      const pm = (s.paymentMethod || '').toLowerCase();
      if (['cash', 'efectivo', 'cash/efectivo'].includes(pm)) {
        efectivo += (s.total || 0);
      } else if (['datafono', 'card', 'tarjeta', 'débito', 'crédito'].includes(pm)) {
        tarjeta += (s.total || 0);
      } else if (['transfer', 'transferencia', 'digital', 'nequi', 'daviplata'].includes(pm)) {
        transferencia += (s.total || 0);
      } else {
        efectivo += (s.total || 0);
      }
    }
  });

  // Credit pedidos for current period
  const creditPedidosPeriod = creditPedidos.filter(p => isInPeriod(p.createdAt, dashboardFilter, selectedDate, selectedMonth, selectedWeek));
  const totalCredito = creditPedidosPeriod.reduce((s, p) => s + (p.total || 0), 0);

  // Supply purchases for current period
  const purchasesPeriod = purchases.filter(p => isInPeriod(p.createdAt, dashboardFilter, selectedDate, selectedMonth, selectedWeek));
  const totalCompras = purchasesPeriod.reduce((s, p) => s + (p.total || 0), 0);
  const comprasEfectivo = purchasesPeriod.reduce((s, p) => s + (p.paymentMethod === 'Mixto' ? (p.splitDetails?.efectivo || 0) : (p.paymentMethod === 'Transferencia' ? 0 : (p.total || 0))), 0);
  const comprasTransferencia = purchasesPeriod.reduce((s, p) => s + (p.paymentMethod === 'Mixto' ? (p.splitDetails?.transferencia || 0) : (p.paymentMethod === 'Transferencia' ? (p.total || 0) : 0)), 0);

  // Gastos operativos for current period
  const gastosPeriod = gastosOperativos.filter(g => isInPeriod(g.dateObj, dashboardFilter, selectedDate, selectedMonth, selectedWeek));
  const totalGastosOperativos = gastosPeriod.reduce((s, g) => s + (g.amount || 0), 0);
  const gastosEfectivo = gastosPeriod.reduce((s, g) => s + (g.paymentMethod === 'Mixto' ? (g.splitDetails?.efectivo || 0) : (g.paymentMethod === 'Transferencia' ? 0 : (g.amount || 0))), 0);
  const gastosTransferencia = gastosPeriod.reduce((s, g) => s + (g.paymentMethod === 'Mixto' ? (g.splitDetails?.transferencia || 0) : (g.paymentMethod === 'Transferencia' ? (g.amount || 0) : 0)), 0);

  // Ganancia
  const gananciaNeta = totalIngresos - totalCompras - totalGastosOperativos;

  // Premios Fidelidad
  const premiosFidelidadPeriod = combinedActivity.filter(s => (s.items || []).some((i: any) => i.isLoyaltyReward));
  const totalPremiosFidelidad = premiosFidelidadPeriod.length;

  // Product ranking
  const productMap: Record<string, { name: string; units: number; revenue: number }> = {};
  combinedActivity.forEach(s => {
    s.items?.forEach((item: any) => {
      const k = item.productName || 'Desconocido';
      if (!productMap[k]) productMap[k] = { name: k, units: 0, revenue: 0 };
      productMap[k].units += item.quantity || 0;
      productMap[k].revenue += item.subtotal || 0;
    });
  });
  const ranking = Object.values(productMap).sort((a, b) => b.units - a.units).slice(0, 10);
  const starProduct = ranking[0];

  // Critical stock
  const criticalSupplies = supplies.filter(s => s.currentStock <= s.minLimit);

  // Deuda by client (all-time)
  const deudaMap: Record<string, { clienteId: string; name: string; total: number; pedidos: any[] }> = {};
  creditPedidos.forEach(p => {
    const k = p.clienteId || p.clienteName || 'desconocido';
    if (!deudaMap[k]) deudaMap[k] = { clienteId: k, name: p.clienteName || 'Cliente', total: 0, pedidos: [] };
    deudaMap[k].total += p.total || 0;
    deudaMap[k].pedidos.push(p);
  });
  const deudaByClient = Object.values(deudaMap).sort((a, b) => b.total - a.total);
  const totalDeuda = creditPedidos.reduce((s, p) => s + (p.total || 0), 0);

  const filterLabel = (() => {
    if (selectedDate) {
      return selectedDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' }).replace(',', '');
    }
    const now = new Date();
    
    if (dashboardFilter === 'today') {
      return `Hoy (${now.toLocaleDateString('es-CO')})`;
    }
    
    if (dashboardFilter === 'week') {
      const w = selectedWeek || now;
      const { start, end } = getWeekBoundaries(w);
      return `Semana (${start.toLocaleDateString('es-CO')} al ${end.toLocaleDateString('es-CO')})`;
    }
    
    const m = selectedMonth || now;
    const firstDay = new Date(m.getFullYear(), m.getMonth(), 1);
    const lastDay = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    return `${m.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })} (${firstDay.toLocaleDateString('es-CO')} al ${lastDay.toLocaleDateString('es-CO')})`;
  })();

  useEffect(() => {
    if (profile) {
      setHeader({
        title: `Bienvenido, ${profile?.name?.split(' ')[0] || 'Usuario'}`,
        subtitle: profile?.role === 'vendedor' 
          ? `Resumen de tu actividad (${filterLabel})` 
          : `Estado de la Heladería (${filterLabel})`,
        actions: (
          <div className="flex items-center gap-2 relative z-50">
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm",
                showCalendar || selectedDate ? "bg-primary text-white" : "bg-white border border-outline/20 text-secondary hover:text-primary hover:border-primary/50"
              )}
              title="Calendario"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowExportOptions(!showExportOptions)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm",
                  isGeneratingPDF || showExportOptions ? "bg-primary text-white" : "bg-white border border-outline/20 text-secondary hover:text-primary hover:border-primary/50"
                )}
                title="Descargar Reporte"
                disabled={isGeneratingPDF}
              >
                <Download className="w-5 h-5" />
              </button>
              {showExportOptions && (
                <div className="absolute top-14 right-0 bg-white rounded-3xl p-2 shadow-2xl border border-outline/10 w-64 z-[100] flex flex-col gap-1">
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary/60">Formato de Salida</p>
                  </div>
                  <button onClick={() => handlePreview('excel')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container transition-colors text-left w-full">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">XLS</div>
                    <span className="font-bold text-on-surface">Descargar Excel</span>
                  </button>
                  <button onClick={() => handlePreview('pdf')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container transition-colors text-left w-full">
                    <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 font-black text-xs">PDF</div>
                    <span className="font-bold text-on-surface">Descargar PDF</span>
                  </button>
                  <button onClick={() => handlePreview('image')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container transition-colors text-left w-full">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">JPG</div>
                    <span className="font-bold text-on-surface">Descargar Imagen</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      });
    }
    return () => clearHeader();
  }, [profile, setHeader, clearHeader, showCalendar, selectedDate, dashboardFilter, isGeneratingPDF, filterLabel, showExportOptions]);

  const handlePreview = async (type: 'pdf' | 'excel' | 'image') => {
    setShowExportOptions(false);
    setPreviewType(type);
    setIsPreviewModalOpen(true);
    setPreviewData(null);
    setIsGeneratingPDF(true);
    
    const dateStr = filterLabel;
    const sellerName = profile?.name || 'Vendedor';

    try {
      const metrics = {
        totalIngresos,
        efectivo,
        tarjeta,
        transferencia,
        totalCredito,
        totalCompras,
        totalGastosOperativos,
        gananciaNeta,
        totalPremiosFidelidad
      };

      if (type === 'excel') {
        setPreviewData({ type: 'excel', dateStr, sellerName });
        setIsGeneratingPDF(false);
      } else if (type === 'pdf') {
        const result = await generateDetailedPDF(sellerName, dateStr, metrics, combinedActivity, ranking);
        if (result.success) {
           setPreviewData({
             type,
             pdf: result.pdf,
             blobUrl: result.blobUrl,
             imgData: null,
             dateStr,
             sellerName
           });
        } else {
           toast.error('Error generando PDF');
           setIsPreviewModalOpen(false);
        }
        setIsGeneratingPDF(false);
      } else if (type === 'image') {
        // Usar setTimeout para permitir que React renderice el componente oculto
        setTimeout(async () => {
          const imgData = await captureReportImage('hidden-image-report');
          if (imgData) {
             setPreviewData({
               type,
               pdf: null,
               blobUrl: null,
               imgData,
               dateStr,
               sellerName
             });
          } else {
             toast.error('Error generando Imagen');
             setIsPreviewModalOpen(false);
          }
          setIsGeneratingPDF(false);
        }, 100);
      }
    } catch (e) {
      toast.error('Ocurrió un error al procesar');
      setIsPreviewModalOpen(false);
      setIsGeneratingPDF(false);
    }
  };

  const handleDownload = () => {
    if (!previewData) return;
    const { type, pdf, imgData, dateStr, sellerName } = previewData;
    const fileName = `Reporte_${dateStr.replace(/\//g, '-')}_${sellerName}`;
    
    if (type === 'pdf' && pdf) {
      pdf.save(`${fileName}.pdf`);
      toast.success('PDF descargado con éxito');
    } else if (type === 'image' && imgData) {
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${fileName}.jpg`;
      link.click();
      toast.success('Imagen descargada con éxito');
    } else if (type === 'excel') {
      const metrics = {
        totalIngresos,
        efectivo,
        tarjeta,
        transferencia,
        totalCredito,
        totalCompras,
        totalGastosOperativos,
        gananciaNeta,
        totalPremiosFidelidad
      };
      generateDashboardExcel(sellerName, dateStr, metrics, combinedActivity, ranking);
      toast.success('Excel descargado con éxito');
    }
  };

  const handleShare = async () => {
    if (!previewData) return;
    try {
      const { type, pdf, imgData, dateStr, sellerName } = previewData;
      const fileName = `Reporte_${dateStr.replace(/\//g, '-')}_${sellerName}`;
      
      let fileToShare: File | null = null;

      if (type === 'pdf' && pdf) {
        const blob = pdf.output('blob');
        fileToShare = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });
      } else if (type === 'image' && imgData) {
        const response = await fetch(imgData);
        const blob = await response.blob();
        fileToShare = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
      } else if (type === 'excel') {
         toast.error('Compartir Excel directamente no soportado aún, usa Descargar.');
         return;
      }

      const textSummary = `📊 *Reporte General D'LI*\n📅 *Periodo:* ${dateStr}\n👤 *Generado por:* ${sellerName}\n💰 *Ingresos:* $${totalIngresos.toLocaleString()}\n💵 *Ganancia Neta:* $${gananciaNeta.toLocaleString()}`;

      if (fileToShare && navigator.share && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
        try {
          await navigator.share({
            title: `Reporte General D'LI`,
            text: textSummary,
            files: [fileToShare]
          });
          toast.success('Reporte compartido con éxito');
          return;
        } catch (shareErr) {
          console.warn('Fallo al compartir archivo físico en Dashboard, intentando texto plano...', shareErr);
        }
      }

      // Fallback 1: Compartir resumen de texto nativo
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Reporte General D'LI`,
            text: textSummary,
          });
          toast.success('Resumen de reporte compartido');
          return;
        } catch (textErr) {
          console.warn('Fallo al compartir texto plano nativo, intentando por WhatsApp direct link...', textErr);
        }
      }

      // Fallback 2: WhatsApp direct API link
      const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(textSummary)}`;
      window.open(waLink, '_blank');
      toast.success('Abriendo WhatsApp con el resumen del reporte.');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo compartir el reporte.');
    }
  };

  const tableStatus = [
    { id: 'mesa1', label: 'M1', status: (carts['mesa1']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
    { id: 'mesa2', label: 'M2', status: (carts['mesa2']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
    { id: 'mesa3', label: 'M3', status: (carts['mesa3']?.items?.length || 0) > 0 ? 'Ocupada' : 'Libre' },
  ];

  return (
    <>
      <div id="dashboard-pdf-container" className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full pb-32">
        {/* FILTERS */}
        {selectedDate ? (
          <div className="flex items-center justify-between bg-primary/10 rounded-2xl p-3 w-full sm:max-w-sm border border-primary/20">
            <span className="text-sm font-bold text-primary capitalize">
              {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={() => { setSelectedDate(null); setDashboardFilter('today'); }}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-primary shadow-sm hover:bg-primary hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full sm:max-w-sm">
            <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner w-full">
              {(['today', 'week', 'month'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => {
                    setDashboardFilter(f);
                    setSelectedDate(null);
                    if (f === 'month') setSelectedMonth(new Date());
                    if (f === 'week') setSelectedWeek(new Date());
                  }}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    (dashboardFilter === f) ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high"
                  )}
                >
                  {f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>

            {/* Week Selector */}
            {dashboardFilter === 'week' && (
              <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-outline/10">
                <button 
                  onClick={() => {
                    const newD = new Date(selectedWeek);
                    newD.setDate(newD.getDate() - 7);
                    setSelectedWeek(newD);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-on-surface capitalize tracking-wide text-center leading-tight">
                  {(() => {
                    const { start, end } = getWeekBoundaries(selectedWeek);
                    const isSameMonth = start.getMonth() === end.getMonth();
                    if (isSameMonth) {
                      return `${start.getDate()} al ${end.getDate()} de ${start.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}`;
                    } else {
                      return `${start.getDate()} ${start.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')} al ${end.getDate()} ${end.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}`;
                    }
                  })()}
                </span>
                <button 
                  onClick={() => {
                    const newD = new Date(selectedWeek);
                    newD.setDate(newD.getDate() + 7);
                    setSelectedWeek(newD);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Month Selector */}
            {dashboardFilter === 'month' && (
              <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-outline/10">
                <button 
                  onClick={() => {
                    const newD = new Date(selectedMonth);
                    newD.setMonth(newD.getMonth() - 1);
                    setSelectedMonth(newD);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-on-surface capitalize tracking-wide">
                  {selectedMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => {
                    const newD = new Date(selectedMonth);
                    newD.setMonth(newD.getMonth() + 1);
                    setSelectedMonth(newD);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Ingresos"
            value={formatCurrency(totalIngresos)}
            numericValue={totalIngresos}
            isCurrency={true}
            sub={filterLabel}
            accent="emerald"
            onOpen={() => open('ingresos')}
            index={0}
          />
          <MetricCard
            icon={<CreditCard className="w-5 h-5" />}
            label="Vtas. a Crédito"
            value={formatCurrency(totalCredito)}
            numericValue={totalCredito}
            isCurrency={true}
            sub={filterLabel}
            accent="orange"
            onOpen={() => open('credito')}
            index={1}
          />
          {profile?.role !== 'vendedor' && (
            <MetricCard
              icon={<TrendingDown className="w-5 h-5" />}
              label="Egresos/Compras"
              value={formatCurrency(totalCompras + totalGastosOperativos)}
              numericValue={totalCompras + totalGastosOperativos}
              isCurrency={true}
              sub={filterLabel}
              accent="amber"
              onOpen={() => open('egresos')}
              index={2}
            />
          )}
          {profile?.role !== 'vendedor' && (
            <MetricCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Ganancia Neta"
              value={formatCurrency(gananciaNeta)}
              numericValue={Math.abs(gananciaNeta)}
              isCurrency={true}
              sub={filterLabel}
              badge={{ text: gananciaNeta >= 0 ? '+ RENTABLE' : '- PÉRDIDA', color: gananciaNeta >= 0 ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#fee2e2] text-[#b91c1c]' }}
              accent="blue"
              onOpen={() => open('ganancia')}
              index={3}
            />
          )}
          <MetricCard
            icon={<Trophy className="w-5 h-5" />}
            label="Estrella"
            value={starProduct?.name || 'N/A'}
            sub={`${starProduct?.units || 0} uds`}
            accent="amber"
            onOpen={() => open('ranking')}
            index={4}
          />
          {profile?.role !== 'vendedor' && (
            <MetricCard
              icon={<Users className="w-5 h-5" />}
              label="Deuda Clientes"
              value={formatCurrency(totalDeuda)}
              numericValue={totalDeuda}
              isCurrency={true}
              sub="Total Histórico"
              accent="orange"
              onOpen={() => open('deuda')}
              index={5}
            />
          )}
          <MetricCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Stock"
            value={criticalSupplies.length.toString()}
            numericValue={criticalSupplies.length}
            isCurrency={false}
            sub="Items críticos"
            badge={criticalSupplies.length > 0 ? { text: 'REVISAR', color: 'bg-[#fee2e2] text-[#b91c1c]' } : null}
            accent="orange"
            onOpen={() => setIsStockModalOpen(true)}
            index={6}
          />
          <MetricCard
            icon={<Trophy className="w-5 h-5" />}
            label="Fidelidad"
            value={totalPremiosFidelidad.toString()}
            numericValue={totalPremiosFidelidad}
            isCurrency={false}
            sub="Premios"
            accent="fuchsia"
            onOpen={() => open('premios')}
            index={7}
          />
        </div>

        {/* CHARTS (Admin Only) */}
        {profile?.role !== 'vendedor' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[2rem] p-6 border border-outline/10 shadow-sm relative overflow-hidden">
              <h4 className="font-bold text-xs uppercase tracking-widest text-secondary mb-4">Ingresos {filterLabel}</h4>
              <TrendChart data={ingresosSales} color="#10b981" label="Ingresos" />
            </div>
            <div className="bg-white rounded-[2rem] p-6 border border-outline/10 shadow-sm relative overflow-hidden">
              <h4 className="font-bold text-xs uppercase tracking-widest text-secondary mb-4">Compras {filterLabel}</h4>
              <TrendChart data={purchasesPeriod} color="#f59e0b" label="Egresos" />
            </div>
          </div>
        )}

        {/* RECENT SALES & TABLE STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-on-surface">Movimientos</h2>
              <span className="text-xs font-bold text-secondary uppercase tracking-widest">{sales.length} REGS</span>
            </div>
            <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
              {combinedActivity.length > 0 ? (
                combinedActivity.slice(0, 20).map((sale, i) => (
                  <SaleCard 
                    key={sale.id}
                    sale={sale}
                    onClick={() => setSelectedSale(sale)}
                    index={i}
                  />
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-outline/10 shadow-sm">
                  <DollarSign className="w-12 h-12 text-secondary/20 mb-4" />
                  <p className="text-sm font-bold text-secondary">No hay movimientos</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] p-6 border border-outline/50 shadow-sm h-full">
              <h4 className="font-headline font-bold text-sm text-on-surface mb-6 flex items-center justify-between">
                 Estado de Mesas
                 <ChevronRight className="w-4 h-4 text-secondary/40" />
              </h4>
              <div className="grid grid-cols-3 gap-3">
                 {tableStatus.map(t => (
                    <div key={t.id} className="flex flex-col items-center gap-2">
                       <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                          t.status === 'Ocupada' ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "bg-surface-container text-secondary/40"
                       )}>
                          <TableIcon className="w-5 h-5" />
                       </div>
                       <p className="text-[9px] font-bold text-on-surface">{t.label}</p>
                       <p className={cn("text-[8px] font-black uppercase tracking-widest", t.status === 'Ocupada' ? "text-orange-600" : "text-success")}>
                          {t.status}
                       </p>
                    </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CalendarModal 
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        allActivity={allUnfilteredActivity}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setDashboardFilter('today');
        }}
      />

      <IngresosModal
        isOpen={openModal === 'ingresos'}
        onClose={close}
        filter={filterLabel}
        efectivo={efectivo}
        tarjeta={tarjeta}
        transferencia={transferencia}
      />
      <VentasCreditoModal
        isOpen={openModal === 'credito'}
        onClose={close}
        filter={filterLabel}
        creditPedidos={creditPedidosPeriod}
      />
      <EgresosModal
        isOpen={openModal === 'egresos'}
        onClose={close}
        filter={filterLabel}
        totalCompras={totalCompras}
        totalGastosOperativos={totalGastosOperativos}
        comprasEfectivo={comprasEfectivo}
        comprasTransferencia={comprasTransferencia}
        gastosEfectivo={gastosEfectivo}
        gastosTransferencia={gastosTransferencia}
        onNavigate={(subtab) => navigate(`/admin/management?tab=operacion&subtab=${subtab}`)}
      />
      <GananciaModal
        isOpen={openModal === 'ganancia'}
        onClose={close}
        filter={filterLabel}
        totalIngresos={totalIngresos}
        totalCompras={totalCompras}
        totalGastosOperativos={totalGastosOperativos}
        totalCredito={totalCredito}
        ingresosEfectivo={efectivo}
        ingresosTransferencia={transferencia}
        comprasEfectivo={comprasEfectivo}
        comprasTransferencia={comprasTransferencia}
        gastosEfectivo={gastosEfectivo}
        gastosTransferencia={gastosTransferencia}
        onNavigate={(subtab) => navigate(`/admin/management?tab=operacion&subtab=${subtab}`)}
      />
      <RankingModal
        isOpen={openModal === 'ranking'}
        onClose={close}
        filter={filterLabel}
        ranking={ranking}
      />
      <DeudaClientesModal
        isOpen={openModal === 'deuda'}
        onClose={close}
        deudaByClient={deudaByClient}
        totalDeuda={totalDeuda}
      />
      <PremiosModal
        isOpen={openModal === 'premios'}
        onClose={close}
        filter={filterLabel}
        premios={premiosFidelidadPeriod}
      />
      <StockCriticoModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        criticalSupplies={criticalSupplies}
      />

      <MovementDetailModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        data={selectedSale}
        profile={profile}
        onToggleItemPrepared={() => {}}
      />

      <ReportPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        type={previewType}
        previewUrl={previewData?.blobUrl || previewData?.imgData || null}
        onDownload={handleDownload}
        onShare={handleShare}
      />

      <div className="absolute opacity-0 pointer-events-none -z-50" style={{ top: '-10000px', left: '-10000px' }}>
        <div id="hidden-image-report">
          <DetailedReportTemplate
            sellerName={profile?.name || 'Vendedor'}
            dateStr={filterLabel}
            metrics={{
              totalIngresos,
              efectivo,
              tarjeta,
              transferencia,
              totalCredito,
              totalCompras,
              totalGastosOperativos,
              gananciaNeta,
              totalPremiosFidelidad
            }}
            ranking={ranking}
          />
        </div>
      </div>
    </>
  );
}

