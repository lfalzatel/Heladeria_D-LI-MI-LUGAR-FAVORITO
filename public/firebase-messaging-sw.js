importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAd8eXIrpn396YOsQwr4M99PaMRBlbse88",
  authDomain: "ruta-comun-4fcaf.firebaseapp.com",
  projectId: "ruta-comun-4fcaf",
  storageBucket: "ruta-comun-4fcaf.firebasestorage.app",
  messagingSenderId: "764541288248",
  appId: "1:764541288248:web:266038ea513e8c13b98bcd"
});

const messaging = firebase.messaging();

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensaje en background:', payload);

  // Mostrar notificación nativa en la barra del sistema
  return self.registration.showNotification(
    payload.notification?.title || "D'LI Boutique", {
      body: payload.notification?.body || 'Nueva actualización',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'dli-notification',
      renotify: true,
      data: payload.data || {},
      actions: [
        { action: 'open', title: 'Ver' },
        { action: 'close', title: 'Cerrar' }
      ]
    }
  );
});

// Al tocar la notificación, abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Intentar enfocar una ventana existente de la app
        for (const client of clientList) {
          // Filtramos por la URL de producción o el nombre del proyecto
          if (client.url.includes('heladeria-d-li') && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no está abierta, abrir la URL de producción
        if (clients.openWindow) {
          return clients.openWindow('https://heladeria-d-li-mi-lugar-favorito.vercel.app/');
        }
      })
  );
});
