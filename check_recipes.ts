import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const suppliesSnap = await getDocs(collection(db, 'supplies'));
  const supplies = suppliesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const productsSnap = await getDocs(collection(db, 'products'));
  const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  let missingRecipes = [];
  let productsWithMargins = [];

  for (const p of products) {
    if (!p.recipe || p.recipe.length === 0) {
      missingRecipes.push(p.name);
    } else {
      let estimatedCost = 0;
      for (const ing of p.recipe) {
        const supply = supplies.find(s => s.id === ing.supplyId);
        if (supply && supply.lastPurchasePrice && supply.yieldPerUnit) {
          const costPerPortion = supply.lastPurchasePrice / supply.yieldPerUnit;
          estimatedCost += costPerPortion * ing.quantity;
        }
      }
      const profit = p.price - estimatedCost;
      const marginPct = p.price > 0 ? (profit / p.price) * 100 : 0;
      
      productsWithMargins.push({
        name: p.name,
        price: p.price,
        cost: estimatedCost,
        profit: profit,
        marginPct: marginPct.toFixed(1) + '%'
      });
    }
  }

  let report = '# Reporte de Recetas\n\n';
  report += '## Productos SIN receta configurada:\n';
  missingRecipes.forEach(name => {
    report += '- ' + name + '\n';
  });

  report += '\n## Productos CON receta y sus márgenes:\n';
  report += '| Producto | Precio Venta | Costo Prod | Ganancia | Margen % |\n';
  report += '|---|---|---|---|---|\n';
  productsWithMargins.sort((a,b) => a.cost - b.cost).forEach(p => {
    report += `| ${p.name} | $${p.price} | $${p.cost.toFixed(0)} | $${p.profit.toFixed(0)} | ${p.marginPct} |\n`;
  });

  fs.writeFileSync('reporte_recetas.md', report);
  console.log('Reporte generado en reporte_recetas.md');
  process.exit(0);
}
run();
