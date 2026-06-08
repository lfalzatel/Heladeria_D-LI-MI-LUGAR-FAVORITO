import { collection, setDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

const flavors = [
  { id: 'arequipe', name: 'Arequipe' },
  { id: 'brownie', name: 'Brownie' },
  { id: 'chicle', name: 'Chicle' },
  { id: 'chocolate', name: 'Chocolate' },
  { id: 'fresa', name: 'Fresa' },
  { id: 'frutos-rojos', name: 'Frutos Rojos' },
  { id: 'mandarina', name: 'Mandarina' },
  { id: 'mango-biche', name: 'Mango Biche' },
  { id: 'maracuya', name: 'Maracuyá' },
  { id: 'nata-mani', name: 'Nata Maní' },
  { id: 'ron-pasas', name: 'Ron Pasas' },
  { id: 'vainilla', name: 'Vainilla' },
  { id: 'vainilla-chips', name: 'Vainilla Chips' },
  { id: 'vainilla-pasas', name: 'Vainilla Pasas' },
  { id: 'veteado-caramelo', name: 'Veteado de Caramelo' },
  { id: 'veteado-mora', name: 'Veteado de Mora' }
];

async function addFlavors() {
  console.log("Starting...");
  let count = 0;
  for (const flavor of flavors) {
    if (flavor.id === 'sin-helado') continue;
    const ns = {
      id: 'helado_' + flavor.id,
      name: 'Helado de ' + flavor.name,
      category: 'Helado base',
      unit: 'g',
      currentStock: 0,
      minLimit: 1000,
      minLimitUnit: 'base',
      portionsPerUnit: 1,
      stockMinimum: 1000,
      stockQuantity: 0,
      purchaseUnit: 'g',
      yieldPerSize: { mini: 80, small: 90, medium: 100, large: null },
      yieldPerUnit: 1,
      isVirtual: false
    };
    
    // Check if exists first
    const docsSnap = await getDocs(query(collection(db, 'supplies'), where('name', '==', ns.name)));
    if (docsSnap.empty) {
      await setDoc(doc(db, 'supplies', ns.id), ns);
      console.log("Added: " + ns.name);
      count++;
    } else {
      console.log("Skipping (already exists): " + ns.name);
    }
  }
  console.log(`Finished adding ${count} flavors.`);
  process.exit(0);
}
addFlavors();
