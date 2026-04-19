import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface IceCreamFlavor {
  id: string;
  name: string;
  isAvailable: boolean;
}

interface FlavorsState {
  availableFlavors: IceCreamFlavor[];
  isLoading: boolean;
  initialize: () => () => void;
}

let unsubscribeFlavors: (() => void) | null = null;

export const useFlavorsStore = create<FlavorsState>((set) => ({
  availableFlavors: [],
  isLoading: true,
  initialize: () => {
    // If already listening, return existing unsubscribe
    if (unsubscribeFlavors) return unsubscribeFlavors;

    const q = query(collection(db, 'icecreamFlavors'), orderBy('name', 'asc'));
    unsubscribeFlavors = onSnapshot(q,
      (snapshot) => {
        const flavors = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as IceCreamFlavor[];
        set({ availableFlavors: flavors, isLoading: false });
      },
      (error) => {
        console.error('Flavors listener error:', error);
        // On permission denied: clear listener so it can be retried after login
        unsubscribeFlavors = null;
        set({ isLoading: false });
      }
    );

    return unsubscribeFlavors!;
  },
}));

// Splash Store
interface SplashState {
  isVisible: boolean;
  message: string;
  progress: number;
  showSplash: (message: string) => void;
  hideSplash: () => void;
  setProgress: (progress: number) => void;
}

export const useSplashStore = create<SplashState>((set) => ({
  isVisible: true,
  message: 'Cargando D\'LI...',
  progress: 0,
  showSplash: (message) => set({ isVisible: true, message, progress: 0 }),
  hideSplash: () => set({ isVisible: false }),
  setProgress: (progress) => set({ progress }),
}));
