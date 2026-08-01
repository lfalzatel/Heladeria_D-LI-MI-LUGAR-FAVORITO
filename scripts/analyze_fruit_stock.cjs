const fs = require('fs');

const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const sales = Object.values(data.sales || {});
const supplies = Object.values(data.supplies || {});

const fresaInfo = supplies.find(s => s.name.toLowerCase() === 'fresa');
const uvaInfo = supplies.find(s => s.name.toLowerCase() === 'uva');
const kiwiInfo = supplies.find(s => s.name.toLowerCase() === 'kiwi');
const salsaInfo = supplies.find(s => s.name.toLowerCase() === 'salsa');

const results = {
  fresa: { base: 0, dynamic: 0, total: 0, unit: fresaInfo.unit },
  uva: { base: 0, dynamic: 0, total: 0, unit: uvaInfo.unit },
  kiwi: { base: 0, dynamic: 0, total: 0, unit: kiwiInfo.unit },
  salsa: { base: 0, dynamic: 0, total: 0, unit: salsaInfo.unit }
};

sales.forEach(order => {
  (order.items || []).forEach(item => {
    const qty = item.quantity || 1;
    const productName = (item.productName || '').toLowerCase();
    const size = (item.size || 'medium').toLowerCase();

    // 1. BASE RECIPE DEDUCTIONS
    if (item.recipe) {
      item.recipe.forEach(rItem => {
        if (rItem.supplyId === fresaInfo.id) results.fresa.base += (rItem.quantity * qty);
        if (rItem.supplyId === uvaInfo.id) results.uva.base += (rItem.quantity * qty);
        if (rItem.supplyId === kiwiInfo.id) results.kiwi.base += (rItem.quantity * qty);
        if (rItem.supplyId === salsaInfo.id) results.salsa.base += (rItem.quantity * qty);
      });
    }

    // 2. DYNAMIC DEDUCTIONS
    (item.additions || []).forEach(choice => {
      const cName = (choice.name || '').toLowerCase();
      // Fresa dynamic
      if (cName === 'fresa' || cName === 'adición fresa') {
        const val = fresaInfo.yieldPerSize?.[size] || fresaInfo.yieldPerUnit || 1;
        // The bug in inventory.ts does 1 / val for fruit fallbacks!
        // So we record what the BUG actually deducted to explain the decimals
        results.fresa.dynamic += ((1 / val) * qty);
      }
      // Uva dynamic
      if (cName === 'uva' || cName === 'adición uva') {
        let val = 0;
        if (productName.includes('ensalada')) val = 21.1; 
        else val = 1 / (uvaInfo.yieldPerSize?.[size] || uvaInfo.yieldPerUnit || 1); // fallback bug
        results.uva.dynamic += (val * qty);
      }
      // Kiwi dynamic
      if (cName === 'kiwi' || cName === 'adición kiwi') {
        const val = kiwiInfo.yieldPerSize?.[size] || kiwiInfo.yieldPerUnit || 1;
        results.kiwi.dynamic += ((1 / val) * qty); // 1/6 = 0.1666
      }
    });
  });
});

Object.keys(results).forEach(k => {
  results[k].total = results[k].base + results[k].dynamic;
  console.log(`--- ${k.toUpperCase()} ---`);
  console.log(`Deducido por recetas base: ${results[k].base}`);
  console.log(`Deducido por adiciones (con el bug): ${results[k].dynamic}`);
  console.log(`Total Deducido Históricamente: ${results[k].total} ${results[k].unit}`);
});
