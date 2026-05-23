const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src', 'data', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

menu.products.forEach(p => {
  if (p.id === 'adicion-queso') p.imageUrl = '/Images/products/adicion_queso.png';
});

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2), 'utf8');
console.log("menu.json adicion_queso image updated.");
