import { collection, getDocs, updateDoc, doc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CartItem, Product } from '../types';

/**
 * Deduce insumos del inventario basándose en el carrito
 * Integra recetas estáticas y selecciones dinámicas con matemática de rendimiento.
 */
export async function deductInventory(cartItems: CartItem[]) {
  try {
    // 1. Obtener todos los supplies actuales para buscar sus IDs y rendimientos
    const suppliesSnap = await getDocs(collection(db, 'supplies'));
    const suppliesMap: Record<string, any> = {}; 
    
    suppliesSnap.docs.forEach(d => {
      const data = d.data();
      if (data.name && !data.isVirtual) {
        // Solo mapear insumos FÍSICOS (no virtuales) — los virtuales son solo etiquetas organizativas
        suppliesMap[data.name.toLowerCase().trim()] = { id: d.id, ...data };
      }
    });

    const deductions: Record<string, number> = {};

    // Map para guardar productos ya consultados y no repetir lecturas a la BD
    const productsCache: Record<string, Product> = {};

    for (const item of cartItems) {
      const variantLabel = (item.variantLabel || '').toLowerCase();
      
      // Identificar tamaño base para cálculos dinámicos
      let size = 'medium';
      if (variantLabel.includes('mini')) size = 'mini';
      else if (variantLabel.includes('pequeñ')) size = 'small';
      else if (variantLabel.includes('grand')) size = 'large';
      
      // 2.1 RECETAS ESTÁTICAS (Ej. galleta oblea, base de leche)
      if (!productsCache[item.productId]) {
         const pDoc = await getDoc(doc(db, 'products', item.productId));
         if (pDoc.exists()) {
             productsCache[item.productId] = pDoc.data() as Product;
         }
      }
      const product = productsCache[item.productId];
      
      if (product) {
         let activeRecipe = product.recipe || [];
         
         // Verificar si la variante específica tiene una receta que sobreescriba la general
         if (product.variants && product.variants.length > 0) {
             const matchedVariant = product.variants.find(v => v.label.toLowerCase() === variantLabel);
             if (matchedVariant && matchedVariant.recipe && matchedVariant.recipe.length > 0) {
                 activeRecipe = matchedVariant.recipe;
             }
         }

         // Acumular la receta estática
         for (const rItem of activeRecipe) {
             if (rItem.supplyId && rItem.quantity > 0) {
                 deductions[rItem.supplyId] = (deductions[rItem.supplyId] || 0) + (rItem.quantity * item.quantity);
             }
         }
      }

      // 2.2 DESCUENTOS DINÁMICOS (Sabores, Frutas, Salsas, Toppings elegidos por el cliente)
      // Consolidar todos los nombres de selecciones dinámicas del carrito
      const dynamicChoices: string[] = [
          ...(item.flavors || []),
          ...(item.fruitChoices || []),
          ...(item.includedSauces || []),
          ...(item.extraSauces || []),
          ...(item.additions || [])
      ];

      const cleanChoices: string[] = [];
      dynamicChoices.forEach(choice => {
          const lower = choice.toLowerCase();
          // Ignorar etiquetas genéricas de cobro que no son insumos físicos
          if (lower.includes('adición fruta') || lower.includes('adición helado') || lower.includes('adición de salsa')) {
              return;
          }
          
          // Extraer multiplicador real si existe (ej. "Arequipe (x2)" -> significa 2 porciones)
          let cleanName = choice.replace(/\(x\d+\)/gi, '').trim().toLowerCase();
          let multiplier = 1;
          const match = choice.match(/\(x(\d+)\)/i);
          if (match) {
              multiplier = parseInt(match[1]);
          }
          
          for(let i = 0; i < multiplier; i++) {
              cleanChoices.push(cleanName);
          }
      });

      // Calcular descuento dinámico basado en rendimientos
      for (const choiceName of cleanChoices) {
          const supply = suppliesMap[choiceName];
          if (supply) {
              let deductionAmount = 0;
              
              // 1. Usar rendimiento específico del tamaño de la porción (Ej. porción pequeña = 1/80, porción grande = 1/40)
              if (supply.yieldPerSize && supply.yieldPerSize[size]) {
                  deductionAmount = 1 / supply.yieldPerSize[size];
              } 
              // 2. Fallback a rendimiento estándar si no hay por tamaño
              else if (supply.yieldPerUnit && supply.yieldPerUnit > 0) {
                  deductionAmount = 1 / supply.yieldPerUnit;
              } 
              // 3. Fallback a 1 unidad completa en el peor caso
              else {
                  deductionAmount = 1; 
              }

              deductions[supply.id] = (deductions[supply.id] || 0) + (deductionAmount * item.quantity);
          }
      }
    }

    // 3. Aplicar las deducciones en lote a Firestore
    const promises = Object.entries(deductions).map(([supplyId, amount]) => {
      if (amount <= 0) return Promise.resolve();
      return updateDoc(doc(db, 'supplies', supplyId), {
        currentStock: increment(-amount) // Resta el monto calculado
      });
    });

    await Promise.all(promises);
    console.log("Inventario estático y dinámico descontado exitosamente", deductions);

  } catch (error) {
    console.error("Error descontando inventario:", error);
  }
}
