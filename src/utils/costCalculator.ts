import { Product, Supply, RecipeIngredient } from '../types';

/**
 * Safely parses any value to a finite number, returning fallback if null/undefined/NaN.
 */
function safeNum(val: any, fallback = 0): number {
  if (val == null) return fallback;
  const n = Number(val);
  return (typeof n === 'number' && !isNaN(n) && isFinite(n)) ? n : fallback;
}

/**
 * Calculates the production cost of a recipe using supply prices.
 */
export function calculateRecipeCost(recipe: RecipeIngredient[] | undefined | null, supplies: Supply[]): number {
  if (!recipe || !Array.isArray(recipe) || recipe.length === 0) return 0;
  
  const suppliesMap = new Map<string, Supply>();
  supplies.forEach(s => {
    if (s?.id) suppliesMap.set(s.id, s);
  });

  return recipe.reduce((acc, ing) => {
    if (!ing?.supplyId) return acc;
    const supply = suppliesMap.get(ing.supplyId);
    if (!supply) return acc;
    const unitCost = safeNum(supply.lastPurchasePrice, 0);
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

  // 1. Find product
  let product: Product | undefined;
  if (item.productId) {
    product = products.find(p => p.id === item.productId);
  }
  if (!product && item.productName) {
    const normName = String(item.productName).toLowerCase().trim();
    product = products.find(p => p.name?.toLowerCase().trim() === normName);
  }

  let baseUnitCost = 0;

  if (product) {
    // Check variant recipe first
    if (item.variantLabel && Array.isArray(product.variants) && product.variants.length > 0) {
      const normVariant = String(item.variantLabel).toLowerCase().trim();
      const variant = product.variants.find(v => v.label?.toLowerCase().trim() === normVariant);
      if (variant?.recipe && variant.recipe.length > 0) {
        baseUnitCost = calculateRecipeCost(variant.recipe, supplies);
      } else if (product.recipe && product.recipe.length > 0) {
        baseUnitCost = calculateRecipeCost(product.recipe, supplies);
      }
    } else if (product.recipe && product.recipe.length > 0) {
      baseUnitCost = calculateRecipeCost(product.recipe, supplies);
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
        additionsUnitCost += calculateRecipeCost(addProduct.recipe, supplies);
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
        additionsUnitCost += calculateRecipeCost(addProduct.recipe, supplies);
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
        if (!supply && p?.name) {
          const normName = String(p.name).toLowerCase().trim();
          supply = supplies.find(s => s.name?.toLowerCase().trim() === normName);
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

  const totalCost = Math.max(0, safeNum(itemsTotalCost + packagingCost, 0));
  const saleTotal = safeNum(sale.total, 0);
  const totalProfit = safeNum(saleTotal - totalCost, 0);

  return {
    totalCost,
    totalProfit,
    itemsBreakdown,
    packagingCost: safeNum(packagingCost, 0)
  };
}
