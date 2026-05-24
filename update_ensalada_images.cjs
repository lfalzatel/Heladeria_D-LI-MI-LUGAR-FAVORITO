const fs = require('fs');

const data = JSON.parse(fs.readFileSync('src/data/menu.json', 'utf8'));

const prod = data.products.find(p => p.name === 'Ensalada de Frutas');
if (prod) {
  prod.imageUrl = '/Images/products/ensalada-frutas-pequeña.jpeg';
  if (prod.variants) {
    const mini = prod.variants.find(v => v.label === 'Mini');
    if (mini) mini.imageUrl = '/Images/products/ensalada-frutas-mini.jpeg';
    
    const pequena = prod.variants.find(v => v.label === 'Pequeña');
    if (pequena) pequena.imageUrl = '/Images/products/ensalada-frutas-pequeña.jpeg';
    
    const mediana = prod.variants.find(v => v.label === 'Mediana');
    if (mediana) mediana.imageUrl = '/Images/products/ensalada-frutas-mediana.png';
    
    const grande = prod.variants.find(v => v.label === 'Grande');
    if (grande) grande.imageUrl = '/Images/products/ensalada-frutas-grande.png';
  }
}

fs.writeFileSync('src/data/menu.json', JSON.stringify(data, null, 2));
console.log('menu.json updated with ensalada de frutas variant images');
