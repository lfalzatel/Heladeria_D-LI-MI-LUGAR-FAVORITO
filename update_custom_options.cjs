const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src', 'data', 'menu.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

menu.products.forEach(p => {
  if (p.id === 'dli-capricho') {
    p.requiresSauces = true;
    p.sauceOptions = ["Arequipe", "Lecherita"];
    p.customOptions = [
      { id: "acompanante", name: "Acompañante", choices: ["Brownie", "Chocorramo", "Jet Wafer"], required: true }
    ];
  } else if (p.id === 'malteada') {
    p.requiresSauces = true;
    p.sauceOptions = ["Arequipe", "Lechera", "Mora", "Chocolate"];
  } else if (p.id === 'tinto') {
    p.customOptions = [
      { id: "intensidad", name: "Intensidad", choices: ["Claro", "Oscuro"], required: true },
      { id: "azucar", name: "Azúcar", choices: ["Con azúcar", "Sin azúcar"], required: true }
    ];
  } else if (p.id === 'aromatica') {
    p.customOptions = [
      { id: "tipo", name: "Tipo de Aromática", choices: ["Sobre", "Cubo"], required: true },
      { id: "azucar", name: "Azúcar", choices: ["Con azúcar", "Sin azúcar"], required: true }
    ];
  } else if (p.id === 'perico' || p.id === 'cafe') {
    p.customOptions = [
      { id: "azucar", name: "Azúcar", choices: ["Con azúcar", "Sin azúcar"], required: true }
    ];
  }
});

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2), 'utf8');
console.log("menu.json updated with customOptions.");
