import { doc, setDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';
import menuData from './src/data/menu.json';

async function updateData() {
  console.log("Iniciando actualización segura de datos (solo productos y sabores)...");

  for (const product of menuData.products) {
    const docRef = doc(db, 'products', product.id);
    await setDoc(docRef, product, { merge: true });
    console.log(`Producto actualizado/añadido: ${product.name}`);
  }

  for (const flavor of menuData.icecreamFlavors || []) {
    const docRef = doc(db, 'icecreamFlavors', flavor.id);
    await setDoc(docRef, flavor, { merge: true });
    console.log(`Sabor actualizado/añadido: ${flavor.name}`);
  }

  for (const supply of menuData.supplies || []) {
    const docRef = doc(db, 'supplies', supply.id);
    await setDoc(docRef, supply, { merge: true });
    console.log(`Insumo actualizado/añadido: ${supply.name}`);
  }

  console.log("¡Actualización completada!");
}

updateData().catch(console.error);
