import { collection, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import menuData from '../data/menu.json';

/**
 * Sincroniza las URLs de las imágenes de los productos en Firestore.
 * Primero intenta por ID, y si no coincide, intenta por NOMBRE.
 * Esto asegura que incluso los productos creados manualmente reciban su imagen.
 */
export const syncProductImages = async () => {
  const batch = writeBatch(db);
  const productsSnap = await getDocs(collection(db, 'products'));
  
  let count = 0;
  
  productsSnap.forEach(productDoc => {
    const productData = productDoc.data();
    const productId = productDoc.id;
    const productName = productData.name;
    
    // 1. Intentar buscar por ID
    let menuProduct = menuData.products.find(p => p.id === productId);
    
    // 2. Si no hay match por ID, intentar por NOMBRE (ignora mayúsculas/minúsculas)
    if (!menuProduct) {
      menuProduct = menuData.products.find(p => 
        p.name.toLowerCase().trim() === productName.toLowerCase().trim()
      );
    }
    
    if (menuProduct && menuProduct.imageUrl) {
      batch.update(productDoc.ref, {
        imageUrl: menuProduct.imageUrl
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Se sincronizaron ${count} imágenes de productos.`);
  }
  
  return count;
};
