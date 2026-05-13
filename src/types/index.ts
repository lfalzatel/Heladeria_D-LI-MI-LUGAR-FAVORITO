export type UserRole = 'admin' | 'propietario' | 'vendedor' | 'cliente';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  fcmTokens?: string[];
  createdAt: any;
}

export interface RecipeIngredient {
  supplyId: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'helados' | 'ensaladas' | 'copas' | 'salpicon' | 'obleas' | 'adiciones';
  basePrice: number;
  variants?: ProductVariant[];
  requiresFlavors?: boolean;
  requiresFruitChoice?: boolean;
  requiresSauces?: boolean;
  requiresToppings?: boolean;
  requiresBaseFlavor?: boolean;
  fruitOptions?: string[];
  scoops?: number;
  isActive: boolean;
  imageUrl?: string;
  cardColor?: string;
  salesCount?: number;
  recipe?: RecipeIngredient[];
}

export interface ProductVariant {
  label: string;
  price: number;
  scoops?: number;
  hasFruit?: boolean;
  hasIceCream?: boolean;
  fruits?: string[];
  recipe?: RecipeIngredient[];
}

export interface IceCreamFlavor {
  id: string;
  name: string;
  isAvailable: boolean;
}

export interface CartItem {
  id: string; // Internal unique ID for the cart item
  productId: string;
  productName: string;
  variantLabel?: string;
  description: string;
  flavors: string[];
  fruitChoices: string[];
  additions: string[];
  additionIds?: string[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
  prepared?: boolean;
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
  createdAt: any;
  status: 'completed' | 'cancelled';
}

export interface Table {
  id: string;
  status: 'free' | 'occupied' | 'waiting_payment';
  openedAt: any;
  currentCartSnapshot?: any;
}

export interface Supply {
  id: string;
  name: string;
  category: string;
  purchaseUnit: string;
  lastPurchasePrice?: number;
  stockQuantity: number;
  stockMinimum: number;
  yieldPerUnit?: number;
  consumptionUnit?: string;
  notes?: string;
}
