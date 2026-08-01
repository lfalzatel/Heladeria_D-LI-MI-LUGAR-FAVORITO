const fs = require('fs');

const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const sales = Object.values(data.sales || {});

let totalArequipeDeducted = 0;
let totalArequipeShouldHaveBeenDeducted = 0;

let arequipeTodayDeducted = 0;
let arequipeTodayShouldHaveBeenDeducted = 0;

sales.forEach(order => {
  const dateObj = order.createdAt ? new Date(order.createdAt.seconds * 1000) : null;
  // Let's assume today is July 20 or July 21 (since the backup says 2026-07-21)
  const isToday = dateObj ? dateObj.toISOString().startsWith('2026-07-20') || dateObj.toISOString().startsWith('2026-07-21') : false;

  (order.items || []).forEach(item => {
    const productName = (item.productName || '').toLowerCase();
    const qty = item.quantity || 1;

    // 1. Dynamic extra choices are in 'additions'
    (item.additions || []).forEach(addition => {
      const additionName = (addition.name || '').toLowerCase();
      if (additionName === 'arequipe' || additionName === 'salsa arequipe' || additionName === 'adición arequipe' || additionName === 'adición de arequipe') {
         let amount = 30; // default in grams
         if (productName.includes('cuchareable')) amount = 50;
         else if (productName.includes('oblea')) amount = 30;
         else if (productName.includes('copa')) amount = 30;
         else if (productName.includes('malteada')) amount = 30;
         else if (productName.includes('helado')) amount = 6;
         
         // Wait, the dynamic deduction might have divided by 1000
         totalArequipeShouldHaveBeenDeducted += amount * qty;
         totalArequipeDeducted += (amount / 1000) * qty;
         
         if (isToday) {
            arequipeTodayShouldHaveBeenDeducted += amount * qty;
            arequipeTodayDeducted += (amount / 1000) * qty;
         }
      }
    });
    
    // 2. Recipe base for Copa Explosión
    if (productName.includes('explosión') || productName.includes('explosion')) {
      // The recipe had 0.08 grams instead of 80 grams for Arequipe
      totalArequipeShouldHaveBeenDeducted += (80 * qty);
      totalArequipeDeducted += (0.08 * qty);
      if (isToday) {
         arequipeTodayShouldHaveBeenDeducted += (80 * qty);
         arequipeTodayDeducted += (0.08 * qty);
      }
    }
  });
});

console.log('--- Cálculo de corrección de AREQUIPE ---');
console.log('HOY (20/21 de Julio):');
console.log(`Deducido erróneamente: ${arequipeTodayDeducted}g`);
console.log(`Debió deducirse: ${arequipeTodayShouldHaveBeenDeducted}g`);
console.log(`Déficit hoy: ${arequipeTodayShouldHaveBeenDeducted - arequipeTodayDeducted}g`);

console.log('\nEN TODO EL HISTORIAL:');
console.log(`Deducido erróneamente: ${totalArequipeDeducted}g`);
console.log(`Debió deducirse: ${totalArequipeShouldHaveBeenDeducted}g`);
console.log(`Déficit Total (todo el historial): ${totalArequipeShouldHaveBeenDeducted - totalArequipeDeducted}g`);
