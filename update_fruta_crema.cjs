const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src', 'data', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

menu.products.forEach(p => {
  if (p.id === 'fruta-con-crema') {
    p.requiresSauces = true;
    p.fruitOptions = ["Fresa", "Mango", "Durazno", "Mixta"];
  }
});

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2), 'utf8');
console.log("menu.json fruta-con-crema updated.");
