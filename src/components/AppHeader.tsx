import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

interface AppHeaderProps {
  /** Muestra botón de regreso */
  backTo?: string;
  /** Slot izquierdo personalizado (ej: buscador) */
  left?: React.ReactNode;
  /** Si true, muestra campana de notificaciones */
  showBell?: boolean;
  /** Slot derecho adicional antes del UserMenu */
  rightExtra?: React.ReactNode;
}

/**
 * Header unificado para todas las páginas.
 * Izquierda: logo D (mobile) + back button (opcional) + slot left
 * Derecha: bell (opcional) + UserMenu
 *
 * Los títulos y subtítulos de cada página deben ir
 * DEBAJO de este header, dentro del <main> de cada página.
 */
export default function AppHeader({ backTo, left, showBell = true, rightExtra }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex justify-between items-center px-4 sm:px-8 h-16 sm:h-20 bg-white/80 backdrop-blur-md border-b border-outline sticky top-0 z-[60]">
      {/* ── Lado izquierdo ── */}
      <div className="flex items-center gap-3">
        {/* Logo D — solo mobile sin sidebar */}
        {!backTo && (
          <div className="lg:hidden w-9 h-9 bg-primary rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-primary/20 flex-shrink-0">
            <span className="font-brand text-white font-bold text-xl leading-none">D</span>
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
        {left}
      </div>

      {/* ── Lado derecho ── */}
      <div className="flex items-center gap-3">
        {rightExtra}
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
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 sm:px-8 pt-5 pb-3 border-b border-outline/20 bg-surface-container-lowest">
      <h1 className="font-headline font-bold text-xl sm:text-2xl text-on-surface leading-tight">{title}</h1>
      {subtitle && (
        <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
