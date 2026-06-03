import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import { useCategoriesStore } from '../stores/useCategoriesStore';
import { Category } from '../types';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { DEFAULT_CATEGORIES } from '../stores/useCategoriesStore';

const ICON_OPTIONS = [
  { value: 'IceCream', label: 'Helado' },
  { value: 'Apple', label: 'Fruta / Manzana' },
  { value: 'Coffee', label: 'Copa / Café' },
  { value: 'GlassWater', label: 'Vaso' },
  { value: 'Utensils', label: 'Cubiertos' },
  { value: 'Cookie', label: 'Galleta' },
  { value: 'Plus', label: 'Suma / Extra' },
  { value: 'Store', label: 'Tienda' },
  { value: 'Cake', label: 'Pastel' },
  { value: 'Star', label: 'Estrella' }
];

export default function CategoryManager() {
  const { categories } = useCategoriesStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [isAdding, setIsAdding] = useState(false);

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({ ...cat });
    setIsAdding(false);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      label: '',
      iconName: 'Star',
      isActive: true,
      order: categories.length
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.label?.trim()) {
      toast.error('El nombre de la categoría es requerido');
      return;
    }

    try {
      const isNew = isAdding;
      const catId = isNew 
        ? formData.label.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : formData.id!;

      const docRef = doc(db, 'categories', catId);
      
      await setDoc(docRef, {
        id: catId,
        label: formData.label.trim(),
        iconName: formData.iconName || 'Star',
        order: formData.order ?? categories.length,
        isActive: formData.isActive ?? true,
        updatedAt: Timestamp.now()
      }, { merge: true });

      toast.success(isNew ? 'Categoría creada' : 'Categoría actualizada');
      handleCancel();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la categoría');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Si hay productos usándola, podrían no mostrarse correctamente.')) return;
    
    try {
      await deleteDoc(doc(db, 'categories', id));
      toast.success('Categoría eliminada');
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar');
    }
  };

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-outline/10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Categorías de Productos</h2>
          <p className="text-sm text-secondary">Gestiona las categorías que aparecen en ventas y catálogo</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Categoría
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {isAdding && (
          <div className="bg-surface-container/50 p-4 rounded-2xl border-2 border-primary/20 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-black uppercase tracking-widest text-secondary block mb-1">Nombre</label>
              <input
                autoFocus
                type="text"
                value={formData.label || ''}
                onChange={e => setFormData({ ...formData, label: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-outline/20 outline-none focus:border-primary focus:ring-1"
                placeholder="Ej. Bebidas"
              />
            </div>
            <div className="w-48">
              <label className="text-[11px] font-black uppercase tracking-widest text-secondary block mb-1">Ícono</label>
              <select
                value={formData.iconName || 'Star'}
                onChange={e => setFormData({ ...formData, iconName: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-outline/20 outline-none focus:border-primary"
              >
                {ICON_OPTIONS.map(icon => (
                  <option key={icon.value} value={icon.value}>{icon.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 h-12">
              <button onClick={handleSave} className="h-full px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">Guardar</button>
              <button onClick={handleCancel} className="h-full w-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {sortedCategories.map(cat => {
          const isEditing = editingId === cat.id;

          if (isEditing) {
            return (
              <div key={cat.id} className="bg-surface-container/50 p-4 rounded-2xl border-2 border-primary/20 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[11px] font-black uppercase tracking-widest text-secondary block mb-1">Nombre</label>
                  <input
                    autoFocus
                    type="text"
                    value={formData.label || ''}
                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-outline/20 outline-none focus:border-primary focus:ring-1"
                  />
                </div>
                <div className="w-48">
                  <label className="text-[11px] font-black uppercase tracking-widest text-secondary block mb-1">Ícono</label>
                  <select
                    value={formData.iconName || 'Star'}
                    onChange={e => setFormData({ ...formData, iconName: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-outline/20 outline-none focus:border-primary"
                  >
                    {ICON_OPTIONS.map(icon => (
                      <option key={icon.value} value={icon.value}>{icon.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 h-12">
                  <button onClick={() => setFormData({ ...formData, isActive: !formData.isActive })} 
                    className={`h-full px-4 flex items-center justify-center rounded-xl border-2 font-bold transition-colors ${formData.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-surface-container text-secondary border-outline/20'}`}>
                    {formData.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button onClick={handleSave} className="h-full px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">Guardar</button>
                  <button onClick={handleCancel} className="h-full w-12 flex items-center justify-center bg-surface-container text-secondary rounded-xl hover:bg-outline/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={cat.id} className={`flex items-center justify-between p-4 rounded-2xl border ${cat.isActive ? 'border-outline/10 bg-white' : 'border-outline/5 bg-surface-container/30 opacity-70'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.isActive ? 'bg-primary/10 text-primary' : 'bg-outline/10 text-secondary'}`}>
                  {/* Preview icon placeholder since dynamic icon rendering requires more complex logic, we'll just use a generic or label */}
                  <span className="font-black uppercase">{cat.label.substring(0, 2)}</span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-lg">{cat.label}</h3>
                  <p className="text-xs text-secondary font-medium">
                    Ícono: {cat.iconName || 'Defecto'} • {cat.isActive ? 'Activa' : 'Oculta'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(cat)}
                  className="w-10 h-10 flex items-center justify-center text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="w-10 h-10 flex items-center justify-center text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
