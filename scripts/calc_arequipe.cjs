const fs = require('fs');

const data = JSON.parse(fs.readFileSync('dli_backup_2026-07-21.json', 'utf8'));
const orders = Object.values(data.orders || {});

let totalExplosionSold = 0;
let explosionToday = 0;

// Get today's date in string format if we can, or just look at all orders.
// Orders usually have a createdAt timestamp. We can check recent ones.
const todayStr = '2026-07-20'; // According to the user's local time metadata 2026-07-20T19:19:57

orders.forEach(order => {
  if (order.status === 'Completado' || order.status === 'completed' || !order.status) { // assuming completed orders
    const dateObj = order.createdAt ? new Date(order.createdAt.seconds * 1000) : null;
    const isToday = dateObj ? dateObj.toISOString().startsWith('2026-07-20') || dateObj.toISOString().startsWith('2026-07-21') : false;

    (order.items || []).forEach(item => {
      if (item.name && item.name.includes('Explosión')) {
        totalExplosionSold += item.quantity || 1;
        if (isToday) {
          explosionToday += item.quantity || 1;
        }
      }
    });
  }
});

console.log('Total Copas Explosión vendidas en el historial:', totalExplosionSold);
console.log('Copas Explosión vendidas "hoy" (20/21 de Julio):', explosionToday);

// We know the current stock is 4159.399...
// So the real stock if we fix ALL history vs just today:
const currentStock = 4159.4;
const deficitPerCopa = 80 - 0.08; // 79.92g

console.log('--- Cálculo de corrección ---');
console.log(`Déficit por cada Copa: ${deficitPerCopa}g no descontados.`);
console.log(`Si corregimos SOLO las de hoy (${explosionToday} copas):`);
console.log(`Restar a stock: ${explosionToday * deficitPerCopa}g`);
console.log(`Nuevo stock hoy: ${currentStock - (explosionToday * deficitPerCopa)}g`);

console.log(`Si corregimos TODO el historial (${totalExplosionSold} copas):`);
console.log(`Restar a stock: ${totalExplosionSold * deficitPerCopa}g`);
console.log(`Nuevo stock total: ${currentStock - (totalExplosionSold * deficitPerCopa)}g`);
