
import fs from 'fs';

const menuPath = './src/data/menu.json';
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

const helado = { supplyId: '6wY8QFazQNFhy0ABmTQh', name: 'helado', quantity: 1, unit: 'und' };
const salsa = { supplyId: 'uOU7jJwk3v9b2OEQhlBk', name: 'Salsa', quantity: 1, unit: 'porción' };
const toppings = { supplyId: 'rb3qDHM3r7c46gAgAD9c', name: 'Toppings', quantity: 1, unit: 'porción' };
const servilletaCono = { supplyId: 'GVzW5WJVA3Fzb017lsQL', name: 'Servilletas para Conos', quantity: 1, unit: 'Paquete' };

const cucuruchoBase = [
  { supplyId: 'yGJIo16EOdpC10Fjbzs9', name: 'Cucuruchos', quantity: 1, unit: 'und' },
  servilletaCono, salsa, toppings
];
const conoBase = [
  { supplyId: 'Zn0HGZ9pBrCLdhnPEc7S', name: 'Conos', quantity: 1, unit: 'und' },
  servilletaCono, salsa, toppings
];
const conchitaBase = [
  { supplyId: 'xxe4z3w0ji3J5vFrRQYr', name: 'Conchitas', quantity: 1, unit: 'und' },
  servilletaCono, salsa, toppings
];

menu.products.forEach(p => {
  if (p.name === 'Cucurucho') {
    p.variants.forEach(v => {
      v.recipe = [...cucuruchoBase, { ...helado, quantity: v.scoops }];
    });
  }
  if (p.name === 'Cono') {
    p.variants.forEach(v => {
      v.recipe = [...conoBase, { ...helado, quantity: v.scoops }];
    });
  }
  if (p.name === 'Conchita') {
    p.variants.forEach(v => {
      const scoops = v.label === 'Sencilla' ? 1 : v.label === 'Doble' ? 2 : 3;
      v.recipe = [...conchitaBase, { ...helado, quantity: scoops }];
    });
  }
  if (p.name === 'Vaso') {
    p.variants.forEach(v => {
      const scoops = v.label === 'Sencillo' ? 1 : 2;
      const vaso = scoops === 1 
        ? { supplyId: 'po8wRQbsZTpCFAV6j6LO', name: 'Vasos 7 ONZ', quantity: 1, unit: 'und' }
        : { supplyId: 'FXmLB3gV5ar51UbPnZgp', name: 'Vasos 10 ONZ', quantity: 1, unit: 'und' };
      const tapa = scoops === 1
        ? { supplyId: '1aeTwgz5tOMxdLSQ3aGV', name: 'Tapas vasos 7 ONZ', quantity: 1, unit: 'und' }
        : { supplyId: 's2XVzIPeFC3sW9yCqkLi', name: 'Tapas vasos 10 ONZ', quantity: 1, unit: 'und' };

      v.recipe = [
        vaso, 
        tapa,
        { supplyId: 'xW74Gmt0srs3pUu5Y4Xi', name: 'Cuchara Pequeña', quantity: 1, unit: 'und' },
        { supplyId: 'j6uusMRF7v5MKxzS0rQy', name: 'Servilletas', quantity: 1, unit: 'und' },
        salsa, toppings,
        { ...helado, quantity: scoops }
      ];
    });
  }
});

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2));
console.log('Fixed variants!');

