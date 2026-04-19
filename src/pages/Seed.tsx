import React, { useState } from 'react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Loader2, Database, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const FLAVORS = [
  "Fresa", "Chicle", "Brownie", "Vainilla", "Arequipe", "Maracuyá", "Chocolate",
  "Mandarina", "Nata Maní", "Ron Pasas", "Mango Biche", "Frutos Rojos",
  "Vainilla Chips", "Vainilla Pasas", "Veteado de Mora", "Veteado de Caramelo"
];

const PRODUCTS = [
  { name: "Cono o Vaso", category: "helados", imageUrl: "https://images.unsplash.com/photo-1559703248-dcaaec9fab78?w=800&q=80", variants: [
    {label:"Sencillo",price:3500,scoops:1},
    {label:"Doble",price:5500,scoops:2}
  ], requiresFlavors: true, isActive: true },

  { name: "Cucurucho", category: "helados", imageUrl: "https://images.unsplash.com/photo-1570197781417-0a52375c3171?w=800&q=80", variants: [
    {label:"Sencillo",price:4000,scoops:1},
    {label:"Doble",price:6000,scoops:2},
    {label:"Triple",price:8000,scoops:3}
  ], requiresFlavors: true, isActive: true },

  { name: "Conchita", category: "helados", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c8e9e5cb?w=800&q=80", variants: [
    {label:"Sencilla",price:4500,scoops:1},
    {label:"Doble",price:6500,scoops:2},
    {label:"Triple",price:8500,scoops:3}
  ], requiresFlavors: true, isActive: true },

  { name: "Ensalada de Frutas", category: "ensaladas", imageUrl: "https://images.unsplash.com/photo-1490818387583-1baba5e638ce?w=800&q=80", variants: [
    {label:"Mini",price:10000,scoops:1},
    {label:"Pequeña",price:17000,scoops:2},
    {label:"Mediana",price:22000,scoops:2},
    {label:"Grande",price:27000,scoops:2}
  ], requiresFlavors: true, isActive: true },

  { name: "Copa de Salpicón", category: "salpicon", imageUrl: "https://images.unsplash.com/photo-1627962483861-5fa58ad200d6?w=800&q=80", variants: [
    {label:"Sabor Mango",price:11000,fruits:["Banano","Papaya","Mango"]},
    {label:"Sabor Fresa",price:11000,fruits:["Banano","Papaya","Fresa"]}
  ], requiresFlavors: true, requiresFruitChoice: true, isActive: true },

  { name: "Vaso de Salpicón con Helado", category: "salpicon", imageUrl: "https://images.unsplash.com/photo-1550461716-e578fae32231?w=800&q=80", variants: [
    {label:"Pequeño",price:7000},
    {label:"Mediano",price:9000},
    {label:"Grande",price:11000}
  ], requiresFlavors: true, isActive: true },

  { name: "Copa D'LI", category: "copas", basePrice: 13000, imageUrl: "https://images.unsplash.com/photo-1553177595-4de2bb0842b9?w=800&q=80", requiresFlavors: true, scoops: 3, isActive: true },
  { name: "Copa Explosión de Sabores", category: "copas", basePrice: 16000, imageUrl: "https://images.unsplash.com/photo-1582236371542-f9024f0c9780?w=800&q=80", requiresFlavors: true, scoops: 7, isActive: true },

  { name: "Oblea Tradicional", category: "obleas", imageUrl: "https://images.unsplash.com/photo-1615801267497-29ef31d0540d?w=800&q=80", variants: [
    {"label":"Arequipe, Crema y Queso","price":6000,"hasFruit":false},
    {"label":"Arequipe, Crema, Queso y Fruta","price":9000,"hasFruit":true}
  ], requiresFruitChoice: true, isActive: true },

  { name: "Oblea Cuchareable", category: "obleas", imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&q=80", variants: [
    {"label":"Sin Helado","price":13000,"hasIceCream":false},
    {"label":"Con Helado","price":15000,"hasIceCream":true}
  ], requiresFruitChoice: true, requiresFlavors: true, isActive: true },

  { name: "Adición Queso", category: "adiciones", basePrice: 4000, isActive: true },
  { name: "Adición Fruta", category: "adiciones", basePrice: 3500, isActive: true },
  { name: "Adición Helado", category: "adiciones", basePrice: 3000, isActive: true },
  { name: "Adición Chantilly", category: "adiciones", basePrice: 4000, isActive: true },
  { name: "Adición Chips de Chocolate", category: "adiciones", basePrice: 3000, isActive: true },
  { name: "Adición Salsa", category: "adiciones", basePrice: 1000, isActive: true },
  { name: "Adición Barquillo", category: "adiciones", basePrice: 500, isActive: true },
  { name: "Adición Cono/Cucurucho", category: "adiciones", basePrice: 1000, isActive: true }
];

const SUPPLIES = [
  { name: 'Queso Crema', currentStock: 0.5, unit: 'kg', minLimit: 2, category: 'Lácteos' },
  { name: 'Fresa', currentStock: 1.2, unit: 'kg', minLimit: 5, category: 'Frutas' },
  { name: 'Leche Condensada', currentStock: 3, unit: 'und', minLimit: 10, category: 'Toppings' },
  { name: 'Helado Vainilla (Bala)', currentStock: 2, unit: 'und', minLimit: 5, category: 'Helados base' },
  { name: 'Barquillos', currentStock: 100, unit: 'und', minLimit: 200, category: 'Acompañamientos' },
];

const TABLES = [
  {"id": "mesa1", "label": "Mesa 1", "type": "table", "status": "free"},
  {"id": "mesa2", "label": "Mesa 2", "type": "table", "status": "free"},
  {"id": "mesa3", "label": "Mesa 3", "type": "table", "status": "free"},
  {"id": "paraLlevar", "label": "Para Llevar", "type": "delivery", "status": "free"}
];

export default function Seed() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // Flavors
      FLAVORS.forEach(name => {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const ref = doc(db, 'icecreamFlavors', id);
        batch.set(ref, { name, isAvailable: true, updatedAt: serverTimestamp() });
      });

      // Products
      PRODUCTS.forEach(p => {
        const id = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        const ref = doc(db, 'products', id);
        batch.set(ref, { ...p, updatedAt: serverTimestamp() });
      });

      // Tables
      TABLES.forEach(t => {
        const ref = doc(db, 'tables', t.id);
        batch.set(ref, { ...t, openedAt: null, currentCartSnapshot: null });
      });

      // Supplies
      SUPPLIES.forEach(s => {
        const id = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        const ref = doc(db, 'supplies', id);
        batch.set(ref, { ...s, updatedAt: serverTimestamp() });
      });

      await batch.commit();
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
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary font-bold">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="font-headline font-bold text-2xl text-on-surface">Configuración Inicial</h2>
        </div>

        <p className="text-secondary text-sm mb-8 leading-relaxed">
          Este proceso cargará el catálogo oficial de productos, sabores y la configuración de insumos/mesas en tu base de datos Firestore.
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
              onClick={() => window.location.href = '/login'}
              className="mt-4 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
            >
              Ir al Login
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
            Solo ejecutar una vez para inicializar el sistema
          </p>
        </div>
      </div>
    </div>
  );
}
