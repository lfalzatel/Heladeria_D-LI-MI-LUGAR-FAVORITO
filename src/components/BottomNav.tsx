import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  MenuSquare, 
  Receipt, 
  LayoutDashboard,
  ShoppingBag,
  Users,
  BarChart3,
  Home,
  ShoppingCart,
  History,
  QrCode,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import { motion } from 'motion/react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  highlight?: boolean;
}

const NavItem = ({ to, icon, label, active, highlight }: NavItemProps) => {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center transition-all duration-300 w-full h-full text-center relative",
      highlight
        ? "text-white"
        : active 
          ? "text-white" 
          : "text-secondary/40 hover:text-secondary"
    )}>
      <div className={cn(
        "relative flex flex-col items-center justify-center transition-all duration-500",
        highlight
          ? "w-14 h-14 -mt-5 rounded-full bg-primary shadow-xl shadow-primary/40 ring-4 ring-white"
          : cn("px-3 py-1 rounded-2xl gap-1", active ? "bg-primary text-white shadow-lg shadow-primary/40 nav-item-active-pop" : "bg-transparent")
      )}>
        {React.cloneElement(icon as React.ReactElement, { 
          className: cn(
            "transition-transform duration-300",
            highlight ? "w-6 h-6 stroke-[2.5]" : cn("w-5 h-5", active ? "stroke-[2.5]" : "stroke-[2]")
          ) 
        })}
        
        {!highlight && (
          <span className={cn(
            "text-[9px] sm:text-[10px] uppercase font-black tracking-tight",
            active ? "opacity-100" : "opacity-80"
          )}>
            {label}
          </span>
        )}
      </div>
      
      {highlight && (
        <span className="text-[10px] font-black uppercase tracking-tight opacity-100 text-primary mt-1">
          {label}
        </span>
      )}
    </div>
  );

  return <Link to={to} className="flex-1 flex justify-center">{content}</Link>;
};

export default function BottomNav({ onCartOpen }: { onCartOpen?: () => void }) {
  const location = useLocation();
  const { profile } = useAuthStore();
  
  if (!profile) return null;

  const isVendedor = profile.role === 'vendedor';
  const isAdmin = profile.role === 'admin' || profile.role === 'propietario';
  const isCliente = profile.role === 'cliente';

  return (
    <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[96%] max-w-lg z-50">
      <div className="glass-panel rounded-full p-2 flex items-center justify-around shadow-2xl shadow-black/20 border-white/40 backdrop-blur-xl">
        
        {/* CLIENTE */}
        {isCliente && (
          <>
            <NavItem 
              to="/cliente/compras"
              icon={<ShoppingBag />}
              label="Comprar"
              active={location.pathname === '/cliente/compras'}
            />
            <NavItem 
              to="/cliente/pedidos"
              icon={<ShoppingCart />}
              label="Pedidos"
              active={location.pathname === '/cliente/pedidos'}
            />
            <NavItem 
              to="/cliente/historial"
              icon={<History />}
              label="Historial"
              active={location.pathname === '/cliente/historial'}
            />
            <NavItem 
              to="/profile"
              icon={<Users />}
              label="Perfil"
              active={location.pathname === '/profile'}
            />
          </>
        )}

        {/* VENDEDOR */}
        {isVendedor && (
          <>
            <NavItem 
              to="/pos" 
              icon={<MenuSquare />} 
              label="Vender" 
              active={location.pathname === '/pos'} 
            />
            <NavItem 
              to="/cliente/pedidos"
              icon={<ShoppingCart />}
              label="Pedidos"
              active={location.pathname === '/cliente/pedidos'}
            />
            <NavItem 
              to="/admin/dashboard"
              icon={<LayoutDashboard />}
              label="Dashboard"
              active={location.pathname === '/admin/dashboard'}
            />
            <NavItem 
              to="/profile"
              icon={<Users />}
              label="Perfil"
              active={location.pathname === '/profile'}
            />
          </>
        )}

        {/* ADMIN / PROPIETARIO */}
        {isAdmin && (
          <>
            <NavItem 
              to="/admin/dashboard" 
              icon={<Home />} 
              label="Inicio" 
              active={location.pathname === '/admin/dashboard'} 
            />
            <NavItem 
              to="/pos" 
              icon={<MenuSquare />} 
              label="Vender" 
              active={location.pathname === '/pos'} 
            />
            <NavItem 
              to="/admin/management" 
              icon={<Users />} 
              label="Gestión" 
              active={location.pathname === '/admin/management'} 
            />
            <NavItem 
              to="/admin/reports" 
              icon={<BarChart3 />} 
              label="Reportes" 
              active={location.pathname === '/admin/reports'} 
            />
            <NavItem 
              to="/cliente/pedidos"
              icon={<ShoppingCart />}
              label="Pedidos"
              active={location.pathname === '/cliente/pedidos'}
            />
          </>
        )}
      </div>
    </nav>
  );
}
