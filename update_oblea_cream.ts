import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    // 1. Update the Supply (Insumo)
    const supplyRef = doc(db, 'supplies', 'Vlive457m1cTaOBLepUT');
    await updateDoc(supplyRef, {
      unit: 'g',
      minLimit: 780
    });
    console.log('Successfully updated supply Vlive457m1cTaOBLepUT (Crema de Leche Oblea Cuchareable) to unit: "g" and minLimit: 780.');

    // 2. Update the Recipe in Oblea Cuchareable
    const productRef = doc(db, 'products', 'oblea-cuchareable');
    const productSnap = await getDoc(productRef);
    
    if (productSnap.exists()) {
      const productData = productSnap.data();
      const recipe = productData.recipe || [];
      
      let updatedRecipe = false;
      const newRecipe = recipe.map((item: any) => {
        if (item.supplyId === 'Vlive457m1cTaOBLepUT') {
          updatedRecipe = true;
          return {
            ...item,
            quantity: 183.5,
            unit: 'g'
          };
        }
        return item;
      });

      if (updatedRecipe) {
        await updateDoc(productRef, {
          recipe: newRecipe
        });
        console.log('Successfully updated the recipe for oblea-cuchareable to use 183.5g of cream.');
      } else {
        console.log('Could not find the Crema de Leche supply in the recipe array of oblea-cuchareable.');
      }
    } else {
      console.log('Product oblea-cuchareable does not exist in Firestore.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error updating documents:', err);
    process.exit(1);
  }
}

run();
