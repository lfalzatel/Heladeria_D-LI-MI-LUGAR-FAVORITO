import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Inicializar Firebase Admin si no ha sido inicializado
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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens, title, body, data, target } = req.body;

    let targetTokens = tokens;

    // Si el target es 'admins', buscamos los tokens en Firestore desde el servidor
    if (target === 'admins') {
      console.log('Buscando tokens de administradores/vendedores...');
      const snapshot = await db.collection('users')
        .where('role', 'in', ['admin', 'propietario', 'vendedor'])
        .get();
      
      const allTokens: string[] = [];
      snapshot.forEach(doc => {
        const userTokens = doc.data().fcmTokens || [];
        if (Array.isArray(userTokens)) {
          allTokens.push(...userTokens);
        }
      });
      targetTokens = [...new Set(allTokens)];
    }

    if (!targetTokens || !Array.isArray(targetTokens) || targetTokens.length === 0) {
      return res.status(200).json({ 
        success: true, 
        sent: 0, 
        message: 'No tokens found to notify' 
      });
    }

    console.log(`Enviando notificación a ${targetTokens.length} dispositivos...`);

    // Enviar notificaciones
    // Usamos sendEachForMulticast para eficiencia
    const response = await messaging.sendEachForMulticast({
      tokens: targetTokens,
      notification: { title, body },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true
          }
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png'
        }
      }
    });

    console.log(`Notificaciones enviadas: ${response.successCount}, Fallidas: ${response.failureCount}`);

    return res.status(200).json({ 
      success: true, 
      sent: response.successCount,
      total: targetTokens.length,
      failures: response.failureCount
    });

  } catch (error: any) {
    console.error('Error en API notify:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}
