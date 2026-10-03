import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppHeader, { PageTitle } from './AppHeader';
import AdminSidebar from './AdminSidebar';
import BottomNav from './BottomNav';
import ActiveOrderFloatingPill from './ActiveOrderFloatingPill';
import { useAuthStore } from '../stores/useAuthStore';
import { useHeaderStore } from '../stores/useHeaderStore';
import { toast } from 'sonner';

export default function MainLayout() {
  const { profile } = useAuthStore();
  const { title, subtitle, rightExtra, actions } = useHeaderStore();
  const location = useLocation();
  const navigate = useNavigate();
  const lastViewRef = useRef<string>('');

  const isOperationalRoute = location.pathname.startsWith('/admin') || 
                             location.pathname.startsWith('/pos') || 
                             location.pathname.startsWith('/profile') || 
                             location.pathname.startsWith('/cliente');

  const showSidebar = isOperationalRoute && !!profile;

  useEffect(() => {
    let currentView = '';
    let toastMessage = '';
    let action: { label: string; onClick: () => void } | undefined = undefined;

    if (location.pathname.startsWith('/admin')) {
      currentView = 'admin';
      toastMessage = 'Estás en la vista Administrador (Centro de Control)';
    } else if (location.pathname.startsWith('/pos')) {
      currentView = 'pos';
      toastMessage = 'Estás en la vista Vendedor (Punto de Venta / Mesas)';
    } else if (location.pathname.startsWith('/cliente')) {
      currentView = 'cliente';
      const isStaff = profile && ['admin', 'propietario', 'vendedor'].includes(profile.role);
      if (isStaff) {
        toastMessage = 'Estás en la vista Cliente (Carta Digital / Domicilios)';
        action = {
          label: 'Ir a Vender (POS)',
          onClick: () => navigate('/pos')
        };
      } else {
        toastMessage = 'Estás en la vista Cliente';
      }
    }

    if (currentView && lastViewRef.current !== currentView) {
      lastViewRef.current = currentView;
      toast.info(toastMessage, {
        id: 'view-role-indicator-toast',
        duration: 3500,
        action: action
      });
    }
  }, [location.pathname, profile?.role, navigate]);

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      {showSidebar && <AdminSidebar />}

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0">
        <AppHeader />
        <ActiveOrderFloatingPill />
        
        {title && (
          <PageTitle 
            title={title}
            subtitle={subtitle}
            actions={actions}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden pb-24 lg:pb-0">
          <Outlet />
        </div>

        <BottomNav />
      </main>
    </div>
  );
}
