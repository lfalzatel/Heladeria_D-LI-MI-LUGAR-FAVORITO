/* eslint-disable no-undef */
// REQUERIDO por VitePWA para inyectar el manifest de precaché
// @ts-ignore
self.__WB_MANIFEST;

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
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);
  
  const notificationTitle = payload.notification?.title || 'D\'LI Boutique';
  const notificationOptions = {
    body: payload.notification?.body || 'Nueva actualización disponible',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    tag: 'order-update' // Agrupar notificaciones
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
