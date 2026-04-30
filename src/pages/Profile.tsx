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
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useHeaderStore } from '../stores/useHeaderStore';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, signOut, updateProfile } = useAuthStore();
  const { setHeader, clearHeader } = useHeaderStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    cedula: profile?.cedula || '',
    phone: profile?.phone || '',
    address: profile?.address || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      await updateProfile(formData);
      toast.success('Perfil actualizado correctamente');
      setIsEditing(false);
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

  if (!profile) return null;

  return (
    <>
      <div className="px-4 sm:px-6 flex justify-end mb-4">
        <button 
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-all border border-primary/20"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Editar
        </button>
      </div>

      <main className="p-4 sm:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 border border-outline/50 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-24 bg-primary/5" />
          
          <div className="relative mt-4">
            <div className="w-24 h-24 rounded-3xl bg-surface-container-high border-4 border-white shadow-xl flex items-center justify-center text-primary text-4xl font-black">
              {profile.imageUrl ? (
                <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover rounded-3xl" referrerPolicy="no-referrer" />
              ) : (
                profile.name[0]
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-success rounded-xl border-2 border-white flex items-center justify-center shadow-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-black text-on-surface tracking-tight uppercase leading-tight">{profile.name}</h2>
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                profile.role === 'admin' ? "bg-red-100 text-red-600" : 
                profile.role === 'propietario' ? "bg-purple-100 text-purple-600" :
                "bg-primary/10 text-primary"
              )}>
                {profile.role}
              </span>
              {profile.cedula && (
                <span className="text-[10px] font-black text-secondary bg-surface-container px-3 py-1 rounded-full uppercase tracking-widest">
                  CC: {profile.cedula}
                </span>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-outline/20 my-8" />

          <div className="w-full space-y-4">
            <ProfileInfoItem icon={<Mail className="w-4 h-4" />} label="Correo Electrónico" value={profile.email || '--'} />
            <ProfileInfoItem icon={<CreditCard className="w-4 h-4" />} label="Cédula de Ciudadanía" value={profile.cedula || 'No registrada'} />
            <ProfileInfoItem icon={<Phone className="w-4 h-4" />} label="Teléfono de Contacto" value={profile.phone || 'No registrado'} />
            <ProfileInfoItem icon={<MapPin className="w-4 h-4" />} label="Dirección" value={profile.address || 'No registrada'} />
          </div>
        </motion.div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-outline/50 shadow-sm flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Días Activo</p>
            <p className="text-xl font-black text-on-surface">12</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-outline/50 shadow-sm flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Estado</p>
            <p className="text-base font-black text-success uppercase tracking-widest">Verificado</p>
          </div>
        </div>

        <button 
          onClick={handleSignOut}
          className="mt-4 w-full py-5 bg-red-50 text-red-600 rounded-[2rem] border-2 border-red-100 font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-red-500/5 hover:bg-red-100 transition-all flex items-center justify-center gap-3"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline bg-surface-container-lowest">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-headline font-bold text-on-surface">Editar Perfil</h2>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-14 bg-surface-container rounded-2xl border-2 border-transparent px-5 font-bold text-sm focus:border-primary transition-all outline-none"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest ml-1">Cédula de Ciudadanía</label>
                  <input 
                    type="text" 
                    value={formData.cedula}
                    onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                    className="w-full h-14 bg-surface-container rounded-2xl border-2 border-transparent px-5 font-bold text-sm focus:border-primary transition-all outline-none"
                    placeholder="Documento de identidad"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest ml-1">Teléfono</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-14 bg-surface-container rounded-2xl border-2 border-transparent px-5 font-bold text-sm focus:border-primary transition-all outline-none"
                    placeholder="Número de contacto"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest ml-1">Dirección</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full h-14 bg-surface-container rounded-2xl border-2 border-transparent px-5 font-bold text-sm focus:border-primary transition-all outline-none"
                    placeholder="Tu dirección de residencia"
                  />
                </div>
              </div>

              <div className="p-8 bg-surface-container-lowest border-t border-outline flex gap-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 rounded-xl border-2 border-outline font-bold text-xs text-secondary hover:bg-surface transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-xl bg-primary text-white font-bold text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
