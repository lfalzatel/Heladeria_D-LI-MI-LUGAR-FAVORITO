import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  LogOut, 
  ArrowLeft,
  Calendar,
  Award,
  Clock,
  Edit3,
  X,
  Check,
  CreditCard,
  Phone,
  MapPin,
  Star,
  TrendingUp,
  ShoppingBag,
  Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useHeaderStore } from '../stores/useHeaderStore';
import { cn, formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { compressImage } from '../utils/imageCompressor';
import { Camera, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Profile() {
  const { profile, user, signOut, updateProfile } = useAuthStore();
  const { setHeader, clearHeader } = useHeaderStore();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    phone: '',
    address: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (profile || user) {
      setFormData(prev => ({
        ...prev,
        name: profile?.name || user?.displayName || '',
        cedula: profile?.cedula || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        imageUrl: profile?.imageUrl || user?.photoURL || ''
      }));
    }
  }, [profile, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Por favor, selecciona una imagen válida');
    }

    setIsUploading(true);

    try {
      // Comprimir la imagen de perfil localmente a un Base64 súper liviano (máximo 300px, calidad 0.5)
      const base64Image = await compressImage(file, 300, 300, 0.5);
      
      await updateProfile({ imageUrl: base64Image });
      setFormData(prev => ({ ...prev, imageUrl: base64Image }));
      toast.success('Foto de perfil actualizada');
    } catch (error) {
      console.error("Error compressing/uploading file:", error);
      toast.error('Error al actualizar la foto de perfil');
    } finally {
      setIsUploading(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSave = async () => {
    if (!profile) return;
    
    if (!navigator.onLine) {
      toast.error('No tienes conexión a internet para guardar');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(formData);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setHeader({
      title: "Mi Perfil",
      subtitle: "Información de Cuenta"
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const [heladoCoins, setHeladoCoins] = useState<number | null>(null);
  const [coinsData, setCoinsData] = useState({ totalSpent: 0, orderCount: 0 });

  useEffect(() => {
    const fetchHeladoCoins = async () => {
      const currentUserId = profile?.uid || user?.uid;
      if (!currentUserId) return;
      
      try {
        const q = query(
          collection(db, 'pedidos'),
          where('clienteId', '==', currentUserId),
          where('status', '==', 'entregado')
        );
        const snapshot = await getDocs(q);
        let totalSpent = 0;
        let orderCount = snapshot.size;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          totalSpent += (data.total || 0);
        });
        
        const valuePoints = Math.floor(totalSpent / 1000);
        const bonusPoints = orderCount * 10;
        
        setCoinsData({ totalSpent, orderCount });
        setHeladoCoins(valuePoints + bonusPoints);
      } catch (error) {
        console.error("Error fetching helado coins:", error);
        setHeladoCoins(0);
      }
    };
    
    fetchHeladoCoins();
  }, [profile, user]);

  const [staffSalesData, setStaffSalesData] = useState({ totalSold: 0, salesCount: 0 });

  useEffect(() => {
    const fetchStaffSales = async () => {
      const currentUserId = profile?.uid || user?.uid;
      if (!currentUserId) return;
      
      const isStaff = ['admin', 'propietario', 'vendedor'].includes(profile?.role || '');
      if (!isStaff) return;

      try {
        const q = query(
          collection(db, 'sales'),
          where('soldBy', '==', currentUserId)
        );
        const snapshot = await getDocs(q);
        let totalSold = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          totalSold += (data.total || 0);
        });
        setStaffSalesData({ totalSold, salesCount: snapshot.size });
      } catch (error) {
        console.error("Error fetching staff sales:", error);
      }
    };
    
    fetchStaffSales();
  }, [profile, user]);

  if (!profile && !user) return null;

  const avatarUrl = profile?.imageUrl || user?.photoURL;
  const userEmail = profile?.email || user?.email;

  const getDaysActiveAndDate = () => {
    let creationDate = new Date();
    
    if (user?.metadata?.creationTime) {
      creationDate = new Date(user.metadata.creationTime);
    } else if (profile?.createdAt) {
      creationDate = new Date(profile.createdAt.toDate ? profile.createdAt.toDate().getTime() : profile.createdAt);
    }

    const diffTime = Math.abs(Date.now() - creationDate.getTime());
    const days = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    return {
      days,
      dateString: creationDate.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    };
  };

  const { days: daysActive, dateString: joinedDate } = getDaysActiveAndDate();

  const handleDaysActiveClick = () => {
    // Configuración del confeti interactivo
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    // Lanzar confeti!
    frame();

    toast.success(`🎉 Te uniste el ${joinedDate}. ¡Gracias por preferirnos! 🍦`, {
      position: 'top-center',
      duration: 5000,
      className: 'text-center text-base sm:text-lg font-bold py-4 shadow-xl border-primary/20',
    });
  };

  return (
    <>
      <main className="p-4 sm:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6 pt-6">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] p-4 sm:p-6 border border-outline/50 shadow-sm flex flex-col relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative flex-shrink-0">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface-container-high border-2 border-white shadow-md flex items-center justify-center text-primary text-2xl font-black overflow-hidden relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile?.name} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                ) : (
                  <span className="uppercase">{(profile?.name || user?.displayName || 'U')[0]}</span>
                )}
                
                {/* Overlay de carga o cambio de foto */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                    isUploading && "opacity-100"
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-lg border border-white flex items-center justify-center shadow-sm pointer-events-none">
                <Shield className="w-3 h-3 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-on-surface tracking-tight uppercase leading-tight truncate">{profile?.name || user?.displayName || 'Usuario'}</h2>
              <div className="flex items-center justify-center sm:justify-start flex-wrap gap-1.5 mt-1.5">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                  profile?.role === 'admin' ? "bg-red-100 text-red-600" : 
                  profile?.role === 'propietario' ? "bg-purple-100 text-purple-600" :
                  "bg-primary/10 text-primary"
                )}>
                  {profile?.role || 'Cliente'}
                </span>
                <button 
                  onClick={() => {
                    toast.success(
                      `Tienes ${profile?.loyaltyPoints || 0} Puntos Premium`,
                      {
                        description: `¡Acumula 9 para ganar un Cucurucho Doble gratis!`,
                        position: 'top-center',
                        duration: 6000,
                        className: 'text-center border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
                      }
                    );
                    
                    // Animación de confeti mejorada (Fucsia/Morado)
                    const duration = 2500;
                    const end = Date.now() + duration;
                    const colors = ['#d946ef', '#c026d3', '#a21caf', '#e879f9', '#fdf4ff'];
                    
                    const frame = () => {
                      confetti({
                        particleCount: 5,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0, y: 0.8 },
                        colors: colors
                      });
                      confetti({
                        particleCount: 5,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1, y: 0.8 },
                        colors: colors
                      });

                      if (Date.now() < end) {
                        requestAnimationFrame(frame);
                      }
                    };
                    frame();
                  }}
                  className="text-[9px] font-black text-fuchsia-600 bg-fuchsia-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs border border-fuchsia-200 hover:scale-105 active:scale-95 transition-transform"
                >
                  <Star className="w-3 h-3 fill-fuchsia-500" /> {profile?.loyaltyPoints || 0} / 9 Pts
                </button>

                {heladoCoins !== null && (
                  <button 
                    onClick={() => {
                      const valuePoints = Math.floor(coinsData.totalSpent / 1000);
                      const bonusPoints = coinsData.orderCount * 10;
                      toast.success(
                        `Tienes ${heladoCoins} Helado-Coins`,
                        {
                          description: `⭐ ${valuePoints} pts por compras ($${coinsData.totalSpent.toLocaleString('es-CO')})\n🎁 ${bonusPoints} pts por constancia (${coinsData.orderCount} pedidos)`,
                          position: 'top-center',
                          duration: 6000,
                          className: 'text-center border-amber-200 bg-amber-50',
                        }
                      );

                      // Animación de confeti mejorada (Dorado/Amarillo)
                      const duration = 2500;
                      const end = Date.now() + duration;
                      const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#b45309', '#fffbeb'];
                      
                      const frame = () => {
                        confetti({
                          particleCount: 5,
                          angle: 60,
                          spread: 55,
                          origin: { x: 0, y: 0.8 },
                          colors: colors
                        });
                        confetti({
                          particleCount: 5,
                          angle: 120,
                          spread: 55,
                          origin: { x: 1, y: 0.8 },
                          colors: colors
                        });

                        if (Date.now() < end) {
                          requestAnimationFrame(frame);
                        }
                      };
                      frame();
                    }}
                    className="text-[9px] font-black text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs border border-amber-200 hover:scale-105 active:scale-95 transition-transform"
                  >
                    ⭐ {heladoCoins} Pts
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-outline/20 my-4" />

          <div className="w-full space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Correo Electrónico (No editable)</label>
              <div className="w-full h-14 bg-surface-container/50 rounded-2xl border-2 border-transparent px-5 flex items-center font-bold text-sm text-secondary/60">
                <Mail className="w-4 h-4 mr-3 opacity-40" />
                {userEmail}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Nombre Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-14 bg-surface-container rounded-2xl border-2 border-transparent px-5 font-bold text-sm focus:border-primary transition-all outline-none"
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Cédula de Ciudadanía</label>
              <input 
                type="text" 
                value={formData.cedula}
                onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                className="w-full h-14 bg-surface-container rounded-2xl border-2 border-transparent px-5 font-bold text-sm focus:border-primary transition-all outline-none"
                placeholder="Documento de identidad"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Teléfono</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-14 bg-surface-container rounded-2xl border-2 border-transparent px-5 font-bold text-sm focus:border-primary transition-all outline-none"
                placeholder="Número de contacto"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Dirección de Residencia</label>
              <input 
                type="text" 
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full h-14 bg-surface-container rounded-2xl border-2 border-transparent px-5 font-bold text-sm focus:border-primary transition-all outline-none"
                placeholder="Tu dirección de residencia"
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving || isUploading}
              className="w-full bg-primary text-white py-4 mt-2 rounded-2xl font-black text-xs uppercase tracking-widestáshadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleDaysActiveClick}
            className="bg-white p-6 rounded-[2rem] border border-outline/50 shadow-sm flex flex-col items-center gap-2 hover:bg-emerald-50/30 hover:border-emerald-200 active:scale-95 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Días Activo</p>
            <p className="text-xl font-black text-on-surface">{daysActive}</p>
          </button>
          
          <div className="bg-white p-6 rounded-[2rem] border border-outline/50 shadow-sm flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Estado</p>
            <p className="text-base font-black text-success uppercase tracking-widest">Activo</p>
          </div>

          {['admin', 'propietario', 'vendedor'].includes(profile?.role || '') ? (
            <>
              {/* Cards para personal/empleados */}
              <div className="bg-white p-6 rounded-[2rem] border border-outline/50 shadow-sm flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <p className="text-[9px] font-black text-secondary uppercase tracking-widest text-center">Ventas Procesadas</p>
                <p className="text-lg font-black text-on-surface">{formatCurrency(staffSalesData.totalSold)}</p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-outline/50 shadow-sm flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <p className="text-[9px] font-black text-secondary uppercase tracking-widest text-center">Transacciones</p>
                <p className="text-lg font-black text-on-surface">{staffSalesData.salesCount} Ventas</p>
              </div>
            </>
          ) : (
            <>
              {/* Cards para Clientes */}
              <div className="bg-white p-6 rounded-[2rem] border border-outline/50 shadow-sm flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <p className="text-[9px] font-black text-secondary uppercase tracking-widest text-center">Compras Totales</p>
                <p className="text-lg font-black text-on-surface">{formatCurrency(coinsData.totalSpent)}</p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-outline/50 shadow-sm flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <p className="text-[9px] font-black text-secondary uppercase tracking-widest text-center font-bold">Pedidos Entregados</p>
                <p className="text-lg font-black text-on-surface">{coinsData.orderCount} Pedidos</p>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={handleSignOut}
          className="mt-4 w-full py-5 bg-red-50 text-red-600 rounded-[2rem] border-2 border-red-100 font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-red-500/5 hover:bg-red-100 transition-all flex items-center justify-center gap-3"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </main>
    </>
  );
}

function ProfileInfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low border border-outline/10 text-left hover:bg-white transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-secondary group-hover:text-primary transition-colors border border-outline/30 group-hover:border-primary/20">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-sm font-bold text-on-surface">{value}</p>
      </div>
    </div>
  );
}
