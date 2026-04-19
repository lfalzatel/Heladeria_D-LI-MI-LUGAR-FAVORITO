import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { seedDatabase } from '../services/seedService';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Settings2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [seeding, setSeeding] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
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
        await setDoc(userRef, {
          email: user.email,
          role: 'vendedor',
          name: user.displayName || 'Usuario Google',
          createdAt: serverTimestamp()
        });
        toast.success('Cuenta vinculada como Vendedor');
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

  const seedUsers = async () => {
    setSeeding(true);
    const usersToCreate = [
      { email: 'admin@dli.com', password: 'Admin123#', role: 'admin', name: 'Admin D\'LI' },
      { email: 'prope@dli.com', password: 'Prope123#', role: 'propietario', name: 'Propietario D\'LI' },
      { email: 'vendedor@dli.com', password: 'Vendedor123#', role: 'vendedor', name: 'Vendedor D\'LI' },
    ];

    try {
      for (const u of usersToCreate) {
        try {
          let uid = '';
          try {
            const userCred = await createUserWithEmailAndPassword(auth, u.email, u.password);
            uid = userCred.user.uid;
            toast.success(`Usuario ${u.role} creado`);
          } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
              // Forced login to get the UID and update Firestore
              const loginCred = await signInWithEmailAndPassword(auth, u.email, u.password);
              uid = loginCred.user.uid;
              toast.info(`Actualizando perfil de ${u.role}...`);
            } else {
              throw err;
            }
          }

          if (uid) {
            await setDoc(doc(db, 'users', uid), {
              email: u.email,
              role: u.role,
              name: u.name,
              updatedAt: serverTimestamp(),
              // Ensure createdAt is at least present
              createdAt: serverTimestamp() 
            }, { merge: true });
          }
        } catch (itemError: any) {
          console.error(`Error with user ${u.email}:`, itemError);
          toast.error(`Error con ${u.email}: ${itemError.message}`);
        }
      }
      setShowConfig(false);
      toast.success('Configuración de prueba completada');
    } catch (error: any) {
      console.error('Seed error:', error);
      toast.error('Error al configurar: ' + error.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-surface relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="absolute top-6 right-6 z-10">
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="p-3 rounded-full glass-panel hover:bg-white transition-all text-secondary hover:text-primary shadow-sm"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showConfig && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-outline">
              <h3 className="font-headline font-bold text-xl text-on-surface mb-2">Entorno de Prueba</h3>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                Carga los perfiles iniciales en tu Firebase Auth para comenzar las pruebas locales.
              </p>
              
              <div className="space-y-2 mb-8">
                <CredentialInfo email="admin@dli.com" pass="Admin123#" role="Admin" />
                <CredentialInfo email="vendedor@dli.com" pass="Vendedor123#" role="Vendedor" />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={seedUsers}
                  disabled={seeding}
                  className="w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {seeding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Inicializar Usuarios Auth'}
                </button>

                <button 
                  onClick={async () => {
                    setSeeding(true);
                    try {
                      await seedDatabase();
                      toast.success('¡Menú, Precios e Inventario cargados!');
                      setShowConfig(false);
                    } catch (error: any) {
                      toast.error('Error al cargar datos: ' + error.message);
                    } finally {
                      setSeeding(false);
                    }
                  }}
                  disabled={seeding}
                  className="w-full py-4 rounded-xl border-2 border-primary text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {seeding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cargar Menú y Precios Reales'}
                </button>
              </div>
              
              <button 
                onClick={() => setShowConfig(false)}
                className="w-full mt-3 py-3 text-xs font-bold text-secondary hover:text-on-surface transition-colors uppercase tracking-widest"
                disabled={seeding}
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4 sm:px-6 flex flex-col items-center relative z-10"
      >
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-3">
            <h1 className="font-brand text-3xl font-bold text-white italic leading-none">D</h1>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-on-surface text-2xl leading-none tracking-tight">D'LI Boutique</span>
            <span className="font-brand text-primary italic text-lg mt-0.5">Mi Lugar Favorito</span>
          </div>
        </div>

        <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl shadow-primary/5 border border-outline">
          <div className="text-center mb-8">
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">Bienvenido</h2>
            <p className="text-secondary text-sm mt-2">Accede a la gestión integral</p>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full h-14 rounded-xl border-2 border-outline/50 flex items-center justify-center gap-3 font-bold text-on-surface hover:bg-white hover:border-primary transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              )}
              <span className="text-sm">Entrar con Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline/50"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
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
                      className="mt-2 w-full h-14 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
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

function CredentialInfo({ email, pass, role }: { email: string, pass: string, role: string }) {
  return (
    <div className="p-3 bg-surface rounded-xl border border-outline/30">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{role}</span>
        <span className="text-[10px] font-mono text-secondary/60">{pass}</span>
      </div>
      <p className="text-xs font-medium text-on-surface">{email}</p>
    </div>
  );
}
