import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function run() {
  await updateDoc(doc(db, 'products', 'dli-capricho'), {
    customOptions: deleteField()
  });
  console.log('Removed from firestore');
}
run().catch(console.error);
