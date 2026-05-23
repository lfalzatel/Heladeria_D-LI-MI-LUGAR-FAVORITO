const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src', 'data', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

// Correcting prices
const updates = {
  "copa-favorita": { price: 16500 },
  "copa-queso": { price: 14000 },
  "dli-capricho": { price: 14000 },
  "malteada": { price: 12000 },
  "fruta-con-crema": { price: 13000 },
  "tinto": { price: 1500 },
  "aromatica": { price: 1500 },
  "perico": { price: 2000 },
  "cafe": { price: 2500 }
};

menu.products.forEach(p => {
  if (updates[p.id] && p.variants && p.variants.length > 0) {
    p.variants[0].price = updates[p.id].price;
  }
});

// Add Botella con agua
if (!menu.products.find(p => p.id === 'agua')) {
  menu.products.push({
    id: "agua",
    name: "Botella con agua",
    category: "bebidas",
    description: "Botella de agua natural.",
    requiresFlavors: false,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: null,
    variants: [{ label: "Botella con agua", price: 1500 }]
  });
}

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2), 'utf8');
console.log("menu.json prices updated locally.");
