import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleAuth } from 'google-auth-library';

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
    const { tokens, title, body, data } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'Tokens array is required' });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    // Obtener access token con Service Account
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging']
    });

    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    const accessToken = accessTokenResponse.token;
    
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    const projectId = serviceAccount.project_id;

    console.log(`Enviando notificación a ${tokens.length} dispositivos vía FCM V1...`);

    // Enviar a cada token usando FCM V1 API
    const results = await Promise.allSettled(
      tokens.map((token: string) =>
        fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data: data || {},
              android: { 
                priority: 'high',
                notification: {
                  sound: 'default',
                  click_action: 'FLUTTER_NOTIFICATION_CLICK'
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
            }
          })
        })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`Notificaciones enviadas con éxito: ${successCount}`);

    return res.status(200).json({ 
      success: true, 
      sent: successCount,
      total: tokens.length
    });

  } catch (error: any) {
    console.error('Error en API notify:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}
