import React, { useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ArrowRight, Loader2, User, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSavedAccountsStore, SavedAccount } from '../stores/useSavedAccountsStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null);

  const { user, profile } = useAuthStore();
  const { accounts, addAccount, removeAccount } = useSavedAccountsStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      navigate(profile.role === 'vendedor' ? '/pos' : '/admin/dashboard');
    }
  }, [user, profile, navigate]);

  const handleGoogleLogin = async (savedAccount?: SavedAccount) => {
    if (savedAccount) setLoadingAccountId(savedAccount.uid);
    else setGoogleLoading(true);

    const provider = new GoogleAuthProvider();
    if (savedAccount) {
      provider.setCustomParameters({ login_hint: savedAccount.email });
    } else {
      provider.setCustomParameters({ prompt: 'select_account' });
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      let assignedRole = 'cliente';
      if (!userSnap.exists()) {
        const isAdminEmail = user.email === 'lfalzatel@gmail.com' || user.email === 'lfalzatel@gmai.com';
        assignedRole = isAdminEmail ? 'admin' : 'cliente';
        
        await setDoc(userRef, {
          email: user.email,
          role: assignedRole,
          name: user.displayName || 'Usuario Google',
          imageUrl: user.photoURL || '',
          createdAt: serverTimestamp()
        });
        toast.success(isAdminEmail ? 'Cuenta vinculada como Administrador' : 'Cuenta vinculada como Vendedor');
      } else {
        assignedRole = userSnap.data().role || 'cliente';
      }

      // Add to saved accounts
      addAccount({
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Usuario',
        imageUrl: user.photoURL || '',
        role: assignedRole
      });

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
    } finally {
      setGoogleLoading(false);
      setLoadingAccountId(null);
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
            <p className="text-secondary text-xs mt-1">
              {accounts.length > 0 ? 'Selecciona una cuenta para continuar' : 'Inicia sesión para continuar'}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            
            {accounts.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {accounts.map(acc => (
                  <div key={acc.uid} className="relative group">
                    <button 
                      onClick={() => handleGoogleLogin(acc)}
                      disabled={googleLoading || loadingAccountId !== null}
                      className="w-full p-3 bg-surface-container-lowest border border-outline/20 rounded-2xl flex items-center justify-between hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {acc.imageUrl ? (
                            <img src={acc.imageUrl} alt={acc.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-on-surface">{acc.name}</p>
                          <p className="text-[10px] text-secondary font-medium">{acc.email}</p>
                        </div>
                      </div>
                      {loadingAccountId === acc.uid ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeAccount(acc.uid); }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-surface-container rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 z-10"
                      title="Quitar cuenta"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {accounts.length > 0 && (
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline/50"></div>
                </div>
                <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-bold">
                  <span className="bg-white/80 px-4 text-secondary/60">O</span>
                </div>
              </div>
            )}

            <button 
              onClick={() => handleGoogleLogin()}
              disabled={googleLoading || loadingAccountId !== null}
              className="w-full h-12 rounded-xl border-2 border-outline/50 flex items-center justify-center gap-3 font-bold text-on-surface hover:bg-white hover:border-primary transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <UserPlus className="w-5 h-5 text-secondary" />
              )}
              <span className="text-sm">{accounts.length > 0 ? 'Iniciar sesión en otra cuenta' : 'Entrar con Google'}</span>
            </button>
          </div>
        </div>
      </motion.main>

      <div className="absolute bottom-8 text-[10px] text-secondary font-bold uppercase tracking-widest opacity-40">
        D'LI Management POS v1.0
      </div>
    </div>
  );
}
