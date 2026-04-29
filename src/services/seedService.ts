import { collection, writeBatch, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import menuData from '../data/menu.json';

export const seedDatabase = async () => {
  const batch = writeBatch(db);

  // 0. LIMPIEZA DE DATOS EXISTENTES PARA EVITAR DUPLICADOS
  const productsSnap = await getDocs(collection(db, 'products'));
  productsSnap.forEach(d => batch.delete(d.ref));

  const flavorsSnap = await getDocs(collection(db, 'icecreamFlavors'));
  flavorsSnap.forEach(d => batch.delete(d.ref));

  const suppliesSnap = await getDocs(collection(db, 'supplies'));
  suppliesSnap.forEach(d => batch.delete(d.ref));

  // 1. SABORES DE HELADO (Mimo's)
  const flavors = menuData.icecreamFlavors;

  flavors.forEach(flavor => {
    const ref = doc(db, 'icecreamFlavors', flavor.id);
    batch.set(ref, { name: flavor.name, isAvailable: flavor.isAvailable, updatedAt: serverTimestamp() });
  });

  // 2. PRODUCTOS DEL MENÚ
  const products = menuData.products;

  products.forEach(p => {
    const ref = doc(db, 'products', p.id);
    batch.set(ref, { ...p, updatedAt: serverTimestamp() });
  });

  // 3. INSUMOS
  const supplies = [
    { name: "Queso",                    category: "Lácteos",        unit: "Bloque",  currentStock: 5,  minLimit: 1 },
    { name: "Mango",                    category: "Frutas",         unit: "Kilo",    currentStock: 10, minLimit: 2 },
    { name: "Fresa",                    category: "Frutas",         unit: "Kilo",    currentStock: 8,  minLimit: 2 },
    { name: "Papaya",                   category: "Frutas",         unit: "Kilo",    currentStock: 5,  minLimit: 1 },
    { name: "Banano",                   category: "Frutas",         unit: "Unidad",  currentStock: 20, minLimit: 5 },
    { name: "Manzana",                  category: "Frutas",         unit: "Unidad",  currentStock: 10, minLimit: 2 },
    { name: "Uva",                      category: "Frutas",         unit: "500 gr",  currentStock: 5,  minLimit: 1 },
    { name: "Kiwi",                     category: "Frutas",         unit: "Kilo",    currentStock: 2,  minLimit: 0.5 },
    { name: "Durazno",                  category: "Frutas",         unit: "Lata",    currentStock: 12, minLimit: 3 },
    { name: "Crema de Leche Ensaladas", category: "Lácteos",        unit: "Litro",   currentStock: 15, minLimit: 2 },
    { name: "Chantilly",                category: "Lácteos",        unit: "Litro",   currentStock: 5,  minLimit: 1 },
    { name: "Lechera",                  category: "Lácteos",        unit: "Pouch",   currentStock: 20, minLimit: 5 },
    { name: "Arequipe",                 category: "Lácteos",        unit: "Kg",      currentStock: 5,  minLimit: 1 },
    { name: "Salsa Mora",               category: "Salsas",         unit: "Litro",   currentStock: 5,  minLimit: 1 },
    { name: "Salsa Chocolate",          category: "Salsas",         unit: "Litro",   currentStock: 5,  minLimit: 1 },
    { name: "Salsa Arequipe",           category: "Salsas",         unit: "Litro",   currentStock: 5,  minLimit: 1 },
    { name: "Cucuruchos",               category: "Galletas",       unit: "Caja",    currentStock: 10, minLimit: 2 },
    { name: "Barquillos",               category: "Galletas",       unit: "Caja",    currentStock: 10, minLimit: 2 },
    { name: "Oblea Gruesa",             category: "Galletas",       unit: "Paquete", currentStock: 25, minLimit: 5 },
    { name: "Vasos 7 ONZ",              category: "Desechables",    unit: "Paquete", currentStock: 5,  minLimit: 1 },
    { name: "Vasos 10/12 ONZ",           category: "Desechables",    unit: "Paquete", currentStock: 5,  minLimit: 1 },
    { name: "Cucharas",                 category: "Desechables",    unit: "Paquete", currentStock: 10, minLimit: 2 },
    { name: "Servilletas",              category: "Desechables",    unit: "Paquete", currentStock: 10, minLimit: 2 },
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
