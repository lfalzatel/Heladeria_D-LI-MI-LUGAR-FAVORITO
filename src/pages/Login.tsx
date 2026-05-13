import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      navigate(profile.role === 'vendedor' ? '/pos' : '/admin/dashboard');
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Fast-track redirection based on email if profile is still loading
      const isVendedor = result.user.email?.includes('vendedo');
      navigate(isVendedor ? '/pos' : '/admin/dashboard');
      
      toast.success('¡Bienvenido!');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        toast.error('Credenciales incorrectas o usuario no creado.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('El inicio de sesión con correo está desactivado en Firebase.');
      } else {
        toast.error('Error al iniciar sesión. Verifica tu conexión.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const isAdminEmail = user.email === 'lfalzatel@gmail.com' || user.email === 'lfalzatel@gmai.com';
        const assignedRole = isAdminEmail ? 'admin' : 'cliente';
        
        await setDoc(userRef, {
          email: user.email,
          role: assignedRole,
          name: user.displayName || 'Usuario Google',
          createdAt: serverTimestamp()
        });
        toast.success(isAdminEmail ? 'Cuenta vinculada como Administrador' : 'Cuenta vinculada como Vendedor');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('El navegador bloqueó la ventana emergente.');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Token de sesión inválido. Por favor intenta de nuevo.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        toast.info('Solicitud cancelada.');
      } else {
        toast.error('Error al iniciar sesión con Google.');
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-surface relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4 sm:px-6 flex flex-col items-center relative z-10"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center flex-shrink-0 mb-4">
            <img 
              src="/pwa-192x192.png" 
              alt="D'LI" 
              className="w-full h-full object-contain drop-shadow-2xl rounded-[2.5rem] animate-float"
            />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="font-headline font-bold text-on-surface text-3xl sm:text-4xl leading-none tracking-tight">D'LI Heladería</h1>
            <p className="font-brand text-base sm:text-lg text-primary italic leading-none mt-2">Mi Lugar Favorito</p>
          </div>
        </div>

        <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-xl shadow-primary/5 border border-outline">
          <div className="text-center mb-6">
            <h2 className="font-headline text-xl font-bold text-on-surface tracking-tight">Bienvenido</h2>
            <p className="text-secondary text-xs mt-1">Accede a la gestión integral</p>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full h-12 rounded-xl border-2 border-outline/50 flex items-center justify-center gap-3 font-bold text-on-surface hover:bg-white hover:border-primary transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              )}
              <span className="text-sm">Entrar con Google</span>
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline/50"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-bold">
                <span className="bg-white/80 px-4 text-secondary/60">alternativa</span>
              </div>
            </div>

            <div className="flex flex-col">
              <button 
                onClick={() => setShowCredentials(!showCredentials)}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-secondary hover:text-primary transition-colors uppercase tracking-widest"
              >
                {showCredentials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{showCredentials ? 'Ocultar correo' : 'Usar credenciales'}</span>
              </button>

              <AnimatePresence>
                {showCredentials && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleLogin} 
                    className="flex flex-col gap-4 overflow-hidden mt-2"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline/80 group-focus-within:text-primary transition-colors" />
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@dli.com"
                          className="w-full bg-surface-container-low border border-outline/40 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline/80 group-focus-within:text-primary transition-colors" />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-surface-container-low border border-outline/40 rounded-xl py-3.5 pl-11 pr-11 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-outline/80 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading || googleLoading}
                      className="mt-1 w-full h-12 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Iniciar Sesión <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.main>

      <div className="absolute bottom-8 text-[10px] text-secondary font-bold uppercase tracking-widest opacity-40">
        D'LI Management POS v1.0
      </div>
    </div>
  );
}
