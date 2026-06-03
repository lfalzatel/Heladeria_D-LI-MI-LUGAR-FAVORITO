import { collection, doc, setDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './src/lib/firebase';
import { Category } from './src/types';

const defaultCategories = [
  { id: 'helados', label: 'Helados', iconName: 'IceCream' },
  { id: 'ensaladas', label: 'Ensaladas', iconName: 'Apple' },
  { id: 'copas', label: 'Copas', iconName: 'Coffee' },
  { id: 'salpicon', label: 'Salpicón', iconName: 'GlassWater' },
  { id: 'bebidas-calientes', label: 'Bebidas Calientes', iconName: 'Utensils' },
  { id: 'obleas', label: 'Obleas', iconName: 'Cookie' },
  { id: 'adiciones', label: 'Adiciones Extras', iconName: 'Plus' },
];

export async function seedCategories() {
  const categoriesRef = collection(db, 'categories');
  const snap = await getDocs(categoriesRef);

  if (!snap.empty) {
    console.log('Categories already exist, skipping seed.');
    return;
  }

  console.log('Seeding categories...');
  for (let i = 0; i < defaultCategories.length; i++) {
    const cat = defaultCategories[i];
    const catDoc: Category = {
      id: cat.id,
      label: cat.label,
      iconName: cat.iconName,
      order: i,
      isActive: true,
      updatedAt: Timestamp.now()
    };
    await setDoc(doc(categoriesRef, cat.id), catDoc);
    console.log(`Created category: ${cat.label}`);
  }
  console.log('Categories seeded successfully.');
}

seedCategories().then(() => process.exit(0)).catch(console.error);
