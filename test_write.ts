
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const ref = doc(db, 'products', 'copa-favorita');
    await updateDoc(ref, { description: 'test' });
    console.log('Success');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();

