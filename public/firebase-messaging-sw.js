importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAd8eXIrpn396YOsQwr4M99PaMRBlbse88",
  authDomain: "ruta-comun-4fcaf.firebaseapp.com",
  projectId: "ruta-comun-4fcaf",
  storageBucket: "ruta-comun-4fcaf.firebasestorage.app",
  messagingSenderId: "764541288248",
  appId: "1:764541288248:web:266038ea513e8c13b98bcd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
