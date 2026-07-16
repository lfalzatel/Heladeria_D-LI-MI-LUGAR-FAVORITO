import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, User, Key, Shield, Bell, Smartphone, Monitor, 
  Volume2, Music, Check, Palette, Sparkles, LogOut, Trash2, 
  Layers, Users, RefreshCw, Settings as SettingsIcon
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
  
  // Accordion active sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cuenta: true,
    notificaciones: false,
    gestion: false,
    apariencia: false,
    privacidad: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const isCurrentlyOpen = prev[section];
      return {
        cuenta: false,
        notificaciones: false,
        gestion: false,
        apariencia: false,
        privacidad: false,
        [section]: !isCurrentlyOpen
      };
    });
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

        {/* ── SECCIÓN 2: NOTIFICACIONES ── */}
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

                  {/* Switch 4: Efectos de Sonido */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <Volume2 className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">Efecto de Sonido</p>
                        <p className="text-[10px] text-secondary">Reproducir tonos de alerta de pedidos</p>
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

                  {/* Select: Tono de Alerta */}
                  {notifSoundEnabled && (
                    <div className="p-3 rounded-2xl bg-surface-container-low space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                          <Music className="w-4 h-4 text-pink-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">Tono de Alerta</p>
                          <p className="text-[10px] text-secondary">Selecciona el tono de tu preferencia</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-1.5">
                        {ALERT_TONES.map(tone => (
                          <div 
                            key={tone.id}
                            onClick={() => setSelectedTone(tone.id)}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all active:scale-[0.99]",
                              selectedTone === tone.id 
                                ? "border-primary bg-primary/5 text-primary" 
                                : "border-outline/10 hover:bg-surface-container"
                            )}
                          >
                            <span className="text-xs font-medium">{tone.name}</span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleTestTone(tone.id); }}
                                className="text-[9px] font-bold uppercase tracking-wider bg-surface-container text-secondary hover:text-on-surface px-2.5 py-1 rounded-lg"
                              >
                                Probar
                              </button>
                              {selectedTone === tone.id && <Check className="w-4 h-4 text-primary" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
    </div>
  );
}
