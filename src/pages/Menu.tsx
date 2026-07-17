import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { useCategoriesStore } from '../stores/useCategoriesStore';
import { formatCurrency, cn, getAssetUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Search, IceCream, LogIn, Sparkles, ChevronRight, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductDetailsCarousel from '../components/ProductDetailsCarousel';

export default function Menu() {
  const navigate = useNavigate();
  const { activeCategories } = useCategoriesStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [showAuthAlert, setShowAuthAlert] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('isActive', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      
      // Sort by salesCount (desc) then by name
      prods.sort((a, b) => {
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
      
      setProducts(prods);
    });
    return unsub;
  }, []);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-surface-container-lowest/30 flex flex-col pb-12">
      {/* Premium Header Banner */}
      <header className="sticky top-0 z-[60] bg-white/75 backdrop-blur-2xl border-b border-outline/10 shadow-[0_4px_30px_rgba(0,0,0,0.02)] px-4 sm:px-10 h-16 sm:h-24 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-outline/10 shadow-sm p-0.5 bg-white">
            <img src="/pwa-192x192.png" alt="D'LI" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <h1 className="font-headline font-black text-sm sm:text-lg text-on-surface leading-tight">D'LI MI LUGAR FAVORITO</h1>
            <p className="text-[8px] sm:text-[9px] font-black text-primary uppercase tracking-[0.2em]">Carta Interactiva</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-white rounded-full text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Ingresar</span>
        </button>
      </header>

      {/* CTA Banner to login */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6">
        <div className="bg-gradient-to-r from-rose-500/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-headline font-black text-sm sm:text-base text-on-surface">¡Haz tu pedido en línea!</h3>
              <p className="text-xs text-secondary font-medium mt-1">Crea tu cuenta o inicia sesión para pedir a domicilio o a la mesa y acumular puntos de fidelidad.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-5 py-2.5 bg-on-surface text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Registrarse / Iniciar Sesión
          </button>
        </div>
      </div>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Search and filter header */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 rounded-3xl border border-outline/10 shadow-sm">
          <div className="relative flex-1 bg-surface-container rounded-2xl px-4 py-3 border border-outline/10 flex items-center">
            <Search className="w-4 h-4 text-secondary/60 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar un helado, postre..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-on-surface placeholder:text-secondary/40 font-bold"
            />
          </div>
          
          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar text-[10px] font-black uppercase max-w-full md:max-w-2xl py-1">
            {[{ id: 'all', label: 'Todos', icon: <Package className="w-4 h-4" /> }, ...activeCategories.map(c => ({ id: c.id, label: c.label, icon: <Package className="w-4 h-4" /> }))].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-xl transition-all flex items-center gap-2 flex-shrink-0 border",
                  activeCategory === cat.id
                    ? "bg-on-surface text-white border-on-surface shadow-sm"
                    : "text-secondary hover:bg-surface-container border-outline/10"
                )}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const minPrice = product.variants?.length ? Math.min(...product.variants.map(v => v.price)) : (product.basePrice || 0);
            const priceDisplay = product.variants && product.variants.length > 1 ? `Desde ${formatCurrency(minPrice)}` : formatCurrency(minPrice);
            
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setDetailsProduct(product)}
                className={cn(
                  "rounded-[1.5rem] p-3.5 flex items-center gap-3 relative border hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group bg-white border-outline/10 shadow-sm"
                )}
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-surface-container-low border border-outline/5">
                  {product.imageUrl ? (
                    <img src={getAssetUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <IceCream className="w-8 h-8 text-secondary/30 absolute inset-0 m-auto group-hover:text-primary transition-colors" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-6 text-left">
                  <h3 className="font-headline font-black text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-[10px] text-secondary font-medium line-clamp-2 leading-snug mt-1">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-black text-rose-500">
                      {priceDisplay}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-secondary/40 absolute right-3 top-1/2 -translate-y-1/2 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Product Details Modal (Reuses ProductDetailsCarousel component) */}
      <AnimatePresence>
        {detailsProduct && (
          <ProductDetailsCarousel
            product={detailsProduct}
            onClose={() => setDetailsProduct(null)}
            onAddToOrder={(qty, variant, notes, selectedFlavors, fruitChoices, additions) => {
              setDetailsProduct(null);
              setShowAuthAlert(true);
            }}
            ctaText="Ordenar ahora"
          />
        )}
      </AnimatePresence>

      {/* Auth Alert Dialog */}
      <AnimatePresence>
        {showAuthAlert && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthAlert(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-outline/10 text-center z-10"
            >
              <button
                onClick={() => setShowAuthAlert(false)}
                className="absolute right-4 top-4 w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              
              <h3 className="font-headline font-black text-base text-on-surface">¿Quieres hacer un pedido?</h3>
              <p className="text-xs text-secondary font-medium leading-relaxed mt-2 px-2">
                Para ordenar tus antojos en línea y acumular puntos de fidelidad ⭐ para ganar premios, por favor inicia sesión o crea tu cuenta.
              </p>
              
              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowAuthAlert(false);
                    navigate('/login');
                  }}
                  className="w-full py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Iniciar Sesión / Registrarse
                </button>
                <button
                  onClick={() => setShowAuthAlert(false)}
                  className="w-full py-3 text-secondary hover:bg-surface-container rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
                >
                  Seguir viendo la carta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
