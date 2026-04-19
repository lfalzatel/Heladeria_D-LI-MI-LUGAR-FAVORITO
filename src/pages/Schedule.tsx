import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Plus, 
  Clock, 
  Users, 
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import UserMenu from '../components/UserMenu';
import BottomNav from '../components/BottomNav';
import { useAuthStore } from '../stores/useAuthStore';

export default function Schedule() {
  const { profile } = useAuthStore();
  const [view, setView] = useState<'dia' | 'semana'>('dia');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const employees = [
    { id: '1', name: 'Leidy Mosquera', role: 'Vendedor', status: 'Activo' },
    { id: '2', name: 'Luis Alzate', role: 'Administrador', status: 'Activo' },
    { id: '3', name: 'Johana Cuesta', role: 'Vendedor', status: 'Descanso' },
    { id: '4', name: 'Andrea Perez', role: 'Vendedor', status: 'Activo' },
  ];

  const timeSlots = [
    "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", 
    "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", 
    "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"
  ];

  const handleSave = () => {
    toast.success('Horario guardado correctamente');
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-32">
      {/* Header */}
      <header className="bg-[#008BB1] text-white sticky top-0 z-30 px-4 sm:px-6 h-20 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-headline font-bold text-lg leading-none">Tablero de Horarios</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-1">Gestión de Personal D'LI</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
              <Info className="w-5 h-5" />
           </button>
           <UserMenu />
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-6">
        {/* View Selector and Actions */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex p-1 bg-surface-container rounded-2xl border border-outline/30 w-full sm:w-auto">
               <button
                 onClick={() => setView('dia')}
                 className={cn(
                   "flex-1 px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   view === 'dia' ? "bg-[#008BB1] text-white shadow-md" : "text-secondary hover:text-on-surface"
                 )}
               >
                 Día
               </button>
               <button
                 onClick={() => setView('semana')}
                 className={cn(
                   "flex-1 px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   view === 'semana' ? "bg-[#008BB1] text-white shadow-md" : "text-secondary hover:text-on-surface"
                 )}
               >
                 Semana
               </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
               <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-2xl border border-outline/50 shadow-sm text-xs font-bold text-secondary">
                  Sede Principal
                  <ChevronDown className="w-4 h-4 opacity-30" />
               </button>
               {(profile?.role === 'admin' || profile?.role === 'propietario') && (
                 <button 
                   onClick={handleSave}
                   className="flex items-center justify-center gap-2 h-12 px-6 bg-[#008BB1] text-white rounded-2xl shadow-lg shadow-[#008BB1]/20 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                 >
                    <Save className="w-4 h-4" />
                    Guardar
                 </button>
               )}
            </div>
        </div>

        {/* Date Navigator */}
        <div className="bg-[#00C2E4] rounded-3xl p-4 flex items-center justify-between text-white shadow-lg overflow-hidden relative">
           <ChevronLeft className="w-6 h-6 opacity-60 cursor-pointer" />
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                 <CalendarIcon className="w-6 h-6" />
              </div>
              <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Editando Fecha</p>
                 <p className="text-sm font-black uppercase tracking-tight">Lunes 20 de Abril</p>
              </div>
           </div>
           <ChevronRight className="w-6 h-6 opacity-60 cursor-pointer" />
           {/* Decorative elements */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12 blur-2xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Timeline Context */}
           <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 sm:p-8 border border-outline/50 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                     <Clock className="w-5 h-5 text-[#008BB1]" />
                     <h3 className="font-headline font-bold text-lg text-on-surface uppercase tracking-tight">Línea de Tiempo</h3>
                  </div>
                  <p className="text-[9px] font-bold text-secondary uppercase tracking-[0.2em] opacity-60">Toque para asignar personal</p>
               </div>

               <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                       <span className="w-20 text-[10px] font-black text-secondary/40 group-hover:text-[#008BB1] transition-colors">{slot}</span>
                       <div className="flex-1 h-12 rounded-2xl bg-surface-container border border-dashed border-outline/40 flex items-center px-6 text-[10px] font-bold text-secondary italic opacity-50 group-hover:bg-[#00C2E4]/5 group-hover:border-[#00C2E4]/30 hover:opacity-100 transition-all cursor-pointer">
                          Toca para asignar grupo o empleado...
                       </div>
                    </div>
                  ))}
               </div>
           </div>

           {/* Employees & News */}
           <div className="flex flex-col gap-6">
              {/* Employee Selection */}
              <div className="bg-white rounded-[2.5rem] p-6 border border-outline/50 shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                       <Users className="w-4 h-4 text-[#008BB1]" />
                       <h3 className="font-headline font-bold text-sm text-on-surface uppercase tracking-tight">Personal</h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-surface-container rounded-lg font-black text-secondary">{employees.length}</span>
                 </div>

                 <div className="flex flex-col gap-3">
                    {employees.map(emp => (
                       <div key={emp.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline/20 hover:border-[#00C2E4]/40 hover:bg-[#00C2E4]/5 transition-all cursor-pointer group">
                          <div className="flex items-center justify-between">
                             <p className="font-bold text-sm text-on-surface group-hover:text-[#008BB1] transition-colors">{emp.name}</p>
                             <div className={cn(
                               "w-2 h-2 rounded-full",
                               emp.status === 'Activo' ? "bg-success" : "bg-secondary/40"
                             )} />
                          </div>
                          <p className="text-[9px] text-secondary font-black uppercase tracking-widest mt-1 opacity-60">{emp.role}</p>
                       </div>
                    ))}
                    <button className="w-full mt-2 py-3 border-2 border-dashed border-outline/40 rounded-2xl flex items-center justify-center gap-2 text-secondary/40 hover:text-[#008BB1] hover:border-[#008BB1]/30 transition-all font-black text-[10px] uppercase tracking-widest">
                       <Plus className="w-4 h-4" />
                       Agregar Personal
                    </button>
                 </div>
              </div>

              {/* Weekly News / Notes */}
              <div className="bg-white rounded-[2.5rem] p-6 border border-outline/50 shadow-sm relative overflow-hidden">
                 <div className="flex items-center gap-2 mb-6">
                    <MessageSquare className="w-4 h-4 text-[#E91E8C]" />
                    <h3 className="font-headline font-bold text-sm text-on-surface uppercase tracking-tight">Novedades</h3>
                 </div>

                 <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 relative">
                       <p className="text-xs font-bold text-on-surface mb-2">Miércoles de Abasto</p>
                       <p className="text-[10px] text-secondary leading-relaxed">Recordar comprar helado de vainilla y fresa. El stock está bajo.</p>
                       <div className="absolute top-4 right-4 text-primary opacity-40">
                          <Info className="w-4 h-4" />
                       </div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-surface-container border border-outline/10 opacity-60">
                       <p className="text-xs font-bold text-on-surface mb-2">Limpieza Profunda</p>
                       <p className="text-[10px] text-secondary leading-relaxed">Sábado a las 8 PM: Limpieza de neveras y bodega.</p>
                    </div>
                 </div>

                 <button className="w-full mt-4 py-3 bg-surface-container rounded-xl flex items-center justify-center gap-2 text-secondary font-black text-[10px] uppercase tracking-widest hover:bg-surface transition-all">
                    <Plus className="w-4 h-4" />
                    Nueva Nota
                 </button>

                 {/* Decorative background icon */}
                 <MessageSquare className="absolute -bottom-10 -left-10 w-32 h-32 text-primary opacity-[0.03] rotate-12" />
              </div>
           </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
   return (
      <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
   );
}
