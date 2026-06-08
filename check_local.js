
const fs = require('fs');
const menu = JSON.parse(fs.readFileSync('./src/data/menu.json', 'utf8'));
const products = menu.products;
const missing = products.filter(p => !p.recipe || p.recipe.length === 0).map(p => p.name);
console.log('Productos sin receta en menu.json:');
missing.forEach(m => console.log('- ' + m));

