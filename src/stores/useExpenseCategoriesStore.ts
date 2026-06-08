import { create } from 'zustand';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string;
  createdAt?: any;
}

interface ExpenseCategoriesState {
  categories: ExpenseCategory[];
  loading: boolean;
  subscribe: () => () => void;
  addCategory: (name: string, emoji: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useExpenseCategoriesStore = create<ExpenseCategoriesState>((set) => {
  let unsubscribe: (() => void) | null = null;

  return {
    categories: [],
    loading: true,

    subscribe: () => {
      if (unsubscribe) return unsubscribe;

      const q = query(collection(db, 'expenseCategories'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseCategory));
        set({ categories: data.sort((a, b) => a.name.localeCompare(b.name)), loading: false });
      }, (err) => {
        console.error("Error loading expense categories:", err);
        set({ loading: false });
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };
    },

    addCategory: async (name: string, emoji: string) => {
      try {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const ref = doc(db, 'expenseCategories', id);
        await setDoc(ref, { name, emoji, createdAt: serverTimestamp() }, { merge: true });
        toast.success(`Categoría de gasto "${name}" añadida`);
      } catch (err) {
        console.error("Error adding expense category:", err);
        toast.error("No se pudo añadir la categoría");
      }
    },

    deleteCategory: async (id: string) => {
      try {
        await deleteDoc(doc(db, 'expenseCategories', id));
        toast.success('Categoría eliminada');
      } catch (err) {
        console.error("Error deleting expense category:", err);
        toast.error("No se pudo eliminar la categoría");
      }
    }
  };
});
