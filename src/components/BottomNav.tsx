import React, { useEffect, useState } from 'react';
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
import { playUiSound } from '../lib/soundEffects';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  highlight?: boolean;
  id?: string;
  badgeCount?: number;
}

const NavItem = ({ to, icon, label, active, highlight, id, badgeCount }: NavItemProps) => {
  const content = (
    <div id={id} className={cn(
      "flex flex-col items-center justify-center transition-colors duration-300 w-full h-full text-center relative",
      highlight
        ? "text-white"
        : active 
          ? "text-primary" 
          : "text-primary/40 hover:text-primary/70"
    )}>
      <div className={cn(
        "relative flex flex-col items-center justify-center gap-1",
        highlight
          ? "w-14 h-14 -mt-5 rounded-full bg-primary shadow-xl shadow-primary/40 ring-4 ring-white transition-all duration-300"
          : cn(
              "px-3 py-1.5 rounded-2xl",
              active ? "bg-primary text-white shadow-lg shadow-primary/40 animate-push-settle" : "bg-transparent transition-all duration-300"
            )
      )}>
        
        {React.cloneElement(icon as React.ReactElement, { 
          className: cn(
            highlight ? "w-6 h-6 stroke-[2.5]" : cn("w-5 h-5", active ? "stroke-[2.5]" : "stroke-[2]"),
            active && !highlight ? "animate-micro-bounce" : ""
          ),
          style: active && !highlight ? { animationDelay: '0.45s' } : {}
        })}
        
        {badgeCount && badgeCount > 0 ? (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white animate-badge-bounce shadow-md">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        ) : null}

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

  return <Link to={to} onClick={() => playUiSound()} className="flex-1 flex justify-center">{content}</Link>;
};

export default function BottomNav({ onCartOpen }: { onCartOpen?: () => void }) {
  const location = useLocation();
  const { profile } = useAuthStore();
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  
  useEffect(() => {
    if (!profile) return;
    const isStaff = profile.role === 'admin' || profile.role === 'propietario' || profile.role === 'vendedor';
    const q = isStaff
      ? query(collection(db, 'pedidos'), limit(50))
      : query(collection(db, 'pedidos'), where('clienteId', '==', profile.uid));

    const unsub = onSnapshot(q, (snap) => {
      const active = snap.docs.filter(d => ['pendiente', 'aceptado', 'celebrado'].includes(d.data().status));
      setActiveOrdersCount(active.length);

      const unread = snap.docs.some(d => {
        const data = d.data();
        const msgs = data.chatMessages || data.messages || [];
        return Array.isArray(msgs) && msgs.some((m: any) => !m.read && m.senderId !== profile.uid);
      });
      setHasUnreadChat(unread);
    });
    return unsub;
  }, [profile]);

  if (!profile) return null;

  const isVendedor = profile.role === 'vendedor';
  const isAdmin = profile.role === 'admin' || profile.role === 'propietario';
  const isCliente = profile.role === 'cliente';

  return (
    <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[96%] max-w-lg z-50">
      <div className={cn(
        "glass-panel rounded-full p-2 flex items-center justify-around shadow-2xl shadow-black/20 border-white/40 backdrop-blur-xl transition-all",
        hasUnreadChat && "ring-2 ring-fuchsia-500/80 shadow-[0_0_30px_rgba(217,70,239,0.4)] animate-pulse"
      )}>
        
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
              id="bottom-nav-orders-target"
              to="/cliente/pedidos"
              icon={<ShoppingCart />}
              label="Pedidos"
              active={location.pathname === '/cliente/pedidos'}
              badgeCount={activeOrdersCount}
            />
            <NavItem 
              to="/cliente/historial"
              icon={<Receipt />}
              label="Gastos"
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
              id="bottom-nav-orders-target"
              to="/cliente/pedidos"
              icon={<ShoppingCart />}
              label="Pedidos"
              active={location.pathname === '/cliente/pedidos'}
              badgeCount={activeOrdersCount}
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
              id="bottom-nav-orders-target"
              to="/cliente/pedidos"
              icon={<ShoppingCart />}
              label="Pedidos"
              active={location.pathname === '/cliente/pedidos'}
              badgeCount={activeOrdersCount}
            />
          </>
        )}
      </div>
    </nav>
  );
}

