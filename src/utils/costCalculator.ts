import { Product, Supply, RecipeIngredient } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Safely parses any value to a finite number, returning fallback if null/undefined/NaN.
 */
function safeNum(val: any, fallback = 0): number {
  if (val == null) return fallback;
  const n = Number(val);
  return (typeof n === 'number' && !isNaN(n) && isFinite(n)) ? n : fallback;
}

function normalizeText(str?: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds a matching supply by exact id, or by fuzzy normalized name if id is missing or unlinked.
 */
export function findMatchingSupply(ingNameOrId: string, supplies: Supply[]): Supply | undefined {
  if (!ingNameOrId || !Array.isArray(supplies)) return undefined;

  // 1. Direct ID match with price
  const byId = supplies.find(s => s.id === ingNameOrId);
  if (byId && byId.lastPurchasePrice != null && !isNaN(Number(byId.lastPurchasePrice)) && Number(byId.lastPurchasePrice) > 0) {
    return byId;
  }

  const normIng = normalizeText(ingNameOrId);
  if (!normIng) return byId;

  // 2. Exact normalized name match
  let found = supplies.find(s => normalizeText(s.name) === normIng);
  if (found && found.lastPurchasePrice != null && Number(found.lastPurchasePrice) > 0) return found;

  // 3. Singular/plural normalization
  const ingNoS = normIng.replace(/\b(\w+)s\b/g, '$1');
  found = supplies.find(s => {
    const sNoS = normalizeText(s.name).replace(/\b(\w+)s\b/g, '$1');
    return sNoS === ingNoS;
  });
  if (found && found.lastPurchasePrice != null && Number(found.lastPurchasePrice) > 0) return found;

  // 4. Token & size number aware match
  const ingTokens = new Set(ingNoS.split(' ').filter(w => w.length > 0));
  const ingNumbers = [...ingTokens].filter(w => /^\d+$/.test(w));
  let bestMatch: Supply | undefined = undefined;
  let maxScore = 0;

  for (const s of supplies) {
    const sNoS = normalizeText(s.name).replace(/\b(\w+)s\b/g, '$1');
    const sTokens = new Set(sNoS.split(' ').filter(w => w.length > 0));

    // Category protection: lid vs cup
    if (ingTokens.has('tapa') && !sTokens.has('tapa')) continue;
    if (ingTokens.has('vaso') && !ingTokens.has('tapa') && sTokens.has('tapa')) continue;

    // Number protection (e.g. 7, 10, 13, 16 onzas)
    let numberMismatch = false;
    for (const num of ingNumbers) {
      if (!sTokens.has(num)) {
        numberMismatch = true;
        break;
      }
    }
    if (numberMismatch) continue;

    let score = 0;
    ingTokens.forEach(t => {
      if (t.length > 2 && sTokens.has(t)) score += 2;
      else if (/^\d+$/.test(t) && sTokens.has(t)) score += 5;
    });

    if (score > maxScore) {
      maxScore = score;
      bestMatch = s;
    }
  }

  return bestMatch || byId;
}

const KNOWN_FRUITS = [
  'fresa', 'mango', 'durazno', 'manzana', 'banano', 'uva', 'papaya',
  'kiwi', 'pina', 'piña', 'maracuya', 'maracuyá', 'mora', 'guanabana',
  'guanábana', 'lulo', 'cereza', 'arandano', 'arándano'
];

export function isFruitSupplyOrName(name: string, supply?: Supply): boolean {
  const normName = normalizeText(name);
  const normCategory = normalizeText(supply?.category);
  if (normCategory.includes('fruta') || normCategory.includes('pulpa')) return true;
  return KNOWN_FRUITS.some(f => normName.includes(f));
}

export interface CustomizationOptions {
  fruitChoices?: string[];
  flavors?: string[];
  includedSauces?: string[];
  extraSauces?: string[];
  notes?: string;
}

/**
 * Calculates the production cost of a recipe using supply prices,
 * adapting dynamically to customer exclusions (unselected fruits, "sin helado", "sin salsa", notes).
 */
export function calculateRecipeCost(
  recipe: RecipeIngredient[] | undefined | null,
  supplies: Supply[],
  options?: CustomizationOptions
): number {
  if (!recipe || !Array.isArray(recipe) || recipe.length === 0) return 0;
  
  const suppliesMap = new Map<string, Supply>();
  supplies.forEach(s => {
    if (s?.id) suppliesMap.set(s.id, s);
  });

  const selectedFruits = (options?.fruitChoices || []).map(f => normalizeText(f)).filter(Boolean);
  const flavorsList = (options?.flavors || []).map(f => normalizeText(f));
  const hasSinHelado = flavorsList.some(f => f === 'sin helado');
  const allSauces = [...(options?.includedSauces || []), ...(options?.extraSauces || [])].map(s => normalizeText(s));
  const hasSinSalsa = allSauces.some(s => s === 'sin salsa');
  const notesText = normalizeText(options?.notes);

  return recipe.reduce((acc, ing) => {
    if (!ing) return acc;
    let supply = ing.supplyId ? suppliesMap.get(ing.supplyId) : undefined;
    
    // Fallback inteligente por nombre si el ID no existe en supplies o no tiene precio
    if ((!supply || !supply.lastPurchasePrice) && ing.name) {
      supply = findMatchingSupply(ing.name, supplies) || supply;
    }

    const ingNorm = normalizeText(ing.name);
    const catNorm = normalizeText(supply?.category);

    // 1. Exclusión si el cliente eligió 'Sin Helado'
    if (hasSinHelado && (ingNorm.includes('helado') || catNorm.includes('helado'))) {
      return acc;
    }

    // 2. Exclusión si el cliente eligió 'Sin Salsa'
    if (hasSinSalsa && (ingNorm.includes('salsa') || catNorm.includes('salsa'))) {
      return acc;
    }

    // 3. Exclusiones en notas (ej: "sin queso", "sin lechera", "sin crema", "sin barquillo")
    if (notesText) {
      if (
        notesText.includes(`sin ${ingNorm}`) || 
        notesText.includes(`no ${ingNorm}`) || 
        notesText.includes(`s ${ingNorm}`) ||
        (supply?.name && notesText.includes(`sin ${normalizeText(supply.name)}`))
      ) {
        return acc;
      }
    }

    // 4. Frutas: si el cliente seleccionó frutas específicas y este ingrediente es una fruta
    if (selectedFruits.length > 0 && isFruitSupplyOrName(ing.name, supply)) {
      const isSelected = selectedFruits.some(sf => sf.includes(ingNorm) || ingNorm.includes(sf));
      if (!isSelected) {
        // La fruta no fue seleccionada por el cliente en esta orden
        return acc;
      }
    }

    const unitCost = safeNum(supply?.lastPurchasePrice, 0);
    const qty = safeNum(ing.quantity, 0);
    return acc + (unitCost * qty);
  }, 0);
}

export interface ItemCostResult {
  unitCost: number;
  itemCost: number;
  unitProfit: number;
  itemProfit: number;
}

/**
 * Calculates production cost and profit for a single cart/sale item.
 */
export function calculateItemCostAndProfit(
  item: any,
  products: Product[],
  supplies: Supply[]
): ItemCostResult {
  if (!item) {
    return { unitCost: 0, itemCost: 0, unitProfit: 0, itemProfit: 0 };
  }

  const quantity = Math.max(1, safeNum(item.quantity, 1));
  const rawSubtotal = item.subtotal != null ? safeNum(item.subtotal, NaN) : NaN;
  const rawUnitPrice = item.unitPrice != null ? safeNum(item.unitPrice, NaN) : NaN;

  let subtotal = 0;
  if (!isNaN(rawSubtotal)) {
    subtotal = rawSubtotal;
  } else if (!isNaN(rawUnitPrice)) {
    subtotal = rawUnitPrice * quantity;
  }
  const unitPrice = quantity > 0 ? subtotal / quantity : 0;

  // 0. Si el ítem ya tiene congelado un snapshot de costo válido, respetarlo
  if (item.unitCost != null && !isNaN(Number(item.unitCost)) && Number(item.unitCost) > 0) {
    const unitCost = Number(item.unitCost);
    const itemCost = item.itemCost != null ? Number(item.itemCost) : (item.productionCost != null ? Number(item.productionCost) : unitCost * quantity);
    const unitProfit = item.unitProfit != null ? Number(item.unitProfit) : unitPrice - unitCost;
    const itemProfit = item.itemProfit != null ? Number(item.itemProfit) : subtotal - itemCost;
    return { unitCost, itemCost, unitProfit, itemProfit };
  }

  // 1. Find product
  let product: Product | undefined;
  if (item.productId) {
    product = products.find(p => p.id === item.productId);
  }
  if (!product && item.productName) {
    const normName = String(item.productName).toLowerCase().trim();
    product = products.find(p => p.name?.toLowerCase().trim() === normName);
  }

  const options: CustomizationOptions = {
    fruitChoices: Array.isArray(item.fruitChoices) ? item.fruitChoices : (Array.isArray(item.includedFruits) ? item.includedFruits : []),
    flavors: Array.isArray(item.flavors) ? item.flavors : [],
    includedSauces: Array.isArray(item.includedSauces) ? item.includedSauces : [],
    extraSauces: Array.isArray(item.extraSauces) ? item.extraSauces : [],
    notes: item.notes || ''
  };

  let baseUnitCost = 0;

  if (product) {
    // Check variant recipe first
    if (item.variantLabel && Array.isArray(product.variants) && product.variants.length > 0) {
      const normVariant = String(item.variantLabel).toLowerCase().trim();
      const variant = product.variants.find(v => v.label?.toLowerCase().trim() === normVariant);
      if (variant?.recipe && variant.recipe.length > 0) {
        baseUnitCost = calculateRecipeCost(variant.recipe, supplies, options);
      } else if (product.recipe && product.recipe.length > 0) {
        baseUnitCost = calculateRecipeCost(product.recipe, supplies, options);
      }
    } else if (product.recipe && product.recipe.length > 0) {
      baseUnitCost = calculateRecipeCost(product.recipe, supplies, options);
    }
  }

  // 2. Additions cost
  let additionsUnitCost = 0;
  const additionsList: string[] = Array.isArray(item.additions) ? item.additions : [];
  const additionIdsList: string[] = Array.isArray(item.additionIds) ? item.additionIds : [];

  // Check additionIds first
  if (additionIdsList.length > 0) {
    additionIdsList.forEach(addId => {
      if (!addId) return;
      const addProduct = products.find(p => p.id === addId);
      if (addProduct?.recipe && addProduct.recipe.length > 0) {
        additionsUnitCost += calculateRecipeCost(addProduct.recipe, supplies, options);
      } else {
        const addSupply = supplies.find(s => s.id === addId);
        if (addSupply) {
          additionsUnitCost += safeNum(addSupply.lastPurchasePrice, 0);
        }
      }
    });
  } else if (additionsList.length > 0) {
    additionsList.forEach(addName => {
      if (!addName) return;
      const cleanName = String(addName).replace(/^\+/, '').toLowerCase().trim();
      const addProduct = products.find(p => p.name?.toLowerCase().trim() === cleanName);
      if (addProduct?.recipe && addProduct.recipe.length > 0) {
        additionsUnitCost += calculateRecipeCost(addProduct.recipe, supplies, options);
      } else {
        const addSupply = supplies.find(s => s.name?.toLowerCase().trim() === cleanName);
        if (addSupply) {
          additionsUnitCost += safeNum(addSupply.lastPurchasePrice, 0);
        }
      }
    });
  }

  const unitCost = Math.max(0, safeNum(baseUnitCost + additionsUnitCost, 0));
  const itemCost = Math.max(0, safeNum(unitCost * quantity, 0));
  const unitProfit = safeNum(unitPrice - unitCost, 0);
  const itemProfit = safeNum(subtotal - itemCost, 0);

  return {
    unitCost,
    itemCost,
    unitProfit,
    itemProfit
  };
}

export interface SaleCostResult {
  totalCost: number;
  totalProfit: number;
  itemsBreakdown: Array<{
    item: any;
    unitCost: number;
    itemCost: number;
    itemProfit: number;
  }>;
  packagingCost: number;
}

/**
 * Calculates total production cost and total profit for a full sale or movement.
 */
export function calculateSaleCostAndProfit(
  sale: any,
  products: Product[],
  supplies: Supply[]
): SaleCostResult {
  if (!sale) {
    return { totalCost: 0, totalProfit: 0, itemsBreakdown: [], packagingCost: 0 };
  }

  const items = Array.isArray(sale.items) ? sale.items : [];
  let itemsTotalCost = 0;

  const itemsBreakdown = items.map((item: any) => {
    const res = calculateItemCostAndProfit(item, products, supplies);
    itemsTotalCost += safeNum(res.itemCost, 0);
    return {
      item,
      unitCost: res.unitCost,
      itemCost: res.itemCost,
      itemProfit: res.itemProfit
    };
  });

  // Calculate packaging supplies cost (Empaques / Desechables)
  let packagingCost = 0;
  if (Array.isArray(sale.packagingSupplies)) {
    const suppliesMap = new Map<string, Supply>();
    supplies.forEach(s => { if (s?.id) suppliesMap.set(s.id, s); });

    sale.packagingSupplies.forEach((p: any) => {
      const q = safeNum(p?.quantity, 0);
      if (q > 0) {
        let supply = p?.supplyId ? suppliesMap.get(p.supplyId) : undefined;
        if ((!supply || !supply.lastPurchasePrice) && (p?.name || p?.supplyId)) {
          supply = findMatchingSupply(p?.name || p?.supplyId, supplies) || supply;
        }
        
        let costPerUnit = 0;
        if (supply && supply.lastPurchasePrice != null && !isNaN(Number(supply.lastPurchasePrice))) {
          costPerUnit = Number(supply.lastPurchasePrice);
        } else if (p?.unitPrice != null && !isNaN(Number(p.unitPrice))) {
          costPerUnit = Number(p.unitPrice);
        }

        packagingCost += q * costPerUnit;
      }
    });
  }

  const frozenCost = (sale.productionCost != null && !isNaN(Number(sale.productionCost))) ? Number(sale.productionCost) : null;
  const frozenProfit = (sale.profit != null && !isNaN(Number(sale.profit))) ? Number(sale.profit) : null;
  const frozenPackaging = (sale.packagingCost != null && !isNaN(Number(sale.packagingCost))) ? Number(sale.packagingCost) : null;

  const totalCost = frozenCost !== null ? frozenCost : Math.max(0, safeNum(itemsTotalCost + packagingCost, 0));
  const saleTotal = safeNum(sale.total, 0);
  const totalProfit = frozenProfit !== null ? frozenProfit : safeNum(saleTotal - totalCost, 0);
  const finalPackagingCost = frozenPackaging !== null ? frozenPackaging : safeNum(packagingCost, 0);

  return {
    totalCost,
    totalProfit,
    itemsBreakdown,
    packagingCost: finalPackagingCost
  };
}

/**
 * Calculates and attaches an immutable historical cost snapshot to a sale object
 * before persisting to Firestore.
 */
export async function attachCostSnapshotToSale(saleData: any): Promise<any> {
  try {
    const [productsSnap, suppliesSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'supplies'))
    ]);
    const allProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
    const allSupplies = suppliesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Supply));
    
    const costMetrics = calculateSaleCostAndProfit({
      total: saleData.total,
      items: saleData.items || [],
      packagingSupplies: saleData.packagingSupplies || []
    }, allProducts, allSupplies);

    saleData.productionCost = costMetrics.totalCost;
    saleData.profit = costMetrics.totalProfit;
    saleData.packagingCost = costMetrics.packagingCost;

    if (Array.isArray(saleData.items)) {
      saleData.items = saleData.items.map(item => {
        const itemRes = calculateItemCostAndProfit(item, allProducts, allSupplies);
        return {
          ...item,
          unitCost: itemRes.unitCost,
          itemCost: itemRes.itemCost,
          itemProfit: itemRes.itemProfit,
          productionCost: itemRes.itemCost
        };
      });
    }
  } catch (err) {
    console.warn('Error attaching cost snapshot to sale:', err);
  }
  return saleData;
}
