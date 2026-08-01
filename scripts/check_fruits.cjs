const fs = require('fs');

const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const products = Object.values(data.products || {});
const supplies = Object.values(data.supplies || {});

const targetNames = ['fresa', 'uva', 'kiwi', 'salsa'];

console.log('--- TARGET SUPPLIES ---');
const targets = supplies.filter(s => targetNames.some(tn => (s.name || '').toLowerCase().includes(tn)));
targets.forEach(s => {
  console.log(`- ${s.name} (ID: ${s.id})`);
  console.log(`  Stock: ${s.currentStock} ${s.unit}`);
  console.log(`  Virtual: ${s.isVirtual ? 'YES' : 'NO'}`);
});

console.log('\n--- RECIPES USING THEM ---');
products.forEach(p => {
  if (p.recipe) {
    p.recipe.forEach(item => {
      const supply = targets.find(t => t.id === item.supplyId);
      if (supply) {
        console.log(`[Base] Product: ${p.name} -> Supply: ${supply.name}, Qty: ${item.quantity} ${supply.unit}`);
      }
    });
  }
  
  if (p.variants) {
    p.variants.forEach(v => {
      if (v.recipe) {
        v.recipe.forEach(item => {
          const supply = targets.find(t => t.id === item.supplyId);
          if (supply) {
            console.log(`[Variant] Product: ${p.name}, Variant: ${v.label} -> Supply: ${supply.name}, Qty: ${item.quantity} ${supply.unit}`);
          }
        });
      }
    });
  }
});
