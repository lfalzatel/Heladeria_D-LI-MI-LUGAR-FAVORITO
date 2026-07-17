import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Comparte un archivo binario nativamente en Android/iOS usando Capacitor.
 * Si no está en plataforma nativa (Capacitor), retorna false para activar el fallback web.
 */
export async function shareFileNative(blob: Blob, filename: string, title: string, text: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false; // No es plataforma nativa, usar fallback web
  }

  try {
    // 1. Convertir el Blob a base64 (requerido por Filesystem de Capacitor)
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Quitar el prefijo data:*/*;base64, si existe
        const cleanBase64 = base64String.includes(',') 
          ? base64String.split(',')[1] 
          : base64String;
        resolve(cleanBase64);
      };
      reader.onerror = reject;
    });
    
    reader.readAsDataURL(blob);
    const base64Data = await base64Promise;

    // 2. Guardar el archivo en el directorio temporal/caché nativo
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    // 3. Compartir el URI local seguro del archivo (content:// en Android)
    await Share.share({
      title: title,
      text: text,
      url: result.uri,
    });

    return true;
  } catch (err) {
    console.error('Error in shareFileNative:', err);
    return false;
  }
}
