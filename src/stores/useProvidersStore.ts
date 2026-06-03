import { create } from 'zustand';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export interface Provider {
  id: string;
  name: string;
  createdAt: any;
}

interface ProvidersState {
  providers: Provider[];
  loading: boolean;
  subscribe: () => () => void;
  addProvider: (name: string) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
}

export const useProvidersStore = create<ProvidersState>((set) => {
  let unsubscribe: (() => void) | null = null;

  return {
    providers: [{ id: 'otro', name: 'Otro', createdAt: null }], // Default
    loading: true,

    subscribe: () => {
      if (unsubscribe) return unsubscribe;

      const q = query(collection(db, 'providers'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Provider));
        // Ensure "Otro" is always there
        if (!data.some(p => p.name.toLowerCase() === 'otro')) {
            data.push({ id: 'otro', name: 'Otro', createdAt: null });
        }
        set({ providers: data.sort((a, b) => a.name.localeCompare(b.name)), loading: false });
      }, (err) => {
        console.error("Error loading providers:", err);
        set({ loading: false });
      });

      return unsubscribe;
    },

    addProvider: async (name: string) => {
      try {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const ref = doc(db, 'providers', id);
        await setDoc(ref, { name, createdAt: serverTimestamp() }, { merge: true });
        toast.success(`Proveedor ${name} añadido`);
      } catch (err) {
        console.error("Error adding provider:", err);
        toast.error("No se pudo añadir el proveedor");
      }
    },

    deleteProvider: async (id: string) => {
      try {
        if (id === 'otro') return;
        await deleteDoc(doc(db, 'providers', id));
        toast.success('Proveedor eliminado');
      } catch (err) {
        console.error("Error deleting provider:", err);
        toast.error("No se pudo eliminar el proveedor");
      }
    }
  };
});
