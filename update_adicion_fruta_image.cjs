const fs = require('fs');

const data = JSON.parse(fs.readFileSync('src/data/menu.json', 'utf8'));

const prod = data.products.find(p => p.name === 'Adición Fruta');
if (prod) {
  prod.imageUrl = 'images/products/adicion_fruta.png';
}

fs.writeFileSync('src/data/menu.json', JSON.stringify(data, null, 2));
console.log('menu.json updated with adicion_fruta.png');
