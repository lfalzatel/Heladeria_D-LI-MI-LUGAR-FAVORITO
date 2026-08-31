import { toast } from 'sonner';

export interface BiometricCredential {
  credentialId: string;
  userUid: string;
  userEmail: string;
  userName: string;
  createdAt: number;
}

const BIOMETRICS_STORAGE_KEY = 'dli_biometrics_registered_credentials';

/**
 * Check if the current browser/device supports WebAuthn biometric authentication (Fingerprint / Face ID).
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (isAvailable) return true;
    }
    // Fallback: Si el navegador tiene API PublicKeyCredential y es localhost/HTTPS
    return true;
  } catch (err) {
    console.warn("Biometrics support check failed, using fallback:", err);
    return true;
  }
}

/**
 * Check if there is at least one biometric credential registered on this device.
 */
export function getRegisteredBiometricCredentials(): BiometricCredential[] {
  try {
    const data = localStorage.getItem(BIOMETRICS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Check if biometrics are registered for a specific user ID.
 */
export function hasBiometricsRegisteredForUser(userUid: string): boolean {
  const creds = getRegisteredBiometricCredentials();
  return creds.some(c => c.userUid === userUid);
}

/**
 * Helper to convert string to Uint8Array buffer
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Helper to convert ArrayBuffer to Base64URL string
 */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Helper to convert Base64URL string to Uint8Array
 */
function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Register a new Biometric / Passkey credential on this device for the current user.
 */
export async function registerBiometricCredential(user: { uid: string; email: string; name: string }): Promise<boolean> {
  const supported = await isBiometricsSupported();
  if (!supported) {
    toast.error('Este dispositivo no soporta autenticación por Huella Dactilar o Face ID.');
    return false;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "D'LI Heladería",
        id: window.location.hostname,
      },
      user: {
        id: stringToUint8Array(user.uid),
        name: user.email || user.uid,
        displayName: user.name || 'Usuario D\'LI',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Built-in platform sensor (Fingerprint / Face ID / Touch ID)
        userVerification: 'preferred',
      },
      timeout: 60000,
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('No se generó credencial biométrica.');
    }

    const credentialIdStr = bufferToBase64Url(credential.rawId);

    const newCred: BiometricCredential = {
      credentialId: credentialIdStr,
      userUid: user.uid,
      userEmail: user.email,
      userName: user.name,
      createdAt: Date.now(),
    };

    const currentCreds = getRegisteredBiometricCredentials().filter(c => c.userUid !== user.uid);
    currentCreds.push(newCred);
    localStorage.setItem(BIOMETRICS_STORAGE_KEY, JSON.stringify(currentCreds));

    toast.success('¡Huella Dactilar / Face ID activada con éxito!');
    return true;

  } catch (err: any) {
    console.error("Error al registrar huella dactilar:", err);
    if (err.name === 'NotAllowedError') {
      toast.error('Se canceló la verificación de la huella dactilar.');
    } else {
      toast.error('Error al registrar la huella dactilar en este dispositivo.');
    }
    return false;
  }
}

/**
 * Authenticate with Fingerprint / Face ID on this device.
 * Returns the matching BiometricCredential if successful.
 */
export async function authenticateWithBiometrics(): Promise<BiometricCredential | null> {
  const registered = getRegisteredBiometricCredentials();
  if (registered.length === 0) {
    toast.error('No hay ninguna huella registrada en este dispositivo.');
    return null;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredentials = registered.map(c => ({
      id: base64UrlToUint8Array(c.credentialId),
      type: 'public-key' as const,
    }));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials,
      userVerification: 'preferred',
      timeout: 60000,
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('No se recibió verificación biométrica.');
    }

    const matchedId = bufferToBase64Url(assertion.rawId);
    const matchedCred = registered.find(c => c.credentialId === matchedId) || registered[0];

    return matchedCred;

  } catch (err: any) {
    console.error("Error al autenticar con huella:", err);
    if (err.name === 'NotAllowedError') {
      toast.error('Verificación de huella cancelada.');
    } else {
      toast.error('No se pudo verificar la huella dactilar.');
    }
    return null;
  }
}

/**
 * Remove biometric credential for a user.
 */
export function removeBiometricCredential(userUid: string): void {
  const currentCreds = getRegisteredBiometricCredentials().filter(c => c.userUid !== userUid);
  localStorage.setItem(BIOMETRICS_STORAGE_KEY, JSON.stringify(currentCreds));
  toast.success('Acceso por huella dactilar desactivado.');
}
