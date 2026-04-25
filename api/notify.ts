import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Esta función se encarga de enviar notificaciones a múltiples tokens
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { tokens, title, body, data } = req.body;

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ message: 'Se requieren tokens válidos' });
  }

  try {
    // Inicializar Firebase Admin si no está inicializado
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount)
      });
    }

    const messaging = getMessaging();

    const message = {
      notification: {
        title: title || "D'LI Heladería",
        body: body || "Nueva actualización"
      },
      data: data || {},
      tokens: tokens,
    };

    // Enviar mensajes a todos los dispositivos
    const response = await messaging.sendEachForMulticast(message);
    
    console.log('Resultado del envío:', response.successCount, 'mensajes enviados con éxito');
    
    return res.status(200).json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}
