const fs = require('fs');
const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const purchases = Object.values(data.supplyPurchases || {});
const sales = Object.values(data.sales || {});

const ids = {
  fresa: '1iHkGY7x8hP3aPpSsTiF',
  uva: 'OQJXBXLD14HamYLZHzH1',
  kiwi: 'o97hn4XJ0WInMW8mHLay',
  salsa: 'uOU7jJwk3v9b2OEQhlBk'
};

console.log('--- COMPRAS EN JULIO (Mes 7) ---');
Object.keys(ids).forEach(name => {
  const id = ids[name];
  const pList = purchases.filter(p => p.supplyId === id);
  let totalBought = 0;
  pList.forEach(p => {
    const d = new Date(p.date.seconds * 1000);
    if (d.getMonth() === 6) { // July is month 6 in JS
      totalBought += p.quantity;
      console.log(`[${name}] Comprado: ${p.quantity} el ${d.toISOString()}`);
    }
  });
  console.log(`Total ${name} comprado en Julio: ${totalBought}`);
});

console.log('\n--- VENTAS EN JULIO (Mes 7) ---');
const suppliesMap = {};
Object.values(data.supplies || {}).forEach(s => suppliesMap[s.id] = s);

Object.keys(ids).forEach(name => {
  const id = ids[name];
  const supply = suppliesMap[id];
  let deductedInJuly = 0;

  sales.forEach(order => {
    const d = new Date(order.createdAt.seconds * 1000);
    if (d.getMonth() === 6) {
      (order.items || []).forEach(item => {
        const qty = item.quantity || 1;
        const size = (item.size || 'medium').toLowerCase();
        
        // Base
        if (item.recipe) {
          item.recipe.forEach(r => {
            if (r.supplyId === id) deductedInJuly += (r.quantity * qty);
          });
        }

        // Additions
        const allChoices = [];
        if (item.flavors) item.flavors.forEach(c => allChoices.push({ name: c, type: 'flavor' }));
        if (item.syrups) item.syrups.forEach(c => allChoices.push({ name: c, type: 'sauce' }));
        if (item.fruitChoices) item.fruitChoices.forEach(c => allChoices.push({ name: c, type: 'fruit' }));
        if (item.toppings) item.toppings.forEach(c => allChoices.push({ name: c, type: 'topping' }));
        if (item.additions) item.additions.forEach(c => allChoices.push({ name: c.name, type: 'addition' }));

        allChoices.forEach(choice => {
          let choiceName = (choice.name || '').toLowerCase().trim();
          if (choiceName.includes('adición ')) choiceName = choiceName.replace('adición ', '');
          if (choiceName === name) { // Simplified matching
             // We want CORRECT deductions now
             if (name === 'uva' && item.productName?.toLowerCase().includes('ensalada')) {
               deductedInJuly += (21.1 * qty);
             } else {
               const isGramsOrMl = ['g','ml','gramos','mililitros'].includes((supply.unit||'').toLowerCase());
               let newVal = 1;
               if (supply.yieldPerSize && supply.yieldPerSize[size]) newVal = isGramsOrMl ? supply.yieldPerSize[size] : (1 / supply.yieldPerSize[size]);
               else if (supply.yieldPerUnit && supply.yieldPerUnit > 0) {
                   const lowerUnit = (supply.unit || '').toLowerCase();
                   const yieldVal = (lowerUnit === 'und' || lowerUnit === 'unidad' || lowerUnit === 'unidades' || lowerUnit === 'uds') ? 1 : supply.yieldPerUnit;
                   newVal = isGramsOrMl ? yieldVal : (1 / yieldVal);
               }
               deductedInJuly += (newVal * qty);
             }
          }
        });
      });
    }
  });

  console.log(`Total ${name} vendido en Julio: ${deductedInJuly.toFixed(2)} ${supply.unit}`);
});
