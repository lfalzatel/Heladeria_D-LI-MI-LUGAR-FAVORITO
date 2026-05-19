import { doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

const data = {
  "products": [
    {
      "id": "cono-vaso",
      "name": "Cono o Vaso",
      "category": "helados",
      "description": "Helado artesanal Mimo's servido en cono de galleta o vaso desechable. Incluye una salsa a elegir (arequipe, mora, chocolate o lecherita) y un topping a elegir (maní o bolitas de colores). Sencillo para un antojo rápido, doble para el que no se decide.",
      "includedExtras": {
        "sauces": ["arequipe", "mora", "chocolate", "lecherita"],
        "toppings": ["maní", "bolitas de colores"],
        "note": "Cliente elige 1 salsa y 1 topping incluidos sin costo adicional"
      },
      "requiresFlavors": true,
      "requiresFruitChoice": false,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Sencillo", "price": 3500, "scoops": 1 },
        { "label": "Doble", "price": 5500, "scoops": 2 }
      ]
    },
    {
      "id": "cucurucho",
      "name": "Cucurucho",
      "category": "helados",
      "description": "El clásico en barquillo crujiente de oblea. Incluye una salsa a elegir (arequipe, mora, chocolate o lecherita) y un topping a elegir (maní o bolitas de colores). Disponible en sencillo, doble y triple.",
      "includedExtras": {
        "sauces": ["arequipe", "mora", "chocolate", "lecherita"],
        "toppings": ["maní", "bolitas de colores"],
        "note": "Cliente elige 1 salsa y 1 topping incluidos sin costo adicional"
      },
      "requiresFlavors": true,
      "requiresFruitChoice": false,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Sencillo", "price": 4000, "scoops": 1 },
        { "label": "Doble", "price": 6000, "scoops": 2 },
        { "label": "Triple", "price": 8000, "scoops": 3 }
      ]
    },
    {
      "id": "conchita",
      "name": "Conchita",
      "category": "helados",
      "description": "Helado servido en una delicada concha de oblea crujiente. Incluye una salsa a elegir (arequipe, mora, chocolate o lecherita) y un topping a elegir (maní o bolitas de colores). Disponible en sencilla, doble y triple.",
      "includedExtras": {
        "sauces": ["arequipe", "mora", "chocolate", "lecherita"],
        "toppings": ["maní", "bolitas de colores"],
        "note": "Cliente elige 1 salsa y 1 topping incluidos sin costo adicional"
      },
      "requiresFlavors": true,
      "requiresFruitChoice": false,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Sencilla", "price": 4500, "scoops": 1 },
        { "label": "Doble", "price": 6500, "scoops": 2 },
        { "label": "Triple", "price": 8500, "scoops": 3 }
      ]
    },
    {
      "id": "ensalada-frutas",
      "name": "Ensalada de Frutas",
      "category": "ensaladas",
      "description": "Mezcla de frutas frescas con queso rallado, helado Mimo's, crema de leche, lechera y barquillo. La versión Mini lleva manzana, mango, fresa, banano, papaya y uvas (sin kiwi), 1 bola de helado y 1 barquillo. Las versiones Pequeña, Mediana y Grande llevan además kiwi, 2 bolas de helado y barquillo.",
      "includedExtras": {
        "sauces": [],
        "toppings": [],
        "note": "No incluye salsas ni toppings por defecto. Las adiciones son opcionales y tienen costo adicional."
      },
      "requiresFlavors": true,
      "requiresFruitChoice": false,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Mini", "price": 10000, "scoops": 1 },
        { "label": "Pequeña", "price": 17000, "scoops": 2 },
        { "label": "Mediana", "price": 22000, "scoops": 2 },
        { "label": "Grande", "price": 27000, "scoops": 2 }
      ]
    },
    {
      "id": "copa-salpicon",
      "name": "Copa de Salpicón",
      "category": "salpicon",
      "description": "Refrescante salpicón de banano, papaya y fruta fresca (fresa o mango) con queso rallado, helado Mimo's a elección, lechera y barquillo. Servido en copa.",
      "requiresFlavors": true,
      "requiresFruitChoice": false,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Copa Salpicón", "price": 11000, "scoops": 1 }
      ]
    },
    {
      "id": "vaso-salpicon",
      "name": "Vaso de Salpicón con Helado",
      "category": "salpicon",
      "description": "Frutas frescas (banano, papaya y mango o fresa) con helado Mimo's, lechera y barquillo, servidas en vaso para llevar. Sin queso incluido — puede agregarse como adición. Las adiciones extras tienen costo adicional.",
      "requiresFlavors": true,
      "requiresFruitChoice": false,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Pequeño", "price": 7000, "scoops": 1 },
        { "label": "Mediano", "price": 9000, "scoops": 1 },
        { "label": "Grande", "price": 11000, "scoops": 1 }
      ]
    },
    {
      "id": "copa-dli",
      "name": "Copa D'LI",
      "category": "copas",
      "description": "Nuestra copa insignia. Base generosa de arequipe, 3 bolas de helado Mimo's a elección, queso rallado, chantilly y cucurucho. Bañada con salsa de arequipe. Sin toppings secos adicionales.",
      "requiresFlavors": true,
      "requiresFruitChoice": false,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Copa D'LI", "price": 13000, "scoops": 3 }
      ]
    },
    {
      "id": "copa-explosion",
      "name": "Copa Explosión de Sabores",
      "category": "copas",
      "description": "Para los verdaderos amantes del helado. Base de arequipe, 7 sabores de helado Mimo's a elección, cubiertos con chantilly y barquillo. Bañada con salsa de arequipe. Grande, vistosa e irresistible.",
      "requiresFlavors": true,
      "requiresFruitChoice": false,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Copa Explosión", "price": 16000, "scoops": 7 }
      ]
    },
    {
      "id": "oblea-tradicional",
      "name": "Oblea Tradicional",
      "category": "obleas",
      "description": "Dos crujientes obleas de maíz unidas con arequipe, crema y queso. La versión con fruta añade fresa, mango o durazno fresco. Sin salsas líquidas incluidas — solo los ingredientes clásicos que la hacen irresistible.",
      "requiresFlavors": false,
      "requiresFruitChoice": true,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Arequipe, crema y queso", "price": 6000 },
        { "label": "Arequipe, crema, queso y fruta", "price": 9000 }
      ]
    },
    {
      "id": "oblea-cuchareable",
      "name": "Oblea Cuchareable",
      "category": "obleas",
      "description": "Versión moderna de la oblea para disfrutar con cuchara. Trozos de oblea crujiente mezclados con arequipe, queso, crema de leche, fruta fresca (fresa, mango o durazno) y chantilly. Decorada con trozos de oblea y arequipe extra encima. También disponible con una bola de helado Mimo's.",
      "requiresFlavors": true,
      "requiresFruitChoice": true,
      "isActive": true,
      "imageUrl": null,
      "variants": [
        { "label": "Sin helado", "price": 13000, "scoops": 0 },
        { "label": "Con helado", "price": 15000, "scoops": 1 }
      ]
    }
  ],
  "icecreamFlavors": [
    { "id": "fresa", "name": "Fresa", "isAvailable": true },
    { "id": "chicle", "name": "Chicle", "isAvailable": true },
    { "id": "brownie", "name": "Brownie", "isAvailable": true },
    { "id": "vainilla", "name": "Vainilla", "isAvailable": true },
    { "id": "arequipe", "name": "Arequipe", "isAvailable": true },
    { "id": "maracuya", "name": "Maracuyá", "isAvailable": true },
    { "id": "chocolate", "name": "Chocolate", "isAvailable": true },
    { "id": "mandarina", "name": "Mandarina", "isAvailable": true },
    { "id": "nata-mani", "name": "Nata Maní", "isAvailable": true },
    { "id": "ron-pasas", "name": "Ron Pasas", "isAvailable": true },
    { "id": "mango-biche", "name": "Mango Biche", "isAvailable": true },
    { "id": "frutos-rojos", "name": "Frutos Rojos", "isAvailable": true },
    { "id": "vainilla-chips", "name": "Vainilla Chips", "isAvailable": true },
    { "id": "vainilla-pasas", "name": "Vainilla Pasas", "isAvailable": true },
    { "id": "veteado-mora", "name": "Veteado de Mora", "isAvailable": true },
    { "id": "veteado-caramelo", "name": "Veteado de Caramelo", "isAvailable": true }
  ],
  "tables": [
    { "id": "1", "label": "Mesa 1", "status": "free", "openedAt": null, "currentCartSnapshot": null },
    { "id": "2", "label": "Mesa 2", "status": "free", "openedAt": null, "currentCartSnapshot": null },
    { "id": "3", "label": "Mesa 3", "status": "free", "openedAt": null, "currentCartSnapshot": null }
  ]
};

async function updateData() {
  console.log("Iniciando actualización de datos...");

  // Actualizar productos
  for (const product of data.products) {
    const docRef = doc(db, 'products', product.id);
    await setDoc(docRef, product, { merge: true });
    console.log(`Producto actualizado: ${product.name}`);
  }

  // Actualizar sabores
  for (const flavor of data.icecreamFlavors) {
    const docRef = doc(db, 'icecreamFlavors', flavor.id);
    await setDoc(docRef, flavor, { merge: true });
    console.log(`Sabor actualizado: ${flavor.name}`);
  }

  // Actualizar mesas
  for (const table of data.tables) {
    const docRef = doc(db, 'tables', table.id);
    await setDoc(docRef, table, { merge: true });
    console.log(`Mesa actualizada: ${table.label}`);
  }

  console.log("¡Actualización completada!");
}

updateData().catch(console.error);
