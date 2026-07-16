import { collection, getDocs, updateDoc, doc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CartItem, Product } from '../types';

/**
 * Deduce insumos del inventario basándose en el carrito
 * Integra recetas estáticas y selecciones dinámicas con matemática de rendimiento.
 */
export async function deductInventory(cartItems: CartItem[], packagingSupplies?: {supplyId: string, quantity: number}[]) {
  return processInventory(cartItems, packagingSupplies, false);
}

export async function restoreInventory(cartItems: CartItem[], packagingSupplies?: {supplyId: string, quantity: number}[]) {
  return processInventory(cartItems, packagingSupplies, true);
}

async function processInventory(cartItems: CartItem[], packagingSupplies?: {supplyId: string, quantity: number}[], isRestore = false) {
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
                 // Check if it's a real supply
                 const supplyInfo = suppliesMap[rItem.supplyId] || Object.values(suppliesMap).find(s => s.id === rItem.supplyId);
                 if (supplyInfo && !supplyInfo.isVirtual) {
                      let yieldPerUnit = supplyInfo.portionsPerUnit || supplyInfo.yieldPerUnit || 1;
                      const lowerUnit = (supplyInfo.unit || '').toLowerCase();
                      if (lowerUnit === 'und' || lowerUnit === 'unidad' || lowerUnit === 'unidades' || lowerUnit === 'uds') {
                          yieldPerUnit = 1;
                      }
                      const deductedUnits = (rItem.quantity * item.quantity) / yieldPerUnit;
                      deductions[rItem.supplyId] = (deductions[rItem.supplyId] || 0) + deductedUnits;
                 }
             }
         }
      }

      // 2.2 DESCUENTOS DINÁMICOS (Sabores, Frutas, Salsas, Toppings elegidos por el cliente)
      const dynamicChoices: {name: string, type: string}[] = [];
      const addChoice = (list: string[] | undefined, type: string) => {
         (list || []).forEach(choice => {
             const lower = choice.toLowerCase();
             if (lower.includes('adición fruta') || lower.includes('adición helado') || lower.includes('adición de salsa')) return;
             let cleanName = choice.replace(/\(x\d+\)/gi, '').trim().toLowerCase();
             let multiplier = 1;
             const match = choice.match(/\(x(\d+)\)/i);
             if (match) multiplier = parseInt(match[1]);
             for(let i=0; i<multiplier; i++) dynamicChoices.push({ name: cleanName, type });
         });
      };

      addChoice(item.flavors, 'flavor');
      addChoice(item.fruitChoices, 'fruit');
      addChoice(item.includedSauces, 'sauce');
      addChoice(item.extraSauces, 'sauce');
      addChoice(item.additions, 'addition');

      for (const choice of dynamicChoices) {
          const choiceName = choice.name;
          let supply = suppliesMap[choiceName];
          
          if (!supply && choice.type === 'flavor') {
             const possibleNames = [`helado de ${choiceName}`, `helado ${choiceName}`, `${choiceName} helado`, `helado sabor ${choiceName}`];
             for (const p of possibleNames) {
                 if (suppliesMap[p]) { supply = suppliesMap[p]; break; }
             }
          }
          if (!supply && choice.type === 'sauce') {
             if (suppliesMap[`salsa ${choiceName}`]) supply = suppliesMap[`salsa ${choiceName}`];
             else if (suppliesMap[`salsa de ${choiceName}`]) supply = suppliesMap[`salsa de ${choiceName}`];
          }

          if (supply) {
              let deductionAmount = 0;
              const productName = (product?.name || '').toLowerCase();
              
              // REGLAS ESPECÍFICAS DE GRAMAJES (Custom Logic)
              if (choice.type === 'flavor') {
                  const isGrams = supply.unit?.toLowerCase() === 'g' || supply.unit?.toLowerCase() === 'gramos';

                  if (productName.includes('cuchareable') || productName.includes('ensalada') || productName.includes('salpicón') || productName.includes('salpicon') || productName.includes("copa d'li") || productName.includes("copa d´li")) {
                      const val = supply.yieldPerSize?.mini || (isGrams ? 80 : 62);
                      deductionAmount = isGrams ? val : 1 / val;
                  } else if (productName.includes("capricho") || productName.includes('copa queso') || productName.includes('copa favorita')) {
                      const val = supply.yieldPerSize?.small || (isGrams ? 90 : 55);
                      deductionAmount = isGrams ? val : 1 / val;
                  } else {
                      const val = supply.yieldPerSize?.medium || (isGrams ? 100 : 50);
                      deductionAmount = isGrams ? val : 1 / val;
                  }
              }
              else if (choiceName === 'queso' || choiceName === 'adición queso') {
                  if (productName.includes('mini') && productName.includes('ensalada')) deductionAmount = 100;
                  else if (productName.includes('pequeña') && productName.includes('ensalada')) deductionAmount = 150;
                  else if (productName.includes('mediana') && productName.includes('ensalada')) deductionAmount = 200;
                  else if (productName.includes('grande') && productName.includes('ensalada')) deductionAmount = 250;
                  else if (productName.includes("copa d'li") || productName.includes("copa d´li") || productName.includes('salpicón') || productName.includes('salpicon') || productName.includes('copa favorita')) deductionAmount = 100;
                  else if (productName.includes('oblea tradicional') || choiceName === 'adición queso') deductionAmount = 150;
                  else if (productName.includes('oblea cuchareable') || productName.includes('copa queso')) deductionAmount = 200;
                  else deductionAmount = 100; // Default
                  
                  if (supply.unit?.toLowerCase() === 'kg') deductionAmount /= 1000;
              }
              else if (choiceName === 'arequipe' || choiceName === 'salsa arequipe') {
                  // asumiendo unit = Kg (1000g) o Litro
                  if (productName.includes('cuchareable')) deductionAmount = 50 / 1000;
                  else if (productName.includes('oblea')) deductionAmount = 30 / 1000;
                  else if (productName.includes('copa')) deductionAmount = 30 / 1000;
                  else if (productName.includes('malteada')) deductionAmount = 30 / 1000;
                  else if (productName.includes('helado')) deductionAmount = 6 / 1000;
                  else deductionAmount = 30 / 1000; // Default
              }
              else if (choiceName === 'lechera' || choiceName === 'lecherita') { 
                  // asumiendo unit = Pouch/Kg (1000g)
                  if (productName.includes('cuchareable')) deductionAmount = 50 / 1000;
                  else if (productName.includes('oblea') || (productName.includes('frutas') && productName.includes('crema'))) deductionAmount = 100 / 1000;
                  else if (productName.includes('copa')) deductionAmount = 30 / 1000;
                  else if (productName.includes('salpicón') || productName.includes('salpicon')) deductionAmount = 20 / 1000;
                  else if (productName.includes('ensalada')) deductionAmount = 35 / 1000;
                  else if (productName.includes('helado')) deductionAmount = 6 / 1000;
                  else deductionAmount = 30 / 1000;
              }
              else if (choiceName === 'salsa mora' || choiceName === 'mora') { 
                  // asumiendo unit = Litro (1000g/ml)
                  if (productName.includes('malteada')) deductionAmount = 30 / 1000;
                  else if (productName.includes('helado')) deductionAmount = 6 / 1000;
                  else deductionAmount = 30 / 1000;
              }
              else if (choiceName === 'salsa chocolate' || choiceName === 'chocolate') { 
                  // asumiendo unit = Litro (1000g/ml)
                  if (productName.includes('copa')) deductionAmount = 30 / 1000;
                  else if (productName.includes('helado')) deductionAmount = 6 / 1000;
                  else deductionAmount = 30 / 1000;
              }
              else if (choiceName === 'chantilly' || choiceName === 'adición chantilly') {
                  deductionAmount = 1; // It deductions from Chantilly, or directly from crema? 
                  // Wait, if it deducts from "Chantilly", that's 1 portion.
              }
              else if (choiceName === 'uva') { 
                  // asumiendo unit = Kg (1000g)
                  if (productName.includes('ensalada')) deductionAmount = 21.1 / 1000; // basado en 443g / 21
              }

              else if (choiceName === 'maní' || choiceName === 'mani') {
                  // The user requested 2gr de maní
                  deductionAmount = 2 / 1000;
              }
              else if (choiceName === 'bolitas de colores' || choiceName === 'bolitas') {
                  // The user requested 1gr de bolitas de colores
                  deductionAmount = 1 / 1000;
              }

              // Fallback a las reglas estándar si no encajó en ninguna regla específica
              if (deductionAmount === 0) {
                  // 1. Usar rendimiento específico del tamaño de la porción (Ej. porción pequeña = 1/80, porción grande = 1/40)
                  if (supply.yieldPerSize && supply.yieldPerSize[size]) {
                      deductionAmount = 1 / supply.yieldPerSize[size];
                  } 
                  // 2. Fallback a rendimiento estándar si no hay por tamaño
                  else if (supply.yieldPerUnit && supply.yieldPerUnit > 0) {
                      const lowerUnit = (supply.unit || '').toLowerCase();
                      const yieldVal = (lowerUnit === 'und' || lowerUnit === 'unidad' || lowerUnit === 'unidades' || lowerUnit === 'uds') ? 1 : supply.yieldPerUnit;
                      deductionAmount = 1 / yieldVal;
                  } 
                  // 3. Fallback a 1 unidad completa en el peor caso
                  else {
                      deductionAmount = 1; 
                  }
              }

              deductions[supply.id] = (deductions[supply.id] || 0) + (deductionAmount * item.quantity);
          }
      }
    }

    // 2.5 ADD PACKAGING SUPPLIES
    if (packagingSupplies && packagingSupplies.length > 0) {
      for (const pack of packagingSupplies) {
        if (pack.quantity > 0) {
          deductions[pack.supplyId] = (deductions[pack.supplyId] || 0) + pack.quantity;
        }
      }
    }

    // 3. Aplicar las deducciones en lote a Firestore
    const promises = Object.entries(deductions).map(([supplyId, amount]) => {
      if (amount <= 0) return Promise.resolve();
      return updateDoc(doc(db, 'supplies', supplyId), {
        currentStock: increment(isRestore ? amount : -amount) // Resta o suma el monto calculado
      });
    });

    await Promise.all(promises);
    console.log(`Inventario estático y dinámico ${isRestore ? 'restaurado' : 'descontado'} éxitosamente`, deductions);

  } catch (error) {
    console.error("Error descontando inventario:", error);
  }
}
