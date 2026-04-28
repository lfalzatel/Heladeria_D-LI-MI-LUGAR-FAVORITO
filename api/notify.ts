import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', error);
  }
}

const messaging = admin.messaging();
const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tokens, title, body, data, target } = req.body;
    let targetTokens = tokens || [];

    if (target === 'admins') {
      const snapshot = await db.collection('users')
        .where('role', 'in', ['admin', 'propietario', 'vendedor'])
        .get();
      
      const allTokens: string[] = [];
      snapshot.forEach(doc => {
        const userTokens = doc.data().fcmTokens || [];
        if (Array.isArray(userTokens)) allTokens.push(...userTokens);
      });
      targetTokens = [...new Set(allTokens)];
    }

    if (targetTokens.length === 0) {
      return res.status(200).json({ 
        success: true, 
        sent: 0, 
        tokensFound: 0,
        message: 'No tokens found for target' 
      });
    }

    const response = await messaging.sendEachForMulticast({
      tokens: targetTokens,
      notification: { title, body },
      data: data || {},
      android: {
        priority: 'high',
        notification: { sound: 'default' }
      },
      apns: {
        payload: { aps: { sound: 'default', contentAvailable: true } }
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200]
        }
      }
    });

    // Limpieza automática de tokens inválidos
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error as any;
          if (
            error?.code === 'messaging/registration-token-not-registered' ||
            error?.code === 'messaging/invalid-registration-token'
          ) {
            tokensToRemove.push(targetTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        console.log(`Limpiando ${tokensToRemove.length} tokens inválidos...`);
        // Buscar y eliminar estos tokens de todos los usuarios
        const usersSnap = await db.collection('users').get();
        const batch = db.batch();
        
        usersSnap.forEach(userDoc => {
          const userData = userDoc.data();
          const currentTokens = userData.fcmTokens || [];
          const newTokens = currentTokens.filter((t: string) => !tokensToRemove.includes(t));
          
          if (newTokens.length !== currentTokens.length) {
            batch.update(userDoc.ref, { fcmTokens: newTokens });
          }
        });
        
        await batch.commit();
      }
    }

    return res.status(200).json({ 
      success: true, 
      sent: response.successCount,
      failed: response.failureCount,
      tokensFound: targetTokens.length,
      results: response.responses.map(r => r.success)
    });

  } catch (error: any) {
    console.error('Error en API notify:', error);
    return res.status(500).json({ error: error.message });
  }
}
