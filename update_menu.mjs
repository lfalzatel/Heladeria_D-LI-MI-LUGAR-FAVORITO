import fs from 'fs';

const menuPath = './src/data/menu.json';
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

const updates = {
  'Copa Favorita': {
    description: 'Copa de helado con dos sabores a elección, fresas, kiwi y durazno (a elección), arequipe, queso, chantilly y barquillo.',
    recipe: [
      { supplyId: '6wY8QFazQNFhy0ABmTQh', name: 'Helado', quantity: 2, unit: 'por' },
      { supplyId: '1iHkGY7x8hP3aPpSsTiF', name: 'Fresa', quantity: 1, unit: 'por' },
      { supplyId: 'o97hn4XJ0WInMW8mHLay', name: 'Kiwi', quantity: 1, unit: 'por' },
      { supplyId: 'G06SiLwcEafPShAjF5Lk', name: 'Durazno', quantity: 1, unit: 'por' },
      { supplyId: 'EzgWSO8MusrXfaAt9XhV', name: 'Arequipe', quantity: 1, unit: 'por' },
      { supplyId: 'rp58vljdMGtvlq1QPI1z', name: 'Queso', quantity: 1, unit: 'por' },
      { supplyId: 'fOUftWtgphnmRHdvEQ04', name: 'Chantilly', quantity: 1, unit: 'por' },
      { supplyId: '4W3Z9a8JkmgfQJFjvMBY', name: 'Barquillos', quantity: 1, unit: 'por' },
      { supplyId: 'W7tXHvoU7mFmfAc8x2Dv', name: 'Cucharas pequeñas', quantity: 1, unit: 'por' },
      { supplyId: 'j6uusMRF7v5MKxzS0rQy', name: 'Servilletas', quantity: 1, unit: 'por' }
    ]
  },
  'Copa Queso': {
    description: 'Copa de helado con dos sabores a elección, lecherita, doble porción de queso, chantilly y barquillo.',
    recipe: [
      { supplyId: '6wY8QFazQNFhy0ABmTQh', name: 'Helado', quantity: 2, unit: 'por' },
      { supplyId: 'CiZcLsMlleKivYXP3aaq', name: 'Lechera', quantity: 1, unit: 'por' },
      { supplyId: 'rp58vljdMGtvlq1QPI1z', name: 'Queso', quantity: 2, unit: 'por' },
      { supplyId: 'fOUftWtgphnmRHdvEQ04', name: 'Chantilly', quantity: 1, unit: 'por' },
      { supplyId: '4W3Z9a8JkmgfQJFjvMBY', name: 'Barquillos', quantity: 1, unit: 'por' },
      { supplyId: 'W7tXHvoU7mFmfAc8x2Dv', name: 'Cucharas pequeñas', quantity: 1, unit: 'por' },
      { supplyId: 'j6uusMRF7v5MKxzS0rQy', name: 'Servilletas', quantity: 1, unit: 'por' }
    ]
  },
  'Copa de Salpicón': {
    description: "Refrescante salpicón con banano y papaya, base de fruta a elección (fresa o mango), queso rallado, una bola de helado Mimo's, lechera y barquillo.",
    recipe: [
      { supplyId: 'RlEJxlSvmDxeAmHX3vSs', name: 'Banano', quantity: 1, unit: 'por' },
      { supplyId: 'Ugnw0DsBnGE3CYpTGm1x', name: 'Papaya', quantity: 1, unit: 'por' },
      { supplyId: 'YzC6Lh3PQssKLIVvzVFZ', name: 'Fruta', quantity: 1, unit: 'por' },
      { supplyId: 'rp58vljdMGtvlq1QPI1z', name: 'Queso', quantity: 1, unit: 'por' },
      { supplyId: '6wY8QFazQNFhy0ABmTQh', name: 'Helado', quantity: 1, unit: 'por' },
      { supplyId: 'CiZcLsMlleKivYXP3aaq', name: 'Lechera', quantity: 1, unit: 'por' },
      { supplyId: '4W3Z9a8JkmgfQJFjvMBY', name: 'Barquillos', quantity: 1, unit: 'por' },
      { supplyId: 'W7tXHvoU7mFmfAc8x2Dv', name: 'Cucharas pequeñas', quantity: 1, unit: 'por' },
      { supplyId: 'j6uusMRF7v5MKxzS0rQy', name: 'Servilletas', quantity: 1, unit: 'por' }
    ]
  },
  "D'LI Capricho": {
    description: 'Copa de helado con dos sabores a elección, brownie, arequipe, chantilly y barquillo.',
    recipe: [
      { supplyId: '6wY8QFazQNFhy0ABmTQh', name: 'Helado', quantity: 2, unit: 'por' },
      { supplyId: 'mtVxskso6RCadP9Es6XZ', name: 'Brownie', quantity: 1, unit: 'por' },
      { supplyId: 'EzgWSO8MusrXfaAt9XhV', name: 'Arequipe', quantity: 1, unit: 'por' },
      { supplyId: 'fOUftWtgphnmRHdvEQ04', name: 'Chantilly', quantity: 1, unit: 'por' },
      { supplyId: '4W3Z9a8JkmgfQJFjvMBY', name: 'Barquillos', quantity: 1, unit: 'por' },
      { supplyId: 'W7tXHvoU7mFmfAc8x2Dv', name: 'Cucharas pequeñas', quantity: 1, unit: 'por' },
      { supplyId: 'j6uusMRF7v5MKxzS0rQy', name: 'Servilletas', quantity: 1, unit: 'por' }
    ]
  },
  'Fruta con crema': {
    description: 'Porción de fresa, mango y durazno a tu elección acompañada de nuestra deliciosa crema.',
    recipe: [
      { supplyId: '1iHkGY7x8hP3aPpSsTiF', name: 'Fresa', quantity: 1, unit: 'por' },
      { supplyId: 'BShilodzthyQJkHi2riC', name: 'Mango', quantity: 1, unit: 'por' },
      { supplyId: 'G06SiLwcEafPShAjF5Lk', name: 'Durazno', quantity: 1, unit: 'por' },
      { supplyId: 'DeIL9YPHY4wn2r6xLjDE', name: 'Crema de Leche Ensaladas', quantity: 1, unit: 'por' },
      { supplyId: 'W7tXHvoU7mFmfAc8x2Dv', name: 'Cucharas pequeñas', quantity: 1, unit: 'por' },
      { supplyId: 'j6uusMRF7v5MKxzS0rQy', name: 'Servilletas', quantity: 1, unit: 'por' }
    ]
  },
  'Malteada': {
    description: 'Deliciosa malteada preparada con un sabor de helado artesanal, leche y salsa a elegir.',
    recipe: [
      { supplyId: '6wY8QFazQNFhy0ABmTQh', name: 'Helado', quantity: 1, unit: 'por' },
      { supplyId: 'QiSGiB8rBXXNvMkuOq3C', name: 'Leche deslactosada', quantity: 1, unit: 'por' },
      { supplyId: 'uOU7jJwk3v9b2OEQhlBk', name: 'Salsa', quantity: 1, unit: 'por' },
      { supplyId: 'W7tXHvoU7mFmfAc8x2Dv', name: 'Cucharas pequeñas', quantity: 1, unit: 'por' },
      { supplyId: 'j6uusMRF7v5MKxzS0rQy', name: 'Servilletas', quantity: 1, unit: 'por' }
    ]
  },
  'Vaso de Salpicón con Helado': {
    description: "Salpicón con banano y papaya, base de fruta a elección (fresa o mango) con una bola de helado Mimo's, lechera y barquillo. Servido en vaso para llevar. (Sin queso).",
    recipe: [
      { supplyId: 'RlEJxlSvmDxeAmHX3vSs', name: 'Banano', quantity: 1, unit: 'por' },
      { supplyId: 'Ugnw0DsBnGE3CYpTGm1x', name: 'Papaya', quantity: 1, unit: 'por' },
      { supplyId: 'YzC6Lh3PQssKLIVvzVFZ', name: 'Fruta', quantity: 1, unit: 'por' },
      { supplyId: '6wY8QFazQNFhy0ABmTQh', name: 'Helado', quantity: 1, unit: 'por' },
      { supplyId: 'CiZcLsMlleKivYXP3aaq', name: 'Lechera', quantity: 1, unit: 'por' },
      { supplyId: '4W3Z9a8JkmgfQJFjvMBY', name: 'Barquillos', quantity: 1, unit: 'por' },
      { supplyId: 'VckYsY5I7V64eSh8uXsz', name: 'Vasos 13 ONZ', quantity: 1, unit: 'por' },
      { supplyId: 'Mfh6bESEfhfADxYf613O', name: 'Tapas Vaso 13, 14 y 16 ONZ', quantity: 1, unit: 'por' },
      { supplyId: 'W7tXHvoU7mFmfAc8x2Dv', name: 'Cucharas pequeñas', quantity: 1, unit: 'por' },
      { supplyId: 'j6uusMRF7v5MKxzS0rQy', name: 'Servilletas', quantity: 1, unit: 'por' }
    ]
  }
};

for (const product of menu.products) {
  if (updates[product.name]) {
    product.description = updates[product.name].description;
    product.recipe = updates[product.name].recipe;
    console.log('Updated', product.name);
  }
}

fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2));
console.log('Done.');
