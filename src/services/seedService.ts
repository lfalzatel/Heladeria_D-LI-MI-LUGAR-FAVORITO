import { collection, writeBatch, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import menuData from '../data/menu.json';

export const DEFAULT_SUPPLIES = [
  {
    unit: "kg",
    minLimit: 1,
    category: "Lácteos",
    currentStock: 0,
    name: "Crema de Leche Oblea Cuchareable"
  },
  {
    unit: "Caja",
    category: "Galletas",
    purchaseUnit: "Caja",
    minLimitUnit: "internal",
    stockMinimum: 0.2,
    yieldPerUnit: 50,
    isVirtual: false,
    name: "Oblea delgada",
    currentStock: 0,
    yieldPerSize: {
      small: null,
      medium: null,
      mini: null,
      large: null
    },
    minLimit: 0.2,
    portionsPerUnit: 50,
    stockQuantity: 0,
    yieldDetails: ""
  },
  {
    name: "Bolsa de Basura Pequeña",
    currentStock: 0,
    unit: "Rollo",
    minLimit: 1,
    category: "Limpieza"
  },
  {
    name: "Brownie",
    currentStock: 5,
    stockQuantity: 10,
    stockMinimum: 5,
    yieldDetails: "",
    purchaseUnit: "kg",
    yieldPerUnit: 1,
    portionsPerUnit: 1,
    unit: "kg",
    minLimit: 5,
    category: "Bases"
  },
  {
    name: "Papaya",
    yieldPerSize: {
      large: 4,
      mini: 30,
      small: 8,
      medium: 6
    },
    currentStock: 7.416666666666668,
    stockQuantity: 10,
    yieldDetails: "",
    purchaseUnit: "kg",
    stockMinimum: 1,
    portionsPerUnit: 1,
    unit: "kg",
    minLimit: 1,
    category: "Frutas",
    yieldPerUnit: 1
  },
  {
    yieldPerSize: {
      medium: 6,
      mini: 6,
      large: 6,
      small: 6
    },
    minLimit: 0.5,
    portionsPerUnit: 6,
    stockQuantity: 2,
    yieldDetails: "",
    category: "Frutas",
    unit: "kg",
    yieldPerUnit: 6,
    purchaseUnit: "kg",
    minLimitUnit: "base",
    stockMinimum: 0.5,
    isVirtual: false,
    name: "Kiwi",
    currentStock: 2
  },
  {
    unit: "Paquete",
    category: "Desechables",
    minLimit: 2,
    currentStock: 10,
    name: "Tapas"
  },
  {
    currentStock: 0,
    name: "Alcohol",
    category: "Limpieza",
    minLimit: 1,
    unit: "Litro"
  },
  {
    yieldDetails: "",
    stockQuantity: 0,
    portionsPerUnit: 1,
    minLimit: 5,
    yieldPerSize: {
      small: null,
      mini: null,
      medium: null,
      large: null
    },
    currentStock: 0,
    name: "Helado",
    isVirtual: true,
    stockMinimum: 5,
    purchaseUnit: "kg",
    minLimitUnit: "base",
    yieldPerUnit: 1,
    unit: "kg",
    category: "Helados base"
  },
  {
    minLimit: 1,
    name: "Salsa Arequipe",
    category: "Salsas",
    currentStock: 5,
    unit: "Litro"
  },
  {
    category: "Limpieza",
    minLimit: 1,
    unit: "Tarro",
    name: "Jabón de Manos",
    currentStock: 0
  },
  {
    category: "Varios",
    minLimit: 1,
    unit: "kg",
    currentStock: 0,
    name: "Azúcar Pulverizada"
  },
  {
    category: "Frutas",
    portionsPerUnit: 1,
    purchaseUnit: "kg",
    yieldPerUnit: 1,
    name: "Fruta",
    stockQuantity: 0,
    minLimit: 5,
    isVirtual: true,
    unit: "kg",
    currentStock: -9,
    minLimitUnit: "base",
    yieldDetails: "",
    stockMinimum: 5,
    yieldPerSize: {
      large: null,
      medium: null,
      small: null,
      mini: null
    }
  },
  {
    minLimit: 1,
    category: "Toppings",
    unit: "kg",
    name: "Chips de Chocolate",
    currentStock: 0
  },
  {
    unit: "g",
    stockMinimum: 500,
    category: "Lácteos",
    portionsPerUnit: 1,
    stockQuantity: 2230,
    minLimitUnit: "base",
    yieldPerSize: {
      large: null,
      mini: null,
      medium: null,
      small: null
    },
    yieldDetails: "",
    currentStock: 2230,
    purchaseUnit: "g",
    minLimit: 500,
    name: "Lechera",
    yieldPerUnit: 1,
    isVirtual: false
  },
  {
    unit: "Paquete",
    category: "Desechables",
    minLimit: 2,
    currentStock: 10,
    name: "Cuchara Grande"
  },
  {
    name: "Toppings",
    category: "Toppings",
    minLimitUnit: "base",
    unit: "und",
    stockMinimum: 5,
    stockQuantity: 0,
    minLimit: 5,
    currentStock: -25,
    isVirtual: true,
    yieldDetails: "",
    yieldPerSize: {
      mini: null,
      medium: null,
      large: null,
      small: null
    },
    purchaseUnit: "und",
    portionsPerUnit: 1,
    yieldPerUnit: 1
  },
  {
    currentStock: 0,
    name: "Bolsa Blanca Grande",
    unit: "Paquete",
    minLimit: 1,
    category: "Desechables"
  },
  {
    minLimit: 1,
    unit: "Paquete",
    category: "Desechables",
    name: "Vasos 13 ONZ",
    currentStock: 5
  },
  {
    yieldDetails: "",
    portionsPerUnit: 50,
    stockQuantity: 0,
    minLimit: 0.2,
    yieldPerSize: {
      large: null,
      mini: null,
      medium: null,
      small: null
    },
    currentStock: 0,
    isVirtual: false,
    name: "Tapas 10 ONZ",
    category: "Desechables",
    unit: "Paquete",
    yieldPerUnit: 50,
    minLimitUnit: "internal",
    stockMinimum: 0.2,
    purchaseUnit: "Paquete"
  },
  {
    yieldPerSize: {
      small: null,
      medium: null,
      mini: null,
      large: null
    },
    yieldPerUnit: 1,
    name: "Crema de Leche Ensaladas",
    isVirtual: false,
    yieldDetails: "",
    currentStock: 31,
    minLimit: 5,
    purchaseUnit: "und",
    stockMinimum: 5,
    unit: "und",
    stockQuantity: 31,
    minLimitUnit: "base",
    category: "Lácteos",
    portionsPerUnit: 1
  },
  {
    category: "Bases",
    yieldPerUnit: 1,
    yieldDetails: "",
    portionsPerUnit: 1,
    stockQuantity: 10,
    name: "Chocorramo",
    purchaseUnit: "kg",
    currentStock: 10,
    stockMinimum: 5,
    unit: "kg",
    minLimit: 5
  },
  {
    unit: "Paquete",
    currentStock: 5,
    category: "Desechables",
    name: "Vasos 7 ONZ",
    minLimit: 1
  },
  {
    unit: "Paquete",
    category: "Desechables",
    minLimit: 1,
    name: "Tapas Vaso 13, 14 y 16 ONZ",
    currentStock: 0
  },
  {
    minLimit: 1,
    unit: "Paquete",
    category: "Desechables",
    currentStock: 5,
    name: "Tapas vasos 10 ONZ"
  },
  {
    minLimit: 1,
    name: "Tapa oblea cuchareable",
    currentStock: 5,
    unit: "Paquete",
    category: "Desechables"
  },
  {
    minLimit: 1,
    name: "Salsa Chocolate",
    category: "Salsas",
    unit: "Litro",
    currentStock: 5
  },
  {
    category: "Desechables",
    minLimit: 1,
    unit: "Paquete",
    currentStock: 0,
    name: "Tapa Recipiente Oblea Cuchareable"
  },
  {
    currentStock: 0,
    name: "Jabón en Polvo",
    minLimit: 1,
    category: "Limpieza",
    unit: "kg"
  },
  {
    currentStock: 0,
    name: "Bolsa Blanca Pequeña",
    category: "Desechables",
    minLimit: 1,
    unit: "Paquete"
  },
  {
    category: "Desechables",
    unit: "Paquete",
    currentStock: 10,
    name: "Cucharas",
    minLimit: 2
  },
  {
    yieldPerUnit: 1,
    stockMinimum: 2,
    purchaseUnit: "Caja",
    minLimitUnit: "base",
    category: "Galletas",
    unit: "Caja",
    currentStock: 10,
    isVirtual: false,
    name: "Barquillos",
    minLimit: 2,
    yieldPerSize: {
      small: null,
      mini: null,
      medium: null,
      large: null
    },
    yieldDetails: "",
    stockQuantity: 10,
    portionsPerUnit: 1
  },
  {
    yieldPerSize: {
      large: null,
      mini: null,
      medium: null,
      small: null
    },
    yieldDetails: "",
    minLimit: 10,
    purchaseUnit: "g",
    currentStock: 500,
    isVirtual: false,
    name: "Chantilly",
    yieldPerUnit: 1,
    unit: "g",
    stockMinimum: 10,
    portionsPerUnit: 1,
    category: "Lácteos",
    minLimitUnit: "base",
    stockQuantity: 500
  },
  {
    name: "Tapas Vaso 9, 10 y 12 ONZ",
    currentStock: 0,
    unit: "Paquete",
    category: "Desechables",
    minLimit: 1
  },
  {
    stockQuantity: 3,
    minLimit: 1,
    currentStock: 3,
    unit: "kg",
    yieldDetails: "",
    stockMinimum: 1,
    yieldPerSize: {
      mini: null,
      small: null,
      medium: null,
      large: null
    },
    portionsPerUnit: 200,
    category: "Frutas",
    purchaseUnit: "kg",
    yieldPerUnit: 200,
    name: "Uva"
  },
  {
    currentStock: 0,
    name: "Salero",
    unit: "und",
    minLimit: 1,
    category: "Varios"
  },
  {
    unit: "Paquete",
    minLimit: 1,
    category: "Desechables",
    currentStock: 0,
    name: "Tapas Vaso 7 ONZ"
  },
  {
    unit: "Rollo",
    category: "Varios",
    minLimit: 1,
    name: "Rollo Caja Registradora",
    currentStock: 0
  },
  {
    unit: "Rollo",
    minLimit: 1,
    category: "Limpieza",
    currentStock: 0,
    name: "Bolsa de Basura Verde"
  },
  {
    minLimitUnit: "base",
    category: "Salsas",
    name: "Salsa",
    minLimit: 5,
    stockQuantity: 0,
    stockMinimum: 5,
    unit: "und",
    yieldPerSize: {
      medium: null,
      large: null,
      mini: null,
      small: null
    },
    yieldDetails: "",
    isVirtual: true,
    currentStock: -25,
    yieldPerUnit: 1,
    portionsPerUnit: 1,
    purchaseUnit: "und"
  },
  {
    name: "Desechable ensalada pequeña",
    currentStock: 5,
    category: "Desechables",
    unit: "Paquete",
    minLimit: 1
  },
  {
    minLimit: 1,
    category: "Desechables",
    unit: "Paquete",
    name: "Vasos 16 ONZ",
    currentStock: 5
  },
  {
    unit: "Paquete",
    category: "Desechables",
    name: "Desechable ensalada mediana-grande",
    currentStock: 5,
    minLimit: 1
  },
  {
    isVirtual: false,
    stockQuantity: 3260,
    name: "Arequipe",
    category: "Lácteos",
    yieldPerUnit: 1,
    yieldDetails: "",
    portionsPerUnit: 1,
    unit: "g",
    minLimit: 500,
    minLimitUnit: "base",
    purchaseUnit: "g",
    stockMinimum: 500,
    currentStock: 3258,
    yieldPerSize: {
      medium: null,
      small: null,
      large: null,
      mini: null
    }
  },
  {
    name: "Salsa Mora",
    minLimit: 1,
    unit: "Litro",
    currentStock: 5,
    category: "Salsas"
  },
  {
    name: "Guantes Amarillos (Loza)",
    currentStock: 0,
    unit: "und",
    minLimit: 1,
    category: "Limpieza"
  },
  {
    category: "Galletas",
    minLimit: 2,
    unit: "Caja",
    currentStock: 10,
    name: "Conos"
  },
  {
    name: "Vasos 10 ONZ",
    isVirtual: false,
    currentStock: 5,
    unit: "Paquete",
    category: "Desechables",
    purchaseUnit: "Paquete",
    minLimitUnit: "internal",
    stockMinimum: 0.2,
    yieldPerUnit: 50,
    portionsPerUnit: 50,
    stockQuantity: 5,
    yieldDetails: "",
    yieldPerSize: {
      large: null,
      mini: null,
      medium: null,
      small: null
    },
    minLimit: 0.2
  },
  {
    unit: "kg",
    category: "Varios",
    minLimit: 1,
    name: "Polvo Mango",
    currentStock: 0
  },
  {
    minLimit: 1,
    yieldPerSize: {
      large: null,
      medium: 8,
      mini: 20,
      small: 12
    },
    yieldDetails: "",
    stockQuantity: 5,
    portionsPerUnit: 1,
    purchaseUnit: "Tarro",
    stockMinimum: 1,
    yieldPerUnit: 1,
    unit: "Tarro",
    category: "Frutas",
    currentStock: 4.625,
    name: "Durazno"
  },
  {
    name: "Bolsa de Basura Negra",
    minLimit: 1,
    currentStock: 3,
    unit: "Rollo",
    category: "Limpieza"
  },
  {
    unit: "kg",
    minLimit: 5,
    purchaseUnit: "kg",
    stockMinimum: 5,
    currentStock: 10,
    stockQuantity: 10,
    name: "Jet Wafer",
    category: "Bases",
    yieldDetails: "",
    portionsPerUnit: 1,
    yieldPerUnit: 1
  },
  {
    name: "Límpido",
    currentStock: 0,
    category: "Limpieza",
    minLimit: 1,
    unit: "Litro"
  },
  {
    currentStock: 0,
    name: "Guantes de Nitrilo",
    minLimit: 1,
    category: "Limpieza",
    unit: "Caja"
  },
  {
    name: "Maní",
    currentStock: 0,
    category: "Toppings",
    minLimit: 1,
    unit: "kg"
  },
  {
    minLimit: 1,
    unit: "Paquete",
    category: "Desechables",
    currentStock: 5,
    name: "Tapas vasos 7 ONZ"
  },
  {
    currentStock: 10,
    unit: "und",
    stockMinimum: 2,
    yieldPerSize: {
      medium: 5,
      large: 3,
      small: 6,
      mini: null
    },
    yieldDetails: "",
    minLimit: 2,
    stockQuantity: 10,
    yieldPerUnit: 1,
    name: "Manzana",
    portionsPerUnit: 1,
    category: "Frutas",
    purchaseUnit: "und"
  },
  {
    minLimit: 1,
    category: "Desechables",
    unit: "Paquete",
    name: "Recipiente oblea cuchareable",
    currentStock: 5
  },
  {
    name: "Balas Chantillera",
    currentStock: 0,
    minLimit: 1,
    category: "Varios",
    unit: "und"
  },
  {
    category: "Desechables",
    unit: "Paquete",
    currentStock: 10,
    minLimit: 2,
    name: "Servilletas"
  },
  {
    category: "Galletas",
    name: "Oblea Gruesa",
    minLimitUnit: "base",
    unit: "Paquete",
    stockMinimum: 5,
    minLimit: 5,
    stockQuantity: 9,
    currentStock: 0,
    yieldDetails: "",
    yieldPerSize: {
      small: null,
      large: null,
      medium: null,
      mini: null
    },
    isVirtual: false,
    purchaseUnit: "Paquete",
    yieldPerUnit: 1,
    portionsPerUnit: 1
  },
  {
    unit: "kg",
    category: "Toppings",
    minLimit: 1,
    currentStock: 0,
    name: "Bolitas de Colores"
  },
  {
    currentStock: 0,
    name: "Servilletas para Conos",
    minLimit: 1,
    category: "Desechables",
    unit: "Paquete"
  },
  {
    minLimit: 1,
    name: "Desechable ensalada mini",
    currentStock: 5,
    unit: "Paquete",
    category: "Desechables"
  },
  {
    minLimit: 0.2,
    yieldPerSize: {
      mini: null,
      medium: null,
      large: null,
      small: null
    },
    yieldDetails: "",
    stockQuantity: 0,
    portionsPerUnit: 50,
    purchaseUnit: "Paquete",
    minLimitUnit: "internal",
    stockMinimum: 0.2,
    yieldPerUnit: 50,
    unit: "Paquete",
    category: "Desechables",
    currentStock: 0,
    name: "Tapas 12 ONZ",
    isVirtual: false
  },
  {
    stockQuantity: 20,
    minLimit: 2,
    stockMinimum: 2,
    unit: "kg",
    name: "Fresa",
    category: "Frutas",
    portionsPerUnit: 1,
    yieldPerUnit: 1,
    purchaseUnit: "kg",
    yieldPerSize: {
      large: 14,
      medium: 20,
      mini: 47,
      small: 27
    },
    yieldDetails: "",
    currentStock: 19.362962962962957
  },
  {
    currentStock: 0,
    name: "Desechable Ens Pequeña",
    minLimit: 1,
    category: "Desechables",
    unit: "Paquete"
  },
  {
    yieldPerSize: {
      mini: null,
      medium: null,
      large: null,
      small: null
    },
    minLimit: 0.2,
    stockQuantity: 0,
    portionsPerUnit: 50,
    yieldDetails: "",
    minLimitUnit: "internal",
    stockMinimum: 0.2,
    purchaseUnit: "Paquete",
    yieldPerUnit: 50,
    unit: "Paquete",
    category: "Desechables",
    isVirtual: false,
    name: "Vasos 12 ONZ",
    currentStock: 0
  },
  {
    currentStock: 0,
    name: "Tapas 7 ONZ",
    isVirtual: false,
    minLimitUnit: "internal",
    purchaseUnit: "Paquete",
    stockMinimum: 0.20408163265306123,
    yieldPerUnit: 49,
    unit: "Paquete",
    category: "Desechables",
    yieldDetails: "",
    stockQuantity: 0,
    portionsPerUnit: 49,
    minLimit: 0.20408163265306123,
    yieldPerSize: {
      medium: null,
      mini: null,
      large: null,
      small: null
    }
  },
  {
    isVirtual: false,
    name: "Cucuruchos",
    currentStock: 2,
    stockMinimum: 0.3,
    minLimitUnit: "internal",
    purchaseUnit: "Caja",
    yieldPerUnit: 50,
    unit: "Caja",
    category: "Galletas",
    stockQuantity: 2,
    portionsPerUnit: 50,
    yieldDetails: "",
    yieldPerSize: {
      small: null,
      large: null,
      medium: null,
      mini: null
    },
    minLimit: 0.3
  },
  {
    unit: "Paquete",
    category: "Desechables",
    name: "Tapas vasos 13-16 ONZ",
    currentStock: 5,
    minLimit: 1
  },
  {
    currentStock: -195,
    unit: "Bloque",
    category: "Lácteos",
    name: "Queso",
    minLimit: 1
  },
  {
    minLimit: 1,
    category: "Desechables",
    unit: "Paquete",
    name: "Bolsa Metalizada Oblea",
    currentStock: 0
  },
  {
    yieldDetails: "",
    portionsPerUnit: 50,
    stockQuantity: 0,
    minLimit: 0.16,
    yieldPerSize: {
      large: null,
      medium: null,
      mini: null,
      small: null
    },
    currentStock: 0,
    isVirtual: false,
    name: "Cuchara Pequeña",
    category: "Galletas",
    unit: "Caja",
    yieldPerUnit: 50,
    minLimitUnit: "internal",
    stockMinimum: 0.16,
    purchaseUnit: "Caja"
  },
  {
    yieldPerSize: {
      small: null,
      mini: null,
      medium: null,
      large: null
    },
    minLimit: 5,
    portionsPerUnit: 1,
    stockQuantity: 0,
    yieldDetails: "",
    category: "Bases",
    unit: "kg",
    yieldPerUnit: 1,
    stockMinimum: 5,
    minLimitUnit: "base",
    purchaseUnit: "kg",
    isVirtual: true,
    name: "Bases",
    currentStock: 0
  },
  {
    unit: "Paquete",
    minLimit: 1,
    category: "Desechables",
    currentStock: 0,
    name: "Desechable Ens Mediana y Grande"
  },
  {
    name: "Polvo Fresa",
    currentStock: 0,
    category: "Varios",
    minLimit: 1,
    unit: "kg"
  },
  {
    yieldPerUnit: 1,
    portionsPerUnit: 1,
    category: "Frutas",
    minLimit: 2,
    unit: "kg",
    stockMinimum: 2,
    purchaseUnit: "kg",
    yieldDetails: "",
    yieldPerSize: {
      large: 5,
      small: 10,
      medium: 8,
      mini: 38
    },
    name: "Mango",
    currentStock: 18.125,
    stockQuantity: 20
  },
  {
    name: "Jabón de Loza",
    currentStock: 0,
    minLimit: 1,
    category: "Limpieza",
    unit: "Tarro"
  },
  {
    yieldPerUnit: 1,
    portionsPerUnit: 1,
    minLimit: 5,
    category: "Frutas",
    unit: "und",
    stockMinimum: 5,
    purchaseUnit: "und",
    yieldDetails: "",
    yieldPerSize: {
      mini: 4,
      medium: 1,
      small: 2,
      large: 1
    },
    name: "Banano",
    stockQuantity: 20,
    currentStock: 6
  },
  {
    unit: "Paquete",
    minLimit: 0.3,
    currentStock: 2,
    stockMinimum: 0.3,
    purchaseUnit: "Paquete",
    minLimitUnit: "internal",
    yieldPerSize: {
      large: null,
      mini: null,
      medium: null,
      small: null
    },
    stockQuantity: 2,
    name: "Cucharas grandes",
    category: "Desechables",
    portionsPerUnit: 50,
    yieldDetails: "100",
    yieldPerUnit: 50
  },
  {
    currentStock: 0,
    name: "Conchitas",
    unit: "Caja",
    category: "Galletas",
    minLimit: 1
  },
  {
    currentStock: 0,
    name: "Desechable Pequeño",
    minLimit: 1,
    category: "Desechables",
    unit: "Paquete"
  }
];

export const seedDatabase = async () => {
  const batch = writeBatch(db);

  // 0. LIMPIEZA DE DATOS EXISTENTES PARA EVITAR DUPLICADOS
  const productsSnap = await getDocs(collection(db, 'products'));
  productsSnap.forEach(d => batch.delete(d.ref));

  const flavorsSnap = await getDocs(collection(db, 'icecreamFlavors'));
  flavorsSnap.forEach(d => batch.delete(d.ref));

  const categoriesSnap = await getDocs(collection(db, 'categories'));
  categoriesSnap.forEach(d => batch.delete(d.ref));

  const suppliesSnap = await getDocs(collection(db, 'supplies'));
  suppliesSnap.forEach(d => batch.delete(d.ref));

  // 1. SABORES DE HELADO (Mimo's)
  const flavors = menuData.icecreamFlavors;

  flavors.forEach(flavor => {
    const ref = doc(db, 'icecreamFlavors', flavor.id);
    batch.set(ref, { name: flavor.name, isAvailable: flavor.isAvailable, updatedAt: serverTimestamp() });
  });

  // 1.5 CATEGORÍAS (De las Categorías por defecto del sistema)
  const defaultCategories = [
    { id: 'helados', label: 'Helados', icon: 'IceCream', isActive: true, order: 1, isCustom: false },
    { id: 'ensaladas', label: 'Ensaladas', icon: 'Utensils', isActive: true, order: 2, isCustom: false },
    { id: 'copas', label: 'Copas', icon: 'GlassWater', isActive: true, order: 3, isCustom: false },
    { id: 'salpicon', label: 'Salpicón', icon: 'CupSoda', isActive: true, order: 4, isCustom: false },
    { id: 'obleas', label: 'Obleas', icon: 'Package', isActive: true, order: 5, isCustom: false },
    { id: 'bebidas-calientes', label: 'Bebidas Calientes', icon: 'Utensils', isActive: true, order: 6, isCustom: false },
    { id: 'adiciones', label: 'Adiciones', icon: 'Plus', isActive: true, order: 7, isCustom: false }
  ];

  defaultCategories.forEach(cat => {
    const ref = doc(db, 'categories', cat.id);
    batch.set(ref, { ...cat, createdAt: Date.now() });
  });

  // 2. PRODUCTOS DEL MENÚ
  const products = menuData.products;

  products.forEach(p => {
    const ref = doc(db, 'products', p.id);
    batch.set(ref, { ...p, updatedAt: serverTimestamp() });
  });

  // 3. INSUMOS
  DEFAULT_SUPPLIES.forEach(s => {
    const ref = doc(collection(db, 'supplies'));
    batch.set(ref, { ...s, updatedAt: serverTimestamp() });
  });

  // 4. MESAS
  const tables = [
    { id: '1',        status: 'free', name: 'Mesa 1'     },
    { id: '2',        status: 'free', name: 'Mesa 2'     },
    { id: '3',        status: 'free', name: 'Mesa 3'     },
    { id: 'takeaway', status: 'free', name: 'Para Llevar' }
  ];

  tables.forEach(t => {
    const ref = doc(db, 'tables', t.id);
    batch.set(ref, { ...t, updatedAt: serverTimestamp() });
  });

  await batch.commit();
};
