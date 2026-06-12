const fs = require('fs');
const path = './src/data/menu.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const recipeMap = {
  "Oblea Cuchareable": "Base Oblea Cuchareable:\n- Crema ensalada 200 gr\n- Crema oblea 500 gr\n- Azúcar pulverizada 20 gr\n- Lecherita 50 gr\n\nCantidades específicas:\n- Helado: 80 GR\n- Queso: Dos cucharadas (200 GR)\n- Porción de Durazno (si aplica): Mini (mixta) o Pequeña (dos porciones si es solo durazno)",
  "Oblea Tradicional": "Base Oblea Tradicional:\n- Crema oblea 500 gr\n- Si está muy espesa agregar crema ensalada 200 gr\n- Azúcar pulverizada 50 gr\n- Lecherita 50 gr\n\nCantidades:\n- Queso: Cucharada y media (150 GR)\n- Porción de Durazno (si aplica): Mini (mixta) o Mediana (si es solo durazno)",
  "Fruta con crema": "Base Crema:\n- Crema oblea 500 gr\n- Si está muy espesa agregar crema ensalada 200 gr\n- Azúcar pulverizada 50 gr\n- Lecherita 50 gr\n\nCantidades:\n- Porción de Durazno (si aplica): Mini (mixta) o Pequeña (dos porciones si es solo durazno)",
  "Ensalada de Frutas": "Cantidades según tamaño:\n- MINI: Helado 80 GR | Queso: Una Cucharada (50 GR)\n- PEQUEÑA: Queso: Cucharada y media (150 GR)\n- MEDIANA: Queso: Dos cucharadas (200 GR)\n- GRANDE: Queso: Dos cucharadas y media (250 GR)",
  "Copa de Salpicón": "Base Jugo Salpicón:\n- Sabor Fresa: Agua 500 gr, Fresa 200 gr, Polvo fresa 2gr\n- Sabor Mango: Agua 750 gr, Mango 200 gr, Polvo mango 2gr\n\nCantidades:\n- Helado: 80 GR\n- Queso: Una Cucharada (50 GR)",
  "Copa D'LI": "Cantidades específicas:\n- Helado: 80 GR (por sabor)\n- Queso: Una Cucharada (50 GR)",
  "Copa Favorita": "Cantidades específicas:\n- Helado: 90 GR (por sabor)\n- Queso: Una Cucharada (50 GR)\n- Porción de Durazno: Mini",
  "Copa Queso": "Cantidades específicas:\n- Helado: 90 GR (por sabor)\n- Queso: Dos cucharadas (200 GR)",
  "D'LI Capricho": "Cantidades específicas:\n- Helado: 90 GR (por sabor)",
  "Cono": "Cantidades específicas:\n- Helado: 100 GR (por bola)",
  "Cucurucho": "Cantidades específicas:\n- Helado: 100 GR (por bola)",
  "Conchita": "Cantidades específicas:\n- Helado: 100 GR (por bola)",
  "Vaso": "Cantidades específicas:\n- Helado: 100 GR (por bola)",
  "Adición Queso": "Cantidades específicas:\n- Queso: Cucharada y media (150 GR)",
  "Adición Chantilly": "Preparación Chantilly:\n- Crema ensalada 500 gr\n- Azúcar pulverizada 50 gr\n- Esencia de vainilla (Chorrito)",
  "Adición Fruta": "Cantidades específicas:\n- Las adiciones de fruta van con la cuchara verde (PORCIÓN MEDIANA)",
  "Vaso de Salpicón con Helado": "Base Jugo Salpicón:\n- Sabor Fresa: Agua 500 gr, Fresa 200 gr, Polvo fresa 2gr\n- Sabor Mango: Agua 750 gr, Mango 200 gr, Polvo mango 2gr\n\nCantidades:\n- Helado: 80 GR"
};

data.products = data.products.map(p => {
  if (recipeMap[p.name]) {
    p.recipeDescription = recipeMap[p.name];
  }
  return p;
});

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Recetas actualizadas con éxito!');
