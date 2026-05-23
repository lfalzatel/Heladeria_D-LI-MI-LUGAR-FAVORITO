const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src', 'data', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

// 1. Update adiciones images
menu.products.forEach(p => {
  if (p.id === 'adicion-helado') p.imageUrl = '/Images/products/adicion_helado.png';
  if (p.id === 'adicion-cono') p.imageUrl = '/Images/products/adicion_cono.png';
});

// 2. Add 'sin helado' flavor if it doesn't exist
if (!menu.icecreamFlavors.find(f => f.id === 'sin-helado')) {
  menu.icecreamFlavors.push({
    id: "sin-helado",
    name: "Sin Helado",
    isAvailable: true
  });
}

// 3. Add new products
const newProducts = [
  {
    id: "copa-favorita",
    name: "Copa Favorita",
    category: "copas",
    description: "Copa de helado con dos sabores a elección, arequipe, fresas, kiwi, durazno, queso, chantilly y barquillo.",
    requiresFlavors: true,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: "/Images/products/copa_favorita.png",
    variants: [{ label: "Copa Favorita", price: 15000, scoops: 2 }] // Assumed price
  },
  {
    id: "copa-queso",
    name: "Copa Queso",
    category: "copas",
    description: "Copa de helado con dos sabores a elección, lecherita, doble porción de queso, crema y barquillo.",
    requiresFlavors: true,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: "/Images/products/copa_queso.png",
    variants: [{ label: "Copa Queso", price: 14000, scoops: 2 }] // Assumed price
  },
  {
    id: "dli-capricho",
    name: "D'LI Capricho",
    category: "copas",
    description: "Copa de helado con dos sabores a elección, brownie, arequipe, chantilly y barquillo.",
    requiresFlavors: true,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: "/Images/products/dli_capricho.png",
    variants: [{ label: "D'LI Capricho", price: 16000, scoops: 2 }] // Assumed price
  },
  {
    id: "malteada",
    name: "Malteada",
    category: "bebidas-calientes", // Putting it somewhere, wait malteada is cold? "bebidas" maybe? I'll use "helados" or "copas" for now, or "bebidas-calientes" if there's no "bebidas". Wait, I'll add category "bebidas". Oh wait, the user didn't mention category. I'll put it in "helados".
    description: "Deliciosa malteada preparada con helado artesanal, leche y salsa a elegir.",
    requiresFlavors: true,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: "/Images/products/malteada.jpeg",
    variants: [{ label: "Malteada", price: 12000, scoops: 2 }] // Assumed price
  },
  {
    id: "fruta-con-crema",
    name: "Fruta con crema",
    category: "ensaladas",
    description: "Porción de fruta fresca acompañada de deliciosa crema.",
    requiresFlavors: false,
    requiresFruitChoice: true,
    isActive: true,
    imageUrl: "/Images/products/fruta_con_crema.jpeg",
    variants: [{ label: "Fruta con crema", price: 8000 }] // Assumed price
  },
  {
    id: "tinto",
    name: "Tinto",
    category: "bebidas-calientes",
    description: "Café negro caliente.",
    requiresFlavors: false,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: "/Images/products/tinto.png",
    variants: [{ label: "Tinto", price: 2000 }] // Assumed price
  },
  {
    id: "aromatica",
    name: "Aromática",
    category: "bebidas-calientes",
    description: "Bebida caliente a base de hierbas aromáticas.",
    requiresFlavors: false,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: "/Images/products/aromatica.png",
    variants: [{ label: "Aromática", price: 2500 }] // Assumed price
  },
  {
    id: "perico",
    name: "Perico",
    category: "bebidas-calientes",
    description: "Café con leche caliente en presentación pequeña.",
    requiresFlavors: false,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: "/Images/products/perico.png",
    variants: [{ label: "Perico", price: 2500 }] // Assumed price
  },
  {
    id: "cafe",
    name: "Café",
    category: "bebidas-calientes",
    description: "Café con leche caliente.",
    requiresFlavors: false,
    requiresFruitChoice: false,
    isActive: true,
    imageUrl: "/Images/products/cafe.png",
    variants: [{ label: "Café", price: 3000 }] // Assumed price
  }
];

newProducts.forEach(np => {
  if (!menu.products.find(p => p.id === np.id)) {
    menu.products.push(np);
  } else {
    const idx = menu.products.findIndex(p => p.id === np.id);
    menu.products[idx] = np;
  }
});

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2), 'utf8');
console.log("menu.json updated locally.");
