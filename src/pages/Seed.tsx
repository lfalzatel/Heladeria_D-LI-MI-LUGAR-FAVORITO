import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Database, CheckCircle2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { seedDatabase } from '../services/seedService';
import { useNavigate } from 'react-router-dom';

export default function Seed() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSeed = async () => {
    setLoading(true);
    try {
      await seedDatabase();
      setDone(true);
      toast.success('¡Datos iniciales cargados correctamente!');
    } catch (error: any) {
      console.error(error);
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-outline">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary font-bold">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="font-headline font-bold text-2xl text-on-surface">Configuración Inicial</h2>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-all"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        <p className="text-secondary text-sm mb-8 leading-relaxed">
          Este proceso cargará el catálogo oficial de productos, sabores y la configuración de insumos/mesas en tu base de datos Firestore usando menu.json.
        </p>

        {done ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <CheckCircle2 className="w-16 h-16 text-success" />
            <p className="font-bold text-on-surface">¡Todo listo!</p>
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="mt-4 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
            >
              Ir al Dashboard
            </button>
          </motion.div>
        ) : (
          <button 
            onClick={handleSeed}
            disabled={loading}
            className="w-full py-5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sincronizar Catálogo D\'LI'}
          </button>
        )}

        <div className="mt-8 pt-6 border-t border-outline/50">
          <p className="text-[10px] text-secondary/60 text-center uppercase font-bold tracking-widest">
            Asegúrate de tener permisos de Administrador
          </p>
        </div>
      </div>
    </div>
  );
}
