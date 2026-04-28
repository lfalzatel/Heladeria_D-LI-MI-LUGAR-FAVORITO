import { collection, getDocs, updateDoc, doc, increment, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CartItem } from '../types';

// Diccionario de rendimientos y gramos a descontar
// Basado en los rendimientos proporcionados.
const FRUIT_PORTIONS: Record<string, { mini: number, pequena: number, mediana: number, grande: number }> = {
  'Mango': { mini: 21.6, pequena: 82.2, mediana: 102.7, grande: 164.4 },
  'Papaya': { mini: 25.8, pequena: 97.0, mediana: 129.3, grande: 194.0 },
  'Fresa': { mini: 18.8, pequena: 34.0, mediana: 44.3, grande: 63.2 },
  'Uva': { mini: 21.09, pequena: 21.09, mediana: 21.09, grande: 21.09 },
  'Manzana': { mini: 0, pequena: 0, mediana: 0, grande: 0 }, // TODO: Agregar valores correctos de Manzana
  'Durazno': { mini: 23.5, pequena: 39.1, mediana: 58.7, grande: 58.7 }, // Asumiendo grande igual a mediana si no hay dato
  'Banano': { mini: 0.25, pequena: 0.5, mediana: 0.75, grande: 1.0 }, // En unidades
  'Queso': { mini: 55.5, pequena: 76.9, mediana: 100.0, grande: 125.0 }
};

/**
 * Deduce insumos del inventario basándose en el carrito
 */
export async function deductInventory(cartItems: CartItem[]) {
  try {
    // 1. Obtener todos los supplies actuales para buscar sus IDs por nombre
    const suppliesSnap = await getDocs(collection(db, 'supplies'));
    const suppliesMap: Record<string, string> = {}; // map de name (lowercase) a id
    
    suppliesSnap.docs.forEach(d => {
      const data = d.data();
      if (data.name) {
        suppliesMap[data.name.toLowerCase()] = d.id;
      }
    });

    // 2. Acumular las cantidades a descontar por supplyId para hacer un solo update por insumo
    const deductions: Record<string, number> = {};

    for (const item of cartItems) {
      const variantLabel = (item.variantLabel || '').toLowerCase();
      
      // Identificar tamaño base para cálculos
      let size = 'mediana';
      if (variantLabel.includes('mini')) size = 'mini';
      else if (variantLabel.includes('pequeñ')) size = 'pequena';
      else if (variantLabel.includes('grand')) size = 'grande';

      // 2.1 Descontar frutas elegidas
      for (const fruta of item.fruitChoices) {
        const name = fruta.toLowerCase();
        const portionData = FRUIT_PORTIONS[Object.keys(FRUIT_PORTIONS).find(k => k.toLowerCase() === name) || ''];
        
        if (portionData && suppliesMap[name]) {
          const amount = portionData[size as keyof typeof portionData] * item.quantity;
          const supplyId = suppliesMap[name];
          deductions[supplyId] = (deductions[supplyId] || 0) + amount;
        }
      }

      // 2.2 Descontar queso (si está como adición o variante de queso)
      // Buscamos si eligieron queso en adiciones o el nombre del producto incluye queso
      const hasCheese = item.additions.some(a => a.toLowerCase().includes('queso')) || 
                        item.productName.toLowerCase().includes('queso') || 
                        variantLabel.includes('queso');
                        
      if (hasCheese) {
        const cheeseId = suppliesMap['queso'];
        if (cheeseId) {
          const portionData = FRUIT_PORTIONS['Queso'];
          const amount = portionData[size as keyof typeof portionData] * item.quantity;
          deductions[cheeseId] = (deductions[cheeseId] || 0) + amount;
        }
      }

      // 2.3 Aquí podríamos expandir para buscar recetas del `item.productId` en el futuro.
      // Ya que hemos agregado `recipe` a `Product`, si existiera la podríamos iterar:
      // if (item.recipe) { ... }
    }

    // 3. Aplicar las deducciones
    const promises = Object.entries(deductions).map(([supplyId, amount]) => {
      if (amount <= 0) return Promise.resolve();
      return updateDoc(doc(db, 'supplies', supplyId), {
        currentStock: increment(-amount)
      });
    });

    await Promise.all(promises);
    console.log("Inventario descontado exitosamente", deductions);

  } catch (error) {
    console.error("Error descontando inventario:", error);
  }
}
