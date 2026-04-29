import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Database, CheckCircle2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { seedDatabase } from '../services/seedService';
import { syncProductImages } from '../services/imageFixService';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { serverTimestamp } from 'firebase/firestore';

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

  const handleSyncImages = async () => {
    setLoading(true);
    try {
      const count = await syncProductImages();
      setDone(true);
      toast.success(`¡Se actualizaron ${count} imágenes correctamente!`);
    } catch (error: any) {
      console.error(error);
      toast.error('Error al sincronizar imágenes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateYields = async () => {
    setLoading(true);
    try {
      const yields = {
        'Mango': 'Mini: 38p / P: 10p / M: 8p / G: 5p',
        'Papaya': 'Mini: 30p / P: 8p / M: 6p / G: 4p',
        'Fresa': 'Mini: 47p / P: 26p / M: 20p / G: 14p',
        'Uva': '21 porciones (todos los tamaños)',
        'Durazno': 'Mini: 20p / P: 12p / M: 8p',
        'Banano': 'Mini: 4p / P: 2p / M: 3/4 / G: 1p',
        'Queso': 'Mini: 18p / P: 13p / M: 10p / G: 8p',
        'Manzana': 'P: 6p / M: 5p / G: 3p',
        'Crema ensalada de frutas': 'Mini: 5p / P: 3p / M: 3.5p / G: 2p'
      };

      const snap = await getDocs(collection(db, 'supplies'));
      let count = 0;
      
      for (const d of snap.docs) {
        const name = d.data().name || '';
        const match = Object.keys(yields).find(k => name.toLowerCase().includes(k.toLowerCase()));
        if (match) {
          await updateDoc(d.ref, { yieldDetails: yields[match as keyof typeof yields] });
          count++;
        }
      }

      toast.success(`¡Se actualizaron ${count} insumos con sus notas de rendimiento!`);
      setDone(true);
    } catch (error: any) {
      console.error(error);
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMissingSupplies = async () => {
    setLoading(true);
    try {
      const masterSupplies = [
        { name: "Papaya",                   category: "Frutas",         unit: "Kilo",    currentStock: 5,  minLimit: 1, yieldDetails: 'Mini: 30p / P: 8p / M: 6p / G: 4p' },
        { name: "Banano",                   category: "Frutas",         unit: "Unidad",  currentStock: 20, minLimit: 5, yieldDetails: 'Mini: 4p / P: 2p / M: 3/4 / G: 1p' },
        { name: "Manzana",                  category: "Frutas",         unit: "Unidad",  currentStock: 10, minLimit: 2, yieldDetails: 'P: 6p / M: 5p / G: 3p' },
        { name: "Uva",                      category: "Frutas",         unit: "500 gr",  currentStock: 5,  minLimit: 1, yieldDetails: '21 porciones (todos los tamaños)' },
        { name: "Kiwi",                     category: "Frutas",         unit: "Kilo",    currentStock: 2,  minLimit: 0.5 },
        { name: "Chantilly",                category: "Lácteos",        unit: "Litro",   currentStock: 5,  minLimit: 1 },
        { name: "Salsa Mora",               category: "Salsas",         unit: "Litro",   currentStock: 5,  minLimit: 1 },
        { name: "Salsa Chocolate",          category: "Salsas",         unit: "Litro",   currentStock: 5,  minLimit: 1 },
        { name: "Salsa Arequipe",           category: "Salsas",         unit: "Litro",   currentStock: 5,  minLimit: 1 },
        { name: "Barquillos",               category: "Galletas",       unit: "Caja",    currentStock: 10, minLimit: 2 },
        { name: "Vasos 10/12 ONZ",           category: "Desechables",    unit: "Paquete", currentStock: 5,  minLimit: 1 },
        { name: "Cucharas",                 category: "Desechables",    unit: "Paquete", currentStock: 10, minLimit: 2 },
        { name: "Servilletas",              category: "Desechables",    unit: "Paquete", currentStock: 10, minLimit: 2 }
      ];

      const snap = await getDocs(collection(db, 'supplies'));
      const existingNames = snap.docs.map(d => (d.data().name || '').toLowerCase());
      
      let addedCount = 0;
      for (const s of masterSupplies) {
        if (!existingNames.includes(s.name.toLowerCase())) {
          const newDocRef = doc(collection(db, 'supplies'));
          await setDoc(newDocRef, {
            ...s,
            updatedAt: serverTimestamp()
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(`¡Se añadieron ${addedCount} insumos faltantes correctamente!`);
      } else {
        toast.info('Todos los insumos ya existen en el sistema.');
      }
      setDone(true);
    } catch (error: any) {
      console.error(error);
      toast.error('Error: ' + error.message);
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
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleSeed}
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-on-surface text-white font-bold shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Borrar y Recargar Todo'}
            </button>

            <button 
              onClick={handleSyncImages}
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sincronizar Solo Imágenes'}
            </button>

            <button 
              onClick={handleUpdateYields}
              disabled={loading}
              className="w-full py-4 rounded-2xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Actualizar Rendimientos'}
            </button>

            <button 
              onClick={handleAddMissingSupplies}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-success/10 border-2 border-success text-success font-bold hover:bg-success/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Añadir Insumos Faltantes'}
            </button>
          </div>
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
