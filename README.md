# Heladería D'Lí - Point of Sale (PWA)

Aplicación Web Progresiva (PWA) diseñada a medida para la gestión de ventas, reportes y operaciones de la Heladería D'Lí.

## Características Principales

- **Punto de Venta (POS):** Carrito de compras optimizado con soporte para mesas, ventas directas y pedidos para llevar.
- **División de Pagos:** Soporte para múltiples métodos de pago por orden (Efectivo, Tarjeta, Transferencia, Mixto).
- **Reportes:** Generación de reportes detallados diarios de ventas, compras e inventario en PDF y Excel, incluyendo ranking de productos y desempeño del vendedor.
- **Autenticación Basada en Roles:** Acceso seguro con perfiles para Administradores y Vendedores.
- **Manejo Offline/Online:** Sincronización en tiempo real potenciada por Firebase Firestore.
- **PWA Instalable:** Instalable en dispositivos móviles y de escritorio para una experiencia nativa.

## Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite
- **Estilos y UI:** Tailwind CSS v4, Framer Motion, Lucide React
- **Estado:** Zustand
- **Backend & Base de Datos:** Firebase (Firestore, Auth, Storage)

## Ejecutar Localmente

### Prerrequisitos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) (versión 18+ recomendada).

### Instalación

1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```
2. Asegúrate de tener tu archivo `.env.local` o `.env` configurado con tus credenciales de Firebase en la raíz del proyecto (ver `.env.example` si aplica).

### Entorno de Desarrollo

Inicia el servidor local:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3001` (o en la red local según tu configuración).

### Construcción para Producción

Para compilar la aplicación para producción:
```bash
npm run build
```
Los archivos optimizados se generarán en la carpeta `dist/`.

## Despliegue

La aplicación está lista para ser desplegada en plataformas de hosting de archivos estáticos (como Firebase Hosting, Vercel o GitHub Pages). Actualmente, incluye scripts para `deploy` a Github Pages en el `package.json`.
