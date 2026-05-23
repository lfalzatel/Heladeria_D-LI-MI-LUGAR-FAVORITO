import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, IceCream, ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, getAssetUrl, cn } from '../lib/utils';

interface ProductDetailsCarouselProps {
  products: Product[];
  initialProductId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductDetailsCarousel({
  products,
  initialProductId,
  isOpen,
  onClose,
  onAddToCart
}: ProductDetailsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && initialProductId) {
      const idx = products.findIndex(p => p.id === initialProductId);
      setCurrentIndex(idx !== -1 ? idx : 0);
      setDirection(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only run when isOpen changes to prevent bouncing back on products update

  // Lock body scroll when open and handle hardware back button
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.history.pushState({ modal: 'product-carousel' }, '', window.location.pathname + '#carousel');
      
      const handlePopState = () => {
        onClose();
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        document.body.style.overflow = 'auto';
        window.removeEventListener('popstate', handlePopState);
        if (window.history.state?.modal === 'product-carousel') {
          window.history.back();
        }
      };
    } else {
      document.body.style.overflow = 'auto';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isAnimating) return;
    if (currentIndex < products.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isAnimating) return;
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!isOpen || products.length === 0) return null;

  const currentProduct = products[currentIndex];
  if (!currentProduct) return null;

  const minPrice = currentProduct.variants?.length 
    ? Math.min(...currentProduct.variants.map(v => v.price)) 
    : (currentProduct.basePrice || 0);

  const priceDisplay = currentProduct.variants && currentProduct.variants.length > 1 
    ? `Desde ${formatCurrency(minPrice)}` 
    : formatCurrency(minPrice);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
    })
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-surface/60 backdrop-blur-md"
        />

        {/* Carousel Container */}
        <div className="relative w-full max-w-sm flex items-center">
          
          {/* Prev Button */}
          {currentIndex > 0 && (
            <button 
              onClick={handlePrev}
              className="absolute -left-4 sm:-left-12 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-primary hover:scale-110 transition-transform active:scale-95"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Button */}
          {currentIndex < products.length - 1 && (
            <button 
              onClick={handleNext}
              className="absolute -right-4 sm:-right-12 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-primary hover:scale-110 transition-transform active:scale-95"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="relative w-full max-h-[95vh] grid overflow-hidden rounded-[2.5rem] shadow-2xl bg-white">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 350, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                onAnimationStart={() => setIsAnimating(true)}
                onAnimationComplete={() => setIsAnimating(false)}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.8}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);
                  if (swipe < -swipeConfidenceThreshold) {
                    handleNext();
                  } else if (swipe > swipeConfidenceThreshold) {
                    handlePrev();
                  }
                }}
                className="w-full max-h-[95vh] col-start-1 row-start-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:hidden pb-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Image Area */}
                <div 
                  className="relative w-full aspect-square max-h-[38vh] shrink-0 bg-surface-container-low"
                  style={currentProduct.cardColor?.startsWith('#') ? { backgroundColor: currentProduct.cardColor } : {}}
                >
                  {currentProduct.imageUrl ? (
                    <img 
                      src={getAssetUrl(currentProduct.imageUrl)} 
                      alt={currentProduct.name} 
                      className="w-full h-full object-cover pointer-events-none" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-secondary/30 pointer-events-none">
                      <IceCream className="w-24 h-24" />
                    </div>
                  )}
                  
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors z-20"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                      {currentProduct.category}
                    </span>
                  </div>
                </div>

                {/* Details Area */}
                <div className="p-6 sm:p-8 flex flex-col shrink-0">
                  <h3 className="text-2xl font-headline font-black text-on-surface leading-tight mb-2">
                    {currentProduct.name}
                  </h3>
                  
                  <p className="text-sm text-secondary font-medium leading-relaxed mb-6 min-h-[3rem]">
                    {currentProduct.description || "Sin descripción adicional."}
                  </p>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Precio Base</p>
                      <p className="text-xl font-black text-primary">
                        {priceDisplay}
                      </p>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => onAddToCart(currentProduct)}
                    className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-95 shadow-md shadow-primary/20"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Agregar al pedido
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots indicator */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
              {products.map((_, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-outline/20"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};
