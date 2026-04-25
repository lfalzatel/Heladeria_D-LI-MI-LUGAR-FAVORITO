import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  LogOut, User, ChevronDown, Share2, Download, 
  Sun, Moon, Monitor, HelpCircle, Bell, BellOff,
  Settings, ChevronRight, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type Theme = 'light' | 'dark' | 'system';

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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [theme, setTheme] = useState<Theme>('system');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleShare = async () => {
    setIsOpen(false);
    const appUrl = 'https://heladeria-d-li-mi-lugar-favorito.vercel.app/';
    const whatsappMsg = encodeURIComponent(`¡Hola! Te comparto la app oficial de D'LI Heladería: ${appUrl}`);
    const whatsappUrl = `https://wa.me/?text=${whatsappMsg}`;
    // Try native share first, fallback to WhatsApp
    if (navigator.share) {
      try {
        await navigator.share({ title: "D'LI Boutique", text: "¡Descubre la app de D'LI Heladería!", url: appUrl });
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

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('¡App instalada!');
        setDeferredPrompt(null);
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

  const handleCopyLink = () => {
    setIsOpen(false);
    navigator.clipboard.writeText('https://heladeria-d-li-mi-lugar-favorito.vercel.app/');
    toast.success('Enlace de acceso copiado');
  };

  const roleLabel = ROLE_LABELS[profile?.role || ''] || profile?.role || '';
  const roleColor = ROLE_COLORS[profile?.role || ''] || 'text-primary';
  const roleDot = ROLE_DOT[profile?.role || ''] || 'bg-primary';
  const initials = getInitials(profile?.name);
  const avatarUrl = profile?.imageUrl || user?.photoURL;

  const THEMES: { id: Theme; icon: React.ReactNode; label: string }[] = [
    { id: 'light', icon: <Sun className="w-3.5 h-3.5" />, label: 'Claro' },
    { id: 'dark', icon: <Moon className="w-3.5 h-3.5" />, label: 'Oscuro' },
    { id: 'system', icon: <Monitor className="w-3.5 h-3.5" />, label: 'Sistema' },
  ];

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
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[90]"
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 4, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 350 }}
              className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-[2rem] shadow-2xl shadow-black/20 border border-outline/30 overflow-y-auto overflow-x-hidden z-[100] max-h-[95vh] hide-scrollbar"
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

            {/* Main menu */}
            <div className="p-2 border-b border-outline/10 space-y-0.5">
              <MenuItem
                icon={<User className="w-4 h-4" />}
                label="Mi Perfil"
                sublabel="Ver y editar datos personales"
                onClick={() => navigate('/profile')}
                closeMenu={() => setIsOpen(false)}
              />
              {/* Notifications toggle */}
              <button
                onClick={() => setNotificationsEnabled(v => !v)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left group hover:bg-surface-container"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-container">
                  {notificationsEnabled
                    ? <Bell className="w-4 h-4 text-on-surface" />
                    : <BellOff className="w-4 h-4 text-secondary" />}
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
                    onClick={() => navigate('/admin/inventory')}
                    closeMenu={() => setIsOpen(false)}
                  />
                  <MenuItem
                    icon={<Settings className="w-4 h-4" />}
                    label="Configuración"
                    sublabel="Ajustes del sistema"
                    onClick={() => toast.info('Configuración del sistema próximamente')}
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
                icon={<Download className="w-4 h-4" />}
                label="Instalar app"
                sublabel="Guardar en pantalla de inicio"
                onClick={handleInstall}
                closeMenu={() => setIsOpen(false)}
              />
              <MenuItem
                icon={<HelpCircle className="w-4 h-4" />}
                label="Ayuda y soporte"
                sublabel="Guía de uso de la app"
                onClick={() => toast.info('Centro de ayuda próximamente')}
                closeMenu={() => setIsOpen(false)}
              />
            </div>

            {/* Theme switcher */}
            <div className="px-4 py-3 border-b border-outline/10">
              <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-2">Apariencia</p>
              <div className="flex gap-1.5 bg-surface-container rounded-2xl p-1">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[9px] font-bold transition-all",
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

            {/* Sign out */}
            <div className="p-2">
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
    </div>
  );
}
