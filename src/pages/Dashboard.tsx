import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTableCartStore } from '../stores/useTableCartStore';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Table as TableIcon, 
  DollarSign, 
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  ShoppingCart,
  LayoutDashboard,
  Box,
  BarChart3,
  Clock,
  User as UserIcon,
  Search,
  Receipt,
  Home,
  Calendar,
  X
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from '../components/UserMenu';
import BottomNav from '../components/BottomNav';
import AppHeader, { PageTitle } from '../components/AppHeader';
import AdminSidebar from '../components/AdminSidebar';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SaleRecord {
  id: string;
  total: number;
  sellerName: string;
  sellerId: string;
  tableName: string;
  paymentMethod: string;
  hour: string;
  date: string;
  items: any[];
}

export default function Dashboard() {
  const location = useLocation();
  const { profile } = useAuthStore();
  const { carts, initialize } = useTableCartStore();
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  
  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  const [dailyTotal, setDailyTotal] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!profile) return;

    const todayDate = new Date().toISOString().split('T')[0];
    const salesRef = collection(db, 'sales');
    
    // Base query for today's sales
    let q = query(
      salesRef, 
      where('date', '==', todayDate),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    // If seller, only show their sales
    if (profile.role === 'vendedor') {
      q = query(
        salesRef,
        where('date', '==', todayDate),
        where('sellerId', '==', profile.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const sales: SaleRecord[] = [];
        let total = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<SaleRecord, 'id'>;
          sales.push({ id: doc.id, ...data });
        });

        // To get accurate totals for the day (even beyond the limit of 20 for list)
        // We might need a separate listener or just use the snapshot if it's the full day
        setRecentSales(sales);
        setDailyTotal(sales.reduce((sum, s) => sum + s.total, 0));
        setTxCount(sales.length);
        setLoading(false);
      },
      (error) => {
        console.error("Dashboard sales listener error:", error);
        if (error.code === 'permission-denied') {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, [profile]);

  const stats = [
    { label: 'Ventas hoy', value: formatCurrency(dailyTotal), label2: 'Hoy', icon: <DollarSign className="w-5 h-5 text-success" />, trend: 'Actualizado' },
    { label: 'Transacciones', value: txCount.toString(), label2: 'Pedidos realizados', icon: <Package className="w-5 h-5 text-primary" />, trend: 'En tiempo real' },
  ];

  const criticalStock = [
    { item: 'Queso crema', stock: '0.5 kg', limit: '2 kg' },
    { item: 'Fresa', stock: '1.2 kg', limit: '5 kg' },
    { item: 'Leche condensada', stock: '3 und', limit: '10 und' },
  ];

  const tableStatus = [
    { id: 'mesa1', label: 'M1', status: carts['mesa1']?.items.length > 0 ? 'Ocupada' : 'Libre' },
    { id: 'mesa2', label: 'M2', status: carts['mesa2']?.items.length > 0 ? 'Ocupada' : 'Libre' },
    { id: 'mesa3', label: 'M3', status: carts['mesa3']?.items.length > 0 ? 'Ocupada' : 'Libre' },
  ];

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      <AdminSidebar />

      <main className="flex-1 flex flex-col min-h-screen">
        <AppHeader showBell />
        <PageTitle
          title={`Bienvenido, ${profile?.name?.split(' ')[0] || 'Usuario'}`}
          subtitle={profile?.role === 'vendedor' ? "Resumen de tu actividad de hoy" : "Estado de la Boutique hoy"}
        />

        <div className="p-4 sm:p-8 max-w-7xl w-full flex flex-col gap-6 sm:gap-8 pb-32 relative">
          {/* Key Metrics */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-[2rem] p-6 border border-outline/50 shadow-sm flex items-center gap-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center">
                   {stat.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-secondary mb-1">{stat.label}</p>
                  <div className="flex items-center gap-4">
                    <h3 className="text-3xl font-black text-on-surface tracking-tight">{stat.value}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold">{stat.trend}</span>
                  </div>
                  <p className="text-[10px] text-secondary/60 mt-1 font-medium">{stat.label2}</p>
                </div>
              </motion.div>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Sales List */}
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 sm:p-8 border border-outline/50 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h4 className="font-headline font-bold text-lg text-on-surface">Ventas Recientes</h4>
                   <p className="text-secondary text-[10px] uppercase font-bold tracking-widest mt-1">Corte de hoy</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/5 rounded-full ring-1 ring-success/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-[10px] font-black text-success uppercase">En Vivo</span>
                   </div>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-3 min-h-[400px]">
                {recentSales.length > 0 ? (
                  recentSales.map((sale) => (
                    <motion.div 
                      key={sale.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedSale(sale)}
                      className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low/50 hover:bg-white border border-transparent hover:border-primary/10 transition-all group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <Receipt className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className="font-bold text-sm text-on-surface">{sale.tableName}</h4>
                             <span className="text-[9px] px-2 py-0.5 bg-surface-container rounded-full font-black text-secondary uppercase tracking-tighter">
                                {sale.paymentMethod === 'cash' ? 'Efectivo' : 'Transf'}
                             </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <UserIcon className="w-3 h-3 text-secondary/40" />
                             <p className="text-[10px] font-bold text-secondary uppercase tracking-wide">
                                {sale.sellerName} <span className="mx-1 opacity-20">•</span> {sale.hour}
                             </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-black text-on-surface text-base group-hover:text-primary transition-colors">{formatCurrency(sale.total)}</p>
                        <p className="text-[9px] font-bold text-secondary uppercase mt-0.5">{sale.items.length} productos</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-center opacity-30">
                    <Receipt className="w-12 h-12 mb-4" />
                    <p className="font-bold">No hay ventas registradas aún</p>
                    <p className="text-xs">Las ventas aparecerán aquí en tiempo real</p>
                  </div>
                )}
              </div>
              
              {recentSales.length > 0 && (
                <button className="w-full mt-6 py-4 rounded-2xl border-2 border-primary/10 text-primary font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-primary/5 transition-all">
                   Ver Todas las Ventas
                </button>
              )}
            </div>

            {/* Side Column: Table Status and Stock Alerts */}
            <div className="flex flex-col gap-8">
               {/* Tables Status */}
               <div className="bg-white rounded-[2rem] p-6 border border-outline/50 shadow-sm">
                  <h4 className="font-headline font-bold text-sm text-on-surface mb-6 flex items-center justify-between">
                     Estado de Mesas
                     <ChevronRight className="w-4 h-4 text-secondary/40" />
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                     {tableStatus.map(t => (
                        <div key={t.id} className="flex flex-col items-center gap-2">
                           <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                              t.status === 'Ocupada' ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "bg-surface-container text-secondary/40"
                           )}>
                              <TableIcon className="w-6 h-6" />
                           </div>
                           <p className="text-[10px] font-bold text-on-surface">{t.label}</p>
                           <p className={cn("text-[9px] font-black uppercase tracking-widest", t.status === 'Ocupada' ? "text-orange-600" : "text-success")}>
                              {t.status}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Stock Alerts (Only Admin/Propietario) */}
               {(profile?.role === 'admin' || profile?.role === 'propietario') && (
                 <div className="bg-white rounded-[2rem] p-6 border border-primary/10 shadow-sm bg-gradient-to-br from-white to-primary/5">
                    <div className="flex items-center gap-2 text-primary mb-6">
                       <AlertCircle className="w-4 h-4" />
                       <h4 className="font-headline font-bold text-sm text-on-surface">Stock Crítico</h4>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                       {criticalStock.map((item, i) => (
                          <div key={i} className="flex items-center justify-between group">
                             <div>
                                <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{item.item}</p>
                                <p className="text-[9px] text-secondary font-medium">Límite: {item.limit}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-black text-primary">{item.stock}</p>
                                <div className="w-16 h-1.5 bg-surface-container rounded-full mt-1 overflow-hidden">
                                   <div className="h-full bg-primary rounded-full w-[30%]" />
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>

                    <Link to="/admin/supplies" className="w-full">
                      <button className="w-full mt-6 py-3 rounded-xl bg-primary text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all">
                         Gestionar Insumos
                      </button>
                    </Link>
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />

      {/* ── MODAL DE DETALLE DE VENTA ── */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSale(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header del Modal */}
              <div className="p-6 sm:p-8 bg-surface-container-low/50 border-b border-outline/10 flex justify-between items-start">
                <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                      <Receipt className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="font-headline font-black text-xl text-on-surface">Detalle de Venta</h3>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">ID: {selectedSale.id.slice(-8).toUpperCase()}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-90"
                >
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>

              {/* Contenido (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                {/* Info de la Venta */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline/5">
                      <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-1">Mesa / Lugar</span>
                      <p className="font-bold text-on-surface flex items-center gap-2">
                        <TableIcon className="w-3.5 h-3.5 text-primary" />
                        {selectedSale.tableName}
                      </p>
                   </div>
                   <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline/5">
                      <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-1">Fecha y Hora</span>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {selectedSale.hour}
                      </p>
                   </div>
                   <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline/5">
                      <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-1">Vendedor</span>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <UserIcon className="w-3.5 h-3.5 text-primary" />
                        {selectedSale.sellerName}
                      </p>
                   </div>
                   <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline/5">
                      <span className="text-[8px] font-black text-secondary uppercase tracking-widest block mb-1">Pago</span>
                      <p className="font-bold text-on-surface flex items-center gap-2 text-sm">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        {selectedSale.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                      </p>
                   </div>
                </div>

                <h4 className="font-headline font-bold text-sm text-on-surface mb-4 uppercase tracking-widest">Productos</h4>
                
                <div className="flex flex-col gap-3">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-outline/5 bg-surface-container-lowest/50">
                       <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/5 rounded-md mb-1 inline-block">x{item.quantity}</span>
                            <p className="font-black text-on-surface text-base">{item.productName}</p>
                            {item.variantLabel && <p className="text-[10px] font-bold text-secondary uppercase italic">{item.variantLabel}</p>}
                          </div>
                          <p className="font-brand font-black text-lg text-primary">{formatCurrency(item.subtotal)}</p>
                       </div>
                       
                       {/* Detalles de configuración */}
                       <div className="flex flex-wrap gap-2 mt-3">
                          {item.flavors?.map((f: string) => (
                            <span key={f} className="text-[9px] font-bold bg-white px-2 py-1 rounded-lg border border-outline/5 shadow-sm text-secondary">
                              🍧 {f}
                            </span>
                          ))}
                          {item.fruitChoices?.map((f: string) => (
                            <span key={f} className="text-[9px] font-bold bg-white px-2 py-1 rounded-lg border border-outline/5 shadow-sm text-success">
                              🍓 {f}
                            </span>
                          ))}
                          {item.additions?.map((a: string) => (
                            <span key={a} className="text-[9px] font-bold bg-white px-2 py-1 rounded-lg border border-outline/5 shadow-sm text-primary">
                              ✨ {a}
                            </span>
                          ))}
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer del Modal */}
              <div className="p-6 sm:p-8 bg-surface-container-low border-t border-outline/10">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-1">TOTAL VENTA</p>
                      <h3 className="text-4xl font-brand font-black text-on-surface tracking-tight leading-none">
                        {formatCurrency(selectedSale.total)}
                      </h3>
                   </div>
                   <button 
                     onClick={() => setSelectedSale(null)}
                     className="px-8 py-3 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     Cerrar
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function SidebarLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-sm font-bold cursor-pointer group",
      active 
        ? "bg-primary text-white shadow-lg shadow-primary/20" 
        : "text-slate-500 hover:text-white hover:bg-white/5"
    )}>
      <span className={cn("transition-colors", active ? "text-white" : "text-slate-600 group-hover:text-primary")}>{icon}</span>
      <span className="tracking-tight">{label}</span>
      {active && <div className="ml-auto w-1 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />}
    </div>
  );
}

function BottomNavLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 transition-all",
      active ? "text-primary scale-110" : "text-secondary/40"
    )}>
      {icon}
      <span className={cn("text-[9px] font-black uppercase tracking-widest", active ? "opacity-100" : "opacity-0")}>{label}</span>
      {active && <div className="w-1 h-1 rounded-full bg-primary mt-1 shadow-[0_0_8px_#E91E8C]" />}
    </div>
  );
}
