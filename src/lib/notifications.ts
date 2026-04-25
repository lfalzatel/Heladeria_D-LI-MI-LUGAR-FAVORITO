import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';

// IMPORTANTE: Debes obtener esta clave desde la Consola de Firebase -> Cloud Messaging -> Web Configuration
const VAPID_KEY = "TU_VAPID_KEY_AQUI"; 

export async function requestNotificationPermission(userId: string) {
  try {
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones de escritorio');
      return;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const messaging = getMessaging();
      
      // Obtener el token de registro de FCM
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (currentToken) {
        console.log('Token FCM obtenido:', currentToken);
        
        // Guardar el token en el perfil del usuario en Firestore
        // Usamos arrayUnion para no borrar tokens de otros dispositivos
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        });
        
        return currentToken;
      } else {
        console.warn('No se pudo obtener el token. Asegúrate de que las notificaciones estén permitidas.');
      }
    }
  } catch (error) {
    console.error('Error al configurar notificaciones:', error);
  }
}

// Escuchar mensajes cuando la app está abierta (Primer plano)
export function listenToForegroundMessages() {
  try {
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      console.log('Mensaje recibido en primer plano:', payload);
      
      // Mostrar una notificación visual personalizada (Sonner)
      toast.info(payload.notification?.title || "Nueva notificación", {
        description: payload.notification?.body,
        duration: 5000,
      });

      // Si quieres que suene algo:
      const audio = new Audio('/notification-sound.mp3'); // Opcional
      audio.play().catch(() => {});
    });
  } catch (error) {
    console.error('Error al escuchar mensajes en primer plano:', error);
  }
}
