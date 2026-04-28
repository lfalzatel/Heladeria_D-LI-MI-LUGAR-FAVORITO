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
import { formatCurrency, cn, getAssetUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import BottomNav from '../components/BottomNav';
import AppHeader, { PageTitle } from '../components/AppHeader';
import AdminSidebar from '../components/AdminSidebar';
import ProductFormModal from '../components/ProductFormModal';
import { useAuthStore } from '../stores/useAuthStore';
import { useFlavorsStore } from '../stores/useFlavorsStore';

export default function Inventory() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'productos' | 'sabores'>('productos');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  
  const { availableFlavors } = useFlavorsStore();

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        
        // Order by salesCount desc, then name
        data.sort((a, b) => {
          // 1. Adiciones always go last
          const isAddA = a.category === 'adiciones';
          const isAddB = b.category === 'adiciones';
          if (isAddA && !isAddB) return 1;
          if (!isAddA && isAddB) return -1;

          // 2. Then sort by salesCount (desc)
          const salesA = a.salesCount || 0;
          const salesB = b.salesCount || 0;
          if (salesB !== salesA) return salesB - salesA;

          // 3. Finally by name
          return a.name.localeCompare(b.name);
        });
        
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

  const toggleFlavorStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'icecreamFlavors', id), {
        isAvailable: !currentStatus
      });
      toast.success(`Sabor ${!currentStatus ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al actualizar estado del sabor');
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (productToEdit) {
      await updateDoc(doc(db, 'products', productToEdit.id), {
        ...productData,
        updatedAt: new Date() // using client date to avoid need for serverTimestamp import clash if not imported
      });
      toast.success('Producto actualizado exitosamente');
    } else {
      await import('firebase/firestore').then(({ addDoc, serverTimestamp }) => {
        addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      toast.success('Producto creado y añadido al catálogo');
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
    <div className="min-h-screen flex bg-surface-container-lowest">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen relative pb-32 overflow-x-hidden min-w-0">
        <AppHeader showBell />
        <PageTitle title="Inventario del Menú" subtitle="Catálogo de Venta al Público" />

      <main className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-6 sm:gap-8 w-full overflow-x-hidden">
        {/* Floating Add Product Button */}
        <button 
          onClick={() => { setProductToEdit(null); setIsProductModalOpen(true); }}
          className="w-full py-4 sm:py-5 bg-on-surface text-white rounded-[2rem] font-black text-[10px] sm:text-xs uppercase tracking-widest sm:tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all px-4"
        >
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg sm:text-xl leading-none font-light">+</span>
          </div>
          <span className="truncate">Añadir Nuevo Producto</span>
        </button>

        <div className="flex bg-surface-container rounded-2xl p-1 mb-2">
          <button
            onClick={() => setActiveTab('productos')}
            className={cn(
              "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
              activeTab === 'productos' 
                ? "bg-white text-primary shadow-sm" 
                : "text-secondary hover:text-on-surface"
            )}
          >
            Productos
          </button>
          <button
            onClick={() => setActiveTab('sabores')}
            className={cn(
              "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
              activeTab === 'sabores' 
                ? "bg-white text-primary shadow-sm" 
                : "text-secondary hover:text-on-surface"
            )}
          >
            Sabores
          </button>
        </div>

        {activeTab === 'productos' ? (
          <>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-4 rounded-[2rem] border border-outline/50 shadow-sm w-full">
           <div className="flex gap-2 overflow-x-auto w-full md:w-auto hide-scrollbar pb-2 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap shrink-0",
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
          {filteredProducts.map((product, index) => (
            <motion.div 
              layout
              key={product.id}
              className={cn(
                "rounded-[2.5rem] p-6 border-2 transition-all flex flex-col justify-between group animate-card-mix opacity-0",
                (!product.cardColor || !product.cardColor.startsWith('#')) && (product.cardColor || "bg-white"),
                product.isActive ? "border-outline/50" : "border-dashed border-outline opacity-60 bg-surface-container/10"
              )}
              style={{ 
                ...(product.cardColor?.startsWith('#') ? { backgroundColor: product.cardColor } : {}),
                animationDelay: `${index * 0.05}s`
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors overflow-hidden",
                     product.isActive ? "bg-primary/5 text-primary" : "bg-surface-container text-secondary/40"
                   )}>
                      {product.imageUrl ? (
                         <img src={getAssetUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                         <IceCream className="w-6 h-6" />
                      )}
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
                       {product.isActive ? '• Visible' : '• Oculto'}
                    </span>
                 </div>
                 <button 
                    onClick={() => { setProductToEdit(product); setIsProductModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all cursor-pointer"
                 >
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
          </>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableFlavors.map(flavor => (
              <motion.div
                layout
                key={flavor.id}
                className={cn(
                  "relative bg-white rounded-[2rem] p-6 shadow-sm border transition-all",
                  flavor.isAvailable ? "border-outline/50 hover:shadow-md" : "border-outline/20 opacity-70 grayscale-[0.5]"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-container-high shrink-0 text-primary">
                    <IceCream className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => toggleFlavorStatus(flavor.id, flavor.isAvailable)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95",
                      flavor.isAvailable 
                      ? "bg-surface-container text-secondary hover:bg-error/10 hover:text-error" 
                      : "bg-surface-container text-secondary hover:bg-success/10 hover:text-success"
                    )}
                  >
                    {flavor.isAvailable ? 'Desactivar' : 'Activar'}
                  </button>
                </div>

                <h2 className="font-brand font-black text-2xl text-on-surface mb-2 tracking-tight">
                  {flavor.name}
                </h2>

                <div className="flex flex-col pt-4 border-t border-outline/30 mt-4">
                   <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Estado</span>
                   <span className={cn("text-[10px] font-bold", flavor.isAvailable ? "text-success" : "text-slate-500")}>
                      {flavor.isAvailable ? '• Disponible' : '• Agotado/Oculto'}
                   </span>
                </div>
              </motion.div>
            ))}
          </section>
        )}
      </main>

      {isProductModalOpen && (
        <ProductFormModal 
          isOpen={isProductModalOpen} 
          onClose={() => setIsProductModalOpen(false)} 
          productToEdit={productToEdit}
          onSave={handleSaveProduct}
        />
      )}

      <BottomNav />
      </div>
    </div>
  );
}
