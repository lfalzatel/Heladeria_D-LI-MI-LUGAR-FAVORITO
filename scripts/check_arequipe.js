import fs from 'fs';

const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const products = Object.values(data.products || {});
const supplies = Object.values(data.supplies || {});

// Find the ID of Arequipe
const arequipe = supplies.find(s => s.name === 'Arequipe');
if (!arequipe) {
  console.log('Arequipe not found in supplies!');
  process.exit(1);
}

console.log('Arequipe Supply:', arequipe);
console.log('--- Recipes using Arequipe ---');

products.forEach(p => {
  if (p.recipe) {
    const item = p.recipe.find(r => r.supplyId === arequipe.id);
    if (item) {
      console.log(`Product: ${p.name}, Base Quantity: ${item.quantity}`);
    }
  }
  
  if (p.variants) {
    p.variants.forEach(v => {
      if (v.recipe) {
        const item = v.recipe.find(r => r.supplyId === arequipe.id);
        if (item) {
          console.log(`Product: ${p.name}, Variant: ${v.label}, Quantity: ${item.quantity}`);
        }
      }
    });
  }
});
