import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import { useHeaderStore } from '../stores/useHeaderStore';

interface AppHeaderProps {
  /** Muestra botón de regreso */
  backTo?: string;
}

/**
 * Header unificado para todas las páginas.
 */
export default function AppHeader({ backTo }: AppHeaderProps) {
  const navigate = useNavigate();
  const { leftExtra, rightExtra, showBell } = useHeaderStore();

  return (
    <header className="flex justify-between items-center px-4 sm:px-10 h-16 sm:h-24 bg-white/60 backdrop-blur-2xl border-b border-white/40 sticky top-0 z-[100] shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all">
      {/* ── Lado izquierdo ── */}
      <div className="flex items-center gap-3">
        {/* Logo D'LI Real */}
        {!backTo && (
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img 
              src="/pwa-192x192.png" 
              alt="D'LI" 
              className="w-full h-full object-contain drop-shadow-sm rounded-xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Back button */}
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </button>
        )}

        {/* Slot izquierdo personalizado */}
        {leftExtra}
      </div>

      {/* ── Lado derecho ── */}
      <div className="flex items-center gap-3">
        {rightExtra}
        
        {/* WhatsApp Button */}
        <a 
          href="https://wa.me/573011198206" 
          target="_blank" 
          rel="noopener noreferrer"
          className="relative p-2 rounded-full hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center text-secondary"
          title="Soporte WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
          </svg>
        </a>

        {showBell && <NotificationBell />}
        <UserMenu />
      </div>
    </header>
  );
}

/** Sub-componente: buscador listo para usar en el slot `left` */
export function HeaderSearch({
  value,
  onChange,
  placeholder = 'Buscar...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="hidden sm:flex items-center bg-surface-container rounded-xl px-4 py-2 border border-outline/50 w-64">
      <Search className="w-4 h-4 text-secondary/60 mr-2 flex-shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent border-none outline-none text-xs w-full text-on-surface placeholder:text-secondary/40 font-medium"
      />
    </div>
  );
}

/** Sub-componente: bloque título + subtítulo debajo del header */
export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-10 pt-8 pb-6 border-b border-outline/10 bg-gradient-to-b from-white to-surface-container-lowest/30 flex items-center justify-between gap-4 sticky top-16 sm:top-24 z-[90] backdrop-blur-md">
      <div className="min-w-0 flex-1">
        <h1 className="font-headline font-black text-xl sm:text-4xl text-on-surface tracking-tight leading-none mb-1 truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[8px] sm:text-[10px] font-black text-primary uppercase tracking-[0.2em] truncate">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
