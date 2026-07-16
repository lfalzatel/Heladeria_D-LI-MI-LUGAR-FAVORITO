import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSavedAccountsStore } from '../stores/useSavedAccountsStore';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  Sun, Moon, Monitor, LogOut, Settings, Package, Share2, Download, 
  ChevronDown, Bell, BellOff, HelpCircle, User, ChevronRight, CircleAlert, X, Layers, Sparkles 
} from 'lucide-react';
import { requestNotificationPermission, unregisterNotifications } from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

type Theme = 'light' | 'dark' | 'system' | 'glass' | 'cyber' | 'kilo';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  propietario: 'Propietario',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
};

const ROLE_COLORS: Record<string, string> = {
  admin:      'text-emerald-500',
  propietario:'text-purple-500',
  vendedor:   'text-sky-500',
  cliente:    'text-primary',
};

const ROLE_DOT: Record<string, string> = {
  admin:      'bg-emerald-500',
  propietario:'bg-purple-500',
  vendedor:   'bg-sky-500',
  cliente:    'bg-primary',
};

// First name only
function getFirstName(name?: string) {
  if (!name) return 'Usuario';
  return name.trim().split(' ')[0];
}

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MenuItem({
  icon,
  label,
  sublabel,
  onClick,
  danger,
  iconBg,
  closeMenu,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  danger?: boolean;
  iconBg?: string;
  closeMenu?: () => void;
}) {
  const handleClick = () => {
    onClick?.();
    closeMenu?.();
  };
  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left group",
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-secondary hover:bg-surface-container hover:text-on-surface"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
        danger ? "bg-red-100 group-hover:bg-red-200" : (iconBg || "bg-surface-container group-hover:bg-outline/10")
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold leading-none", danger ? "text-red-500" : "text-on-surface")}>{label}</p>
        {sublabel && <p className={cn("text-[10px] mt-0.5 font-medium", danger ? "text-red-400" : "text-secondary")}>{sublabel}</p>}
      </div>
      {!danger && <ChevronRight className="w-3.5 h-3.5 text-outline/50 flex-shrink-0" />}
    </button>
  );
}

export default function UserMenu() {
  const { profile, user } = useAuthStore();
  const { accounts } = useSavedAccountsStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notifications_enabled');
      if (saved !== null) return saved === 'true';
      return 'Notification' in window && Notification.permission === 'granted';
    }
    return false;
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activeThemesOrder, setActiveThemesOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('active_themes_order');
    return saved ? JSON.parse(saved) : ['light', 'dark', 'glass'];
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      setIsStandalone(!!standalone);
    };
    checkStandalone();
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Sync notifications on open
      if ('Notification' in window) {
        setNotifPermission(Notification.permission);
        if (Notification.permission === 'granted') {
          const saved = localStorage.getItem('notifications_enabled');
          setNotificationsEnabled(saved !== 'false'); // If granted, assume true unless explicitly false
        } else {
          setNotificationsEnabled(false);
        }
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Sync themes list on menu open
    if (isOpen) {
      const saved = localStorage.getItem('active_themes_order');
      if (saved) {
        setActiveThemesOrder(JSON.parse(saved));
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync notifications status with browser permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
      const isGranted = Notification.permission === 'granted';
      // If permission is denied/default but we thought it was enabled, update state
      if (!isGranted && notificationsEnabled) {
        setNotificationsEnabled(false);
        localStorage.setItem('notifications_enabled', 'false');
      }
    }
  }, [notificationsEnabled]);

  // Persist theme changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('dark', 'theme-cyber', 'theme-kilo', 'theme-glass');
    
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else if (theme === 'cyber') {
      root.classList.add('dark', 'theme-cyber');
    } else if (theme === 'kilo') {
      root.classList.add('dark', 'theme-kilo');
    } else if (theme === 'glass') {
      root.classList.add('theme-glass');
    }
  }, [theme]);

  const handleShare = async () => {
    setIsOpen(false);
    const appUrl = 'https://heladeria-d-li-mi-lugar-favorito.vercel.app/';
    const whatsappMsg = encodeURIComponent(`¡Hola! Te comparto la app oficial de D'LI Heladería: ${appUrl}`);
    const whatsappUrl = `https://wa.me/?text=${whatsappMsg}`;
    // Try native share first, fallback to WhatsApp
    if (navigator.share) {
      try {
        await navigator.share({ title: "D'LI Heladería", text: "¡Descubre la app de D'LI Heladería!", url: appUrl });
        return;
      } catch {}
    }
    window.open(whatsappUrl, '_blank');
  };

  const handleShareApk = async () => {
    setIsOpen(false);
    const apkUrl = 'https://drive.google.com/file/d/1qYrsXav8uuIFL0gR3cH-6n9iOg7Wvl70/view?usp=drive_link';
    const whatsappMsg = encodeURIComponent(`¡Hola! Descarga la aplicación de Android (APK) de D'LI Heladería desde aquí: ${apkUrl}`);
    const whatsappUrl = `https://wa.me/?text=${whatsappMsg}`;
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: "D'LI Heladería (Android)", 
          text: "Instala la app oficial de D'LI Heladería directamente en tu celular Android.", 
          url: apkUrl 
        });
        return;
      } catch {}
    }
    window.open(whatsappUrl, '_blank');
  };

  const handleInstall = async () => {
    setIsOpen(false);
    
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (isStandalone) {
      return toast.success('¡La app ya está instalada!');
    }

    const prompt = (window as any).deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('¡App instalada!');
        (window as any).deferredPrompt = null;
      }
    } else if (isIOS) {
      toast.info(
        'Para instalar en iPhone/iPad: toca el botón "Compartir" (el cuadrado con flecha) y selecciona "Añadir a la pantalla de inicio".',
        { duration: 8000 }
      );
    } else {
      toast.info('Para instalar la app: abre el menú del navegador y selecciona "Instalar aplicación" o "Añadir a pantalla de inicio".');
    }
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    try {
      await signOut(auth);
      toast.success('Sesión cerrada');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const roleLabel = ROLE_LABELS[profile?.role || ''] || profile?.role || '';
  const roleColor = ROLE_COLORS[profile?.role || ''] || 'text-primary';
  const roleDot = ROLE_DOT[profile?.role || ''] || 'bg-primary';
  const initials = getInitials(profile?.name);
  const avatarUrl = profile?.imageUrl || user?.photoURL;

  const ALL_THEME_ITEMS: Record<string, { icon: React.ReactNode; label: string }> = {
    light: { icon: <Sun className="w-3.5 h-3.5" />, label: 'Claro' },
    dark: { icon: <Moon className="w-3.5 h-3.5" />, label: 'Oscuro' },
    system: { icon: <Monitor className="w-3.5 h-3.5" />, label: 'Sistema' },
    glass: { icon: <Layers className="w-3.5 h-3.5" />, label: 'Cristal' },
    cyber: { icon: <Sparkles className="w-3.5 h-3.5 text-cyan-500" />, label: 'Cyber' },
    kilo: { icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" />, label: 'Kilo' },
  };

  const THEMES = activeThemesOrder.map(id => ({
    id: id as Theme,
    icon: ALL_THEME_ITEMS[id]?.icon || <Sparkles className="w-3.5 h-3.5" />,
    label: ALL_THEME_ITEMS[id]?.label || id
  }));

  return (
    <div className="relative" ref={menuRef}>
      {/* Compact trigger — avatar + first name + role dot + chevron */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:border-primary/40 transition-all shadow-lg active:scale-95 group max-w-[120px] sm:max-w-none"
      >
        {/* Avatar with Google photo */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-primary/20 overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xs font-black text-primary">{getInitials(profile?.name)}</span>
          )}
          <div className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white", roleDot)} />
        </div>

        {/* First name + role */}
        <div className="flex flex-col items-start leading-none min-w-0">
          <span className="text-xs font-black text-on-surface truncate w-full max-w-[50px] sm:max-w-[100px]">{getFirstName(profile?.name)}</span>
          <span className={cn("text-[8px] sm:text-[9px] font-bold uppercase tracking-wider truncate w-full", roleColor)}>{roleLabel}</span>
        </div>

        <ChevronDown className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5 text-secondary/50 transition-transform duration-300 flex-shrink-0", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed top-16 sm:top-20 inset-x-0 bottom-0 bg-black/60 backdrop-blur-md z-[80]"
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 4, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 350 }}
              className="absolute right-0 mt-4 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-[2.5rem] shadow-2xl shadow-black/30 border border-outline/30 overflow-y-auto overflow-x-hidden z-[90] max-h-[calc(100vh-100px)] hide-scrollbar overscroll-contain flex flex-col"
            >
            {/* User card */}
            <div className="p-4 bg-gradient-to-br from-surface-container/60 to-white border-b border-outline/10">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-primary/20 flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={initials} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-base font-black text-primary">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm text-on-surface truncate">{profile?.name || 'Usuario'}</p>
                  <p className="text-[10px] text-secondary font-medium truncate">{profile?.email}</p>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full",
                    profile?.role === 'admin' ? "bg-emerald-50 text-emerald-600" :
                    profile?.role === 'propietario' ? "bg-purple-50 text-purple-600" :
                    profile?.role === 'cliente' ? "bg-primary/10 text-primary" :
                    "bg-sky-50 text-sky-600"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", roleDot)} />
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning if blocked */}
            {notifPermission === 'denied' && (
              <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-100 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-2">
                <CircleAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-black text-red-600">Notificaciones Bloqueadas</p>
                  {isStandalone ? (
                    <div className="text-[10px] text-red-500/90 font-medium leading-relaxed mt-1 space-y-1.5">
                      <p>Para desbloquearlas en la app instalada:</p>
                      <ol className="list-decimal pl-3 space-y-1">
                        <li>Ve a <b>Ajustes de tu celular</b> &rarr; <b>Aplicaciones</b> &rarr; <b>D'LI Heladería</b> &rarr; <b>Notificaciones</b> y marca <b>Permitir</b>.</li>
                        <li>Como la APK usa el motor de Chrome por debajo, si bloqueaste las notificaciones en la web anteriormente, abre <b>Google Chrome</b> en tu celular, ve a <code>heladeria-d-li-mi-lugar-favorito.vercel.app</code>, toca el <b>candado</b> al lado de la dirección y cámbialas a <b>Permitir</b>.</li>
                      </ol>
                    </div>
                  ) : (
                    <p className="text-[10px] text-red-500/80 font-medium leading-relaxed">
                      Has bloqueado las notificaciones en este navegador. Haz clic en el <b>candado</b> junto a la dirección web y actívalas para recibir alertas de pedidos.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Main menu */}
            <div className="p-2 border-b border-outline/10 space-y-0.5">
              <MenuItem
                icon={<User className="w-4 h-4" />}
                label="Mi Perfil"
                sublabel="Ver y editar datos personales"
                onClick={() => navigate('/profile')}
                closeMenu={() => setIsOpen(false)}
              />

              {/* Theme switcher (moved here) */}
              <div className="px-2 py-1.5 border-b border-outline/5">
                <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-1.5 px-1">Apariencia</p>
                <div className="flex gap-1.5 bg-surface-container rounded-2xl p-1">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl text-[9px] font-bold transition-all",
                        theme === t.id
                          ? "bg-white shadow-sm text-on-surface"
                          : "text-secondary hover:text-on-surface"
                      )}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Notifications toggle */}
              <button 
                 disabled={isRequestingPermission}
                 onClick={async () => {
                   if (!notificationsEnabled) {
                     if (!('Notification' in window)) {
                       return toast.error('Este navegador no soporta notificaciones');
                     }
                     
                     if (Notification.permission === 'denied') {
                       setNotifPermission('denied');
                       return toast.error('Has bloqueado las notificaciones. Por favor, actívalas en los ajustes del sitio (candado en la barra de direcciones).');
                     }
 
                     setIsRequestingPermission(true);
                     try {
                       const token = await requestNotificationPermission(profile?.uid || '');
                       if (token) {
                         setNotificationsEnabled(true);
                         setNotifPermission('granted');
                         localStorage.setItem('notifications_enabled', 'true');
                         toast.success('¡Notificaciones activadas!');
                       } else {
                         toast.error('No se pudo activar las notificaciones');
                       }
                     } catch (err) {
                       console.error(err);
                       toast.error('Error al solicitar permisos');
                     } finally {
                       setIsRequestingPermission(false);
                     }
                    } else {
                      setIsRequestingPermission(true);
                      try {
                        await unregisterNotifications(profile?.uid || '');
                        setNotificationsEnabled(false);
                        localStorage.setItem('notifications_enabled', 'false');
                        toast.info('Notificaciones desactivadas en este dispositivo');
                      } catch (err) {
                        console.error(err);
                        toast.error('Error al desactivar notificaciones');
                      } finally {
                        setIsRequestingPermission(false);
                      }
                    }
                 }}
                 className={cn(
                   "w-full flex items-center gap-3 p-3 rounded-2xl transition-all group border border-outline/5",
                   notificationsEnabled ? "bg-primary/5 hover:bg-primary/10" : "bg-surface-container/30 hover:bg-surface-container"
                 )}
               >
                 <div className={cn(
                   "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                   notificationsEnabled ? "bg-primary/10" : "bg-surface-container"
                 )}>
                   {isRequestingPermission ? (
                     <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                   ) : notificationsEnabled ? (
                     <Bell className="w-4 h-4 text-primary" />
                   ) : (
                     <BellOff className="w-4 h-4 text-secondary" />
                   )}
                 </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-on-surface">
                    {notificationsEnabled ? 'Notificaciones activas' : 'Notificaciones desactivadas'}
                  </p>
                  <p className="text-[10px] text-secondary font-medium">Toca para {notificationsEnabled ? 'desactivar' : 'activar'}</p>
                </div>
                {/* Toggle pill */}
                <div className={cn(
                  "w-11 h-6 rounded-full transition-all relative flex-shrink-0",
                  notificationsEnabled ? "bg-primary" : "bg-outline/30"
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                    notificationsEnabled ? "left-6" : "left-1"
                  )} />
                </div>
              </button>
              {(profile?.role === 'admin' || profile?.role === 'propietario') && (
                <>
                  <MenuItem
                    icon={<Package className="w-4 h-4" />}
                    label="Catálogo e Inventario"
                    sublabel="Gestionar menú y productos"
                    onClick={() => navigate('/admin/management?tab=inventario')}
                    closeMenu={() => setIsOpen(false)}
                  />
                  <MenuItem
                    icon={<Settings className="w-4 h-4" />}
                    label="Configuración"
                    sublabel="Ajustes del sistema"
                    onClick={() => navigate('/settings')}
                    closeMenu={() => setIsOpen(false)}
                  />
                </>
              )}
            </div>

            {/* App options */}
            <div className="p-2 border-b border-outline/10 space-y-0.5">
              <MenuItem
                icon={<Share2 className="w-4 h-4" />}
                label="Compartir app"
                sublabel="Invitar por WhatsApp u otras apps"
                onClick={handleShare}
                closeMenu={() => setIsOpen(false)}
              />
              <MenuItem
                icon={<Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                label="Compartir APK"
                sublabel="Descarga directa para Android"
                onClick={handleShareApk}
                closeMenu={() => setIsOpen(false)}
              />
              {!isStandalone && (
                <MenuItem
                  icon={<Download className="w-4 h-4" />}
                  label="Instalar app"
                  sublabel="Guardar en pantalla de inicio"
                  onClick={handleInstall}
                  closeMenu={() => setIsOpen(false)}
                />
              )}
              <MenuItem
                icon={<HelpCircle className="w-4 h-4 text-primary" />}
                label="Guía de Notificaciones"
                sublabel="Cómo activar alertas en celular"
                onClick={() => { setIsHelpModalOpen(true); setIsOpen(false); }}
                closeMenu={() => setIsOpen(false)}
              />
            </div>

            {/* Account Switcher */}
            <div className="px-2 py-3 border-b border-outline/10">
              <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-2 px-2">Cambiar Cuenta</p>
              <div className="flex flex-col gap-1">
                {accounts.filter(a => a.uid !== profile?.uid).map(acc => (
                  <button
                    key={acc.uid}
                    onClick={async () => {
                      setIsOpen(false);
                      toast.loading('Cambiando de cuenta...');
                      try {
                        const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
                        const provider = new GoogleAuthProvider();
                        provider.setCustomParameters({ login_hint: acc.email });
                        await signOut(auth);
                        await signInWithPopup(auth, provider);
                        toast.success(`Sesión iniciada como ${acc.name}`);
                      } catch (err: any) {
                        console.error("Error al cambiar cuenta", err);
                        toast.error('Error al cambiar de cuenta. ' + (err.message || ''));
                      } finally {
                        toast.dismiss();
                      }
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-surface-container transition-all group text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                      {acc.imageUrl ? (
                        <img src={acc.imageUrl} alt={acc.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 m-2 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{acc.name}</p>
                      <p className="text-[9px] text-secondary truncate">{acc.email}</p>
                    </div>
                  </button>
                ))}
                
                <MenuItem
                  icon={<User className="w-4 h-4" />}
                  label="Añadir otra cuenta"
                  sublabel="Iniciar sesión con Google"
                  onClick={async () => {
                    setIsOpen(false);
                    await signOut(auth);
                    navigate('/login');
                  }}
                />
              </div>
            </div>

            {/* Sign out and spacing */}
            <div className="p-2 pb-8">
              <MenuItem
                icon={<LogOut className="w-4 h-4" />}
                label="Cerrar Sesión"
                sublabel="Finalizar turno actual"
                onClick={handleSignOut}
                danger
                closeMenu={() => setIsOpen(false)}
              />
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

      {/* Help Modal (Portaled to body to prevent z-index stacking issues) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isHelpModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] overflow-y-auto p-4 flex justify-center items-start"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-surface-container rounded-3xl p-6 max-w-md w-full shadow-2xl border border-outline/20 relative my-auto"
              >
                <button
                  onClick={() => setIsHelpModalOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container transition-all"
                >
                  <X className="w-5 h-5 text-secondary" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-on-surface">Guía de Notificaciones</h3>
                    <p className="text-[10px] text-secondary uppercase font-bold tracking-wider">Activar alertas en celular</p>
                  </div>
                </div>

                <div className="space-y-6 text-sm text-on-surface">
                  {/* Android section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-outline/10 pb-1.5">
                      <span className="text-base font-black text-primary">🤖 Android (App / APK)</span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      Si no te llegan las notificaciones de ventas, pedidos o la app te dice que están bloqueadas, sigue estos pasos:
                    </p>
                    <ol className="list-decimal pl-5 text-xs space-y-2 leading-relaxed text-secondary-800">
                      <li>
                        <b>Ajustes del Celular:</b> Ve a los <i>Ajustes de tu celular</i> &rarr; <i>Aplicaciones</i> &rarr; <i>D'LI Heladería</i> &rarr; <i>Notificaciones</i> y asegúrate de marcar <b>"Permitir"</b>.
                      </li>
                      <li>
                        <b>Ajustes de Google Chrome:</b> Como la app usa el motor de Chrome, si los permisos están bloqueados en la web también se bloquearán en la APK. Abre <b>Chrome</b>, visita la web <code>heladeria-d-li-mi-lugar-favorito.vercel.app</code>, toca el icono del <b>candado</b> al lado de la dirección y asegúrate de cambiar Notificaciones a <b>"Permitir"</b>.
                      </li>
                    </ol>
                  </div>

                  {/* iOS section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-outline/10 pb-1.5">
                      <span className="text-base font-black text-primary">🍎 iPhone / iPad (Safari)</span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      En dispositivos Apple, la instalación y activación se hace así:
                    </p>
                    <ol className="list-decimal pl-5 text-xs space-y-2 leading-relaxed text-secondary-800">
                      <li>
                        <b>Instalación:</b> Abre Safari, visita la web de la heladería, toca el botón de <b>Compartir</b> (el cuadrado con la flecha) y selecciona <b>"Añadir a la pantalla de inicio"</b>.
                      </li>
                      <li>
                        <b>Notificaciones:</b> Abre la app desde tu pantalla de inicio, ve al menú de perfil y activa las notificaciones. Si no te deja, ve a <i>Ajustes de tu iPhone</i> &rarr; <i>Notificaciones</i> &rarr; <i>D'LI Heladería</i> y actívalas.
                      </li>
                    </ol>
                  </div>
                </div>

                <button
                  onClick={() => setIsHelpModalOpen(false)}
                  className="mt-6 w-full py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all active:scale-95 text-center"
                >
                  Entendido
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
