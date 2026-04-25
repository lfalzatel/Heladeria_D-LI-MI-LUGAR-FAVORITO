
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function initializeSalesCount() {
  const querySnapshot = await getDocs(collection(db, 'products'));
  const promises = querySnapshot.docs.map(productDoc => {
    const data = productDoc.data();
    if (data.salesCount === undefined) {
      return updateDoc(doc(db, 'products', productDoc.id), {
        salesCount: 0
      });
    }
    return null;
  }).filter(p => p !== null);

  await Promise.all(promises);
  console.log('Sales count initialized for all products');
}

initializeSalesCount();
