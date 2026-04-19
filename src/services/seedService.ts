import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const seedDatabase = async () => {
  const batch = writeBatch(db);

  // 1. SABORES DE HELADO (Mimo's)
  const flavors = [
    "Fresa", "Chicle", "Brownie", "Vainilla", "Arequipe", "Maracuyá", "Chocolate",
    "Mandarina", "Nata Maní", "Ron Pasas", "Mango Biche", "Frutos Rojos",
    "Vainilla Chips", "Vainilla Pasas", "Veteado de Mora", "Veteado de Caramelo"
  ];

  flavors.forEach(flavor => {
    const ref = doc(collection(db, 'icecreamFlavors'));
    batch.set(ref, { name: flavor, isAvailable: true, updatedAt: serverTimestamp() });
  });

  // 2. PRODUCTOS DEL MENÚ
  const products = [
    // --- HELADOS ---
    {
      name: "Cono o Vaso",
      category: "helados",
      variants: [
        { label: "Sencillo", price: 3500, scoops: 1 },
        { label: "Doble",    price: 5500, scoops: 2 }
      ],
      requiresFlavors: true,
      requiresSauces: true,
      isActive: true
    },
    {
      name: "Cucurucho",
      category: "helados",
      variants: [
        { label: "Sencillo", price: 4000, scoops: 1 },
        { label: "Doble",    price: 6000, scoops: 2 },
        { label: "Triple",   price: 8000, scoops: 3 }
      ],
      requiresFlavors: true,
      requiresSauces: true,
      isActive: true
    },
    {
      name: "Conchita",
      category: "helados",
      variants: [
        { label: "Sencilla", price: 4500, scoops: 1 },
        { label: "Doble",    price: 6500, scoops: 2 },
        { label: "Triple",   price: 8500, scoops: 3 }
      ],
      requiresFlavors: true,
      requiresSauces: true,
      isActive: true
    },

    // --- ENSALADAS ---
    {
      name: "Ensalada de Frutas",
      category: "ensaladas",
      variants: [
        { label: "Mini",    price: 10000, scoops: 1 },
        { label: "Pequeña", price: 17000, scoops: 2 },
        { label: "Mediana", price: 22000, scoops: 2 },
        { label: "Grande",  price: 27000, scoops: 2 }
      ],
      requiresFlavors: true,
      isActive: true
    },

    // --- COPAS ---
    {
      name: "Copa D'LI",
      category: "copas",
      basePrice: 13000,
      scoops: 3,
      requiresFlavors: true,
      requiresSauces: true,
      isActive: true
    },
    {
      name: "Copa Explosión de Sabores",
      category: "copas",
      basePrice: 16000,
      scoops: 7,
      requiresFlavors: true,
      requiresSauces: true,
      isActive: true
    },

    // --- SALPICÓN (categoría propia, no 'copas') ---
    {
      name: "Copa de Salpicón",
      category: "salpicon",
      variants: [
        { label: "Sabor Mango", price: 11000, scoops: 1 },
        { label: "Sabor Fresa", price: 11000, scoops: 1 }
      ],
      requiresFlavors: true,
      requiresFruitChoice: false,
      isActive: true
    },
    {
      name: "Vaso de Salpicón con Helado",
      category: "salpicon",
      variants: [
        { label: "Pequeño", price: 7000,  scoops: 1 },
        { label: "Mediano", price: 9000,  scoops: 1 },
        { label: "Grande",  price: 11000, scoops: 1 }
      ],
      requiresFlavors: true,
      isActive: true
    },

    // --- OBLEAS ---
    {
      name: "Oblea Tradicional",
      category: "obleas",
      variants: [
        { label: "Arequipe, Crema y Queso", price: 6000, hasFruit: false },
        { label: "Con Fruta",               price: 9000, hasFruit: true  }
      ],
      requiresFruitChoice: true,
      fruitOptions: ["Fresa", "Mango", "Durazno"],
      isActive: true
    },
    {
      name: "Oblea Cuchareable",
      category: "obleas",
      variants: [
        { label: "Sin Helado", price: 13000, hasIceCream: false },
        { label: "Con Helado", price: 15000, hasIceCream: true,  scoops: 1 }
      ],
      requiresFruitChoice: true,
      fruitOptions: ["Fresa", "Mango", "Durazno", "Mixta"],
      requiresFlavors: true,
      isActive: true
    },

    // --- ADICIONES ---
    { name: "Queso",              category: "adiciones", basePrice: 4000, isActive: true },
    { name: "Fruta",              category: "adiciones", basePrice: 3500, isActive: true },
    { name: "Helado (Bola)",      category: "adiciones", basePrice: 3000, isActive: true },
    { name: "Chantilly",          category: "adiciones", basePrice: 4000, isActive: true },
    { name: "Chips de Chocolate", category: "adiciones", basePrice: 3000, isActive: true },
    { name: "Barquillo",          category: "adiciones", basePrice:  500, isActive: true },
    // Salsas (también como adición suelta $1.000)
    { name: "Salsa Arequipe",     category: "adiciones", basePrice: 1000, isActive: true },
    { name: "Salsa Mora",         category: "adiciones", basePrice: 1000, isActive: true },
    { name: "Salsa Chocolate",    category: "adiciones", basePrice: 1000, isActive: true },
    { name: "Salsa Lecherita",    category: "adiciones", basePrice: 1000, isActive: true },
    { name: "Maní",               category: "adiciones", basePrice: 1000, isActive: true },
    { name: "Bolitas de Colores", category: "adiciones", basePrice: 1000, isActive: true },
    { name: "Cono o Cucurucho",   category: "adiciones", basePrice: 1000, isActive: true },
  ];

  products.forEach(p => {
    const ref = doc(collection(db, 'products'));
    batch.set(ref, { ...p, updatedAt: serverTimestamp() });
  });

  // 3. INSUMOS
  const supplies = [
    { name: "Queso",                    category: "Lácteos",        unit: "Bloque",  currentStock: 5,  minLimit: 1 },
    { name: "Mango",                    category: "Frutas",         unit: "Kilo",    currentStock: 10, minLimit: 2 },
    { name: "Fresa",                    category: "Frutas",         unit: "Kilo",    currentStock: 8,  minLimit: 2 },
    { name: "Durazno",                  category: "Frutas",         unit: "Lata",    currentStock: 12, minLimit: 3 },
    { name: "Crema de Leche Ensaladas", category: "Lácteos",        unit: "Litro",   currentStock: 15, minLimit: 2 },
    { name: "Lechera",                  category: "Lácteos",        unit: "Pouch",   currentStock: 20, minLimit: 5 },
    { name: "Arequipe",                 category: "Lácteos",        unit: "Kg",      currentStock: 5,  minLimit: 1 },
    { name: "Cucuruchos",               category: "Insumos Venta",  unit: "Caja",    currentStock: 10, minLimit: 2 },
    { name: "Oblea Gruesa",             category: "Insumos Venta",  unit: "Paquete", currentStock: 25, minLimit: 5 },
    { name: "Vasos 7 ONZ",              category: "Desechables",    unit: "Paquete", currentStock: 5,  minLimit: 1 },
    { name: "Bolsa de Basura Negra",    category: "Limpieza",       unit: "Rollo",   currentStock: 3,  minLimit: 1 }
  ];

  supplies.forEach(s => {
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
