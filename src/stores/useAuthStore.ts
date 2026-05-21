import { create } from 'zustand';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'admin' | 'propietario' | 'vendedor' | 'cliente';

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  name: string;
  cedula?: string;
  phone?: string;
  address?: string;
  imageUrl?: string;
  createdAt?: any;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  initialize: () => void;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  let unsubscribeProfile: (() => void) | null = null;

  return {
    user: null,
    profile: null,
    isLoading: true,
    initialize: () => {
      onAuthStateChanged(auth, async (user) => {
        // Clean up previous profile listener
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        set({ user, isLoading: true });

        if (user) {
          const userRef = doc(db, 'users', user.uid);
          
          // Check if admin is hardcoded
          const isAdminHardcoded = user.email === 'lfalzatel@gmail.com' || user.email === 'lfalzatel@gmai.com';

          // Set up listener for the user profile
          unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              
              // Usar imagen de Google si falta en Firestore localmente (sin forzar setDoc para evitar loops optimistas)
              // if (!data.imageUrl && user.photoURL) {
              //   setDoc(userRef, { imageUrl: user.photoURL }, { merge: true }).catch(console.error);
              // }

              set({ 
                profile: { 
                  uid: user.uid, 
                  ...data,
                  imageUrl: data.imageUrl || user.photoURL || '',
                  role: isAdminHardcoded ? 'admin' : (data.role || 'cliente')
                } as UserProfile,
                isLoading: false
              });
            } else {
              // Create default profile if missing
              const isAdminEmail = user.email?.includes('admin') || isAdminHardcoded;
              const defaultRole: UserRole = isAdminEmail ? 'admin' : 
                                 user.email?.includes('prope') ? 'propietario' : 
                                 user.email?.includes('vendedor') ? 'vendedor' : 'cliente';
              
              const newProfile = {
                email: user.email,
                role: defaultRole as UserRole,
                name: user.displayName || user.email?.split('@')[0] || 'Usuario',
                imageUrl: user.photoURL || '',
                createdAt: serverTimestamp()
              };

              try {
                await setDoc(userRef, newProfile);
                // The onSnapshot will fire again after setDoc
              } catch (err) {
                console.error("Error creating profile:", err);
                // Fallback for UI if setDoc fails (e.g. offline)
                set({ 
                  profile: { uid: user.uid, ...newProfile } as UserProfile,
                  isLoading: false
                });
              }
            }
          }, (error) => {
            console.error("Profile listener error:", error);
            // Fallback profile if Firestore is inaccessible
            const isAdminEmail = user.email?.includes('admin') || isAdminHardcoded;
            const fallbackRole = isAdminEmail ? 'admin' : 'cliente';
            set({ 
              profile: { 
                uid: user.uid, 
                email: user.email, 
                role: fallbackRole as UserRole, 
                name: user.displayName || user.email?.split('@')[0] || 'Usuario',
                imageUrl: user.photoURL || ''
              },
              isLoading: false
            });
          });
        } else {
          set({ profile: null, isLoading: false });
        }
      });
    },
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    updateProfile: async (data) => {
      const { user } = get();
      if (!user) return;
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, data, { merge: true });
    },
    signOut: () => auth.signOut(),
  };
});
