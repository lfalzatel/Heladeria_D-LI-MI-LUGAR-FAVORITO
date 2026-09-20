import { Product, Supply, RecipeIngredient } from '../types';

/**
 * Calculates the production cost of a recipe using supply prices.
 */
export function calculateRecipeCost(recipe: RecipeIngredient[] | undefined | null, supplies: Supply[]): number {
  if (!recipe || recipe.length === 0) return 0;
  
  const suppliesMap = new Map<string, Supply>();
  supplies.forEach(s => {
    if (s.id) suppliesMap.set(s.id, s);
  });

  return recipe.reduce((acc, ing) => {
    const supply = suppliesMap.get(ing.supplyId);
    if (!supply) return acc;
    const unitCost = supply.lastPurchasePrice || 0;
    return acc + (unitCost * (Number(ing.quantity) || 0));
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
  const quantity = Number(item.quantity) || 1;
  const subtotal = Number(item.subtotal) || (Number(item.unitPrice) || 0) * quantity;
  const unitPrice = subtotal / quantity;

  // 1. Find product
  let product: Product | undefined;
  if (item.productId) {
    product = products.find(p => p.id === item.productId);
  }
  if (!product && item.productName) {
    const normName = item.productName.toLowerCase().trim();
    product = products.find(p => p.name.toLowerCase().trim() === normName);
  }

  let baseUnitCost = 0;

  if (product) {
    // Check variant recipe first
    if (item.variantLabel && product.variants && product.variants.length > 0) {
      const normVariant = item.variantLabel.toLowerCase().trim();
      const variant = product.variants.find(v => v.label.toLowerCase().trim() === normVariant);
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
  const additionsList: string[] = item.additions || [];
  const additionIdsList: string[] = item.additionIds || [];

  // Check additionIds first
  if (additionIdsList.length > 0) {
    additionIdsList.forEach(addId => {
      const addProduct = products.find(p => p.id === addId);
      if (addProduct?.recipe && addProduct.recipe.length > 0) {
        additionsUnitCost += calculateRecipeCost(addProduct.recipe, supplies);
      } else {
        const addSupply = supplies.find(s => s.id === addId);
        if (addSupply) {
          additionsUnitCost += addSupply.lastPurchasePrice || 0;
        }
      }
    });
  } else if (additionsList.length > 0) {
    additionsList.forEach(addName => {
      const cleanName = addName.replace(/^\+/, '').toLowerCase().trim();
      const addProduct = products.find(p => p.name.toLowerCase().trim() === cleanName);
      if (addProduct?.recipe && addProduct.recipe.length > 0) {
        additionsUnitCost += calculateRecipeCost(addProduct.recipe, supplies);
      } else {
        const addSupply = supplies.find(s => s.name.toLowerCase().trim() === cleanName);
        if (addSupply) {
          additionsUnitCost += addSupply.lastPurchasePrice || 0;
        }
      }
    });
  }

  const unitCost = baseUnitCost + additionsUnitCost;
  const itemCost = unitCost * quantity;
  const unitProfit = unitPrice - unitCost;
  const itemProfit = subtotal - itemCost;

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
  const items = sale.items || [];
  let itemsTotalCost = 0;

  const itemsBreakdown = items.map((item: any) => {
    const res = calculateItemCostAndProfit(item, products, supplies);
    itemsTotalCost += res.itemCost;
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
    supplies.forEach(s => { if (s.id) suppliesMap.set(s.id, s); });

    sale.packagingSupplies.forEach((p: any) => {
      const q = Number(p.quantity) || 0;
      if (q > 0) {
        const supply = suppliesMap.get(p.supplyId);
        const costPerUnit = supply?.lastPurchasePrice ?? Number(p.unitPrice) ?? 0;
        packagingCost += q * costPerUnit;
      }
    });
  }

  const totalCost = itemsTotalCost + packagingCost;
  const saleTotal = Number(sale.total) || 0;
  const totalProfit = saleTotal - totalCost;

  return {
    totalCost,
    totalProfit,
    itemsBreakdown,
    packagingCost
  };
}
