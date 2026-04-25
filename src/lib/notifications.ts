import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';

// IMPORTANTE: Debes obtener esta clave desde la Consola de Firebase -> Cloud Messaging -> Web Configuration
const VAPID_KEY = "BD23yi5wkKcpl9rTRkvb4ownj-yxzeDF9w69eC7F2J6wNHWJTTy1qA90VU_hjS17VYW2nGX_2YJreL9ayxvaKak"; 

export async function requestNotificationPermission(userId: string) {
  try {
    if (!('Notification' in window)) return;
    if (!(await isSupported())) return;

    // ⚠️ FCM push no funciona consistentemente en localhost — saltar silenciosamente en desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('⚠️ Notificaciones push simuladas en localhost. Despliega en Vercel para probar con HTTPS.');
      toast.info('Simulación: Notificaciones activadas (solo en producción)', {
        description: 'En localhost no se registra el token real, pero el toggle se activará.'
      });
      return 'fake-token-localhost';
    }

    // 1. Obtener permiso del navegador
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permiso de notificaciones denegado');
    }

    // 2. Esperar a que el Service Worker (gestionado por VitePWA) esté listo con timeout
    console.log("Esperando Service Worker de VitePWA...");
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration>((_, reject) => 
        setTimeout(() => reject(new Error('Tiempo de espera agotado para el Service Worker — Intenta recargar la página')), 5000)
      )
    ]);
    console.log("Service Worker listo:", registration.active?.scriptURL);

    // 3. Inicializar Firebase Messaging
    const { app } = await import('./firebase');
    const messaging = getMessaging(app);

    // 4. Limpiar token anterior si existe para evitar conflictos
    try {
      console.log("Limpiando token antiguo...");
      await deleteToken(messaging);
    } catch (err) {
      console.warn("Error al intentar borrar token antiguo (ignorable):", err);
    }

    // 5. Obtener nuevo token usando la registración de VitePWA
    console.log("Solicitando nuevo token FCM...");
    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log("Token FCM obtenido con éxito");
      // Guardar el token en Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(currentToken)
      });
      return currentToken;
    }
    throw new Error('No se pudo obtener el token de FCM');

  } catch (error) {
    console.error('Error al configurar notificaciones:', error);
    throw error;
  }
}

export async function unregisterNotifications(userId: string) {
  try {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return true;
    }

    if (!(await isSupported())) return;

    const { app } = await import('./firebase');
    const messaging = getMessaging(app);
    
    // Esperar al Service Worker de VitePWA con timeout
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration>((_, reject) => 
        setTimeout(() => reject(new Error('Tiempo de espera agotado para el Service Worker')), 5000)
      )
    ]);
    
    // Obtener el token actual pasando la registración
    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration 
    });
    
    if (currentToken) {
      // Eliminar de Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(currentToken)
      });
      
      // Eliminar del navegador
      await deleteToken(messaging);
      console.log('Notificaciones desactivadas y token eliminado');
    }
    
    return true;
  } catch (error) {
    console.error('Error al desactivar notificaciones:', error);
    throw error;
  }
}

export async function listenToForegroundMessages() {
  try {
    if (!(await isSupported())) return;
    
    const { app } = await import('./firebase');
    const { onMessage } = await import('firebase/messaging');
    const messaging = getMessaging(app);

    onMessage(messaging, (payload) => {
      console.log('Mensaje recibido en primer plano:', payload);
      toast.info(payload.notification?.title || 'Nueva notificación', {
        description: payload.notification?.body,
        duration: 5000,
      });
    });
  } catch (error) {
    console.error('Error al configurar escucha de mensajes:', error);
  }
}

export async function notifyAdmins(title: string, body: string, data: any = {}) {
  try {
    // 1. Obtener los tokens de todos los admins y propietarios de Firestore
    const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'propietario']));
    const snapshot = await getDocs(q);
    
    const allTokens: string[] = [];
    snapshot.docs.forEach(doc => {
      const tokens = doc.data().fcmTokens || [];
      if (Array.isArray(tokens)) {
        allTokens.push(...tokens);
      }
    });

    const uniqueTokens = [...new Set(allTokens)];

    if (uniqueTokens.length === 0) {
      console.log('No hay tokens de administradores registrados.');
      return { success: true, successCount: 0 };
    }

    // 2. Llamar a nuestro endpoint de Vercel pasando los tokens
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        tokens: uniqueTokens,
        title, 
        body, 
        data 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al llamar a la API de notificación');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al disparar notificación a admins:', error);
    throw error;
  }
}
