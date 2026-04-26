# 🔔 GUÍA: Notificaciones Push Sonoras, Visuales y Táctiles en PWA con Vite + Firebase

> Basada en la implementación real de D'LI Boutique — Abril 2026
> Funciona en Android e iOS 16.4+ con la app instalada

---

## 📋 RESUMEN RÁPIDO

| Tipo | Cuándo | Sonido | Vibración | Control |
|------|--------|--------|-----------|---------|
| **In-App** (Sonner toast) | App abierta | Tu MP3 | ✅ | Tú |
| **Push del sistema** | App cerrada/minimizada | Tono del móvil | ✅ | Android |
| **Nativa del sistema** | App abierta pero en background | Tono del móvil | ✅ | Android |

---

## 🏗️ ARQUITECTURA (SIN PAGAR — $0)

```
[Evento en la app] → [/api/notify.ts en Vercel] → [FCM API V1 de Google] → [Celular]
```

**Por qué sin Cloud Functions:** Firebase exige plan Blaze (pago) para Cloud Functions.
La solución es usar **Vercel Serverless Functions** que son gratuitas.

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### Error: `Registration failed - push service error`
**Causa:** Dos Service Workers en el mismo scope (`/`) compitiendo.
**Solución:** Registrar el SW de Firebase con scope exclusivo:
```typescript
await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
  scope: '/firebase-cloud-messaging-push-scope'
});
```

### Error: `Module scripts don't support importScripts()`
**Causa:** VitePWA genera el SW como módulo ES en desarrollo.
**Solución:** Agregar `type: 'classic'` en devOptions del vite.config.ts:
```typescript
devOptions: { enabled: true, type: 'classic' }
```

### Error: SW no se activa (se queda esperando)
**Causa:** `navigator.serviceWorker.ready` espera infinitamente.
**Solución:** Agregar timeout de seguridad:
```typescript
const registration = await Promise.race([
  navigator.serviceWorker.ready,
  new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000))
]);
```

### Error: `Unable to find a place to inject the manifest`
**Causa:** `strategies: 'injectManifest'` requiere `self.__WB_MANIFEST` en el SW.
**Solución:** No usar `injectManifest`. Usar la estrategia por defecto `generateSW`.

### Error: FCM API heredada inhabilitada
**Causa:** Google deprecó la API heredada (`fcm.googleapis.com/fcm/send` con Server Key).
**Solución:** Usar **FCM HTTP API V1** con OAuth2 y Service Account.

---

## 📁 ARCHIVOS NECESARIOS

```
proyecto/
├── public/
│   ├── firebase-messaging-sw.js   ← SW de Firebase (background)
│   └── notification-sound.mp3     ← Sonido personalizado (in-app)
├── api/
│   └── notify.ts                  ← Vercel Serverless Function
├── src/lib/
│   └── notifications.ts           ← Lógica del cliente
└── vite.config.ts                 ← Configuración PWA
```

---

## 1️⃣ `vite.config.ts`

```typescript
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  devOptions: {
    enabled: true,
    type: 'classic'   // ← CRÍTICO: evita el error de importScripts
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true
  },
  manifest: {
    name: 'Nombre de tu App',
    short_name: 'App',
    theme_color: '#tu-color',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',      // ← REQUERIDO para que el navegador permita instalación
    scope: '/',          // ← REQUERIDO
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }
})
```

---

## 2️⃣ `public/firebase-messaging-sw.js`

```javascript
// Service Worker de Firebase — maneja notificaciones cuando la app está CERRADA
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
});

const messaging = firebase.messaging();

// Notificación cuando app está CERRADA o en SEGUNDO PLANO
messaging.onBackgroundMessage((payload) => {
  return self.registration.showNotification(
    payload.notification?.title || 'Tu App', {
      body: payload.notification?.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],   // patrón de vibración
      tag: 'app-notification',    // reemplaza notificación anterior del mismo tipo
      renotify: true,             // vibra aunque tenga el mismo tag
      data: payload.data || {}
    }
  );
});

// Al tocar la notificación → abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        return clients.openWindow('https://tu-app.vercel.app/');
      })
  );
});
```

---

## 3️⃣ `src/lib/notifications.ts`

```typescript
import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// ─── ACTIVAR NOTIFICACIONES ───────────────────────────────────────────────────
export async function requestNotificationPermission(userId: string) {
  // No funciona en localhost — saltar silenciosamente
  if (window.location.hostname === 'localhost') {
    toast.info('Notificaciones solo disponibles en producción (Vercel)');
    return null;
  }

  if (!('Notification' in window) || !(await isSupported())) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso denegado');

  const { app } = await import('./firebase');
  const messaging = getMessaging(app);

  // Registrar SW de Firebase con scope exclusivo (no choca con VitePWA)
  const fcmReg = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/firebase-cloud-messaging-push-scope' }
  );

  // Esperar que esté activo (con timeout de seguridad)
  await new Promise<void>((resolve) => {
    if (fcmReg.active) { resolve(); return; }
    const sw = fcmReg.installing || fcmReg.waiting;
    sw?.addEventListener('statechange', (e: any) => {
      if (e.target.state === 'activated') resolve();
    });
    setTimeout(resolve, 3000);
  });

  // Limpiar token anterior
  try { await deleteToken(messaging); } catch (_) {}

  // Obtener nuevo token
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: fcmReg
  });

  if (token) {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token)
    });
    return token;
  }
}

// ─── DESACTIVAR NOTIFICACIONES ────────────────────────────────────────────────
export async function unregisterNotifications(userId: string) {
  if (window.location.hostname === 'localhost') return true;
  if (!(await isSupported())) return;

  const { app } = await import('./firebase');
  const messaging = getMessaging(app);

  const fcmReg = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/firebase-cloud-messaging-push-scope' }
  );

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: fcmReg
  });

  if (token) {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(token)
    });
    await deleteToken(messaging);
  }
  return true;
}

// ─── ESCUCHAR MENSAJES CON APP ABIERTA ────────────────────────────────────────
export async function listenToForegroundMessages() {
  if (!(await isSupported())) return;
  const { app } = await import('./firebase');
  const messaging = getMessaging(app);

  onMessage(messaging, (payload) => {
    // 1. Toast visual in-app
    toast.info(payload.notification?.title || 'Nueva notificación', {
      description: payload.notification?.body,
      duration: 5000,
    });

    // 2. Vibración (volumen multimedia del móvil)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // 3. Sonido personalizado (volumen multimedia — limitación del navegador)
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch (_) {}

    // 4. Notificación nativa del sistema (aparece en la barra)
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(swReg => {
        swReg.showNotification(payload.notification?.title || 'Tu App', {
          body: payload.notification?.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200],
          tag: 'app-notification',
          renotify: true,
        });
      });
    }
  });
}

// ─── ENVIAR NOTIFICACIÓN A ADMINS ─────────────────────────────────────────────
export async function notifyAdmins(title: string, body: string, data: any = {}) {
  const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'propietario']));
  const snapshot = await getDocs(q);

  const tokens: string[] = [];
  snapshot.docs.forEach(d => {
    const t = d.data().fcmTokens || [];
    if (Array.isArray(t)) tokens.push(...t);
  });

  const uniqueTokens = [...new Set(tokens)];
  if (uniqueTokens.length === 0) return { success: true, sent: 0 };

  const response = await fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens: uniqueTokens, title, body, data })
  });

  if (!response.ok) throw new Error('Error al llamar a /api/notify');
  return response.json();
}
```

---

## 4️⃣ `api/notify.ts` (Vercel Serverless Function — en la raíz del proyecto)

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Genera JWT para autenticación OAuth2 con Google
async function createJWT(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  // Nota: En producción usar una librería como google-auth-library
  // npm install google-auth-library
  return `${header}.${payload}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { tokens, title, body, data } = req.body;
  if (!tokens?.length) return res.json({ sent: 0 });

  try {
    // Obtener credenciales del Service Account desde variable de entorno
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

    // Obtener access token OAuth2 usando google-auth-library
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging']
    });
    const accessToken = await auth.getAccessToken();
    const projectId = serviceAccount.project_id;

    // Enviar a cada token usando FCM HTTP API V1 (gratuita)
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
              android: { priority: 'high' },
              apns: { payload: { aps: { sound: 'default' } } }
            }
          })
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return res.json({ sent });

  } catch (error: any) {
    console.error('Error en /api/notify:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

---

## 5️⃣ Variables de entorno en Vercel

| Variable | Dónde obtenerla |
|----------|----------------|
| `VITE_FIREBASE_VAPID_KEY` | Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Key pair |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service accounts → Generate new private key (JSON completo) |

---

## 6️⃣ Dónde llamar a `notifyAdmins`

```typescript
// Al completar una venta
await notifyAdmins('🍦 Nueva venta', `Mesa ${mesa} · $${total}`, { type: 'new_sale' });

// Al detectar stock crítico
await notifyAdmins('⚠️ Stock crítico', `${insumo} está por debajo del mínimo`, { type: 'low_stock' });

// Al recibir mensaje de un cliente
await notifyAdmins(`💬 Mensaje de ${cliente}`, mensaje, { type: 'chat_message' });

// Al recibir un nuevo pedido online
await notifyAdmins('🛒 Nuevo pedido', `${cliente} hizo un pedido de $${total}`, { type: 'new_order' });
```

---

## 7️⃣ Comportamiento por plataforma

| Plataforma | Push cerrada | Push abierta | Sonido MP3 | Vibración |
|-----------|-------------|-------------|------------|-----------|
| Android (Chrome/Edge) | ✅ | ✅ toast + nativa | ✅ multimedia | ✅ |
| Android (Firefox) | ❌ No funciona | ⚠️ Solo toast | ✅ | ✅ |
| iPhone iOS 16.4+ | ✅ App instalada | ✅ | ✅ multimedia | ❌ iOS no vibra desde web |
| PC Windows (Edge) | ✅ | ✅ toast + nativa | ✅ | ❌ no tiene |

---

## 8️⃣ Limitaciones conocidas

- **Sonido en push de sistema:** Android usa el tono configurado en Ajustes → Sonido → Tono de notificación. No puedes cambiarlo desde código.
- **Sonido MP3 personalizado:** Solo funciona con app abierta usando `new Audio()`. El volumen es el multimedia, no el de notificaciones.
- **iPhone:** Requiere iOS 16.4+ y que la PWA esté instalada en la pantalla de inicio.
- **Localhost:** FCM push no funciona en localhost. Solo en HTTPS (Vercel, Netlify, etc.).
- **Firefox en Android:** No soporta FCM push. Usar Chrome o Edge.

---

## 9️⃣ Checklist de implementación

- [ ] `firebase-messaging-sw.js` en `/public/`
- [ ] `notification-sound.mp3` en `/public/`
- [ ] `notifications.ts` en `/src/lib/`
- [ ] `api/notify.ts` en la raíz del proyecto
- [ ] `npm install google-auth-library @vercel/node`
- [ ] `VITE_FIREBASE_VAPID_KEY` en Vercel
- [ ] `FIREBASE_SERVICE_ACCOUNT` en Vercel (JSON completo)
- [ ] `start_url` y `scope` en el manifest de vite.config.ts
- [ ] `type: 'classic'` en devOptions de VitePWA
- [ ] `listenToForegroundMessages()` llamado en el componente raíz (App.tsx)
- [ ] `requestNotificationPermission()` conectado a un botón en la UI
- [ ] `notifyAdmins()` llamado en cada evento relevante
- [ ] Probado en Android con Chrome
- [ ] Probado con app cerrada (push de sistema)

---

*Guía generada: Abril 25, 2026*
*Basada en implementación real — D'LI Boutique PWA*
