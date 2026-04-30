import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader, { PageTitle } from './AppHeader';
import AdminSidebar from './AdminSidebar';
import BottomNav from './BottomNav';
import { useAuthStore } from '../stores/useAuthStore';
import { useHeaderStore } from '../stores/useHeaderStore';

export default function MainLayout() {
  const { profile } = useAuthStore();
  const { title, subtitle, rightExtra, actions } = useHeaderStore();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/pos');
  const showSidebar = isAdminRoute && (profile?.role === 'admin' || profile?.role === 'propietario' || profile?.role === 'vendedor');

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      {showSidebar && <AdminSidebar />}

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0">
        <AppHeader />
        
        {title && (
          <PageTitle 
            title={title}
            subtitle={subtitle}
            actions={actions}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Outlet />
        </div>

        <BottomNav />
      </main>
    </div>
  );
}
