import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  MenuSquare,
  Users,
  BarChart3,
  ShoppingCart,
  IceCream,
  Receipt,
  History,
  User,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function SidebarLink({ to, icon, label, active }: SidebarLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group',
        active
          ? 'bg-primary text-white shadow-lg shadow-primary/20'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      )}
    >
      <span className={cn(
        'w-5 h-5 flex-shrink-0 transition-transform duration-200',
        active ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-110'
      )}>
        {icon}
      </span>
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {active && (
        <span className="ml-auto w-2 h-2 rounded-full bg-white/60" />
      )}
    </Link>
  );
}

/**
 * Sidebar universal para todas las páginas.
 * Detecta el rol del usuario y muestra las opciones correspondientes.
 */
export default function AdminSidebar() {
  const location = useLocation();
  const { profile } = useAuthStore();

  if (!profile) return null;

  const isCliente = profile.role === 'cliente';
  const isVendedor = profile.role === 'vendedor';
  const isAdmin = profile.role === 'admin' || profile.role === 'propietario';

  const nav = [
    // Admin / Vendedor Links
    { to: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: isVendedor ? 'Mi Actividad' : 'Inicio', show: isAdmin || isVendedor },
    { to: '/pos',             icon: <MenuSquare className="w-5 h-5" />, label: 'Vender', show: isAdmin || isVendedor },
    
    // Client Links
    { to: '/cliente/compras', icon: <IceCream className="w-5 h-5" />, label: 'Comprar', show: isCliente },
    
    // Common / Management Links
    { to: '/admin/management',icon: <Users className="w-5 h-5" />, label: 'Gestión', show: isAdmin },
    { to: '/admin/inventory', icon: <ShoppingCart className="w-5 h-5" />, label: 'Menú & Stock', show: isAdmin },
    { to: '/admin/reports',   icon: <BarChart3 className="w-5 h-5" />, label: 'Reportes', show: isAdmin },
    
    // Orders (Everyone)
    { to: '/cliente/pedidos', icon: <Receipt className="w-5 h-5" />, label: isCliente ? 'Mis Pedidos' : 'Pedidos', show: true },
    
    // History & Profile (Client)
    { to: '/cliente/historial', icon: <History className="w-5 h-5" />, label: 'Historial', show: isCliente },
    { to: '/profile',         icon: <User className="w-5 h-5" />, label: 'Mi Perfil', show: isCliente },
  ].filter(item => item.show);

  return (
    <nav className="hidden lg:flex flex-col w-64 h-screen bg-sidebar-bg py-8 sticky top-0 z-40 flex-shrink-0 border-r border-white/5">
      {/* Logo */}
      <div className="px-6 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img 
              src="/pwa-512x512.png" 
              alt="D'LI" 
              className="w-full h-full object-contain drop-shadow-lg rounded-xl"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-white text-base leading-none tracking-tight">D'LI Heladería</span>
            <span className="font-brand text-xs text-white/70 italic leading-none mt-1">
              {isCliente ? 'Portal Clientes' : 'Panel de Control'}
            </span>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-1 px-4 flex-grow">
        {nav.map(item => (
          <SidebarLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.to}
          />
        ))}
      </div>

      {/* User info */}
      <div className="px-5 mt-auto">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {profile.role?.toUpperCase()}
          </p>
          <p className="text-sm font-bold text-white truncate">{profile.name || 'Usuario'}</p>
        </div>
      </div>
    </nav>
  );
}
