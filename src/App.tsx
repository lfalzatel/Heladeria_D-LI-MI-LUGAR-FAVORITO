import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/useAuthStore';
import { useFlavorsStore, useSplashStore } from './stores/useFlavorsStore';
import { motion, AnimatePresence } from 'motion/react';

import Login from './pages/Login';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Seed from './pages/Seed';
import Supplies from './pages/Supplies';
import Inventory from './pages/Inventory';
import Management from './pages/Management';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import ClientCompras from './pages/ClientCompras';
import ClientPedidos from './pages/ClientPedidos';



export default function App() {
  const { initialize, user, profile, isLoading: authLoading } = useAuthStore();
  const { initialize: initFlavors } = useFlavorsStore();
  const { isVisible: splashVisible, message: splashMessage, progress: splashProgress, hideSplash } = useSplashStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Re-initialize flavors every time user authenticates (retries after permission-denied)
  useEffect(() => {
    if (user) {
      initFlavors();
    }
  }, [user, initFlavors]);



  // Handle splash completion
  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        hideSplash();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, hideSplash]);

  return (
    <Router>
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
              backgroundImage: "url('https://picsum.photos/seed/dli-boutique/1920/1080?blur=10')",
              backgroundSize: 'cover'
            }}></div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 text-center flex flex-col items-center"
            >
              <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-2xl mb-8 rotate-3">
                <h1 className="font-brand text-6xl text-white italic leading-none">D</h1>
              </div>
              <h2 className="font-headline font-bold text-3xl text-on-surface mb-2 tracking-tight">D'LI Boutique</h2>
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

        <Route path="/admin/supplies" element={
          user && profile && (profile.role === 'admin' || profile.role === 'propietario') 
            ? <Supplies /> 
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
            ? <ClientPedidos />
            : (authLoading ? null : <Navigate to="/login" />)
        } />

        <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
        <Route path="/admin/seed" element={<Seed />} />
        
        <Route path="/" element={<Navigate to={user && profile ? (profile.role === 'cliente' ? '/cliente/compras' : profile.role === 'vendedor' ? '/pos' : '/admin/dashboard') : '/login'} />} />
      </Routes>
    </Router>
  );
}

// Add custom animation to tailwind
// This would normally go in tailwind config but we can inject a style tag or 
// use a @keyframes in index.css. I added it to index.css in previous step if I had thought of it.
// Let's add it to index.css now.
