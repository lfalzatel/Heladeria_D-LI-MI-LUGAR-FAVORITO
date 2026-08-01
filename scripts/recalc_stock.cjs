const fs = require('fs');

const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const sales = Object.values(data.sales || {});
const supplies = Object.values(data.supplies || {});

const suppliesMap = {};
supplies.forEach(s => {
  if (s.name && !s.isVirtual) {
    suppliesMap[s.name.toLowerCase().trim()] = s;
    suppliesMap[s.id] = s;
  }
});

const discrepancies = {}; 

function getSupplyByName(name) {
  return suppliesMap[name.toLowerCase().trim()];
}

sales.forEach(order => {
  (order.items || []).forEach(item => {
    const qty = item.quantity || 1;
    const productName = (item.productName || '').toLowerCase();
    const size = (item.size || 'medium').toLowerCase();

    // Base recipes
    if (item.recipe) {
      item.recipe.forEach(rItem => {
         const supply = suppliesMap[rItem.supplyId];
         if (supply && ['fresa','uva','kiwi','salsa'].some(t => supply.name.toLowerCase().includes(t))) {
            if (!discrepancies[supply.id]) discrepancies[supply.id] = { name: supply.name, unit: supply.unit, buggy: 0, correct: 0, base: 0 };
            discrepancies[supply.id].base += (rItem.quantity * qty);
         }
      });
    }

    const allChoices = [];
    if (item.flavors) item.flavors.forEach(c => allChoices.push({ name: c, type: 'flavor' }));
    if (item.syrups) item.syrups.forEach(c => allChoices.push({ name: c, type: 'sauce' }));
    if (item.fruitChoices) item.fruitChoices.forEach(c => allChoices.push({ name: c, type: 'fruit' }));
    if (item.toppings) item.toppings.forEach(c => allChoices.push({ name: c, type: 'topping' }));
    if (item.additions) item.additions.forEach(c => allChoices.push({ name: c.name, type: 'addition' }));

    allChoices.forEach(choice => {
      let choiceName = (choice.name || '').toLowerCase().trim();
      let supply = getSupplyByName(choiceName);
      if (!supply && choiceName.includes('adición ')) {
        choiceName = choiceName.replace('adición ', '');
        supply = getSupplyByName(choiceName);
      }
      if (!supply && choice.type === 'sauce') {
         let sName = choiceName;
         if (sName.includes('salsa ')) sName = sName.replace('salsa ', '');
         supply = getSupplyByName('salsa ' + sName) || getSupplyByName('salsa de ' + sName) || getSupplyByName(sName);
      }
      
      if (!supply) return;
      if (!['fresa','uva','kiwi','salsa'].some(t => supply.name.toLowerCase().includes(t))) return;

      let buggyDeduction = 0;
      let correctDeduction = 0;

      if (choiceName === 'uva') { 
          if (productName.includes('ensalada')) {
              buggyDeduction = 21.1 / 1000;
              correctDeduction = 21.1;
          }
      }

      // FALLBACK
      if (buggyDeduction === 0) {
          const lowerUnit = (supply.unit || '').toLowerCase();
          const isGramsOrMl = (lowerUnit === 'g' || lowerUnit === 'ml' || lowerUnit === 'gramos' || lowerUnit === 'mililitros');
          
          let oldVal = 0;
          if (supply.yieldPerSize && supply.yieldPerSize[size]) oldVal = 1 / supply.yieldPerSize[size];
          else if (supply.yieldPerUnit && supply.yieldPerUnit > 0) {
              const yieldVal = (lowerUnit === 'und' || lowerUnit === 'unidad' || lowerUnit === 'unidades' || lowerUnit === 'uds') ? 1 : supply.yieldPerUnit;
              oldVal = 1 / yieldVal;
          }
          else oldVal = 1;
          buggyDeduction = oldVal;

          let newVal = 0;
          if (supply.yieldPerSize && supply.yieldPerSize[size]) newVal = isGramsOrMl ? supply.yieldPerSize[size] : (1 / supply.yieldPerSize[size]);
          else if (supply.yieldPerUnit && supply.yieldPerUnit > 0) {
              const yieldVal = (lowerUnit === 'und' || lowerUnit === 'unidad' || lowerUnit === 'unidades' || lowerUnit === 'uds') ? 1 : supply.yieldPerUnit;
              newVal = isGramsOrMl ? yieldVal : (1 / yieldVal);
          }
          else newVal = 1;
          correctDeduction = newVal;
      }

      if (!discrepancies[supply.id]) discrepancies[supply.id] = { name: supply.name, unit: supply.unit, buggy: 0, correct: 0, base: 0 };
      discrepancies[supply.id].buggy += (buggyDeduction * qty);
      discrepancies[supply.id].correct += (correctDeduction * qty);
    });
  });
});

console.log('--- REPORTE DE DESFASES EN STOCK (HISTÓRICO) ---');
Object.values(discrepancies).forEach(d => {
  const missing = d.correct - d.buggy;
  console.log(`${d.name} (${d.unit}):`);
  console.log(`  - Deducido por recetas BASE: ${d.base.toFixed(4)}`);
  console.log(`  - Deducido por dinámicos (Bug): ${d.buggy.toFixed(4)}`);
  console.log(`  - Debió deducir (dinámico): ${d.correct.toFixed(4)}`);
  console.log(`  - DÉFICIT OCULTO (lo que falta descontar): ${missing.toFixed(2)} ${d.unit}`);
  console.log('');
});
