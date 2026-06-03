import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../types';

interface CategoriesState {
  categories: Category[];
  activeCategories: Category[];
  isLoading: boolean;
  initialize: () => () => void;
}

let unsubscribeCategories: (() => void) | null = null;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'helados', label: 'Helados', isActive: true, createdAt: Date.now() },
  { id: 'ensaladas', label: 'Ensaladas', isActive: true, createdAt: Date.now() },
  { id: 'copas', label: 'Copas', isActive: true, createdAt: Date.now() },
  { id: 'salpicon', label: 'Salpicón', isActive: true, createdAt: Date.now() },
  { id: 'obleas', label: 'Obleas', isActive: true, createdAt: Date.now() },
  { id: 'bebidas-calientes', label: 'Bebidas Calientes', isActive: true, createdAt: Date.now() },
  { id: 'adiciones', label: 'Adiciones', isActive: true, createdAt: Date.now() }
];

export const useCategoriesStore = create<CategoriesState>((set) => ({
  categories: [],
  activeCategories: DEFAULT_CATEGORIES,
  isLoading: true,
  initialize: () => {
    if (unsubscribeCategories) return unsubscribeCategories;

    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    unsubscribeCategories = onSnapshot(q,
      (snapshot) => {
        const sortedCategories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];
        
        const activeCategories = sortedCategories.filter(c => c.isActive);
        
        set({ 
          categories: sortedCategories.length > 0 ? sortedCategories : DEFAULT_CATEGORIES, 
          activeCategories: activeCategories.length > 0 ? activeCategories : DEFAULT_CATEGORIES,
          isLoading: false 
        });
      },
      (error) => {
        console.error('Categories listener error:', error);
        unsubscribeCategories = null;
        set({ isLoading: false });
      }
    );

    return unsubscribeCategories!;
  },
}));
