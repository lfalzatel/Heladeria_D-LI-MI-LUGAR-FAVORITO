import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';

// IMPORTANTE: Debes obtener esta clave desde la Consola de Firebase -> Cloud Messaging -> Web Configuration
const VAPID_KEY = "BD23yi5wkkcpI9rTRkvb4ownj-yxzeDF9w69eC7F2J6wNHWJTTy1qA90VU_hjS17VYW2nGx_2YJreL9ayxvaKak"; 

export async function requestNotificationPermission(userId: string) {
  try {
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones de escritorio');
      return;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      if (!(await isSupported())) {
        console.log('Mensajería no soportada en este navegador');
        return;
      }
      // Asegurarse de que el Service Worker esté listo antes de pedir el token
      const registration = await navigator.serviceWorker.ready;
      
      const messaging = getMessaging();
      
      // Obtener el token de registro de FCM
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      
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
export async function listenToForegroundMessages() {
  try {
    if (!(await isSupported())) return;
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

export async function notifyAdmins(title: string, body: string, data: any = {}) {
  try {
    // 1. Obtener todos los administradores y propietarios
    const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'propietario']));
    const snapshot = await getDocs(q);
    
    // 2. Recopilar todos sus tokens de dispositivo
    const allTokens: string[] = [];
    snapshot.docs.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        allTokens.push(...userData.fcmTokens);
      }
    });

    // Si no hay tokens, no hay a quién notificar
    if (allTokens.length === 0) {
      console.log('No se encontraron tokens de administradores para notificar');
      return;
    }

    // 3. Llamar a nuestra API segura en Vercel
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: [...new Set(allTokens)], // Evitar duplicados
        title,
        body,
        data
      })
    });

    if (!response.ok) {
      throw new Error('Error al llamar a la API de notificación');
    }
    
    console.log('Notificación enviada a los administradores');
  } catch (error) {
    console.error('Error al disparar notificación a admins:', error);
  }
}
