import { collection, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

async function diagnose() {
  const productsSnap = await getDocs(collection(db, 'products'));
  console.log("DIAGNOSTICO DE PRODUCTOS EN FIRESTORE:");
  productsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Nombre: ${data.name} | Image: ${data.imageUrl}`);
  });
}

diagnose();
