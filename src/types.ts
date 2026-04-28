import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'propietario' | 'vendedor' | 'cliente';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  cedula?: string;
  phone?: string;
  address?: string;
  fcmTokens?: string[];
  createdAt: Timestamp;
}

export interface RecipeItem {
  supplyId: string;
  quantity: number;
}

export interface ProductVariant {
  label: string;
  price: number;
  scoops?: number;
  fruits?: string[];
  hasFruit?: boolean;
  hasIceCream?: boolean;
  recipe?: RecipeItem[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  ingredients?: string[];
  basePrice?: number;
  variants?: ProductVariant[];
  recipe?: RecipeItem[];
  requiresFlavors?: boolean;
  requiresFruitChoice?: boolean;
  requiresSauces?: boolean;
  fruitOptions?: string[];   // override default fruit list
  fruitSelection?: string[]; // alternative fruit list from JSON
  availableFruits?: string[];// alternative fruit list from JSON
  scoops?: number;
  isActive: boolean;
  imageUrl?: string;
  updatedAt: Timestamp;
}

export interface IceCreamFlavor {
  id: string;
  name: string;
  isAvailable: boolean;
  updatedAt: Timestamp;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variantLabel: string;
  description: string;
  flavors: string[];
  fruitChoices: string[];
  additions: string[];
  notes?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  tableNumber: number | null;
  items: CartItem[];
  total: number;
  paymentMethod: 'Efectivo' | 'Transferencia' | 'Tarjeta';
  cashReceived?: number;
  change?: number;
  note?: string;
  soldBy: string;
  soldByName: string;
  createdAt: Timestamp;
  status: 'completed' | 'cancelled';
}

export interface Table {
  id: string;
  status: 'free' | 'occupied' | 'waiting_payment';
  openedAt: Timestamp | null;
  currentCartSnapshot: CartItem[] | null;
}
