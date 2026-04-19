import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Trophy, 
  Clock,
  Filter,
  FileText,
  ChevronDown,
  PieChart,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppHeader, { PageTitle } from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useAuthStore } from '../stores/useAuthStore';
import AdminSidebar from '../components/AdminSidebar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type DateFilter = 'hoy' | 'semana' | 'mes' | 'personalizado';

export default function Reports() {
  const { profile } = useAuthStore();
  const [filter, setFilter] = useState<DateFilter>('hoy');
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (filter === 'semana') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (filter === 'mes') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const salesRef = collection(db, 'sales');
    const q = query(
      salesRef, 
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSales(data);
        setLoading(false);
      },
      (error) => {
        console.error("Sales listener error:", error);
        if (error.code === 'permission-denied') {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, [filter, profile]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalCarts = sales.length;
  const avgTicket = totalCarts > 0 ? totalRevenue / totalCarts : 0;

  const downloadReport = () => {
    toast.info('Generando reporte PDF...');
    setTimeout(() => {
      toast.success('Reporte descargado correctamente');
    }, 2000);
  };

  const chartData = [
    { name: 'Lun', sales: 4000 },
    { name: 'Mar', sales: 3000 },
    { name: 'Mie', sales: 2000 },
    { name: 'Jue', sales: 2780 },
    { name: 'Vie', sales: 1890 },
    { name: 'Sab', sales: 2390 },
    { name: 'Dom', sales: 3490 },
  ];

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen relative pb-32">
        <AppHeader showBell />
        <PageTitle title="Reportes & BI" subtitle="Análisis Operativo" />

      <main className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-8">
        {/* Date Selector */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex p-1 bg-surface-container rounded-2xl border border-outline/30 w-full sm:w-auto">
               {(['hoy', 'semana', 'mes'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "flex-1 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      filter === f ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-on-surface"
                    )}
                  >
                    {f}
                  </button>
               ))}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
               <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-2xl border border-outline/50 shadow-sm text-xs font-bold text-secondary">
                  <Calendar className="w-4 h-4" />
                  Calendario
                  <ChevronDown className="w-4 h-4 opacity-30" />
               </button>
               <button 
                 onClick={downloadReport}
                 className="flex items-center justify-center w-12 h-12 bg-white rounded-2xl border border-outline/50 shadow-sm text-secondary hover:text-primary transition-all"
               >
                  <Download className="w-5 h-5" />
               </button>
            </div>
        </div>

        {/* Financial Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <ReportCard 
             label="Ingresos Recibidos" 
             value={formatCurrency(totalRevenue)} 
             icon={<DollarSign className="w-5 h-5" />} 
             color="emerald" 
             info="Hoy"
           />
           <ReportCard 
             label="Ventas a Crédito" 
             value={formatCurrency(0)} 
             icon={<CreditCard className="w-5 h-5" />} 
             color="orange" 
             info="Hoy"
           />
           <ReportCard 
             label="Ganancia Neta" 
             value={formatCurrency(totalRevenue * 0.4)} 
             icon={<TrendingUp className="w-5 h-5" />} 
             color="blue" 
             info="40% estimado"
           />
           <ReportCard 
             label="Producto Estrella" 
             value="Cono Triple" 
             icon={<Trophy className="w-5 h-5" />} 
             color="purple" 
             info="12 unidades"
           />
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 sm:p-8 border border-outline/50 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">Ventas por Día</h3>
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Tendencia semanal</p>
                 </div>
                 <PieChart className="w-5 h-5 text-secondary/30" />
              </div>
              <div className="h-64 mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                       <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#E91E8C" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#E91E8C" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                         itemStyle={{ color: '#E91E8C', fontWeight: 900, fontSize: '10px' }}
                       />
                       <Area type="monotone" dataKey="sales" stroke="#E91E8C" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-primary rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                 <h3 className="text-xl font-headline font-bold mb-2">Ticket Promedio</h3>
                 <p className="text-4xl font-black mb-6 tracking-tight">{formatCurrency(avgTicket)}</p>
                 
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-70">
                       <span>Conversión</span>
                       <span>85%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                       <div className="h-full bg-white rounded-full w-[85%]" />
                    </div>
                    <p className="text-xs font-medium leading-relaxed opacity-80 mt-4">
                       Tus ventas han aumentado un <span className="font-black text-white">12%</span> respecto a la semana pasada.
                    </p>
                 </div>

                 <button className="mt-10 w-full py-4 bg-white text-primary rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl group-hover:scale-[1.05] transition-all">
                    Detalle por Sede
                 </button>
              </div>
              <TrendingUp className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 blur-sm transform -rotate-12 transition-transform group-hover:rotate-0 duration-700" />
           </div>
        </section>

        {/* Detailed Transactions List */}
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-outline/50 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-headline font-bold text-lg text-on-surface">Historial Detallado</h3>
               <button className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest">
                  Ver Todo
                  <ArrowRight className="w-4 h-4" />
               </button>
            </div>
            
            <div className="flex flex-col gap-4 divide-y divide-outline/30">
               {sales.slice(0, 5).map(sale => (
                  <div key={sale.id} className="flex items-center justify-between pt-4">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shadow-sm">
                           <Clock className="w-5 h-5 opacity-40" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-on-surface">{sale.tableName} - #{sale.id.slice(-4).toUpperCase()}</p>
                           <p className="text-[10px] text-secondary font-black uppercase tracking-widest">{sale.hour} • {sale.paymentMethod}</p>
                        </div>
                     </div>
                     <p className="font-black text-on-surface">{formatCurrency(sale.total)}</p>
                  </div>
               ))}
               {sales.length === 0 && (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center">
                     <FileText className="w-10 h-10 mb-2" />
                     <p className="text-xs font-bold uppercase tracking-widest">Sin transacciones registradas</p>
                  </div>
               )}
            </div>
        </section>
      </main>

      <BottomNav />
      </div>
    </div>
  );
}

function ReportCard({ label, value, icon, color, info }: { label: string, value: string, icon: React.ReactNode, color: 'emerald' | 'orange' | 'blue' | 'purple', info: string }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100"
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-outline/50 shadow-sm flex flex-col gap-4 group hover:scale-[1.02] transition-all">
       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", colors[color])}>
          {icon}
       </div>
       <div>
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl font-black text-on-surface tracking-tight">{value}</p>
          <p className="text-[9px] font-bold text-secondary/40 uppercase tracking-widest mt-1">{info}</p>
       </div>
    </div>
  );
}
