export type SoundProfileId = 'pop' | 'click' | 'chime' | 'haptic' | 'arcade' | 'silent';

export interface SoundProfile {
  id: SoundProfileId;
  name: string;
  desc: string;
  emoji: string;
  isDefault?: boolean;
  accentColor: string;
}

export const SOUND_PROFILES: SoundProfile[] = [
  {
    id: 'pop',
    name: 'Pop / Burbuja',
    desc: 'Suave, satisfactorio, estilo iOS (Por defecto)',
    emoji: '🍿',
    isDefault: true,
    accentColor: 'cyan',
  },
  {
    id: 'click',
    name: 'Click Digital',
    desc: 'Crisp, mecánico y tecnológico',
    emoji: '⚡',
    accentColor: 'blue',
  },
  {
    id: 'chime',
    name: 'Campana Armónica',
    desc: 'Micro-acorde elegante y refinado',
    emoji: '🎵',
    accentColor: 'emerald',
  },
  {
    id: 'haptic',
    name: 'Toque Háptico',
    desc: 'Golpecito grave estilo motor de vibración',
    emoji: '📳',
    accentColor: 'purple',
  },
  {
    id: 'arcade',
    name: 'Chime Brillos',
    desc: 'Tono cristalino ascendente moderno',
    emoji: '✨',
    accentColor: 'amber',
  },
  {
    id: 'silent',
    name: 'Silencioso',
    desc: 'Desactivar efectos de sonido',
    emoji: '🔇',
    accentColor: 'slate',
  },
];

const STORAGE_KEY = 'ui_sound_profile';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (err) {
    console.warn('Error iniciando AudioContext:', err);
    return null;
  }
}

// 1. Pop / Burbuja
export function playPop() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('Error reproduciendo sonido Pop:', e);
  }
}

// 2. Click Digital
export function playClick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch (e) {
    console.warn('Error reproduciendo sonido Click:', e);
  }
}

// 3. Campana Armónica
export function playChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn('Error reproduciendo sonido Chime:', e);
  }
}

// 4. Toque Háptico
export function playHapticThud() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {
    console.warn('Error reproduciendo sonido Haptic:', e);
  }
}

// 5. Chime Brillos / Arcade
export function playArcade() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.12);
  } catch (e) {
    console.warn('Error reproduciendo sonido Arcade:', e);
  }
}

// ==========================================
// A. SONIDOS DE GAMIFICACIÓN RETRO (MARIO 8-BIT)
// ==========================================

// 🍄 Mario 1-UP (Vida Extra / Logro Máximo)
export function playMario1Up() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [
      { freq: 659.25, duration: 0.045 }, // E5
      { freq: 784.00, duration: 0.045 }, // G5
      { freq: 1318.51, duration: 0.045 },// E6
      { freq: 1046.50, duration: 0.045 },// C6
      { freq: 1174.66, duration: 0.045 },// D6
      { freq: 1567.98, duration: 0.090 },// G6
    ];
    let startTime = ctx.currentTime;
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + note.duration);
      startTime += note.duration;
    });
  } catch (e) {
    console.warn('Error reproduciendo sonido Mario 1Up:', e);
  }
}

// 🪙 Mario Coin (Moneda / Registro Rápido)
export function playMarioCoin() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.035); // E6
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.125);
  } catch (e) {
    console.warn('Error reproduciendo sonido Mario Coin:', e);
  }
}

// 🍄 Mario Jump (Salto / Cambio de Sección)
export function playMarioJump() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(261.63, now); // C4
    osc.frequency.exponentialRampToValueAtTime(784.00, now + 0.15); // G5
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn('Error reproduciendo sonido Mario Jump:', e);
  }
}

// 🍄 Mario Pipe (Tubo / Eliminación o Descarte)
export function playMarioPipe() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const steps = [
      { freq: 130.81, duration: 0.09 }, // C3
      { freq: 98.00, duration: 0.09 },  // G2
      { freq: 82.41, duration: 0.09 },  // E2
    ];
    let startTime = ctx.currentTime;
    steps.forEach((step) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(step.freq, startTime);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + step.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + step.duration);
      startTime += step.duration;
    });
  } catch (e) {
    console.warn('Error reproduciendo sonido Mario Pipe:', e);
  }
}

// ==========================================
// C. SONIDOS DE TRANSACCIONES FINANCIERAS
// ==========================================

// 📈 Ingreso Celestial (Venta Cobrada / Cierre Positivo)
export function playIncomeCelestial() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98]; // C5 -> G6
    let startTime = ctx.currentTime;
    const stepDuration = 0.06;
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
      startTime += stepDuration;
    });
  } catch (e) {
    console.warn('Error reproduciendo sonido Ingreso Celestial:', e);
  }
}

// 📉 Gasto Resonante (Egreso de Caja / Pago a Proveedor)
export function playExpenseResonant() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const freqs = [587.33, 523.25, 440.00, 349.23]; // D5 -> F4
    let startTime = ctx.currentTime;
    const stepDuration = 0.10;
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.14, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
      startTime += stepDuration;
    });
  } catch (e) {
    console.warn('Error reproduciendo sonido Gasto Resonante:', e);
  }
}

// ✏️ Edición Cristalina (Modificación de Registro o Precios)
export function playEditCrystal() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const freqs = [659.25, 880.00, 1046.50, 1318.51]; // E5 -> E6
    let startTime = ctx.currentTime;
    const stepDuration = 0.08;
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.2);
      startTime += stepDuration;
    });
  } catch (e) {
    console.warn('Error reproduciendo sonido Edicion Cristalina:', e);
  }
}

// 🗑️ Eliminación De-Rez (Anulación de Factura o Registro)
export function playDeleteDeRez() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(110.00, now + 0.45);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.45);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    console.warn('Error reproduciendo sonido De-Rez:', e);
  }
}

export function getUiSoundProfile(): SoundProfileId {
  if (typeof localStorage === 'undefined') return 'pop';
  const saved = localStorage.getItem(STORAGE_KEY) as SoundProfileId;
  if (saved && (['pop', 'click', 'chime', 'haptic', 'arcade', 'silent'] as string[]).includes(saved)) {
    return saved;
  }
  return 'pop'; // Default to Option 1: Pop / Burbuja
}

export function setUiSoundProfile(profileId: SoundProfileId): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, profileId);
  }
}

export function playUiSound(overrideProfileId?: SoundProfileId): void {
  const profileId = overrideProfileId || getUiSoundProfile();

  switch (profileId) {
    case 'pop':
      playPop();
      break;
    case 'click':
      playClick();
      break;
    case 'chime':
      playChime();
      break;
    case 'haptic':
      playHapticThud();
      break;
    case 'arcade':
      playArcade();
      break;
    case 'silent':
    default:
      // No sound
      break;
  }
}

