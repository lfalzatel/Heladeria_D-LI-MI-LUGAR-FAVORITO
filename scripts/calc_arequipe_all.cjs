const fs = require('fs');

const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const orders = Object.values(data.orders || {});

let totalArequipeDeducted = 0;
let totalArequipeShouldHaveBeenDeducted = 0;

let arequipeTodayDeducted = 0;
let arequipeTodayShouldHaveBeenDeducted = 0;

orders.forEach(order => {
  if (order.status === 'Completado' || order.status === 'completed' || !order.status) {
    const dateObj = order.createdAt ? new Date(order.createdAt.seconds * 1000) : null;
    const isToday = dateObj ? dateObj.toISOString().startsWith('2026-07-20') || dateObj.toISOString().startsWith('2026-07-21') : false;

    (order.items || []).forEach(item => {
      // 1. Dynamic extra choices
      (item.choices || []).forEach(choice => {
        const choiceName = (choice.name || '').toLowerCase();
        if (choiceName === 'arequipe' || choiceName === 'salsa arequipe') {
           let amount = 30; // default in grams
           const productName = (item.name || '').toLowerCase();
           if (productName.includes('cuchareable')) amount = 50;
           else if (productName.includes('oblea')) amount = 30;
           else if (productName.includes('copa')) amount = 30;
           else if (productName.includes('malteada')) amount = 30;
           else if (productName.includes('helado')) amount = 6;
           
           totalArequipeShouldHaveBeenDeducted += amount;
           totalArequipeDeducted += (amount / 1000);
           
           if (isToday) {
              arequipeTodayShouldHaveBeenDeducted += amount;
              arequipeTodayDeducted += (amount / 1000);
           }
        }
      });
      
      // 2. Recipe base
      if (item.name && item.name.includes('Explosión') && item.quantity) {
        totalArequipeShouldHaveBeenDeducted += (item.quantity * 80);
        totalArequipeDeducted += (item.quantity * 0.08);
        if (isToday) {
           arequipeTodayShouldHaveBeenDeducted += (item.quantity * 80);
           arequipeTodayDeducted += (item.quantity * 0.08);
        }
      }
    });
  }
});

console.log('--- Cálculo de corrección de AREQUIPE ---');
console.log('HOY (20/21 de Julio):');
console.log(`Deducido erróneamente: ${arequipeTodayDeducted}g`);
console.log(`Debió deducirse: ${arequipeTodayShouldHaveBeenDeducted}g`);
console.log(`Déficit (lo que falta restar al stock actual por las ventas de hoy): ${arequipeTodayShouldHaveBeenDeducted - arequipeTodayDeducted}g`);

console.log('\nEN TODO EL HISTORIAL:');
console.log(`Deducido erróneamente: ${totalArequipeDeducted}g`);
console.log(`Debió deducirse: ${totalArequipeShouldHaveBeenDeducted}g`);
console.log(`Déficit Total: ${totalArequipeShouldHaveBeenDeducted - totalArequipeDeducted}g`);
