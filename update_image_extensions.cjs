const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src', 'data', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

menu.products.forEach(p => {
  if (p.id === 'malteada') p.imageUrl = '/Images/products/malteada.png';
  if (p.id === 'fruta-con-crema') p.imageUrl = '/Images/products/fruta_con_crema.png';
});

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2), 'utf8');
console.log("menu.json extensions updated.");
