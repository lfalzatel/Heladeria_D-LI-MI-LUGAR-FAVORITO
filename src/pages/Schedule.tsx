import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Plus, 
  Clock, 
  Users, 
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/useAuthStore';
import { useHeaderStore } from '../stores/useHeaderStore';

export default function Schedule() {
  const { profile } = useAuthStore();
  const { setHeader, clearHeader } = useHeaderStore();
  const [view, setView] = useState<'dia' | 'semana'>('dia');

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

  useEffect(() => {
    setHeader({
      title: 'Tablero de Horarios',
      subtitle: 'Gestión de Personal D\'LI'
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const handleSave = () => {
    toast.success('Horario guardado correctamente');
  };

  return (
    <>
      <main className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-6 pb-32">
        {/* View Selector and Actions */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex p-1 bg-surface-container rounded-2xl border border-outline/30 w-full sm:w-auto">
               <button
                 onClick={() => setView('dia')}
                 className={cn(
                   "flex-1 px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   view === 'dia' ? "bg-primary text-white shadow-md" : "text-secondary hover:text-on-surface"
                 )}
               >
                 Día
               </button>
               <button
                 onClick={() => setView('semana')}
                 className={cn(
                   "flex-1 px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   view === 'semana' ? "bg-primary text-white shadow-md" : "text-secondary hover:text-on-surface"
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
                   className="flex items-center justify-center gap-2 h-12 px-6 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                 >
                    <Save className="w-4 h-4" />
                    Guardar
                 </button>
               )}
            </div>
        </div>

        {/* Date Navigator */}
        <div className="bg-primary rounded-3xl p-4 flex items-center justify-between text-white shadow-lg overflow-hidden relative">
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
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12 blur-2xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 sm:p-8 border border-outline/50 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                     <Clock className="w-5 h-5 text-primary" />
                     <h3 className="font-headline font-bold text-lg text-on-surface uppercase tracking-tight">Línea de Tiempo</h3>
                  </div>
                  <p className="text-[9px] font-bold text-secondary uppercase tracking-[0.2em] opacity-60">Toque para asignar personal</p>
               </div>

               <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                       <span className="w-20 text-[10px] font-black text-secondary/40 group-hover:text-primary transition-colors">{slot}</span>
                       <div className="flex-1 h-12 rounded-2xl bg-surface-container border border-dashed border-outline/40 flex items-center px-6 text-[10px] font-bold text-secondary italic opacity-50 group-hover:bg-primary/5 group-hover:border-primary/30 hover:opacity-100 transition-all cursor-pointer">
                          Toca para asignar grupo o empleado...
                       </div>
                    </div>
                  ))}
               </div>
           </div>

           <div className="flex flex-col gap-6">
              <div className="bg-white rounded-[2.5rem] p-6 border border-outline/50 shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                       <Users className="w-4 h-4 text-primary" />
                       <h3 className="font-headline font-bold text-sm text-on-surface uppercase tracking-tight">Personal</h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-surface-container rounded-lg font-black text-secondary">{employees.length}</span>
                 </div>

                 <div className="flex flex-col gap-3">
                    {employees.map(emp => (
                       <div key={emp.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                          <div className="flex items-center justify-between">
                             <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{emp.name}</p>
                             <div className={cn(
                               "w-2 h-2 rounded-full",
                               emp.status === 'Activo' ? "bg-success" : "bg-secondary/40"
                             )} />
                          </div>
                          <p className="text-[9px] text-secondary font-black uppercase tracking-widest mt-1 opacity-60">{emp.role}</p>
                       </div>
                    ))}
                    <button className="w-full mt-2 py-3 border-2 border-dashed border-outline/40 rounded-2xl flex items-center justify-center gap-2 text-secondary/40 hover:text-primary hover:border-primary/30 transition-all font-black text-[10px] uppercase tracking-widest">
                       <Plus className="w-4 h-4" />
                       Agregar Personal
                    </button>
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-6 border border-outline/50 shadow-sm relative overflow-hidden">
                 <div className="flex items-center gap-2 mb-6">
                    <MessageSquare className="w-4 h-4 text-primary" />
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
                 <MessageSquare className="absolute -bottom-10 -left-10 w-32 h-32 text-primary opacity-[0.03] rotate-12" />
              </div>
           </div>
        </div>
      </main>
    </>
  );
}

function ChevronDown({ className }: { className?: string }) {
   return (
      <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
   );
}
