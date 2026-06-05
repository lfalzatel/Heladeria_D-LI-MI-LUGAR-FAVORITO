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
  additionIds?: string[];
  notes?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  prepared?: boolean;
  locked?: boolean;
  isOwnerConsumption?: boolean;
}

interface TableCart {
  items: CartItem[];
  openedAt: string | null;
  note: string;
  isLocked?: boolean;
  isTakeout?: boolean;
  packagingSupplies?: { supplyId: string; quantity: number }[];
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
  updateItem: (table: string, itemId: string, updates: Partial<CartItem>) => Promise<void>;
  updateQuantity: (table: string, itemId: string, delta: number) => Promise<void>;
  removeItem: (table: string, itemId: string) => Promise<void>;
  clearCart: (table: string) => Promise<void>;
  updateNote: (table: string, note: string) => Promise<void>;
  toggleLock: (table: string, locked: boolean) => Promise<void>;
  setTakeout: (table: string, isTakeout: boolean) => Promise<void>;
  updatePackagingSupply: (table: string, supplyId: string, quantity: number) => Promise<void>;
  getTotal: (table: string) => number;
  getItemCount: (table: string) => number;
}

const initialTableCart: TableCart = {
  items: [],
  openedAt: null,
  note: '',
  isLocked: false,
  isTakeout: false,
  packagingSupplies: [],
};

export const useTableCartStore = create<TableCartState>()((set, get) => ({
  carts: {
    'directa': { ...initialTableCart },
    'mesa1': { ...initialTableCart },
    'mesa2': { ...initialTableCart },
    'mesa3': { ...initialTableCart },
  },
  activeTable: 'directa',
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
    // Firebase doesn't allow undefined values, we must clean the object
    const cleanItem = JSON.parse(JSON.stringify(item));
    const carts = get().carts;
    // Ensure we have a valid base for the current table
    const tableCart = carts[table] || { ...initialTableCart };
    
    // Check if identical item already exists AND is not locked
    const existingIndex = tableCart.items.findIndex(i => 
      !i.locked &&
      i.productId === cleanItem.productId && 
      i.variantLabel === cleanItem.variantLabel && 
      JSON.stringify(i.flavors) === JSON.stringify(cleanItem.flavors) &&
      JSON.stringify(i.fruitChoices) === JSON.stringify(cleanItem.fruitChoices) &&
      JSON.stringify(i.additions) === JSON.stringify(cleanItem.additions)
    );

    let newItems;
    if (existingIndex > -1) {
      newItems = [...tableCart.items];
      const existing = newItems[existingIndex];
      newItems[existingIndex] = {
        ...existing,
        quantity: existing.quantity + cleanItem.quantity,
        subtotal: (existing.quantity + cleanItem.quantity) * existing.unitPrice
      };
    } else {
      newItems = [...tableCart.items, cleanItem];
    }

    const newCart = {
      ...tableCart,
      items: newItems,
      openedAt: tableCart.openedAt || new Date().toISOString()
    };

    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: newCart }, { merge: true });
  },

  updateItem: async (table, itemId, updates) => {
    const tableCart = get().carts[table];
    if (!tableCart) return;

    const newItems = tableCart.items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        // Recalculate subtotal if price or quantity changed
        updated.subtotal = updated.unitPrice * updated.quantity;
        return updated;
      }
      return item;
    });

    const newCart = { ...tableCart, items: newItems };
    await setDoc(doc(db, 'tables', table), { currentCart: newCart }, { merge: true });
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

  updateNote: async (table, note) => {
    const tableCart = get().carts[table];
    if (!tableCart) return;

    const newCart = { ...tableCart, note };
    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: newCart }, { merge: true });
  },

  toggleLock: async (table, locked) => {
    const tableCart = get().carts[table];
    if (!tableCart) return;

    // Apply lock to all items in the cart
    const newItems = tableCart.items.map(item => ({
      ...item,
      locked: locked
    }));

    const newCart = { ...tableCart, items: newItems, isLocked: locked };
    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: newCart }, { merge: true });
  },

  setTakeout: async (table, isTakeout) => {
    const tableCart = get().carts[table];
    if (!tableCart) return;

    const newCart = { ...tableCart, isTakeout };
    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: newCart }, { merge: true });
  },

  updatePackagingSupply: async (table, supplyId, quantity) => {
    const tableCart = get().carts[table];
    if (!tableCart) return;

    const currentSupplies = tableCart.packagingSupplies || [];
    let newSupplies = [...currentSupplies];
    
    const existingIndex = newSupplies.findIndex(s => s.supplyId === supplyId);
    if (existingIndex >= 0) {
      if (quantity <= 0) {
        newSupplies.splice(existingIndex, 1);
      } else {
        newSupplies[existingIndex].quantity = quantity;
      }
    } else if (quantity > 0) {
      newSupplies.push({ supplyId, quantity });
    }

    const newCart = { ...tableCart, packagingSupplies: newSupplies };
    const docRef = doc(db, 'tables', table);
    await setDoc(docRef, { currentCart: newCart }, { merge: true });
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
