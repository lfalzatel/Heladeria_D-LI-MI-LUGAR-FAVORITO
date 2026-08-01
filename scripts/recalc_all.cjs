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
         if (supply) {
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

      let buggyDeduction = 0;
      let correctDeduction = 0;

      // SPECIFIC RULES (Old vs New)
      if (choice.type === 'flavor') {
          const isGrams = supply.unit?.toLowerCase() === 'g' || supply.unit?.toLowerCase() === 'gramos';
          if (productName.includes('cuchareable') || productName.includes('ensalada') || productName.includes('salpicón') || productName.includes('salpicon') || productName.includes("copa d'li") || productName.includes("copa d´li")) {
              const val = supply.yieldPerSize?.mini || (isGrams ? 80 : 62);
              buggyDeduction = isGrams ? val : 1 / val;
              correctDeduction = buggyDeduction; // Flavor logic had no bug
          } else if (productName.includes("capricho") || productName.includes('copa queso') || productName.includes('copa favorita')) {
              const val = supply.yieldPerSize?.small || (isGrams ? 90 : 55);
              buggyDeduction = isGrams ? val : 1 / val;
              correctDeduction = buggyDeduction;
          } else {
              const val = supply.yieldPerSize?.medium || (isGrams ? 100 : 50);
              buggyDeduction = isGrams ? val : 1 / val;
              correctDeduction = buggyDeduction;
          }
      }
      else if (choiceName === 'queso' || choiceName === 'adición queso') {
          let base = 100;
          if (productName.includes('mini') && productName.includes('ensalada')) base = 100;
          else if (productName.includes('pequeña') && productName.includes('ensalada')) base = 150;
          else if (productName.includes('mediana') && productName.includes('ensalada')) base = 200;
          else if (productName.includes('grande') && productName.includes('ensalada')) base = 250;
          else if (productName.includes("copa d'li") || productName.includes("copa d´li") || productName.includes('salpicón') || productName.includes('salpicon') || productName.includes('copa favorita')) base = 100;
          else if (productName.includes('oblea tradicional') || choiceName === 'adición queso') base = 150;
          else if (productName.includes('oblea cuchareable') || productName.includes('copa queso')) base = 200;
          
          buggyDeduction = base;
          if (supply.unit?.toLowerCase() === 'kg') buggyDeduction /= 1000;
          correctDeduction = buggyDeduction; // Queso was correct if not /1000 by accident on grams
      }
      else if (choiceName === 'arequipe' || choiceName === 'salsa arequipe') {
          let base = 30;
          if (productName.includes('cuchareable')) base = 50;
          else if (productName.includes('oblea')) base = 30;
          else if (productName.includes('copa')) base = 30;
          else if (productName.includes('malteada')) base = 30;
          else if (productName.includes('helado')) base = 6;
          buggyDeduction = base / 1000;
          correctDeduction = base;
      }
      else if (choiceName === 'lechera' || choiceName === 'lecherita') { 
          let base = 30;
          if (productName.includes('cuchareable')) base = 50;
          else if (productName.includes('oblea') || (productName.includes('frutas') && productName.includes('crema'))) base = 100;
          else if (productName.includes('copa')) base = 30;
          else if (productName.includes('salpicón') || productName.includes('salpicon')) base = 20;
          else if (productName.includes('ensalada')) base = 35;
          else if (productName.includes('helado')) base = 6;
          buggyDeduction = base / 1000;
          correctDeduction = base;
      }
      else if (choiceName === 'salsa mora' || choiceName === 'mora') { 
          let base = 30;
          if (productName.includes('malteada')) base = 30;
          else if (productName.includes('helado')) base = 6;
          buggyDeduction = base / 1000;
          correctDeduction = base;
      }
      else if (choiceName === 'salsa chocolate' || choiceName === 'chocolate') { 
          let base = 30;
          if (productName.includes('copa')) base = 30;
          else if (productName.includes('helado')) base = 6;
          buggyDeduction = base / 1000;
          correctDeduction = base;
      }
      else if (choiceName === 'chantilly' || choiceName === 'adición chantilly') {
          buggyDeduction = 1;
          correctDeduction = 1;
      }
      else if (choiceName === 'uva') { 
          if (productName.includes('ensalada')) {
              buggyDeduction = 21.1 / 1000;
              correctDeduction = 21.1;
          }
      }
      else if (choiceName === 'maní' || choiceName === 'mani') {
          buggyDeduction = 2 / 1000;
          correctDeduction = 2;
      }
      else if (choiceName === 'bolitas de colores' || choiceName === 'bolitas') {
          buggyDeduction = 1 / 1000;
          correctDeduction = 1;
      }

      // New generic /1000 check for base grams
      if (correctDeduction > 0) {
          const u = (supply.unit || '').toLowerCase();
          if (u === 'kg' || u === 'l' || u === 'litro' || u === 'litros') {
              correctDeduction /= 1000;
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
let count = 0;
Object.values(discrepancies).forEach(d => {
  const missing = d.correct - d.buggy;
  if (Math.abs(missing) > 1) { // More than 1 unit missing
    count++;
    console.log(`${d.name} (${d.unit}):`);
    console.log(`  - DÉFICIT OCULTO: ${missing.toFixed(2)} ${d.unit} (Debió descontar ${d.correct.toFixed(2)}, pero restó solo ${d.buggy.toFixed(2)})`);
  }
});
if (count === 0) console.log('Ningún otro insumo tiene desfase significativo.');
