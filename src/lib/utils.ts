import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
  }
}

export function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null): never {
  if (error?.code === 'permission-denied') {
    const info: FirestoreErrorInfo = {
      error: error.message,
      operationType: operation,
      path: path,
      authInfo: {
        userId: 'current-user', // Simplified version as user info is globally available in Firebase
        email: 'unknown',
        emailVerified: false,
        isAnonymous: false
      }
    };
    throw new Error(JSON.stringify(info));
  }
  throw error;
}

export function getAssetUrl(path: string | undefined | null): string {
  if (!path) return '';
  
  // Si ya es una URL completa o data, devolverla tal cual
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  // Limpiar la ruta
  let cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Si no tiene carpetas (ej: conchita.jpeg), es un producto
  if (!cleanPath.includes('/')) {
    cleanPath = `images/products/${cleanPath}`;
  }

  // En Vercel usamos la raíz '/'
  const isVercel = window.location.hostname.includes('vercel.app');
  const base = isVercel ? '/' : (import.meta.env.BASE_URL || '/');
  const finalBase = base.endsWith('/') ? base : `${base}/`;
  
  const result = `${finalBase}${cleanPath}`;
  
  // Log para que veas en la consola (F12) qué ruta se está pidiendo
  if (isVercel && !path.includes('icon')) {
    console.log(`[AssetDebug] Original: ${path} -> Final: ${result}`);
  }
  
  return result;
}
