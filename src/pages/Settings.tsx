import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, User, Key, Shield, Bell, Smartphone, Monitor, 
  Volume2, Music, Check, Palette, Sparkles, LogOut, Trash2, 
  Layers, Users, RefreshCw, Settings as SettingsIcon, Fingerprint
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { requestNotificationPermission, unregisterNotifications } from '../lib/notifications';
import { AnimatePresence, motion } from 'motion/react';
import { playNotificationSound } from '../lib/notifications';
import { 
  SOUND_PROFILES, getUiSoundProfile, setUiSoundProfile, playUiSound, SoundProfileId,
  playMario1Up, playMarioCoin, playMarioJump, playMarioPipe,
  playIncomeCelestial, playExpenseResonant, playEditCrystal, playDeleteDeRez,
  playChocoBerryPop, playHeladoMagico, playFresaCremosa, playCampanaHeladeria, playGoldenCoin, playCoheteDulce,
  ALL_SOUND_OPTIONS, getEventSoundMap, setEventSound, playEventSound, ActionEventType
} from '../lib/soundEffects';
import DualTrajectoryBurst from '../components/DualTrajectoryBurst';
import * as confettiModule from 'canvas-confetti';
const confetti = (confettiModule as any).default || confettiModule;
import { isBiometricsSupported, hasBiometricsRegisteredForUser, registerBiometricCredential, removeBiometricCredential } from '../lib/biometrics';

interface ThemeConfig {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
}

const ALL_THEMES: ThemeConfig[] = [
  { id: 'light', name: 'Día (Claro)', desc: 'Tema rosa y blanco tradicional', icon: <Sparkles className="w-5 h-5 text-amber-500" /> },
  { id: 'dark', name: 'Noche (Original)', desc: 'Fondo oscuro relajante', icon: <Sparkles className="w-5 h-5 text-indigo-400" /> },
  { id: 'glass', name: 'Glassmorphism', desc: 'Efecto de cristal y transparencias', icon: <Layers className="w-5 h-5 text-pink-400" /> },
  { id: 'cyber', name: 'Cyberpunk', desc: 'Estilo futurista de neón', icon: <Sparkles className="w-5 h-5 text-cyan-400" /> },
  { id: 'kilo', name: 'KiloCode', desc: 'Diseño verde hacker retro', icon: <Sparkles className="w-5 h-5 text-emerald-500" /> },
];

const ALERT_TONES = [
  { id: 'default', name: 'D\'LI Campana (Original)', file: 'notification-sound.mp3' },
  { id: 'notification', name: 'Burbuja Suave', file: 'notification.mp3' },
  { id: 'slick', name: 'Slick Digital', file: 'slick-notification.mp3' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [hasBio, setHasBio] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);

  useEffect(() => {
    isBiometricsSupported().then(supported => {
      setBioSupported(supported);
      if (profile?.uid) {
        setHasBio(hasBiometricsRegisteredForUser(profile.uid));
      }
    });
  }, [profile?.uid]);
  
  // Accordion active sections (Todos cerrados por defecto)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cuenta: false,
    sonidos: false,
    animaciones: false,
    notificaciones: false,
    gestion: false,
    apariencia: false,
    privacidad: false
  });

  const [demoBurstTrigger, setDemoBurstTrigger] = useState(false);
  const [showGamifiedDemo, setShowGamifiedDemo] = useState(false);

  useEffect(() => {
    if (showGamifiedDemo) {
      const timer = setTimeout(() => {
        setShowGamifiedDemo(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showGamifiedDemo]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const isCurrentlyOpen = prev[section];
      return {
        cuenta: false,
        sonidos: false,
        animaciones: false,
        notificaciones: false,
        gestion: false,
        apariencia: false,
        privacidad: false,
        [section]: !isCurrentlyOpen
      };
    });
  };

  // ── SOUNDS & AUDIO STATE ──────────────────────────────────────────────
  const [selectedUiSound, setSelectedUiSound] = useState<SoundProfileId>(() => getUiSoundProfile());
  const [eventSounds, setEventSounds] = useState(() => getEventSoundMap());

  const handleSelectEventSound = (event: ActionEventType, soundId: string) => {
    setEventSound(event, soundId);
    setEventSounds(prev => ({ ...prev, [event]: soundId }));
    const opt = ALL_SOUND_OPTIONS.find(o => o.id === soundId);
    if (opt) opt.playFn();
  };

  const handleSelectUiSound = (id: SoundProfileId) => {
    setSelectedUiSound(id);
    setUiSoundProfile(id);
    playUiSound(id);
  };

  // ── NOTIFICATIONS STATE ────────────────────────────────────────────────
  const [notifLocalEnabled, setNotifLocalEnabled] = useState(() => {
    return localStorage.getItem('notifications_enabled') !== 'false';
  });
  const [notifPushEnabled, setNotifPushEnabled] = useState(() => {
    return localStorage.getItem('notifications_push_enabled') !== 'false';
  });
  const [notifInAppEnabled, setNotifInAppEnabled] = useState(() => {
    return localStorage.getItem('notifications_inapp_enabled') !== 'false';
  });
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(() => {
    return localStorage.getItem('notifications_sound_enabled') !== 'false';
  });
  const [selectedTone, setSelectedTone] = useState(() => {
    return localStorage.getItem('notifications_sound_tone') || 'default';
  });

  // Sync state modifications to localStorage
  useEffect(() => {
    localStorage.setItem('notifications_enabled', String(notifLocalEnabled));
  }, [notifLocalEnabled]);
  useEffect(() => {
    localStorage.setItem('notifications_push_enabled', String(notifPushEnabled));
  }, [notifPushEnabled]);
  useEffect(() => {
    localStorage.setItem('notifications_inapp_enabled', String(notifInAppEnabled));
  }, [notifInAppEnabled]);
  useEffect(() => {
    localStorage.setItem('notifications_sound_enabled', String(notifSoundEnabled));
  }, [notifSoundEnabled]);
  useEffect(() => {
    localStorage.setItem('notifications_sound_tone', selectedTone);
  }, [selectedTone]);

  const handleToggleLocalNotifs = async () => {
    if (!('Notification' in window)) {
      toast.error('Este dispositivo no soporta notificaciones');
      return;
    }
    
    if (notifLocalEnabled) {
      // Turn off
      try {
        await unregisterNotifications(user?.uid || '');
        setNotifLocalEnabled(false);
        toast.info('Notificaciones desactivadas localmente');
      } catch (err) {
        toast.error('Error al desactivar notificaciones');
      }
    } else {
      // Turn on
      if (Notification.permission === 'denied') {
        toast.error('El permiso está bloqueado. Actívalo en la Guía de Notificaciones o en los Ajustes del celular.');
        return;
      }
      try {
        const token = await requestNotificationPermission(user?.uid || '');
        if (token) {
          setNotifLocalEnabled(true);
          toast.success('¡Notificaciones activadas con éxito!');
        }
      } catch (err) {
        toast.error('Error al solicitar permisos');
      }
    }
  };

  const handleTestTone = (toneId: string) => {
    // Temporarily save to localstorage to test tone
    const prevTone = localStorage.getItem('notifications_sound_tone');
    localStorage.setItem('notifications_sound_tone', toneId);
    playNotificationSound();
    // Restore
    if (prevTone) localStorage.setItem('notifications_sound_tone', prevTone);
  };

  // ── THEME & APARIENCIA STATE ──────────────────────────────────────────
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    return localStorage.getItem('ui_animations_enabled') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('ui_animations_enabled', String(animationsEnabled));
  }, [animationsEnabled]);

  const [selectedThemesOrder, setSelectedThemesOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('active_themes_order');
    try {
      return saved ? JSON.parse(saved) : ['light', 'dark', 'glass'];
    } catch {
      return ['light', 'dark', 'glass'];
    }
  });

  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const handleThemeClick = (themeId: string) => {
    if (selectedThemesOrder.includes(themeId)) {
      // De-select
      if (selectedThemesOrder.length <= 1) {
        toast.error('Debes tener al menos 1 tema activo.');
        return;
      }
      const newOrder = selectedThemesOrder.filter(id => id !== themeId);
      setSelectedThemesOrder(newOrder);
      localStorage.setItem('active_themes_order', JSON.stringify(newOrder));
      
      // If we deselected the currently active theme, switch active to the first remaining one
      if (activeTheme === themeId) {
        handleSetActiveTheme(newOrder[0]);
      }
    } else {
      // Select
      if (selectedThemesOrder.length >= 3) {
        toast.error('Puedes tener un máximo de 3 temas activos en el menú.');
        return;
      }
      const newOrder = [...selectedThemesOrder, themeId];
      setSelectedThemesOrder(newOrder);
      localStorage.setItem('active_themes_order', JSON.stringify(newOrder));
    }
  };

  const handleSetActiveTheme = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem('theme', themeId);
    
    // Apply classes to DocumentElement
    const root = window.document.documentElement;
    
    // Clear custom theme classes
    root.classList.remove('dark', 'theme-cyber', 'theme-kilo', 'theme-glass');
    
    if (themeId === 'dark') {
      root.classList.add('dark');
    } else if (themeId === 'cyber') {
      root.classList.add('dark', 'theme-cyber');
    } else if (themeId === 'kilo') {
      root.classList.add('dark', 'theme-kilo');
    } else if (themeId === 'glass') {
      root.classList.add('theme-glass');
    }
    
    toast.success(`Tema cambiado a ${ALL_THEMES.find(t => t.id === themeId)?.name}`);
  };

  // ── RESET PASSWORD ───────────────────────────────────────────────────
  const [sendingReset, setSendingReset] = useState(false);
  const handleResetPassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success('Se ha enviado un correo electrónico para restablecer tu contraseña.');
    } catch (err: any) {
      toast.error('Error al enviar correo de recuperación: ' + err.message);
    } finally {
      setSendingReset(false);
    }
  };

  // ── ACCOUNT DELETION ──────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // 1. Delete user doc in Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      // 2. Delete auth user
      await deleteUser(user);
      toast.success('Cuenta eliminada con éxito.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      toast.error('Para eliminar tu cuenta debes haber iniciado sesión recientemente. Intenta cerrar sesión y volver a entrar.');
    }
  };

  // ── CLEAR CACHE ──────────────────────────────────────────────────────
  const handleClearCache = async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let reg of regs) {
        await reg.unregister();
      }
    }
    localStorage.clear();
    toast.success('Caché del sistema borrada. Recargando...');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const isAdminOrOwner = profile?.role === 'admin' || profile?.role === 'propietario';

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-24 text-on-surface">
      {/* Header */}
      <div className="px-4 py-6 border-b border-outline/10 flex items-center gap-3 bg-white/50 backdrop-blur-md sticky top-0 z-30">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-2xl hover:bg-surface-container transition-all active:scale-95"
        >
          <ChevronLeft className="w-6 h-6 text-secondary" />
        </button>
        <div>
          <p className="text-[9px] font-black text-secondary uppercase tracking-widest leading-none">Centro de Control</p>
          <h1 className="text-2xl font-headline font-bold text-on-surface mt-0.5">Configuración</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">

        {/* ── SECCIÓN 1: CUENTA Y PERFIL ── */}
        <div className="bg-white dark:bg-surface-container rounded-3xl overflow-hidden shadow-sm border border-outline/10">
          <button 
            onClick={() => toggleSection('cuenta')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container/30 transition-colors"
          >
            <span className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Cuenta y Perfil
            </span>
            <span className="text-xs text-secondary">{openSections.cuenta ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence initial={false}>
            {openSections.cuenta && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-outline/10"
              >
                <div className="p-4 space-y-3">
                  {/* Mi Perfil item */}
                  <div 
                    onClick={() => navigate('/profile')}
                    className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Mi Perfil</p>
                        <p className="text-[10px] text-secondary">Editar nombre, foto y teléfono</p>
                      </div>
                    </div>
                    <span className="text-secondary text-xs">➔</span>
                  </div>

                  {/* Password reset item */}
                  <div 
                    onClick={handleResetPassword}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer",
                      sendingReset && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Key className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Cambiar contraseña</p>
                        <p className="text-[10px] text-secondary">Enviar correo electrónico de recuperación</p>
                      </div>
                    </div>
                    {sendingReset ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-[10px] text-blue-500 font-bold uppercase bg-blue-500/10 px-2.5 py-1 rounded-full">Enviar</span>
                    )}
                  </div>

                  {/* Biometrics (Huella Dactilar / Face ID) item */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
                        <Fingerprint className="w-5 h-5 text-fuchsia-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Ingreso por Huella / Face ID</p>
                        <p className="text-[10px] text-secondary">
                          {bioSupported ? 'Acceso biométrico rápido en este celular' : 'No compatible con este navegador'}
                        </p>
                      </div>
                    </div>
                    {bioSupported && (
                      <button
                        onClick={async () => {
                          if (!profile) return;
                          if (hasBio) {
                            removeBiometricCredential(profile.uid);
                            setHasBio(false);
                          } else {
                            const ok = await registerBiometricCredential({
                              uid: profile.uid,
                              email: profile.email || '',
                              name: profile.name || 'Usuario'
                            });
                            if (ok) setHasBio(true);
                          }
                        }}
                        className={cn(
                          "text-[10px] font-black uppercase px-3 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer",
                          hasBio ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 hover:scale-105 active:scale-95"
                        )}
                      >
                        {hasBio ? '✓ Activada' : '+ Activar'}
                      </button>
                    )}
                  </div>

                  {/* Account Role item */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Rol de la cuenta</p>
                        <p className="text-[10px] text-secondary">Nivel de acceso en la heladería</p>
                      </div>
                    </div>
                    <span className="text-xs font-black uppercase text-purple-600 bg-purple-500/10 px-3 py-1 rounded-full">
                      {profile?.role || 'Invitado'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SECCIÓN 2: SONIDOS Y AUDIO ── */}
        <div className="bg-white dark:bg-surface-container rounded-3xl overflow-hidden shadow-sm border border-outline/10">
          <button 
            onClick={() => toggleSection('sonidos')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container/30 transition-colors"
          >
            <span className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" /> Sonidos y Audio
            </span>
            <span className="text-xs text-secondary">{openSections.sonidos ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence initial={false}>
            {openSections.sonidos && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-outline/10"
              >
                <div className="p-5 space-y-6">
                  {/* SUBSECCIÓN 1: SONIDOS DE INTERFAZ */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-secondary tracking-widest flex items-center gap-2 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Sonidos de Interfaz (Menú Inferior)
                      </h3>
                      <p className="text-[11px] text-secondary leading-relaxed">
                        Selecciona el efecto sintetizado por código (0 descargas de red) que sonará al cambiar entre las pestañas del menú inferior y botones:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {SOUND_PROFILES.map((profile) => {
                        const isSelected = selectedUiSound === profile.id;
                        return (
                          <div
                            key={profile.id}
                            onClick={() => handleSelectUiSound(profile.id)}
                            className={cn(
                              "sound-card p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all duration-200 active:scale-[0.98]",
                              isSelected
                                ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-xs ring-1 ring-primary/30"
                                : "border-outline/15 bg-white dark:bg-surface-container hover:bg-surface-container-high shadow-xs"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
                                {profile.emoji}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-on-surface">
                                    {profile.name}
                                  </span>
                                  {profile.isDefault && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                                      Por defecto
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-secondary mt-0.5">
                                  {profile.desc}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full border border-outline/25" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botón Probar Sonido Seleccionado */}
                    <button
                      onClick={() => playUiSound(selectedUiSound)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
                    >
                      <Volume2 className="w-4 h-4 stroke-[2.5]" />
                      PROBAR SONIDO SELECCIONADO
                    </button>
                  </div>

                  {/* SUBSECCIÓN 2: TONOS DE ALERTAS Y NOTIFICACIONES */}
                  <div className="border-t border-outline/10 pt-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-secondary tracking-widest flex items-center gap-2 mb-1">
                        <Music className="w-3.5 h-3.5 text-pink-500" /> Tonos de Alerta y Notificaciones
                      </h3>
                      <p className="text-[11px] text-secondary leading-relaxed">
                        Configura el comportamiento sonoro de las alertas cuando entren nuevos pedidos a la heladería:
                      </p>
                    </div>

                    {/* Switch: Efecto de Sonido Notificaciones */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                          <Volume2 className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">Sonido de Alerta de Pedidos</p>
                          <p className="text-[10px] text-secondary">Reproducir tonos de alerta al recibir nuevos pedidos</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setNotifSoundEnabled(!notifSoundEnabled)}
                        className={cn(
                          "w-11 h-6 rounded-full transition-all relative flex-shrink-0",
                          notifSoundEnabled ? "bg-primary" : "bg-outline/30"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                          notifSoundEnabled ? "left-6" : "left-1"
                        )} />
                      </button>
                    </div>

                    {/* SELECTOR DE TONOS CON EL ESTILO UNIFICADO DE LA IMAGEN 1 */}
                    {notifSoundEnabled && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-pink-500" />
                          <h4 className="text-xs font-bold text-on-surface">Tono de Pedido Entrante</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {ALERT_TONES.map(tone => {
                            const isSelected = selectedTone === tone.id;
                            const emoji = tone.id === 'dli' ? '🔔' : tone.id === 'smooth' ? '🍿' : tone.id === 'slick' ? '⚡' : '🎵';
                            return (
                              <div 
                                key={tone.id}
                                onClick={() => {
                                  setSelectedTone(tone.id);
                                  handleTestTone(tone.id);
                                }}
                                className={cn(
                                  "sound-card p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all duration-200 active:scale-[0.98]",
                                  isSelected 
                                    ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-xs ring-1 ring-primary/30" 
                                    : "border-outline/15 bg-white dark:bg-surface-container hover:bg-surface-container-high shadow-xs"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
                                    {emoji}
                                  </div>
                                  <div>
                                    <span className="font-bold text-xs text-on-surface">{tone.name}</span>
                                    <p className="text-[10px] text-secondary mt-0.5">Toca para seleccionar y escuchar muestra</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSelected ? (
                                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                                      <Check className="w-4 h-4 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full border border-outline/25" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SUBSECCIÓN 3: ASIGNACIÓN PERSONALIZADA DE SONIDOS POR ACCIÓN */}
                  <div className="border-t border-outline/10 pt-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-secondary tracking-widest flex items-center gap-2 mb-1">
                        <SettingsIcon className="w-3.5 h-3.5 text-fuchsia-500" /> Asignación de Sonidos por Acción
                      </h3>
                      <p className="text-[11px] text-secondary leading-relaxed">
                        Selecciona el tono sintetizado Web Audio API (0 KB de red) que sonará para cada tipo de transacción en la heladería:
                      </p>
                    </div>

                    {/* EVENTOS DE SONIDO CONFIGURABLES */}
                    {(
                      [
                        { key: 'new_order', label: '🛒 Nuevo Pedido Entrante', desc: 'Sonido al recibir un pedido de cliente' },
                        { key: 'income', label: '📈 Cobro / Venta Guardada', desc: 'Sonido al registrar ingreso en POS' },
                        { key: 'expense', label: '📉 Egreso / Registro de Gasto', desc: 'Sonido al guardar un egreso de caja' },
                        { key: 'edit', label: '✏️ Edición de Registro / Precios', desc: 'Sonido al modificar datos existentes' },
                        { key: 'delete', label: '🗑️ Eliminación / Borrado de Venta', desc: 'Sonido al anular o borrar factura' },
                        { key: 'burst', label: '🚀 Celebración / Ráfaga 3D (Desplazamiento)', desc: 'Sonido al desplazar partículas hacia los extremos' },
                      ] as { key: ActionEventType; label: string; desc: string }[]
                    ).map(ev => {
                      const currentSoundId = eventSounds[ev.key];
                      const selectedOpt = ALL_SOUND_OPTIONS.find(o => o.id === currentSoundId) || ALL_SOUND_OPTIONS[0];

                      return (
                        <div key={ev.key} className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-on-surface flex items-center gap-1.5">
                              <span>{ev.label}</span>
                            </p>
                            <p className="text-[10px] text-secondary mt-0.5">{ev.desc}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={currentSoundId}
                              onChange={(e) => handleSelectEventSound(ev.key, e.target.value)}
                              className="bg-white dark:bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[210px] truncate shadow-xs"
                            >
                              {ALL_SOUND_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => selectedOpt.playFn()}
                              className="p-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all active:scale-95 flex-shrink-0 shadow-xs"
                              title="Escuchar sonido asignado"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SECCIÓN 3: GALERÍA Y PROBADOR DE ANIMACIONES 3D & SONIDOS ── */}
        <div className="bg-white dark:bg-surface-container rounded-3xl overflow-hidden shadow-sm border border-outline/10">
          <button 
            onClick={() => toggleSection('animaciones')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container/30 transition-colors"
          >
            <span className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-500" /> Galería & Probador de Animaciones
            </span>
            <span className="text-xs text-secondary">{openSections.animaciones ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence initial={false}>
            {openSections.animaciones && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-outline/10"
              >
                <div className="p-5 space-y-6">
                  {/* SWITCH PRINCIPAL: ANIMACIONES DINÁMICAS DE PRODUCTOS */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-on-surface">Animaciones Dinámicas de Productos</p>
                        <p className="text-[10px] text-secondary">Efectos de flotación y movimiento en imágenes de productos</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setAnimationsEnabled(!animationsEnabled)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-all relative flex-shrink-0 cursor-pointer",
                        animationsEnabled ? "bg-primary" : "bg-outline/30"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                        animationsEnabled ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>

                  {/* PRESENTACIÓN */}
                  <div className="bg-gradient-to-r from-fuchsia-500/10 via-primary/10 to-amber-500/10 p-4 rounded-2xl border border-fuchsia-500/20">
                    <h4 className="font-black text-xs uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-4 h-4 animate-spin" /> Probador Interactivo de Animaciones D'LI
                    </h4>
                    <p className="text-[11px] text-secondary leading-relaxed">
                      Explora y prueba en tiempo real todas las físicas 3D, efectos de partículas, micro-interacciones de la interfaz y sonidos sintetizados por Web Audio API implementados en la aplicación.
                    </p>
                  </div>

                  {/* 1. ANIMACIÓN 3D GAMIFICADA */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                      ⭐ 1. Celebración 3D Gamificada (Temu / Mario Style)
                    </h4>
                    <p className="text-[11px] text-secondary">
                      Portal modal holográfico 3D con marco neón (`shimmer-sweep`), abanico de luz (`sunburst`), ráfaga de partículas (`star-burst-up`) y rebote elástico (`mario-temu-pop`).
                    </p>
                    <button
                      onClick={() => {
                        playEventSound('burst');
                        setShowGamifiedDemo(true);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-primary to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-fuchsia-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" /> DISPARAR ANIMACIÓN 3D GAMIFICADA
                    </button>
                  </div>

                  {/* 2. TRAYECTORIA DUAL */}
                  <div className="space-y-3 border-t border-outline/10 pt-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                      🚀 2. Ráfaga de Trayectoria Dual (Campana + Menú Pedidos)
                    </h4>
                    <p className="text-[11px] text-secondary">
                      Dispara partículas voladoras (helados 🍦, copas 🍨, monedas 🪙, estrellas ✨) que viajan simultáneamente hacia la campana y el menú inferior.
                    </p>
                    <button
                      onClick={() => setDemoBurstTrigger(true)}
                      className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      🚀 PROBAR RÁFAGA DE TRAYECTORIA DUAL
                    </button>
                  </div>

                  {/* 3. CONFETI ESTRELLA */}
                  <div className="space-y-3 border-t border-outline/10 pt-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                      🎉 3. Estallido de Confeti Celebración
                    </h4>
                    <button
                      onClick={() => {
                        playEventSound('income');
                        confetti({
                          particleCount: 120,
                          spread: 90,
                          origin: { y: 0.6 },
                          colors: ['#d946ef', '#f59e0b', '#fbbf24', '#fcd34d', '#c026d3']
                        });
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      🎉 LANZAR CONFETI FUCSIA & DORADO
                    </button>
                  </div>

                  {/* 4. EFECTOS RETRO MARIO 8-BIT */}
                  <div className="space-y-3 border-t border-outline/10 pt-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                      🍄 4. Efectos Retro Mario NES (Onda `square`)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={playMario1Up}
                        className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-between border border-emerald-500/20 active:scale-95 transition-all"
                      >
                        <span>🍄 1-UP (Vida Extra)</span>
                        <span className="text-[10px] opacity-60">▶</span>
                      </button>
                      <button
                        onClick={playMarioCoin}
                        className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-between border border-amber-500/20 active:scale-95 transition-all"
                      >
                        <span>🪙 Coin (Moneda)</span>
                        <span className="text-[10px] opacity-60">▶</span>
                      </button>
                      <button
                        onClick={playMarioJump}
                        className="p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-between border border-blue-500/20 active:scale-95 transition-all"
                      >
                        <span>🍄 Jump (Salto)</span>
                        <span className="text-[10px] opacity-60">▶</span>
                      </button>
                      <button
                        onClick={playMarioPipe}
                        className="p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-between border border-purple-500/20 active:scale-95 transition-all"
                      >
                        <span>🍄 Pipe (Tubo)</span>
                        <span className="text-[10px] opacity-60">▶</span>
                      </button>
                    </div>
                  </div>

                  {/* 5. TRANSACCIONES FINANCIERAS */}
                  <div className="space-y-3 border-t border-outline/10 pt-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                      📈 5. Transacciones Financieras Sintetizadas
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={playIncomeCelestial}
                        className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-between border border-emerald-500/20 active:scale-95 transition-all"
                      >
                        <span>📈 Ingreso Celestial</span>
                        <span className="text-[10px] opacity-60">▶</span>
                      </button>
                      <button
                        onClick={playExpenseResonant}
                        className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-between border border-rose-500/20 active:scale-95 transition-all"
                      >
                        <span>📉 Gasto Resonante</span>
                        <span className="text-[10px] opacity-60">▶</span>
                      </button>
                      <button
                        onClick={playEditCrystal}
                        className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold text-xs flex items-center justify-between border border-cyan-500/20 active:scale-95 transition-all"
                      >
                        <span>✏️ Edición Cristalina</span>
                        <span className="text-[10px] opacity-60">▶</span>
                      </button>
                      <button
                        onClick={playDeleteDeRez}
                        className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-between border border-red-500/20 active:scale-95 transition-all"
                      >
                        <span>🗑️ Eliminación De-Rez</span>
                        <span className="text-[10px] opacity-60">▶</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SECCIÓN 3: NOTIFICACIONES (CANALES Y PERMISOS) ── */}
        <div className="bg-white dark:bg-surface-container rounded-3xl overflow-hidden shadow-sm border border-outline/10">
          <button 
            onClick={() => toggleSection('notificaciones')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container/30 transition-colors"
          >
            <span className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notificaciones
            </span>
            <span className="text-xs text-secondary">{openSections.notificaciones ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence initial={false}>
            {openSections.notificaciones && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-outline/10"
              >
                <div className="p-4 space-y-4">
                  {/* Switch 1: Activar Notificaciones */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">Activar Notificaciones</p>
                        <p className="text-[10px] text-secondary">Permitir alertas locales en el navegador</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleToggleLocalNotifs}
                      className={cn(
                        "w-11 h-6 rounded-full transition-all relative flex-shrink-0",
                        notifLocalEnabled ? "bg-primary" : "bg-outline/30"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                        notifLocalEnabled ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>

                  {/* Switch 2: Notificaciones Push (Segundo Plano) */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">Notificación Push</p>
                        <p className="text-[10px] text-secondary">Recibir alertas en segundo plano (FCM)</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setNotifPushEnabled(!notifPushEnabled)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-all relative flex-shrink-0",
                        notifPushEnabled ? "bg-primary" : "bg-outline/30"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                        notifPushEnabled ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>

                  {/* Switch 3: Notificaciones In-App */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                        <Monitor className="w-4 h-4 text-sky-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">Notificación In-App</p>
                        <p className="text-[10px] text-secondary">Mensajes tipo toast emergentes mientras navegas</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setNotifInAppEnabled(!notifInAppEnabled)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-all relative flex-shrink-0",
                        notifInAppEnabled ? "bg-primary" : "bg-outline/30"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                        notifInAppEnabled ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SECCIÓN 3: GESTIÓN (Solo Vendedores/Admin/Propietarios) ── */}
        {isAdminOrOwner && (
          <div className="bg-white dark:bg-surface-container rounded-3xl overflow-hidden shadow-sm border border-outline/10">
            <button 
              onClick={() => toggleSection('gestion')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container/30 transition-colors"
            >
              <span className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-primary" /> Gestión Operativa
              </span>
              <span className="text-xs text-secondary">{openSections.gestion ? '▲' : '▼'}</span>
            </button>

            <AnimatePresence initial={false}>
              {openSections.gestion && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden border-t border-outline/10"
                >
                  <div className="p-4 space-y-3">
                    {/* Categorías */}
                    <div 
                      onClick={() => navigate('/admin/management?tab=inventario&subtab=categorias')}
                      className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <Layers className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Gestionar Categorías</p>
                          <p className="text-[10px] text-secondary">Ajustar nombres, colores e iconos de categorías</p>
                        </div>
                      </div>
                      <span className="text-secondary text-xs">➔</span>
                    </div>

                    {/* Usuarios */}
                    <div 
                      onClick={() => navigate('/admin/management?tab=personas&subtab=equipo')}
                      className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Gestionar Usuarios</p>
                          <p className="text-[10px] text-secondary">Modificar roles, asignar permisos de personal</p>
                        </div>
                      </div>
                      <span className="text-secondary text-xs">➔</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── SECCIÓN 4: APARIENCIA (TEMAS) ── */}
        <div className="bg-white dark:bg-surface-container rounded-3xl overflow-hidden shadow-sm border border-outline/10">
          <button 
            onClick={() => toggleSection('apariencia')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container/30 transition-colors"
          >
            <span className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Apariencia y Temas
            </span>
            <span className="text-xs text-secondary">{openSections.apariencia ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence initial={false}>
            {openSections.apariencia && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-outline/10"
              >
                <div className="p-6 space-y-6">
                  {/* Tema Activo */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-secondary tracking-widest mb-3">Tema Visual Activo</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {ALL_THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => handleSetActiveTheme(t.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all active:scale-95 gap-2",
                            activeTheme === t.id 
                              ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20" 
                              : "border-outline/10 hover:bg-surface-container"
                          )}
                        >
                          {t.icon}
                          <span className="text-[10px] font-black tracking-tight">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Configuración de Temas Rápidos */}
                  <div className="border-t border-outline/10 pt-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black uppercase text-secondary tracking-widest">Menú de Temas Rápidos</h3>
                      <span className="text-[9px] font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase">
                        {selectedThemesOrder.length} seleccionados (Máx 3)
                      </span>
                    </div>
                    <p className="text-[10px] text-secondary leading-relaxed mb-4">
                      Toca los temas a continuación para agregarlos u ocultarlos en el menú desplegable del perfil. El orden de selección determinará su posición.
                    </p>

                    <div className="space-y-2">
                      {ALL_THEMES.map(theme => {
                        const orderIndex = selectedThemesOrder.indexOf(theme.id);
                        const isSelected = orderIndex !== -1;
                        
                        return (
                          <div 
                            key={theme.id}
                            onClick={() => handleThemeClick(theme.id)}
                            className={cn(
                              "flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-[0.99]",
                              isSelected 
                                ? "border-primary bg-primary/5 text-primary" 
                                : "border-outline/10 hover:bg-surface-container"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {theme.icon}
                              <div>
                                <p className="text-xs font-bold text-on-surface">{theme.name}</p>
                                <p className="text-[9px] text-secondary">{theme.desc}</p>
                              </div>
                            </div>
                            
                            {isSelected ? (
                              <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                                {orderIndex + 1}
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border border-outline/25" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SECCIÓN 5: DATOS Y PRIVACIDAD ── */}
        <div className="bg-white dark:bg-surface-container rounded-3xl overflow-hidden shadow-sm border border-outline/10">
          <button 
            onClick={() => toggleSection('privacidad')}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container/30 transition-colors"
          >
            <span className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Datos y Privacidad
            </span>
            <span className="text-xs text-secondary">{openSections.privacidad ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence initial={false}>
            {openSections.privacidad && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-outline/10"
              >
                <div className="p-4 space-y-3">
                  {/* Limpiar Caché */}
                  <div 
                    onClick={handleClearCache}
                    className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-orange-500 animate-spin-slow" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Limpiar caché de la app</p>
                        <p className="text-[10px] text-secondary">Borrar archivos temporales y recargar</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2.5 py-1 rounded-full">Ejecutar</span>
                  </div>

                  {/* Eliminar Cuenta */}
                  <div className="p-3 rounded-2xl bg-surface-container-low space-y-3 border border-red-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-red-500">Eliminar cuenta permanente</p>
                          <p className="text-[10px] text-secondary">Borrar todos tus datos y accesos de la heladería</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                        className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2.5 py-1 rounded-full hover:bg-red-500 hover:text-white transition-all"
                      >
                        {showDeleteConfirm ? 'Cancelar' : 'Eliminar'}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showDeleteConfirm && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 space-y-3"
                        >
                          <p className="font-bold">🚨 ¡Atención! Esta acción no se puede deshacer.</p>
                          <p>Se borrará tu perfil y tu registro en la base de datos de la heladería. Para continuar, presiona el botón inferior.</p>
                          <button
                            onClick={handleDeleteAccount}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                          >
                            Sí, eliminar definitivamente
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* COMPONENTE DE DEMOSTRACIÓN DE RÁFAGA DE TRAYECTORIA DUAL */}
      <DualTrajectoryBurst 
        trigger={demoBurstTrigger} 
        onComplete={() => setDemoBurstTrigger(false)} 
      />

      {/* MODAL HOLOGRÁFICO DE CELEBRACIÓN 3D (DEMO TEMU / MARIO STYLE) */}
      <AnimatePresence>
        {showGamifiedDemo && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* 1. Telón de fondo con blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGamifiedDemo(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md animate-backdrop-fade pointer-events-auto"
            />

            {/* 2. Tarjeta 3D Holográfica */}
            <div className="relative z-10 w-full max-w-sm bg-gradient-to-b from-slate-900 via-fuchsia-950 to-slate-900 border-2 border-fuchsia-400/50 rounded-[2.5rem] p-6 shadow-[0_0_50px_rgba(217,70,239,0.4)] text-center overflow-hidden animate-mario-temu-pop">
              
              {/* Marco Neón Shimmer Sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent animate-shimmer-sweep pointer-events-none" />

              {/* Sunburst giratorio dual */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,rgba(245,158,11,0.15)_0%,transparent_70%)] animate-sunburst-cw pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,rgba(217,70,239,0.15)_0%,transparent_70%)] animate-sunburst-ccw pointer-events-none" />

              {/* Emblem flotante 3D */}
              <div className="relative z-20 flex justify-center -mt-3 mb-2 animate-badge-bounce">
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg border border-white/50">
                  ✨ DEMO 3D CELEBRACIÓN D'LI ✨
                </div>
              </div>

              {/* Partículas voladoras 8-Bit */}
              <div className="absolute inset-0 pointer-events-none">
                <span className="absolute left-6 bottom-10 text-2xl animate-star-burst-up">🍦</span>
                <span className="absolute right-6 bottom-12 text-2xl animate-star-burst-up" style={{ animationDelay: '0.4s' }}>🍧</span>
                <span className="absolute left-1/2 bottom-8 text-2xl animate-star-burst-up" style={{ animationDelay: '0.8s' }}>🪙</span>
                <span className="absolute right-12 bottom-6 text-2xl animate-star-burst-up" style={{ animationDelay: '1.2s' }}>⭐</span>
              </div>

              {/* Contenido principal */}
              <div className="relative z-20 space-y-3 py-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-fuchsia-500 to-amber-400 p-0.5 shadow-xl animate-bounce">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-4xl">
                    🍨
                  </div>
                </div>

                <h3 className="font-headline font-black text-2xl text-white tracking-wide">
                  ¡LOGRO DESBLOQUEADO!
                </h3>
                <p className="text-xs font-bold text-fuchsia-200/90 leading-relaxed px-2">
                  Demostración del motor de físicas 3D y Web Audio API sintetizado en tiempo real.
                </p>

                <button
                  onClick={() => setShowGamifiedDemo(false)}
                  className="mt-4 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-fuchsia-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  ¡ENTENDIDO! (CERRAR DEMO)
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
