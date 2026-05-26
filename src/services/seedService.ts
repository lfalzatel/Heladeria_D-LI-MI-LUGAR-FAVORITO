import { collection, writeBatch, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import menuData from '../data/menu.json';

export const DEFAULT_SUPPLIES = [
    { name: "Brownie", category: "Bases", unit: "kg", currentStock: 8, minLimit: 5 },
    { name: "Papaya", category: "Frutas", unit: "kg", currentStock: 9.666666666666668, minLimit: 1 },
    { name: "Kiwi", category: "Frutas", unit: "kg", currentStock: 2, minLimit: 0.5 },
    { name: "Helado", category: "Helados base", unit: "kg", currentStock: 0, minLimit: 5 },
    { name: "Salsa Arequipe", category: "Salsas", unit: "Litro", currentStock: 5, minLimit: 1 },
    { name: "Fruta", category: "Frutas", unit: "kg", currentStock: -1, minLimit: 5 },
    { name: "Lechera", category: "Lácteos", unit: "Pouch", currentStock: 20, minLimit: 5 },
    { name: "Toppings", category: "Toppings", unit: "und", currentStock: -12, minLimit: 5 },
    { name: "Crema de Leche Ensaladas", category: "Lácteos", unit: "g", currentStock: 1000, minLimit: 2 },
    { name: "Chocorramo", category: "Bases", unit: "kg", currentStock: 10, minLimit: 5 },
    { name: "Vasos 7 ONZ", category: "Desechables", unit: "Paquete", currentStock: 5, minLimit: 1 },
    { name: "Salsa Chocolate", category: "Salsas", unit: "Litro", currentStock: 5, minLimit: 1 },
    { name: "Barquillos", category: "Varios", unit: "Caja", currentStock: 10, minLimit: 2 },
    { name: "Chantilly", category: "Lácteos", unit: "Litro", currentStock: 5, minLimit: 1 },
    { name: "Uva", category: "Frutas", unit: "kg", currentStock: 3, minLimit: 1 },
    { name: "Salsa", category: "Salsas", unit: "und", currentStock: -12, minLimit: 5 },
    { name: "Arequipe", category: "Lácteos", unit: "Kg", currentStock: -13, minLimit: 1 },
    { name: "Salsa Mora", category: "Salsas", unit: "Litro", currentStock: 5, minLimit: 1 },
    { name: "Durazno", category: "Frutas", unit: "Tarro", currentStock: 4.75, minLimit: 1 },
    { name: "Bolsa de Basura Negra", category: "Limpieza", unit: "Rollo", currentStock: 3, minLimit: 1 },
    { name: "Jet Wafer", category: "Bases", unit: "kg", currentStock: 10, minLimit: 5 },
    { name: "Manzana", category: "Frutas", unit: "und", currentStock: 10, minLimit: 2 },
    { name: "Servilletas", category: "Desechables", unit: "Paquete", currentStock: 10, minLimit: 2 },
    { name: "Oblea Gruesa", category: "Varios", unit: "Paquete", currentStock: 13, minLimit: 5 },
    { name: "Fresa", category: "Frutas", unit: "kg", currentStock: 19.849999999999998, minLimit: 2 },
    { name: "Cucuruchos", category: "Varios", unit: "Caja", currentStock: 2, minLimit: 0.3 },
    { name: "Queso", category: "Lácteos", unit: "Bloque", currentStock: -195, minLimit: 1 },
    { name: "Bases", category: "Bases", unit: "kg", currentStock: 0, minLimit: 5 },
    { name: "Mango", category: "Frutas", unit: "kg", currentStock: 19.5, minLimit: 2 },
    { name: "Banano", category: "Frutas", unit: "und", currentStock: 18, minLimit: 5 },
    { name: "Vasos 10 ONZ", category: "Desechables", unit: "Paquete", currentStock: 5, minLimit: 1 },
    { name: "Vasos 12 ONZ", category: "Desechables", unit: "Paquete", currentStock: 5, minLimit: 1 },
    { name: "Tapas", category: "Desechables", unit: "Paquete", currentStock: 10, minLimit: 2 },
    { name: "Cuchara Grande", category: "Desechables", unit: "Paquete", currentStock: 10, minLimit: 2 },
    { name: "Cuchara Pequeña", category: "Desechables", unit: "Paquete", currentStock: 10, minLimit: 2 },
    { name: "Conos", category: "Galletas", unit: "Caja", currentStock: 10, minLimit: 2 },
    { name: "Oblea Delgada", category: "Galletas", unit: "Paquete", currentStock: 25, minLimit: 5 },
    { name: "Crema de Leche Oblea Cuchareable", category: "Lácteos", unit: "kg", currentStock: 0, minLimit: 1 },
    { name: "Conchitas", category: "Galletas", unit: "Caja", currentStock: 0, minLimit: 1 },
    { name: "Maní", category: "Toppings", unit: "kg", currentStock: 0, minLimit: 1 },
    { name: "Bolitas de Colores", category: "Toppings", unit: "kg", currentStock: 0, minLimit: 1 },
    { name: "Chips de Chocolate", category: "Toppings", unit: "kg", currentStock: 0, minLimit: 1 },
    { name: "Azúcar Pulverizada", category: "Varios", unit: "kg", currentStock: 0, minLimit: 1 },
    { name: "Polvo Fresa", category: "Varios", unit: "kg", currentStock: 0, minLimit: 1 },
    { name: "Polvo Mango", category: "Varios", unit: "kg", currentStock: 0, minLimit: 1 },
    { name: "Servilletas para Conos", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Vasos 13 ONZ", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Vasos 16 ONZ", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Tapas Vaso 13, 14 y 16 ONZ", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Tapas Vaso 7 ONZ", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Tapas Vaso 9, 10 y 12 ONZ", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Bolsa Blanca Pequeña", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Bolsa Blanca Grande", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Bolsa Metalizada Oblea", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Desechable Pequeño", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Desechable Ens Pequeña", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Desechable Ens Mediana y Grande", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Tapa Recipiente Oblea Cuchareable", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Recipiente Oblea Cuchareable", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Salero", category: "Varios", unit: "und", currentStock: 0, minLimit: 1 },
    { name: "Bolsa de Basura Verde", category: "Limpieza", unit: "Rollo", currentStock: 0, minLimit: 1 },
    { name: "Bolsa de Basura Pequeña", category: "Limpieza", unit: "Rollo", currentStock: 0, minLimit: 1 },
    { name: "Guantes de Nitrilo", category: "Limpieza", unit: "Caja", currentStock: 0, minLimit: 1 },
    { name: "Guantes Amarillos (Loza)", category: "Limpieza", unit: "und", currentStock: 0, minLimit: 1 },
    { name: "Límpido", category: "Limpieza", unit: "Litro", currentStock: 0, minLimit: 1 },
    { name: "Jabón de Loza", category: "Limpieza", unit: "Tarro", currentStock: 0, minLimit: 1 },
    { name: "Jabón de Manos", category: "Limpieza", unit: "Tarro", currentStock: 0, minLimit: 1 },
    { name: "Jabón en Polvo", category: "Limpieza", unit: "kg", currentStock: 0, minLimit: 1 },
    { name: "Alcohol", category: "Limpieza", unit: "Litro", currentStock: 0, minLimit: 1 },
    { name: "Balas Chantillera", category: "Varios", unit: "und", currentStock: 0, minLimit: 1 },
    { name: "Rollo Caja Registradora", category: "Varios", unit: "Rollo", currentStock: 0, minLimit: 1 },
    { name: "Crema de Leche D1", category: "Lácteos", unit: "Caja", currentStock: 0, minLimit: 1 },
    { name: "Crema de Leche Auralac", category: "Lácteos", unit: "Bolsa", currentStock: 0, minLimit: 1 },
    { name: "Leche en Polvo", category: "Lácteos", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Servilletas de Pared", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 },
    { name: "Vinagre", category: "Limpieza", unit: "Tarro", currentStock: 0, minLimit: 1 },
    { name: "Recipiente Oblea Cucha Peq", category: "Desechables", unit: "Paquete", currentStock: 0, minLimit: 1 }
  ];

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
