// Scripts necesarios de Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Inicialización de Firebase con tus credenciales
firebase.initializeApp({
  apiKey: "AIzaSyCdbb4XIamsJauwRJ0R4ZKE3uOEydiAi98",
  authDomain: "ruta-comun-4fcaf.firebaseapp.com",
  projectId: "ruta-comun-4fcaf",
  storageBucket: "ruta-comun-4fcaf.firebasestorage.app",
  messagingSenderId: "764541288248",
  appId: "1:764541288248:web:13531cff1254b246b98bcd"
});

const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano (cuando la app está cerrada)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Recibido mensaje en segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || "D'LI Heladería";
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo-dli.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    tag: 'venta-notificacion', // Agrupa notificaciones similares
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
