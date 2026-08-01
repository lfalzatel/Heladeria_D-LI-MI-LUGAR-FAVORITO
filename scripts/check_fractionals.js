import fs from 'fs';

const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const products = Object.values(data.products || {});
const supplies = Object.values(data.supplies || {});

console.log('--- Recipes with fractional quantities for integer units ---');

products.forEach(p => {
  if (p.recipe) {
    p.recipe.forEach(item => {
      const supply = supplies.find(s => s.id === item.supplyId);
      if (supply && (supply.unit === 'g' || supply.unit === 'und' || supply.unit === 'ml')) {
        if (!Number.isInteger(item.quantity)) {
          console.log(`Product: ${p.name}, Supply: ${supply.name} (${supply.unit}), Base Quantity: ${item.quantity}`);
        }
      }
    });
  }
  
  if (p.variants) {
    p.variants.forEach(v => {
      if (v.recipe) {
        v.recipe.forEach(item => {
          const supply = supplies.find(s => s.id === item.supplyId);
          if (supply && (supply.unit === 'g' || supply.unit === 'und' || supply.unit === 'ml')) {
            if (!Number.isInteger(item.quantity)) {
              console.log(`Product: ${p.name}, Variant: ${v.label}, Supply: ${supply.name} (${supply.unit}), Quantity: ${item.quantity}`);
            }
          }
        });
      }
    });
  }
});
