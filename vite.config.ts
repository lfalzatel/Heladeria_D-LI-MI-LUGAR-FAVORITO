import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'inline',
      devOptions: {
        enabled: true,
        type: 'classic'
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
      manifest: {
        name: "D'LI Heladería — Mi Lugar Favorito",
        short_name: "D'LI",
        description: "Gestión integral para la heladería D'LI",
        theme_color: '#b30069',
        background_color: '#fcf9f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 3001,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
