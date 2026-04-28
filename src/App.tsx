import { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { listenToForegroundMessages, requestNotificationPermission } from './lib/notifications';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/useAuthStore';
import { useFlavorsStore, useSplashStore } from './stores/useFlavorsStore';
import { motion, AnimatePresence } from 'motion/react';

import Login from './pages/Login';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Management from './pages/Management';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import ClientCompras from './pages/ClientCompras';
import ClientPedidos from './pages/ClientPedidos';
import ClientHistorial from './pages/ClientHistorial';



export default function App() {
  const { initialize, user, profile, isLoading: authLoading } = useAuthStore();
  const { initialize: initFlavors } = useFlavorsStore();
  const { isVisible: splashVisible, message: splashMessage, progress: splashProgress, hideSplash } = useSplashStore();

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    initialize();
    listenToForegroundMessages();
  }, [initialize]);

  const hasRequestedNotifs = useRef(false);

  // Re-initialize flavors and handle notifications
  useEffect(() => {
    if (user && profile) {
      initFlavors();
      
      if (!hasRequestedNotifs.current && 'Notification' in window) {
        // 1. Si ya tiene permiso, registrar el token silenciosamente
        if (Notification.permission === 'granted') {
          hasRequestedNotifs.current = true;
          requestNotificationPermission(user.uid).then(token => {
            if (token) localStorage.setItem('notifications_enabled', 'true');
          }).catch(err => {
            console.error('Error registrando token:', err);
            hasRequestedNotifs.current = false;
          });
        } 
        // 2. Si no ha decidido (default), pedir permiso automáticamente al ingresar
        else if (Notification.permission === 'default') {
          hasRequestedNotifs.current = true;
          // Pequeño delay para no interrumpir el splash screen
          setTimeout(() => {
            requestNotificationPermission(user.uid).then(token => {
              if (token) localStorage.setItem('notifications_enabled', 'true');
            }).catch(err => {
              console.error('Error pidiendo permiso:', err);
              hasRequestedNotifs.current = false;
            });
          }, 2000);
        }
      }
    }
  }, [user, profile, initFlavors]);



  // Guarantee splash stays at least 2.5 seconds upon user change (login/logout/initial load)
  useEffect(() => {
    useSplashStore.getState().showSplash('');
    setMinTimeElapsed(false);
    
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [user?.uid]);

  // Handle splash completion
  useEffect(() => {
    if (!authLoading && minTimeElapsed) {
      hideSplash();
    }
  }, [authLoading, minTimeElapsed, hideSplash]);

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Toaster position="top-center" richColors />
      
      <AnimatePresence>
        {splashVisible && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface overflow-hidden"
          >
            <div className="absolute inset-0 z-0 opacity-10" style={{
              backgroundImage: "url('https://picsum.photos/seed/dli-heladeria/1920/1080?blur=10')",
              backgroundSize: 'cover',
            }}></div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 text-center flex flex-col items-center"
            >
              <div className="relative flex items-center justify-center w-40 h-40 mb-8">
                {/* Anillo exterior (Gira a la derecha) */}
                <div className="absolute inset-0 rounded-full border-t-[3px] border-r-[3px] border-primary/80 animate-[spin_2.5s_linear_infinite]" />
                
                {/* Anillo interior (Gira a la izquierda) */}
                <div className="absolute inset-2 rounded-full border-b-[3px] border-l-[3px] border-emerald-400/80 animate-[spin_1.5s_linear_infinite_reverse]" />

                {/* Contenedor central circular de la imagen */}
                <div className="w-32 h-32 flex items-center justify-center flex-shrink-0 relative bg-surface rounded-full overflow-hidden shadow-2xl p-1 z-10">
                  <img 
                    src="/Background.png" 
                    alt="D'LI Heladería" 
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <h2 className="font-headline font-bold text-3xl text-on-surface mb-2 tracking-tight">D'LI Heladería</h2>
              <p className="font-brand text-xl text-primary italic mb-8">Mi Lugar Favorito</p>
              
              <div className="w-48 h-1.5 bg-surface-container-high rounded-full overflow-hidden mx-auto shadow-inner">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: authLoading ? "70%" : "100%" }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <p className="mt-4 text-[10px] uppercase font-bold text-secondary tracking-widest leading-relaxed">
                {splashMessage}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/login" element={user && profile ? <Navigate to={profile.role === 'cliente' ? '/cliente/compras' : profile.role === 'vendedor' ? '/pos' : '/admin'} /> : <Login />} />
        
        <Route path="/pos" element={
          user && profile ? <POS /> : (authLoading ? null : <Navigate to="/login" />)
        } />
        
        <Route path="/admin/dashboard" element={
          user && profile && (profile.role === 'admin' || profile.role === 'propietario' || profile.role === 'vendedor') 
            ? <Dashboard /> 
            : (authLoading ? null : <Navigate to="/login" />)
        } />


        <Route path="/admin/inventory" element={
          user && profile && (profile.role === 'admin' || profile.role === 'propietario') 
            ? <Inventory /> 
            : (authLoading ? null : <Navigate to="/login" />)
        } />

        <Route path="/admin/management" element={
          user && profile && (profile.role === 'admin' || profile.role === 'propietario') 
            ? <Management /> 
            : (authLoading ? null : <Navigate to="/login" />)
        } />

        <Route path="/admin/reports" element={
          user && profile && (profile.role === 'admin' || profile.role === 'propietario') 
            ? <Reports /> 
            : (authLoading ? null : <Navigate to="/login" />)
        } />

        <Route path="/admin/schedule" element={
          user && profile && (profile.role === 'admin' || profile.role === 'propietario' || profile.role === 'vendedor') 
            ? <Schedule /> 
            : (authLoading ? null : <Navigate to="/login" />)
        } />

        <Route path="/profile" element={
          user && profile ? <Profile /> : (authLoading ? null : <Navigate to="/login" />)
        } />

        {/* Client routes */}
        <Route path="/cliente/compras" element={
          user && profile && profile.role === 'cliente'
            ? <ClientCompras />
            : (authLoading ? null : <Navigate to="/login" />)
        } />
        <Route path="/cliente/pedidos" element={
          user && profile
            ? <ClientPedidos />
            : (authLoading ? null : <Navigate to="/login" />)
        } />
        <Route path="/cliente/historial" element={
          user && profile && (profile.role === 'cliente' || ['admin', 'propietario', 'vendedor'].includes(profile.role))
            ? <ClientHistorial />
            : (authLoading ? null : <Navigate to="/login" />)
        } />

        <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
        
        <Route path="/" element={<Navigate to={user && profile ? (profile.role === 'cliente' ? '/cliente/compras' : profile.role === 'vendedor' ? '/pos' : '/admin/dashboard') : '/login'} />} />
      </Routes>
    </Router>
  );
}

// Add custom animation to tailwind
// This would normally go in tailwind config but we can inject a style tag or 
// use a @keyframes in index.css. I added it to index.css in previous step if I had thought of it.
// Let's add it to index.css now.
