import { create } from 'zustand';
import { doc, onSnapshot, updateDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variantLabel: string;
  description: string;
  flavors: string[];
  fruitChoices: string[];
  additions: string[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface TableCart {
  items: CartItem[];
  openedAt: string | null;
  note: string;
}

interface TableCartState {
  carts: {
    [tableKey: string]: TableCart;
  };
  activeTable: string;
  isInitialized: boolean;
  initialize: () => () => void;
  setActiveTable: (table: string) => void;
  addItem: (table: string, item: CartItem) => Promise<void>;
  updateQuantity: (table: string, itemId: string, delta: number) => Promise<void>;
  removeItem: (table: string, itemId: string) => Promise<void>;
  clearCart: (table: string) => Promise<void>;
  getTotal: (table: string) => number;
  getItemCount: (table: string) => number;
}

const initialTableCart: TableCart = {
  items: [],
  openedAt: null,
  note: '',
};

export const useTableCartStore = create<TableCartState>()((set, get) => ({
  carts: {
    'paraLlevar': { ...initialTableCart },
    'mesa1': { ...initialTableCart },
    'mesa2': { ...initialTableCart },
    'mesa3': { ...initialTableCart },
    'mesa4': { ...initialTableCart },
    'mesa5': { ...initialTableCart },
  },
  activeTable: 'paraLlevar',
  isInitialized: false,

  initialize: () => {
    const unsubscribe = onSnapshot(collection(db, 'tables'), (snapshot) => {
      const newCarts = { ...get().carts };
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.currentCart) {
          newCarts[doc.id] = data.currentCart;
        } else {
          newCarts[doc.id] = { ...initialTableCart };
        }
      });
      set({ carts: newCarts, isInitialized: true });
    }, (error) => {
      console.error("Cart sync error:", error);
    });

    return unsubscribe;
  },

  setActiveTable: (activeTable) => set({ activeTable }),

  addItem: async (table, item) => {
    const carts = get().carts;
    // Ensure we have a valid base for the current table
    const tableCart = carts[table] || { ...initialTableCart };
    
    // Check if identical item already exists
    const existingIndex = tableCart.items.findIndex(i => 
      i.productId === item.productId && 
      i.variantLabel === item.variantLabel && 
      JSON.stringify(i.flavors) === JSON.stringify(item.flavors) &&
      JSON.stringify(i.fruitChoices) === JSON.stringify(item.fruitChoices)
    );

    let newItems;
    if (existingIndex > -1) {
      newItems = [...tableCart.items];
      const existing = newItems[existingIndex];
      newItems[existingIndex] = {
        ...existing,
        quantity: existing.quantity + item.quantity,
        subtotal: (existing.quantity + item.quantity) * existing.unitPrice
      };
    } else {
      newItems = [...tableCart.items, item];
    }

    const newCart = {
      ...tableCart,
      items: newItems,
      openedAt: tableCart.openedAt || new Date().toISOString()
    };

    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: newCart }, { merge: true });
  },

  updateQuantity: async (table, itemId, delta) => {
    const tableCart = get().carts[table];
    if (!tableCart) return;

    const items = tableCart.items.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty, subtotal: newQty * i.unitPrice };
      }
      return i;
    });

    const newCart = { ...tableCart, items };
    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: newCart }, { merge: true });
  },

  removeItem: async (table, itemId) => {
    const tableCart = get().carts[table];
    if (!tableCart) return;

    const items = tableCart.items.filter(i => i.id !== itemId);
    const openedAt = items.length === 0 ? null : tableCart.openedAt;

    const newCart = { ...tableCart, items, openedAt };
    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: newCart }, { merge: true });
  },

  clearCart: async (table) => {
    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: { ...initialTableCart } }, { merge: true });
  },

  getTotal: (table) => {
    const items = get().carts[table]?.items || [];
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getItemCount: (table) => {
    const items = get().carts[table]?.items || [];
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }
}));
