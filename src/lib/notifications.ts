import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';

// IMPORTANTE: Debes configurar VITE_FIREBASE_VAPID_KEY en tu .env o en Vercel
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BD23yi5wkKcpl9rTRkvb4ownj-yxzeDF9w69eC7F2J6wNHWJTTy1qA90VU_hjS17VYW2nGX_2YJreL9ayxvaKak"; 

export async function requestNotificationPermission(userId: string) {
  try {
    if (!('Notification' in window)) return;
    if (!(await isSupported())) return;

    // ⚠️ FCM push no funciona consistentemente en localhost — saltar silenciosamente en desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('⚠️ Notificaciones push simuladas en localhost. Despliega en Vercel para probar con HTTPS.');
      toast.info('Simulación: Notificaciones activadas', {
        description: 'En localhost no se registra el token real para evitar errores de servicio push.'
      });
      return 'fake-token-localhost';
    }

    // 1. Obtener permiso del navegador
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permiso de notificaciones denegado');
    }

    // 2. Registrar el Service Worker de Firebase por separado con su propio scope
    console.log("Registrando Service Worker de Firebase (scope dedicado)...");
    const fcmReg = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/firebase-cloud-messaging-push-scope' }
    );

    // 3. Esperar a que el SW esté activo
    await new Promise<void>((resolve) => {
      if (fcmReg.active) {
        resolve();
      } else {
        const sw = fcmReg.installing || fcmReg.waiting;
        if (sw) {
          sw.addEventListener('statechange', (e: any) => {
            if (e.target.state === 'activated') resolve();
          });
        }
        // Timeout de seguridad de 3 segundos
        setTimeout(resolve, 3000);
      }
    });

    console.log("Service Worker de Firebase listo en scope:", fcmReg.scope);

    // 4. Inicializar Firebase Messaging
    const { app } = await import('./firebase');
    const messaging = getMessaging(app);

    // 5. Limpiar token anterior si existe para evitar conflictos
    try {
      console.log("Limpiando token antiguo...");
      await deleteToken(messaging);
    } catch (err) {
      console.warn("Error al intentar borrar token antiguo (ignorable):", err);
    }

    // 6. Obtener nuevo token usando la registración dedicada
    console.log("Solicitando nuevo token FCM...");
    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: fcmReg
    });

    if (currentToken) {
      console.log("Token FCM obtenido con éxito");
      // Guardar el token en Firestore con setDoc (merge) y try/catch de seguridad
      try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        }, { merge: true });
      } catch (tokenErr) {
        console.warn('Advertencia al guardar token en Firestore:', tokenErr);
      }
      return currentToken;
    }
    throw new Error('No se pudo obtener el token de FCM');

  } catch (error: any) {
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
    
    // Registrar/obtener el Service Worker de Firebase dedicado
    const fcmReg = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/firebase-cloud-messaging-push-scope' }
    );
    
    // Obtener el token actual pasando la registración dedicada
    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: fcmReg 
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
      
      // 1. Mostrar toast dentro de la app (In-App)
      const showInApp = localStorage.getItem('notifications_inapp_enabled') !== 'false';
      if (showInApp) {
        toast.info(payload.notification?.title || "Nuevo Pedido", {
          description: payload.notification?.body,
          duration: 6000,
          action: payload.data?.pedidoId ? {
            label: 'Ver Chat 💬',
            onClick: () => {
              window.location.href = '#/cliente/pedidos';
            }
          } : undefined
        });
      }

      // 2. Vibración (funciona en Android)
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // 3. Sonido
      const soundEnabled = localStorage.getItem('notifications_sound_enabled') !== 'false';
      if (soundEnabled) {
        playNotificationSound();
      }

      // 4. Notificación nativa del sistema (para que aparezca en la barra aunque la app esté abierta)
      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(swReg => {
          swReg.showNotification(
            payload.notification?.title || "D'LI Heladería", {
              body: payload.notification?.body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              vibrate: [200, 100, 200],
              tag: 'dli-notification',
              renotify: true,
            }
          );
        });
      }
    });
  } catch (error) {
    console.error('Error al configurar escucha de mensajes:', error);
  }
}

export async function notifyAdmins(title: string, body: string, data: any = {}) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        target: 'admins',
        title, 
        body, 
        data 
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Error al llamar a la API de notificación');
    }
    console.log('Resultado notificación admins:', result);
    return result;
  } catch (error) {
    console.error('Error al disparar notificación a admins:', error);
    throw error;
  }
}

export async function notifyUser(userId: string, title: string, body: string, data: any = {}) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return { success: false, error: 'User not found' };
    
    const tokens = userDoc.data().fcmTokens || [];
    if (!Array.isArray(tokens) || tokens.length === 0) {
      console.log(`Usuario ${userId} no tiene tokens registrados.`);
      return { success: true, sent: 0 };
    }

    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        tokens: [...new Set(tokens)],
        title, 
        body, 
        data 
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Error al llamar a la API de notificación');
    }
    console.log(`Resultado notificación usuario ${userId}:`, result);
    return result;
  } catch (error) {
    console.error(`Error al notificar al usuario ${userId}:`, error);
    throw error;
  }
}

/**
 * Reproduce el tono de notificación configurado por el usuario en localStorage.
 */
export function playNotificationSound() {
  const soundEnabled = localStorage.getItem('notifications_sound_enabled') !== 'false';
  if (!soundEnabled) return;

  const tone = localStorage.getItem('notifications_sound_tone') || 'default';
  let path = '/notification-sound/notification-sound.mp3'; // Default order sound
  
  if (tone === 'notification') {
    path = '/notification-sound/notification.mp3';
  } else if (tone === 'slick') {
    path = '/notification-sound/slick-notification.mp3';
  }

  try {
    const audio = new Audio(path);
    audio.volume = 0.8;
    audio.play().catch(e => console.warn('Audio playback blocked by browser policies:', e));
  } catch (err) {
    console.warn('Error al reproducir el audio de la alerta:', err);
  }
}
