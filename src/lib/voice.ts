// Utility for Web Speech API synthesis in Spanish

const VOICE_STORAGE_KEY = 'voice_confirmation_enabled';

export function isVoiceConfirmationEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(VOICE_STORAGE_KEY) === 'true';
}

export function setVoiceConfirmationEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(VOICE_STORAGE_KEY, String(enabled));
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
}

export function speakConfirmation(text: string): void {
  if (!isVoiceConfirmationEnabled()) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es-CO') || v.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Error al reproducir voz de confirmación:', err);
  }
}
