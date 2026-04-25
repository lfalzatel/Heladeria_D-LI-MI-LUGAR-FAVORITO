import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Save, IceCream, Link as LinkIcon, Info } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { toast } from 'sonner';
import { getAssetUrl, cn } from '../lib/utils';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSave: (productData: Partial<Product>) => Promise<void>;
}

export default function ProductFormModal({ isOpen, onClose, productToEdit, onSave }: ProductFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Product['category']>('helados');
  const [imageUrl, setImageUrl] = useState('');
  const [isVariantBased, setIsVariantBased] = useState(false);
  const [basePrice, setBasePrice] = useState<number>('');
  const [baseScoops, setBaseScoops] = useState<number>(1);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [cardColor, setCardColor] = useState<string>('');
  
  // Toggles
  const [reqFlavors, setReqFlavors] = useState(false);
  const [reqSauces, setReqSauces] = useState(false);
  const [reqFruit, setReqFruit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setName(productToEdit.name);
        setCategory(productToEdit.category);
        setImageUrl(productToEdit.imageUrl || '');
        setReqFlavors(!!productToEdit.requiresFlavors);
        setReqSauces(!!productToEdit.requiresSauces);
        setReqFruit(!!productToEdit.requiresFruitChoice);
        setCardColor(productToEdit.cardColor || '');

        if (productToEdit.variants && productToEdit.variants.length > 0) {
          setIsVariantBased(true);
          setVariants(productToEdit.variants);
          setBasePrice('');
        } else {
          setIsVariantBased(false);
          setBasePrice(productToEdit.basePrice || '');
          setBaseScoops(productToEdit.scoops || 1);
          setVariants([]);
        }
      } else {
        // Reset form for new product
        setName('');
        setCategory('helados');
        setImageUrl('');
        setIsVariantBased(false);
        setBasePrice('');
        setBaseScoops(1);
        setVariants([]);
        setReqFlavors(false);
        setReqSauces(false);
        setReqFruit(false);
        setCardColor('');
      }
    }
  }, [isOpen, productToEdit]);

  const handleAddVariant = () => {
    setVariants([...variants, { label: '', price: 0, scoops: 1 }]);
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('El producto necesita un nombre');
    if (isVariantBased && variants.length === 0) return toast.error('Añade al menos una variante');
    if (isVariantBased && variants.some(v => !v.label || v.price <= 0)) return toast.error('Verifica los datos de las variantes');
    if (!isVariantBased && (!basePrice || basePrice <= 0)) return toast.error('Verifica el precio base');

    setLoading(true);
    try {
      const data: Partial<Product> = {
        name: name.trim(),
        category,
        isActive: productToEdit ? productToEdit.isActive : true,
        imageUrl: imageUrl.trim() || null,
        requiresFlavors: reqFlavors,
        requiresSauces: reqSauces,
        requiresFruitChoice: reqFruit,
        cardColor: cardColor || null as any,
      };

      if (isVariantBased) {
        data.variants = variants;
        data.basePrice = null as any;
        data.scoops = null as any;
      } else {
        data.basePrice = Number(basePrice);
        data.scoops = Number(baseScoops);
        data.variants = null as any;
      }

      await onSave(data);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ y: '100%', opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col h-[90dvh] sm:h-auto sm:max-h-[90vh]"
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-outline/20 rounded-full" />
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-b border-outline/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <IceCream className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-on-surface leading-tight">
                {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-[10px] text-secondary font-black uppercase tracking-widest">
                Catálogo de Ventas
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <X className="w-5 h-5 text-on-surface" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
          <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Imagen URL */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-secondary">
                URL de la Imagen (Link externo)
              </label>
              <div className="relative flex items-center">
                <LinkIcon className="absolute left-4 w-5 h-5 text-secondary/50" />
                <input
                  type="text"
                  placeholder="Ej: /images/products/... o https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full pl-12 pr-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                />
              </div>
              <div className="flex items-center gap-2 mt-1 text-secondary/70">
                 <Info className="w-4 h-4" />
                 <p className="text-xs">Para no incurrir en costos de Firebase, usa links de imágenes (ej. Google Images o Unsplash).</p>
              </div>
            </div>

            {/* Fila: Nombre y Categoría */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-secondary"> Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cono Sencillo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-secondary"> Categoría *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 h-14 bg-surface-container rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-on-surface appearance-none"
                >
                  <option value="helados">Helados</option>
                  <option value="ensaladas">Ensaladas</option>
                  <option value="copas">Copas / Cuchareables</option>
                  <option value="salpicon">Salpicón</option>
                  <option value="obleas">Obleas</option>
                  <option value="adiciones">Adiciones y Extras</option>
                </select>
              </div>
            </div>

            <div className="h-px bg-outline/10 w-full my-2" />

            {/* Requerimientos (Toggles) */}
            <div>
               <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-3 block">
                 ¿Qué le debe preguntar el cajero al cliente?
               </label>
               <div className="flex flex-wrap gap-3">
                  <FormToggle isActive={reqFlavors} onClick={() => setReqFlavors(!reqFlavors)} label="Elegir Sabores (Bolas)" />
                  <FormToggle isActive={reqSauces} onClick={() => setReqSauces(!reqSauces)} label="Elegir Salsas" />
                  <FormToggle isActive={reqFruit} onClick={() => setReqFruit(!reqFruit)} label="Elegir Frutas" />
               </div>
            </div>

            {/* Selector de Color de Tarjeta */}
            <div className="flex flex-col gap-3">
               <label className="text-[11px] font-black uppercase tracking-widest text-secondary">
                 Color Estratégico (Psicología del Color)
               </label>
               <div className="flex flex-wrap gap-3">
                 {[
                   { name: 'Ninguno', color: '' },
                   { name: 'Rojo', color: 'bg-[#FFEBEE]', border: 'border-red-200' },
                   { name: 'Amarillo', color: 'bg-[#FFF9C4]', border: 'border-amber-200' },
                   { name: 'Azul', color: 'bg-blue-100', border: 'border-blue-300' },
                   { name: 'Verde', color: 'bg-emerald-100', border: 'border-emerald-300' },
                   { name: 'Naranja', color: 'bg-orange-100', border: 'border-orange-300' },
                   { name: 'Morado', color: 'bg-purple-100', border: 'border-purple-300' },
                 ].map((c) => (
                   <button
                     key={c.name}
                     type="button"
                     onClick={() => setCardColor(c.color)}
                     className={cn(
                       "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                       cardColor === c.color 
                         ? "border-primary shadow-md scale-105" 
                         : "border-transparent opacity-70 hover:opacity-100"
                     )}
                   >
                     <div className={cn("w-4 h-4 rounded-full border border-black/5", c.color || 'bg-white')} />
                     {c.name}
                   </button>
                 ))}
               </div>
               <p className="text-[9px] text-secondary/60 font-bold italic">
                 * El rojo y amarillo estimulan el apetito y la compra impulsiva.
               </p>
            </div>

            <div className="h-px bg-outline/10 w-full my-2" />

            {/* Precios y Variantes */}
            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/20 cursor-pointer" onClick={() => setIsVariantBased(!isVariantBased)}>
               <div>
                 <p className="font-bold text-primary">Tiene varios tamaños o variantes</p>
                 <p className="text-xs text-primary/70">Ej: Pequeño, Mediano, Grande</p>
               </div>
               <div className={`w-12 h-6 rounded-full transition-colors relative ${isVariantBased ? 'bg-primary' : 'bg-outline/30'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isVariantBased ? 'left-7' : 'left-1'}`} />
               </div>
            </div>

            {!isVariantBased ? (
              // Precio Fijo
              <div className="grid grid-cols-2 gap-4 bg-surface-container/50 p-5 rounded-3xl border border-outline/10">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-secondary">Precio Base *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-secondary">$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value as any)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 h-14 bg-white rounded-xl border border-outline/20 outline-none focus:ring-2 focus:border-primary transition-all font-black text-lg"
                    />
                  </div>
                </div>
                {reqFlavors && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary">Bolas de Helado</label>
                    <input
                      type="number"
                      min={1}
                      value={baseScoops}
                      onChange={(e) => setBaseScoops(Number(e.target.value))}
                      className="w-full px-4 h-14 bg-white rounded-xl border border-outline/20 outline-none focus:ring-2 transition-all font-bold"
                    />
                  </div>
                )}
              </div>
            ) : (
              // Variantes
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-secondary block">Variantes de Venta *</label>
                {variants.map((v, i) => (
                  <div key={i} className="flex flex-wrap gap-2 items-center bg-surface-container/30 p-3 rounded-2xl border border-outline/20 relative group">
                     <input
                        type="text"
                        placeholder="Nombre (ej. Doble)"
                        value={v.label}
                        onChange={(e) => handleUpdateVariant(i, 'label', e.target.value)}
                        className="flex-1 min-w-[120px] h-12 bg-white rounded-xl px-4 border border-outline/10 font-bold outline-none focus:ring-1 focus:ring-primary"
                     />
                     <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-secondary text-sm">$</span>
                        <input
                          type="number"
                          placeholder="Precio"
                          value={v.price || ''}
                          onChange={(e) => handleUpdateVariant(i, 'price', Number(e.target.value))}
                          className="w-full pl-7 pr-3 h-12 bg-white rounded-xl font-black text-on-surface border border-outline/10 outline-none focus:ring-1"
                        />
                     </div>
                     {reqFlavors && (
                        <input
                          type="number"
                          placeholder="Bolas"
                          title="Bolas de helado"
                          value={v.scoops || ''}
                          onChange={(e) => handleUpdateVariant(i, 'scoops', Number(e.target.value))}
                          className="w-16 h-12 bg-white text-center rounded-xl font-bold border border-outline/10 outline-none focus:ring-1"
                        />
                     )}
                     <button
                       type="button"
                       onClick={() => handleRemoveVariant(i)}
                       className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors ml-auto sm:ml-0"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Tamaño/Variante
                </button>
              </div>
            )}

            <div className="h-32" /> {/* Buffer para el scroll visible detrás del botón flotante */}
          </form>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-12">
           <button
             type="submit"
             form="product-form"
             disabled={loading}
             className="w-full h-14 bg-on-surface text-white rounded-2xl font-black uppercase space-x-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
           >
             {loading ? (
               <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
               <>
                 <Save className="w-5 h-5" />
                 <span>{productToEdit ? 'Guardar Cambios' : 'Registrar Producto'}</span>
               </>
             )}
           </button>
        </div>
      </motion.div>
    </div>
  );
}

function FormToggle({ isActive, onClick, label }: { isActive: boolean, onClick: () => void, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
        isActive 
          ? 'bg-primary text-white shadow-lg shadow-primary/20 border-primary' 
          : 'bg-white text-secondary hover:bg-surface-container border-outline/20'
      }`}
    >
      {label}
    </button>
  );
}
