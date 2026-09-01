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

// 🍦 Choco-Berry Pop (Melodía dulce doble tono)
export function playChocoBerryPop() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12); // C6

    osc2.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.14);
    osc2.stop(now + 0.14);
  } catch (e) {
    console.warn('Error reproduciendo ChocoBerryPop:', e);
  }
}

// 🍧 Helado Mágico (Cristalino mágico con filtro envolvente)
export function playHeladoMagico() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [783.99, 987.77, 1174.66, 1567.98]; // G5, B5, D6, G6
    let startTime = ctx.currentTime;
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.18);
      startTime += 0.04;
    });
  } catch (e) {
    console.warn('Error reproduciendo HeladoMagico:', e);
  }
}

// 🍓 Fresa Cremosa (Trino pentatónico alegre)
export function playFresaCremosa() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // Pentatónica C Major
    let startTime = ctx.currentTime;
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.11, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
      startTime += 0.035;
    });
  } catch (e) {
    console.warn('Error reproduciendo FresaCremosa:', e);
  }
}

// 🔔 Campana Heladería D'LI (Timbre nostálgico metálico)
export function playCampanaHeladeria() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(1200, now);
    osc2.frequency.setValueAtTime(2400, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn('Error reproduciendo CampanaHeladeria:', e);
  }
}

// 🪙 Moneda de Oro (Tono agudo brillante NES)
export function playGoldenCoin() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1046.50, now); // C6
    osc.frequency.setValueAtTime(1567.98, now + 0.05); // G6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch (e) {
    console.warn('Error reproduciendo GoldenCoin:', e);
  }
}

// 🚀 Cohete Dulce (Arpegio espacial ascendente)
export function playCoheteDulce() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.3);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn('Error reproduciendo CoheteDulce:', e);
  }
}

// Helper global de emision de tonos Web Audio API
export function playTone(
  freq: number, 
  type: OscillatorType = 'sine', 
  durationMs: number = 180, 
  delayMs: number = 0, 
  gainLevel: number = 0.15
) {
  setTimeout(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainLevel, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (durationMs / 1000));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + (durationMs / 1000));
    } catch (err) {
      // Silencioso si hay bloqueo de audio
    }
  }, delayMs);
}

// ✨ Ráfaga Estelar en 3 Etapas (Despegue, Vuelo y Fanfarria 2550ms)
export function playStarburstSequence() {
  // A) Arpegio celestial ascendente al despegar (0ms - 400ms)
  const arpeggioNotes = [523.25, 659.25, 783.99, 987.77, 1046.50]; // Do5, Mi5, Sol5, Si5, Do6
  arpeggioNotes.forEach((freq, idx) => {
    playTone(freq, 'sine', 220, 50 + idx * 70, 0.12);
  });

  // B) Notas cristalinas viajeras durante el desplazamiento de las partículas (350ms - 1100ms)
  const fireworksNotes = [1567.98, 1760.00, 1975.53, 2093.00, 2637.02]; // Sol6, La6, Si6, Do7, Mi7
  fireworksNotes.forEach((freq, idx) => {
    playTone(freq, 'triangle', 250, 400 + idx * 110, 0.15);
    playTone(freq * 1.5, 'sine', 200, 430 + idx * 110, 0.08); // Armónico cristalino superior
  });

  // C) Llegada suave y metálica a los destinos finales (1200ms - 1350ms)
  playTone(2093.00, 'sine', 400, 1200, 0.12); // Do7 llegada
  playTone(2637.02, 'sine', 450, 1300, 0.10); // Mi7 llegada
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

// ==========================================
// D. MAPEO Y PERSONALIZACIÓN DE SONIDOS POR EVENTO
// ==========================================

export type ActionEventType = 'new_order' | 'income' | 'expense' | 'edit' | 'delete' | 'burst_start' | 'burst_flight';

export interface SoundOption {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  playFn: () => void;
}

export const ALL_SOUND_OPTIONS: SoundOption[] = [
  { id: 'starburst_sequence', name: '✨ Ráfaga Estelar 3 Etapas', desc: 'Despegue celestial, vuelo cristalino y choque final (2550ms)', emoji: '✨', playFn: playStarburstSequence },
  { id: 'fresa_cremosa', name: '🍓 Fresa Cremosa', desc: 'Trino pentatónico alegre para eventos felices', emoji: '🍓', playFn: playFresaCremosa },
  { id: 'choco_berry', name: '🍦 Choco-Berry Pop', desc: 'Doble tono dulce y moderno', emoji: '🍦', playFn: playChocoBerryPop },
  { id: 'helado_magico', name: '🍧 Helado Mágico', desc: 'Arpegio cristalino mágico ascendente', emoji: '🍧', playFn: playHeladoMagico },
  { id: 'campana_dli', name: '🔔 Campana Heladería', desc: 'Timbre nostálgico de mostrador metálico', emoji: '🔔', playFn: playCampanaHeladeria },
  { id: 'golden_coin', name: '🪙 Moneda de Oro', desc: 'Bip-bip brillante estilo NES 8-bit', emoji: '🪙', playFn: playGoldenCoin },
  { id: 'cohete_dulce', name: '🚀 Cohete Dulce', desc: 'Barrido espacial ascendente de impulso inicial', emoji: '🚀', playFn: playCoheteDulce },
  { id: 'mario_1up', name: '🍄 Mario 1-UP', desc: 'Tono retro retro NES de vida extra', emoji: '🍄', playFn: playMario1Up },
  { id: 'mario_coin', name: '🪙 Mario Coin', desc: 'Sonido retro de moneda NES', emoji: '🪙', playFn: playMarioCoin },
  { id: 'mario_jump', name: '🍄 Mario Jump', desc: 'Impulso ascendente retro 8-bit', emoji: '🍄', playFn: playMarioJump },
  { id: 'mario_pipe', name: '🍄 Mario Pipe', desc: 'Gravedad baja retro de tubo NES', emoji: '🍄', playFn: playMarioPipe },
  { id: 'income_celestial', name: '📈 Ingreso Celestial', desc: 'Acorde celestial ascendente para ventas', emoji: '📈', playFn: playIncomeCelestial },
  { id: 'expense_resonant', name: '📉 Gasto Resonante', desc: 'Bajo descendente para egreso de caja', emoji: '📉', playFn: playExpenseResonant },
  { id: 'edit_crystal', name: '✏️ Edición Cristalina', desc: 'Chime de vidrio fino para ajustes', emoji: '✏️', playFn: playEditCrystal },
  { id: 'delete_derez', name: '🗑️ Eliminación De-Rez', desc: 'Filtro descendente arcade de borrado', emoji: '🗑️', playFn: playDeleteDeRez },
];

const EVENT_STORAGE_KEY = 'dli_custom_event_sounds';

const DEFAULT_EVENT_MAP: Record<ActionEventType, string> = {
  new_order: 'fresa_cremosa',
  income: 'income_celestial',
  expense: 'expense_resonant',
  edit: 'edit_crystal',
  delete: 'delete_derez',
  burst_start: 'cohete_dulce',
  burst_flight: 'helado_magico'
};

export function getEventSoundMap(): Record<ActionEventType, string> {
  if (typeof localStorage === 'undefined') return DEFAULT_EVENT_MAP;
  try {
    const data = localStorage.getItem(EVENT_STORAGE_KEY);
    return data ? { ...DEFAULT_EVENT_MAP, ...JSON.parse(data) } : DEFAULT_EVENT_MAP;
  } catch {
    return DEFAULT_EVENT_MAP;
  }
}

export function setEventSound(event: ActionEventType, soundId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getEventSoundMap();
    current[event] = soundId;
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Error guardando sonido de evento:', e);
  }
}

export function playEventSound(event: ActionEventType): void {
  const map = getEventSoundMap();
  const soundId = map[event] || DEFAULT_EVENT_MAP[event];
  const option = ALL_SOUND_OPTIONS.find(o => o.id === soundId);
  if (option) {
    option.playFn();
  } else {
    // Fallback
    switch (event) {
      case 'new_order': playFresaCremosa(); break;
      case 'income': playIncomeCelestial(); break;
      case 'expense': playExpenseResonant(); break;
      case 'edit': playEditCrystal(); break;
      case 'delete': playDeleteDeRez(); break;
      case 'burst_start': playCoheteDulce(); break;
      case 'burst_flight': playHeladoMagico(); break;
    }
  }
}

// ==========================================
// E. CATÁLOGO Y SECUENCIA DE SONIDOS DE VUELO E IMPACTO POR PARTÍCULA (HELADERÍA STYLE)
// ==========================================

export type FlightSoundId = 'cristal_estelar' | 'fresa_escalonada' | 'burbujas_cremosas' | 'monedas_nes' | 'cascada_neon';

export interface FlightSoundOption {
  id: FlightSoundId;
  name: string;
  desc: string;
  emoji: string;
}

export const FLIGHT_SOUND_OPTIONS: FlightSoundOption[] = [
  { 
    id: 'cristal_estelar', 
    name: '💎 Absorción Cristalina Estelar', 
    desc: 'Notas cristalinas individuales (+70 Hz) al converger e impactar cada estrella (Do6 a Mi7)', 
    emoji: '💎' 
  },
  { 
    id: 'fresa_escalonada', 
    name: '🍓 Gotas de Fresa Escalonadas', 
    desc: 'Pentatónica cálida dulce (+85 Hz) estilo heladería artesanal al llegar cada icono', 
    emoji: '🍓' 
  },
  { 
    id: 'burbujas_cremosas', 
    name: '🍦 Burbujas Cremosas de Absorción', 
    desc: 'Chimes de vidrio afinados con armónico superior por impacto en la cápsula', 
    emoji: '🍦' 
  },
  { 
    id: 'monedas_nes', 
    name: '🪙 Monedas NES Progresivas', 
    desc: 'Impactos retro 8-bit en escala ascendente estilo juego de arcade', 
    emoji: '🪙' 
  },
  { 
    id: 'cascada_neon', 
    name: '🌌 Cascada Neón Espacial', 
    desc: 'Barrido espacial hiper-agudo (+130 Hz) al ser absorbido por la píldora/menú', 
    emoji: '🌌' 
  },
];

const FLIGHT_STORAGE_KEY = 'dli_custom_flight_sound';

export function getFlightSoundProfile(): FlightSoundId {
  if (typeof localStorage === 'undefined') return 'cristal_estelar';
  const saved = localStorage.getItem(FLIGHT_STORAGE_KEY) as FlightSoundId;
  if (saved && FLIGHT_SOUND_OPTIONS.some(o => o.id === saved)) {
    return saved;
  }
  return 'cristal_estelar';
}

export function setFlightSoundProfile(profileId: FlightSoundId): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(FLIGHT_STORAGE_KEY, profileId);
  }
}

export function playFlightParticleNote(particleIndex: number, delayMs: number = 0): void {
  const profileId = getFlightSoundProfile();

  let baseFreq = 1046.50; // Do6
  let stepHz = 70;
  let waveType: OscillatorType = 'sine';
  let duration = 180;
  let volume = 0.16;
  let hasHarmonic = false;

  switch (profileId) {
    case 'cristal_estelar':
      baseFreq = 1046.50; // Do6
      stepHz = 70;
      waveType = 'sine';
      duration = 180;
      volume = 0.16;
      break;
    case 'fresa_escalonada':
      baseFreq = 659.25; // Mi5
      stepHz = 85;
      waveType = 'triangle';
      duration = 200;
      volume = 0.18;
      break;
    case 'burbujas_cremosas':
      baseFreq = 1318.51; // Mi6
      stepHz = 95;
      waveType = 'sine';
      duration = 160;
      volume = 0.14;
      hasHarmonic = true;
      break;
    case 'monedas_nes':
      baseFreq = 1567.98; // Sol6
      stepHz = 110;
      waveType = 'square';
      duration = 120;
      volume = 0.08;
      break;
    case 'cascada_neon':
      baseFreq = 1760.00; // La6
      stepHz = 130;
      waveType = 'sine';
      duration = 220;
      volume = 0.15;
      hasHarmonic = true;
      break;
  }

  const freq = baseFreq + (particleIndex % 12) * stepHz;
  playTone(freq, waveType, duration, delayMs, volume);
  if (hasHarmonic) {
    playTone(freq * 1.5, 'sine', duration * 0.8, delayMs + 20, volume * 0.5);
  }
}

export function testFlightSequence(profileId?: FlightSoundId): void {
  const original = getFlightSoundProfile();
  if (profileId) {
    setFlightSoundProfile(profileId);
  }

  // Reproducir ráfaga de 7 notas individuales
  for (let i = 0; i < 7; i++) {
    playFlightParticleNote(i, i * 110);
  }

  if (profileId) {
    setTimeout(() => {
      setFlightSoundProfile(original);
    }, 1000);
  }
}

