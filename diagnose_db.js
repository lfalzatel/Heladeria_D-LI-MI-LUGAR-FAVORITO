const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Intentar leer la config de firebase de la app
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

async function diagnose() {
  console.log('--- INICIO DE AUDITORÍA DE DATOS D-LI ---');
  
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 1. Insumos
    const suppliesSnap = await getDocs(collection(db, 'supplies'));
    console.log('\n📦 INSUMOS EN APP:');
    suppliesSnap.docs.forEach(d => {
      const s = d.data();
      console.log(`- [${s.category || 'Varios'}] ${s.name} | Unit: ${s.unit} | Yield: ${s.yieldPerUnit || 'N/A'}`);
    });

    // 2. Productos y Recetas
    const productsSnap = await getDocs(collection(db, 'products'));
    console.log('\n🍦 PRODUCTOS Y RECETAS:');
    productsSnap.docs.forEach(d => {
      const p = d.data();
      console.log(`\nPRODUCTO: ${p.name}`);
      if (p.recipe && p.recipe.length > 0) {
        console.log('  -> Receta Base:');
        p.recipe.forEach((r) => console.log(`     • ${r.name}: ${r.quantity} ${r.unit}`));
      }
      if (p.variants) {
        p.variants.forEach((v) => {
          if (v.recipe && v.recipe.length > 0) {
            console.log(`  -> VARIANTE: ${v.label}`);
            v.recipe.forEach((r) => console.log(`     • ${r.name}: ${r.quantity} ${r.unit}`));
          }
        });
      }
    });

  } catch (error) {
    console.error('Error en la auditoría:', error);
  }
  
  console.log('\n--- FIN DE AUDITORÍA ---');
}

diagnose();
