import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { 
  MenuSquare, 
  Search, 
  ArrowLeft, 
  Settings2, 
  Eye, 
  EyeOff, 
  Edit3, 
  ChevronRight,
  IceCream,
  Utensils,
  GlassWater
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import UserMenu from '../components/UserMenu';
import BottomNav from '../components/BottomNav';

import { useAuthStore } from '../stores/useAuthStore';

export default function Inventory() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(data);
      },
      (error) => {
        console.error("Inventory products listener error:", error);
      }
    );
    return unsubscribe;
  }, [profile]);

  const toggleProductStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'products', id), {
        isActive: !currentStatus
      });
      toast.success(`Producto ${!currentStatus ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const categories = [
    { id: 'all', label: 'Todos', icon: <MenuSquare className="w-4 h-4" /> },
    { id: 'helados', label: 'Helados', icon: <IceCream className="w-4 h-4" /> },
    { id: 'ensaladas', label: 'Ensaladas', icon: <Utensils className="w-4 h-4" /> },
    { id: 'copas', label: 'Copas', icon: <GlassWater className="w-4 h-4" /> },
    { id: 'obleas', label: 'Obleas', icon: <MenuSquare className="w-4 h-4" /> },
  ];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-32">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-outline sticky top-0 z-30 px-4 sm:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className="p-2 hover:bg-surface rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </Link>
          <div>
            <h1 className="font-headline font-bold text-lg text-on-surface text-center sm:text-left">Inventario del Menú</h1>
            <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Catálogo de Venta al Público</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20">
            <MenuSquare className="w-4 h-4" />
            Nuevo Producto
          </button>
          
          <UserMenu />
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-6 sm:gap-8">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-4 rounded-[2rem] border border-outline/50 shadow-sm">
           <div className="flex gap-2 overflow-x-auto w-full md:w-auto hide-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all",
                    activeCategory === cat.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-surface-container text-secondary hover:bg-surface-container-high"
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
           </div>

           <div className="flex items-center bg-surface-container rounded-2xl px-5 py-3 border border-outline w-full md:w-64 transition-all focus-within:border-primary">
              <Search className="w-4 h-4 text-secondary/40 mr-3" />
              <input 
                type="text" 
                placeholder="Buscar en el menú..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-on-surface placeholder:text-secondary/30 font-bold"
              />
           </div>
        </div>

        {/* Product Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <motion.div 
              layout
              key={product.id}
              className={cn(
                "bg-white rounded-[2.5rem] p-6 border-2 transition-all flex flex-col justify-between group",
                product.isActive ? "border-outline/50" : "border-dashed border-outline opacity-60 bg-surface-container/10"
              )}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                     product.isActive ? "bg-primary/5 text-primary" : "bg-surface-container text-secondary/40"
                   )}>
                      <IceCream className="w-6 h-6" />
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => toggleProductStatus(product.id, !!product.isActive)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          product.isActive ? "bg-success/10 text-success" : "bg-slate-100 text-slate-400"
                        )}
                      >
                         {product.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                   </div>
                </div>

                <h4 className="font-headline font-bold text-lg text-on-surface leading-snug mb-1">{product.name}</h4>
                <p className="text-[10px] text-secondary font-black uppercase tracking-[0.2em] mb-4">
                  Categoría: <span className="text-on-surface">{product.category}</span>
                </p>

                <div className="space-y-2 mb-6">
                   {product.variants ? (
                      product.variants.map((v, i) => (
                        <div key={i} className="flex justify-between items-center text-xs font-bold py-1.5 border-b border-outline/20 last:border-none">
                           <span className="text-secondary">{v.label}</span>
                           <span className="text-on-surface">{formatCurrency(v.price)}</span>
                        </div>
                      ))
                   ) : (
                      <div className="flex justify-between items-center text-sm font-black py-1.5 pt-4">
                         <span className="text-primary">Precio Base</span>
                         <span className="text-on-surface">{formatCurrency(product.basePrice || 0)}</span>
                      </div>
                   )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline/30">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Estado</span>
                    <span className={cn("text-[10px] font-bold", product.isActive ? "text-success" : "text-slate-500")}>
                       {product.isActive ? '• Visible en POS' : '• Oculto'}
                    </span>
                 </div>
                 <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                 </button>
              </div>
            </motion.div>
          ))}
        </section>

        {filteredProducts.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center opacity-30">
             <MenuSquare className="w-16 h-16 mb-6" />
             <p className="text-lg font-bold">No se encontraron productos</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
