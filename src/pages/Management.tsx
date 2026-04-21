import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  where,
  addDoc,
  serverTimestamp,
  getDocs,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users as UsersIcon, 
  Package, 
  Search, 
  Shield, 
  History, 
  Plus, 
  ShoppingCart,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Filter,
  ArrowUpDown,
  FileText,
  AlertCircle,
  X,
  PlusCircle,
  MinusCircle,
  ChevronDown,
  Trash2,
  Calendar,
  Wallet,
  Store,
  Check,
  Download,
  Save,
  Edit3,
  Layers,
  CreditCard,
  Phone,
  MapPin
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppHeader, { PageTitle } from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useAuthStore } from '../stores/useAuthStore';
import AdminSidebar from '../components/AdminSidebar';
import SupplyFormModal from '../components/SupplyFormModal';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'vendedor' | 'propietario' | 'cliente';
  cedula?: string;
  phone?: string;
  address?: string;
  lastSeen?: string;
  imageUrl?: string;
}

interface Supply {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  minLimit: number;
  category: string;
  price?: number;
  portionsPerUnit?: number;
  costPerUnit?: number;
}

interface PurchaseItem extends Partial<Supply> {
  quantity: number;
  cost: number;
  portions: number;
  isNew?: boolean;
}

export default function Management() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = (queryParams.get('tab') as 'personas' | 'insumos') || 'insumos';
  
  const [activeTab, setActiveTab] = useState<'personas' | 'insumos'>(initialTab);
  const { profile: currentUser } = useAuthStore();
  
  // Personas State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  // Insumos State
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplySearch, setSupplySearch] = useState('');
  const [selectedForPurchase, setSelectedForPurchase] = useState<string[]>([]);
  const [isSupplySelectionModalOpen, setIsSupplySelectionModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [purchasePeriod, setPurchasePeriod] = useState<'Hoy' | 'Semana' | 'Mes'>('Hoy');

  const [insumosSubTab, setInsumosSubTab] = useState<'compras' | 'catalogo'>('compras');
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [supplyToEdit, setSupplyToEdit] = useState<Supply | null>(null);

  // Update URL when tab changes
  useEffect(() => {
    navigate(`?tab=${activeTab}`, { replace: true });
  }, [activeTab, navigate]);
  
  useEffect(() => {
    if (!currentUser) return;

    // Fetch Users
    const usersQ = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribeUsers = onSnapshot(usersQ, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
        setUsers(data);
      },
      (error) => {
        console.error("Users listener error:", error);
      }
    );

    // Fetch Supplies
    const suppliesQ = query(collection(db, 'supplies'), orderBy('name', 'asc'));
    const unsubscribeSupplies = onSnapshot(suppliesQ, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supply[];
        setSupplies(data);
      },
      (error) => {
        console.error("Supplies listener error:", error);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeSupplies();
    };
  }, [currentUser]);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast.success(`Rol actualizado a ${newRole}`);
    } catch (error) {
      toast.error('Error al actualizar rol');
    }
  };

  const handleOpenPurchaseModal = () => {
    if (selectedForPurchase.length === 0) {
      toast.error('Selecciona insumos para abastecer');
      return;
    }

    const selectedItems: PurchaseItem[] = selectedForPurchase.map(id => {
      const supply = supplies.find(s => s.id === id);
      return {
        ...supply,
        quantity: 1,
        cost: supply?.costPerUnit || 0,
        portions: supply?.portionsPerUnit || 1
      };
    });

    setPurchaseItems(selectedItems);
    setIsSupplySelectionModalOpen(false);
    setIsPurchaseModalOpen(true);
  };

  const handleAddNewItemToPurchase = () => {
    const newItem: PurchaseItem = {
      id: `temp-${Date.now()}`,
      name: '',
      quantity: 1,
      cost: 0,
      portions: 1,
      isNew: true,
      category: 'Insumos',
      unit: 'Unidad'
    };
    setPurchaseItems([...purchaseItems, newItem]);
  };

  const updatePurchaseItem = (id: string, updates: Partial<PurchaseItem>) => {
    setPurchaseItems(items => items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removePurchaseItem = (id: string) => {
    setPurchaseItems(items => items.filter(item => item.id !== id));
  };

  const handleConfirmPurchaseAll = async () => {
    try {
      // 1. Create a purchase history doc
      const total = purchaseItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
      
      const purchaseRef = await addDoc(collection(db, 'supplyPurchases'), {
        items: purchaseItems.map(item => ({
          name: item.name,
          supplyId: item.isNew ? null : item.id,
          cost: item.cost,
          quantity: item.quantity,
          portions: item.portions,
          subtotal: item.cost * item.quantity
        })),
        total,
        registeredBy: currentUser?.uid,
        createdAt: serverTimestamp()
      });

      // 2. Update stock and prices for each item
      for (const item of purchaseItems) {
        if (item.isNew && item.name) {
          // Create new supply
          await addDoc(collection(db, 'supplies'), {
            name: item.name,
            category: item.category,
            unit: item.unit,
            currentStock: item.quantity,
            minLimit: 1,
            costPerUnit: item.cost,
            portionsPerUnit: item.portions,
            updatedAt: serverTimestamp()
          });
        } else if (!item.isNew && item.id) {
          // Update existing supply
          const supplyRef = doc(db, 'supplies', item.id);
          await updateDoc(supplyRef, {
             currentStock: increment(item.quantity),
             costPerUnit: item.cost,
             portionsPerUnit: item.portions,
             updatedAt: serverTimestamp()
          });
        }
      }

      toast.success('Compra registrada y stock actualizado');
      setIsPurchaseModalOpen(false);
      setSelectedForPurchase([]);
      setPurchaseItems([]);
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar la compra');
    }
  };

  const handleSaveSupply = async (data: Partial<Supply>) => {
    if (supplyToEdit) {
      await updateDoc(doc(db, 'supplies', supplyToEdit.id), { ...data, updatedAt: serverTimestamp() });
      toast.success('Insumo actualizado exitosamente');
    } else {
      await addDoc(collection(db, 'supplies'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast.success('Nuevo insumo registrado en el catálogo base');
    }
  };

  const criticalSupplies = supplies.filter(s => s.currentStock < 3);

  const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserProfile | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'vendedor' as 'admin' | 'vendedor' | 'propietario' | 'cliente',
    cedula: '',
    phone: '',
    address: ''
  });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userSales, setUserSales] = useState<any[]>([]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleEditUser = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setEditFormData({
      name: user.name,
      role: user.role,
      cedula: user.cedula || '',
      phone: user.phone || '',
      address: user.address || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUserForEdit) return;
    setIsSavingUser(true);
    try {
      await updateDoc(doc(db, 'users', selectedUserForEdit.uid), {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      toast.success('Información de usuario actualizada');
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error('Error al actualizar usuario');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Fetch User History when modal opens
  useEffect(() => {
    if (!selectedUserForHistory) {
      setUserSales([]);
      return;
    }

    setIsLoadingHistory(true);
    const salesQ = query(
      collection(db, 'sales'),
      where('soldBy', '==', selectedUserForHistory.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(salesQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserSales(data);
      setIsLoadingHistory(false);
    }, (error) => {
      console.error("Error fetching user history:", error);
      setIsLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [selectedUserForHistory]);

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen relative pb-32">
        <AppHeader showBell />
        <PageTitle title="Gestión del Sistema" subtitle="Control Administrativo" />

      <main className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-6">
        {/* Modern Tabs */}
        <div className="flex p-1.5 bg-surface-container rounded-2xl sm:rounded-full w-full max-w-md mx-auto shadow-inner border border-outline/30">
          <button
            onClick={() => setActiveTab('insumos')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl sm:rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'insumos' ? "bg-white text-primary shadow-md" : "text-secondary hover:text-on-surface"
            )}
          >
            <Package className="w-4 h-4" />
            Compras
          </button>
          <button
            onClick={() => setActiveTab('personas')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl sm:rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'personas' ? "bg-white text-primary shadow-md" : "text-secondary hover:text-on-surface"
            )}
          >
            <UsersIcon className="w-4 h-4" />
            Personas
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'personas' ? (
            <motion.div
              key="personas"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col gap-6"
            >
              {/* Search and Filter */}
              <div className="bg-white rounded-[2rem] p-6 border border-outline/50 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex-1 w-full bg-surface-container rounded-2xl px-4 py-3 border border-outline/50 flex items-center">
                    <Search className="w-4 h-4 text-secondary/50 mr-2" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o correo..." 
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm w-full font-bold placeholder:text-secondary/40"
                    />
                  </div>
                  <button className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-outline hover:bg-surface transition-all text-xs font-bold text-secondary">
                    <Filter className="w-4 h-4" />
                    Filtros
                  </button>
                </div>
              </div>

              {/* User List */}
              <div className="grid grid-cols-1 gap-4">
                {users.filter(u => 
                  u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                  u.email.toLowerCase().includes(userSearch.toLowerCase())
                ).map(user => (
                  <motion.div 
                    layout
                    key={user.uid}
                    className="bg-white rounded-[2rem] p-5 sm:p-6 border border-outline/50 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:border-primary/20 transition-all"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container overflow-hidden border-2 border-white shadow-md flex items-center justify-center text-primary font-black text-2xl">
                        {user.imageUrl ? (
                          <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name[0]
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-lg border-2 border-white flex items-center justify-center shadow-sm">
                        <UserCheck className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-headline font-bold text-lg text-on-surface uppercase tracking-tight">{user.name}</h3>
                      <p className="text-secondary text-xs font-medium mb-2">{user.email}</p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                         <span className={cn(
                           "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                           user.role === 'admin' ? "bg-red-50 text-red-600 border-red-100" : 
                           user.role === 'propietario' ? "bg-purple-50 text-purple-600 border-purple-100" :
                           user.role === 'cliente' ? "bg-blue-50 text-blue-600 border-blue-100" :
                           "bg-primary/5 text-primary border-primary/10"
                         )}>
                            {user.role}
                         </span>
                         <span className="text-[9px] font-bold text-secondary bg-surface-container px-3 py-1 rounded-full uppercase tracking-widest">
                            ID: {user.uid.slice(0, 8)}...
                         </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-3 w-full sm:w-auto">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="flex-1 sm:h-10 px-4 rounded-xl bg-surface-container border border-outline/50 text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button 
                        onClick={() => setSelectedUserForHistory(user)}
                        className="flex-1 sm:h-10 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2"
                      >
                        <History className="w-3.5 h-3.5" />
                        Historial
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="insumos"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col gap-8 pb-10"
            >
              {/* Insert the subtab switcher right here */}
              <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner max-w-sm mx-auto w-full mb-2">
                 <button 
                   onClick={() => setInsumosSubTab('compras')}
                   className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", insumosSubTab === 'compras' ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high")}
                 >
                   Compras & Historial
                 </button>
                 <button 
                   onClick={() => setInsumosSubTab('catalogo')}
                   className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", insumosSubTab === 'catalogo' ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high")}
                 >
                   Catálogo Base
                 </button>
              </div>

              {insumosSubTab === 'compras' ? (
                 <>
              {/* Header section with Stats */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                         <ShoppingCart className="w-6 h-6 text-white" />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black text-on-surface tracking-tight">Compras</h2>
                         <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">Dashboard de abastecimiento y gastos</p>
                      </div>
                   </div>
                </div>

                {/* Controls */}
                <div className="flex gap-1.5 p-1 bg-surface-container rounded-xl text-[10px] font-black uppercase">
                  {['Hoy', 'Semana', 'Mes'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPurchasePeriod(p as any)}
                      className={cn("px-4 py-3 sm:py-1.5 rounded-lg transition-all flex-1 sm:flex-none font-bold", purchasePeriod === p ? "bg-on-surface text-white shadow-sm" : "text-secondary hover:bg-surface")}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                   <button className="flex-1 flex items-center justify-between px-6 py-4 bg-white rounded-3xl border border-outline/50 shadow-sm font-bold text-sm text-secondary">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 opacity-40" />
                        <span>Calendario</span>
                      </div>
                      <ChevronDown className="w-4 h-4 opacity-40" />
                   </button>
                   <button className="w-14 h-14 bg-on-surface text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all">
                      <Download className="w-6 h-6" />
                   </button>
                </div>

                <button 
                  onClick={() => setIsSupplySelectionModalOpen(true)}
                  className="w-full py-5 bg-on-surface text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-98 transition-all"
                >
                   <Plus className="w-5 h-5 stroke-[3]" />
                   Registrar Compra
                </button>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                   <InfoCard 
                     icon={<Wallet className="w-5 h-5 text-emerald-500" />} 
                     label="Inversión Hoy" 
                     value={formatCurrency(0)} 
                     sub="Gasto total en mercancía"
                   />
                   <InfoCard 
                     icon={<Package className="w-5 h-5 text-blue-500" />} 
                     label="Productos Ingresados" 
                     value="0" 
                     sub="Total de unidades compradas"
                   />
                   <InfoCard 
                     icon={<Calendar className="w-5 h-5 text-orange-500" />} 
                     label="Días de Actividad" 
                     value="0" 
                     sub="Días con registros de compras"
                   />
                   <InfoCard 
                     icon={<Store className="w-5 h-5 text-purple-500" />} 
                     label="Promedio por Compra" 
                     value={formatCurrency(0)} 
                     sub="Costo promedio de abastecimiento"
                   />
                </div>
              </div>

              {/* Trend Chart Mockup */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-outline/50 shadow-sm">
                 <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                       <TrendingDown className="w-6 h-6 rotate-180" />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-on-surface">Tendencia de Inversión</h3>
                       <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Historial de gastos en mercancía</p>
                    </div>
                 </div>
                 <div className="h-48 flex items-end justify-between px-2 gap-2 opacity-10">
                    {[30, 45, 25, 60, 40, 80, 55, 70, 45, 90, 65, 50].map((h, i) => (
                      <div key={i} className="flex-1 bg-surface-container rounded-t-lg" style={{ height: `${h}%` }} />
                    ))}
                 </div>
                 <div className="mt-10 py-6 border-t border-dashed border-outline flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-surface-container rounded-xl flex items-center justify-center text-secondary">
                          <History className="w-5 h-5" />
                       </div>
                       <h4 className="font-bold text-base text-on-surface">Actividad <span className="text-[10px] px-2 py-0.5 bg-surface-container rounded-full text-secondary opacity-60 ml-2">1 COMPRAS</span></h4>
                    </div>
                    <p className="text-[10px] font-bold text-secondary uppercase">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                 </div>
              </div>

                 </>
              ) : (
                 <>
                    <button 
                      onClick={() => { setSupplyToEdit(null); setIsSupplyModalOpen(true); }}
                      className="w-full py-5 bg-on-surface text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all mb-4"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-xl leading-none font-light">+</span>
                      </div>
                      Añadir Insumo Base
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {supplies.map((s) => {
                         const isLow = s.currentStock <= s.minLimit;
                         return (
                           <div key={s.id} className="bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-colors hover:border-primary/30">
                              <div className="flex justify-between items-start mb-3">
                                 <div className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", isLow ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary")}>
                                    {s.category || 'Varios'}
                                 </div>
                                 <button 
                                    onClick={() => { setSupplyToEdit(s); setIsSupplyModalOpen(true); }}
                                    className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-all"
                                 >
                                    <Edit3 className="w-4 h-4" />
                                 </button>
                              </div>
                              <h4 className="font-bold text-lg text-on-surface leading-tight mb-4">{s.name}</h4>
                              <div className="flex border-t border-outline/10 pt-4">
                                 <div className="flex-1">
                                    <p className="text-[10px] text-secondary font-black uppercase tracking-widest">En Stock</p>
                                    <p className={cn("text-xl font-black", isLow ? "text-orange-500" : "text-on-surface")}>
                                       {s.currentStock} <span className="text-sm font-bold opacity-60 ml-0.5">{s.unit || s.purchaseUnit}</span>
                                    </p>
                                 </div>
                                 <div className="flex-1 text-right border-l border-outline/10 pl-4">
                                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Alerta en</p>
                                    <p className="text-sm font-bold text-secondary mt-1">{s.minLimit ?? s.stockMinimum ?? 0} {s.unit}</p>
                                 </div>
                              </div>
                           </div>
                         );
                       })}
                    </div>
                    {supplies.length === 0 && (
                      <div className="py-20 flex flex-col items-center opacity-30 text-center">
                         <Layers className="w-16 h-16 mb-4" />
                         <p className="font-bold">No hay insumos base creados.</p>
                      </div>
                    )}
                 </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SupplyFormModal
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        supplyToEdit={supplyToEdit}
        onSave={handleSaveSupply}
      />

      {/* Select Supplies Modal */}
      <AnimatePresence>
         {isSupplySelectionModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 pointer-events-none">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
                 onClick={() => setIsSupplySelectionModalOpen(false)}
               />
               
               <motion.div 
                 initial={{ y: "100%", opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: "100%", opacity: 0 }}
                 className="relative w-full max-w-lg bg-surface-container-lowest rounded-[3rem] shadow-2xl flex flex-col pointer-events-auto max-h-full overflow-hidden"
               >
                 <div className="p-8 bg-white border-b border-outline/10 text-on-surface relative">
                    <h2 className="text-2xl font-black tracking-tight">Seleccionar Insumos</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                       Añada insumos del catálogo base a esta compra
                    </p>
                    <button 
                      onClick={() => setIsSupplySelectionModalOpen(false)}
                      className="absolute top-8 right-8 w-10 h-10 bg-surface-container rounded-full flex items-center justify-center hover:bg-surface-container-high transition-all"
                    >
                       <X className="w-5 h-5 text-secondary" />
                    </button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                    <div className="flex flex-col gap-3">
                       {supplies.sort((a,b) => a.currentStock - b.currentStock).map(supply => {
                          const isCritical = supply.currentStock < 3;
                          const isSelected = selectedForPurchase.includes(supply.id);
                          
                          return (
                             <div 
                               key={supply.id} 
                               onClick={() => {
                                  if (isSelected) {
                                     setSelectedForPurchase(selectedForPurchase.filter(id => id !== supply.id));
                                  } else {
                                     setSelectedForPurchase([...selectedForPurchase, supply.id]);
                                  }
                               }}
                               className={cn(
                                  "p-4 sm:p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 cursor-pointer",
                                  isSelected 
                                    ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.01]" 
                                    : isCritical 
                                      ? "bg-white border-primary/20 hover:border-primary/50" 
                                      : "bg-surface-container-low border-transparent hover:bg-surface-container-high"
                               )}>
                                <div className={cn(
                                   "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                   isSelected ? "bg-white/20" : "bg-surface-container-high"
                                )}>
                                   <Package className={cn("w-6 h-6", isSelected ? "text-white" : "text-secondary")} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                   <p className={cn("font-bold text-[15px] leading-tight uppercase tracking-tight truncate w-full", isSelected ? "text-white" : "text-on-surface")}>
                                      {supply.name}
                                   </p>
                                   <div className="flex items-center gap-2 mt-1">
                                      <p className={cn("text-[9px] font-black uppercase tracking-widest", isSelected ? "text-white/80" : isCritical ? "text-primary" : "text-secondary")}>
                                         STOCK: {supply.currentStock} {supply.unit}
                                      </p>
                                      {isCritical && !isSelected && (
                                         <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest">
                                            Crítico
                                         </span>
                                      )}
                                   </div>
                                </div>

                                <div className={cn(
                                   "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                   isSelected ? "bg-white border-white" : "border-outline/50 bg-surface-container"
                                )}>
                                   {isSelected && <Check className="w-5 h-5 text-primary stroke-[4]" />}
                                </div>
                             </div>
                          )
                       })}
                       {supplies.length === 0 && (
                          <div className="py-10 text-center text-secondary">
                             No hay insumos en el catálogo
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="p-6 bg-white border-t border-outline/10 shadow-inner">
                    <button 
                      onClick={() => handleOpenPurchaseModal()}
                      className={cn(
                        "w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center shadow-2xl",
                        selectedForPurchase.length > 0 
                          ? "bg-on-surface text-white hover:scale-[1.01] active:scale-[0.98]" 
                          : "bg-surface-container-high text-secondary border border-outline/20"
                      )}
                    >
                      {selectedForPurchase.length > 0 
                        ? `Continuar (${selectedForPurchase.length} seleccionados)` 
                        : "Continuar a Registro Manual"
                      }
                    </button>
                    <p className="text-[10px] text-center font-bold text-secondary mt-3 uppercase tracking-widest opacity-60">
                      También podrás añadir insumos manualmente después
                    </p>
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Purchase Modal - "Revisar Compra" */}
      <AnimatePresence>
         {isPurchaseModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 pointer-events-none">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
                 onClick={() => setIsPurchaseModalOpen(false)}
               />
               
               <motion.div 
                 initial={{ y: "100%", opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: "100%", opacity: 0 }}
                 className="relative w-full max-w-lg bg-surface-container-lowest rounded-[3rem] shadow-2xl flex flex-col pointer-events-auto max-h-full overflow-hidden"
               >
                  {/* Modal Header */}
                  <div className="p-8 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white relative">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                           <ShoppingCart className="w-7 h-7" />
                        </div>
                        <div>
                           <h2 className="text-2xl font-black tracking-tight">Revisar Compra</h2>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                              {purchaseItems.length} Productos • Detalles Finales
                           </p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setIsPurchaseModalOpen(false)}
                       className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all border border-white/20"
                     >
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Scrollable Items List */}
                  <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-surface-container-lowest custom-scrollbar">
                     {purchaseItems.map(item => {
                        const pricePerPortion = item.cost / (item.portions || 1);
                        return (
                           <div key={item.id} className="relative p-6 bg-white rounded-[2.5rem] border border-outline/30 shadow-sm flex flex-col gap-6 group hover:border-emerald-500/30 transition-all">
                              <div className="flex justify-between items-start">
                                 <div className="flex flex-col">
                                    {item.isNew ? (
                                       <input 
                                         type="text" 
                                         placeholder="Nombre del producto..."
                                         value={item.name}
                                         onChange={(e) => updatePurchaseItem(item.id!, { name: e.target.value })}
                                         className="font-brand font-black text-lg text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg outline-none placeholder:text-emerald-200"
                                       />
                                    ) : (
                                       <h4 className="font-brand font-black text-xl text-on-surface uppercase leading-tight pr-8">{item.name}</h4>
                                    )}
                                    <div className="flex items-center gap-3 mt-1">
                                       <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">{item.category}</span>
                                       <span className="w-1.5 h-1.5 rounded-full bg-outline/20" />
                                       <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">STOCK ACTUAL: {item.currentStock || 0}</span>
                                    </div>
                                 </div>
                                 <button 
                                   onClick={() => removePurchaseItem(item.id!)}
                                   className="w-10 h-10 rounded-xl flex items-center justify-center text-outline/30 hover:text-red-500 hover:bg-red-50 transition-all"
                                 >
                                    <Trash2 className="w-5 h-5" />
                                 </button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                 <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.2em] ml-4">Cantidad</label>
                                    <div className="h-14 bg-surface rounded-2xl flex items-center justify-between px-2 border border-outline/30">
                                       <button 
                                         disabled={item.quantity <= 1}
                                         onClick={() => updatePurchaseItem(item.id!, { quantity: item.quantity - 1 })}
                                         className="w-10 h-10 flex items-center justify-center text-secondary disabled:opacity-20 translate-y-[1px]"
                                       >
                                          <MinusCircle className="w-5 h-5" />
                                       </button>
                                       <span className="font-black text-lg tabular-nums">{item.quantity}</span>
                                       <button 
                                         onClick={() => updatePurchaseItem(item.id!, { quantity: item.quantity + 1 })}
                                         className="w-10 h-10 flex items-center justify-center text-secondary translate-y-[1px]"
                                       >
                                          <PlusCircle className="w-5 h-5" />
                                       </button>
                                    </div>
                                 </div>

                                 <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.2em] ml-4">Costo Unit.</label>
                                    <div className="relative">
                                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary opacity-40 font-bold">$</div>
                                       <input 
                                         type="number"
                                         value={item.cost || ''}
                                         onChange={(e) => updatePurchaseItem(item.id!, { cost: parseFloat(e.target.value) || 0 })}
                                         className="w-full h-14 bg-surface rounded-2xl flex items-center pl-8 pr-4 border border-outline/30 font-black text-lg outline-none focus:border-emerald-500 transition-all text-emerald-700"
                                       />
                                    </div>
                                 </div>

                                 <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.2em] ml-4">Porciones / U</label>
                                    <div className="relative">
                                       <input 
                                         type="number"
                                         value={item.portions || ''}
                                         onChange={(e) => updatePurchaseItem(item.id!, { portions: parseInt(e.target.value) || 1 })}
                                         className="w-full h-14 bg-surface rounded-2xl flex items-center px-4 border border-outline/30 font-black text-lg outline-none focus:border-emerald-500 transition-all"
                                       />
                                       <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-secondary opacity-40 uppercase">u/p</div>
                                    </div>
                                 </div>

                                 <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.2em] ml-4">Precio Porción</label>
                                    <div className="w-full h-14 bg-emerald-50 rounded-2xl flex items-center px-4 border border-emerald-100 font-black text-lg text-emerald-600 shadow-inner">
                                       {formatCurrency(pricePerPortion)}
                                    </div>
                                 </div>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-dashed border-outline/30">
                                 <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Subtotal:</p>
                                 <p className="font-brand font-black text-2xl text-on-surface">{formatCurrency(item.cost * item.quantity)}</p>
                              </div>
                           </div>
                        )
                     })}

                     <button 
                       onClick={handleAddNewItemToPurchase}
                       className="w-full py-6 border-2 border-dashed border-outline/30 rounded-[2.5rem] flex items-center justify-center gap-3 text-secondary/40 hover:text-emerald-500 hover:border-emerald-500/30 transition-all font-black text-xs uppercase tracking-[0.2em] bg-white/30"
                     >
                        <PlusCircle className="w-5 h-5" />
                        Agregar Producto (+ Nuevo)
                     </button>
                  </div>

                  {/* Summary Footer */}
                  <div className="p-8 bg-white border-t border-outline/20 relative shadow-inner">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Monto Inversión</p>
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                 <Wallet className="w-6 h-6" />
                              </div>
                              <h3 className="text-4xl font-black text-on-surface tracking-tighter">
                                 {formatCurrency(purchaseItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0))}
                              </h3>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Items Totales</p>
                           <p className="text-2xl font-black text-on-surface tracking-tight">{purchaseItems.length} uds</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        <button 
                          onClick={() => setIsPurchaseModalOpen(false)}
                          className="w-full py-4 rounded-2xl border-2 border-outline/50 font-black text-xs uppercase tracking-widest text-secondary hover:bg-surface transition-all"
                        >
                           Editar Selección
                        </button>
                        <button 
                          onClick={handleConfirmPurchaseAll}
                          disabled={purchaseItems.length === 0}
                          className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                        >
                           <Save className="w-5 h-5" />
                           Confirmar y Abastecer
                        </button>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      <BottomNav />

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 bg-primary text-white relative">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                    <Edit3 className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Editar Usuario</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Gestión de datos de personal</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all border border-white/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-surface-container-lowest">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Nombre Completo</label>
                    <div className="relative">
                       <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary opacity-30" />
                       <input 
                         type="text" 
                         value={editFormData.name}
                         onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                         className="w-full h-14 bg-white rounded-2xl border border-outline/30 pl-12 pr-5 font-bold text-sm focus:border-primary transition-all outline-none"
                         placeholder="Nombre del empleado"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Rol en el Sistema</label>
                    <div className="relative">
                       <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary opacity-30" />
                         <select 
                           value={editFormData.role}
                           onChange={e => setEditFormData({ ...editFormData, role: e.target.value as any })}
                           className="w-full h-14 bg-white rounded-2xl border border-outline/30 pl-12 pr-5 font-bold text-sm focus:border-primary transition-all outline-none appearance-none"
                         >
                           <option value="admin">Administrador</option>
                           <option value="propietario">Propietario</option>
                           <option value="vendedor">Vendedor</option>
                           <option value="cliente">Cliente</option>
                         </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Cédula / ID</label>
                    <div className="relative">
                       <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary opacity-30" />
                       <input 
                         type="text" 
                         value={editFormData.cedula}
                         onChange={e => setEditFormData({ ...editFormData, cedula: e.target.value })}
                         className="w-full h-14 bg-white rounded-2xl border border-outline/30 pl-12 pr-5 font-bold text-sm focus:border-primary transition-all outline-none"
                         placeholder="Documento nacional"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Teléfono</label>
                    <div className="relative">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary opacity-30" />
                       <input 
                         type="tel" 
                         value={editFormData.phone}
                         onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                         className="w-full h-14 bg-white rounded-2xl border border-outline/30 pl-12 pr-5 font-bold text-sm focus:border-primary transition-all outline-none"
                         placeholder="Número móvil"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Dirección</label>
                    <div className="relative">
                       <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary opacity-30" />
                       <input 
                         type="text" 
                         value={editFormData.address}
                         onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                         className="w-full h-14 bg-white rounded-2xl border border-outline/30 pl-12 pr-5 font-bold text-sm focus:border-primary transition-all outline-none"
                         placeholder="Dirección de residencia"
                       />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white border-t border-outline flex gap-4">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 rounded-xl border-2 border-outline font-black text-[10px] uppercase tracking-widest text-secondary hover:bg-surface transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateUser}
                  disabled={isSavingUser}
                  className="flex-1 py-4 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSavingUser ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
                  Actualizar Datos
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal - Registro de Actividad */}
      <AnimatePresence>
        {selectedUserForHistory && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
               onClick={() => setSelectedUserForHistory(null)}
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
             >
                {/* Modal Header */}
                <div className="bg-primary p-8 pb-12 relative flex flex-col items-center">
                   <div className="absolute top-6 right-6">
                      <button onClick={() => setSelectedUserForHistory(null)} className="text-white opacity-80 hover:opacity-100 transition-opacity">
                         <X className="w-6 h-6" />
                      </button>
                   </div>

                   <div className="flex items-center gap-4 w-full">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-3xl font-black">
                         {selectedUserForHistory.imageUrl ? (
                            <img src={selectedUserForHistory.imageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                         ) : (
                            selectedUserForHistory.name[0]
                         )}
                      </div>
                      <div className="flex-1">
                         <h3 className="text-white font-brand font-black text-xl leading-tight uppercase">
                            {selectedUserForHistory.name}
                         </h3>
                         <p className="text-[10px] font-black text-white/60 tracking-widest uppercase mt-1">
                            Registro de actividad administrativa
                         </p>
                      </div>
                   </div>
                </div>

                {/* Calendar Content */}
                <div className="bg-surface-container-lowest flex-1 px-8 py-10 -mt-8 rounded-t-[3rem] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 text-[#007D9A]" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-[#007D9A]">Mapa de productividad</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <ChevronLeft className="w-4 h-4 text-secondary/30" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Abril de 2026</span>
                         <ChevronRight className="w-4 h-4 text-secondary/30" />
                      </div>
                   </div>

                   {/* Mock Calendar Grid */}
                   <div className="grid grid-cols-7 gap-y-4 gap-x-1 mb-10">
                      {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
                        <div key={d} className="text-[8px] font-black text-secondary/40 text-center uppercase tracking-widest">{d}</div>
                      ))}
                      {/* Empty slots for start of month */}
                      {Array.from({ length: 2 }).map((_, i) => <div key={`empty-${i}`} />)}
                      {/* Days with activity */}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(day => {
                        const hasActivity = [2, 3, 4, 10, 12, 17, 18, 19, 24, 25, 26, 27].includes(day);
                        return (
                          <div key={day} className="flex flex-col items-center justify-center">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex flex-col items-center justify-center transition-all",
                              hasActivity ? "bg-[#00ADC8] text-white shadow-lg shadow-[#00ADC8]/30" : "text-secondary/20"
                            )}>
                               <span className="text-[10px] font-black">{day}</span>
                               {hasActivity && <span className="text-[6px] font-bold opacity-60">31</span>}
                            </div>
                          </div>
                        );
                      })}
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-secondary/40 uppercase tracking-widest px-2">Sesiones de registro</h4>
                      {isLoadingHistory ? (
                        <div className="flex justify-center p-8">
                          <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                        </div>
                      ) : userSales.length === 0 ? (
                        <div className="text-center py-10 opacity-30">
                          <p className="text-[10px] font-black uppercase tracking-widest">Sin ventas registradas</p>
                        </div>
                      ) : (
                        userSales.slice(0, 5).map(sale => (
                          <div 
                            key={sale.id} 
                            onClick={() => setSelectedSaleDetail(sale)}
                            className="p-5 rounded-3xl bg-white border border-outline/30 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer"
                          >
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                   <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                   <span className="text-sm font-black text-on-surface">{sale.tableName || 'Venta'}</span>
                                   <p className="text-[8px] font-black text-secondary uppercase opacity-60">{sale.hour || 'Reciente'}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <span className="text-sm font-black text-primary">{formatCurrency(sale.total)}</span>
                             </div>
                          </div>
                        ))
                      )}
                      {userSales.length > 5 && (
                         <p className="text-[8px] text-center font-black text-secondary uppercase tracking-widest opacity-40 italic">Mostrando las últimas 5 ventas</p>
                      )}
                   </div>
                </div>

                {/* Sale Detail Modal Overlay */}
                <AnimatePresence>
                  {selectedSaleDetail && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-x-6 bottom-6 bg-white rounded-[2.5rem] shadow-2xl p-6 border border-outline/20 z-[120]"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-brand font-black text-primary uppercase text-sm">Detalles de Venta</h4>
                          <p className="text-[10px] font-bold text-secondary">{selectedSaleDetail.tableName} • {selectedSaleDetail.hour}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedSaleDetail(null)}
                          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-3 max-h-48 overflow-y-auto mb-4 hide-scrollbar">
                        {selectedSaleDetail.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-xs">
                             <div className="flex flex-col">
                                <span className="font-bold text-on-surface">{item.productName} x{item.quantity}</span>
                                <span className="text-[8px] text-secondary/60 leading-none">{item.variantLabel}</span>
                             </div>
                             <span className="font-black text-primary">{formatCurrency(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-4 border-t border-dashed border-outline/30 flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-secondary">Total Cobrado</span>
                        <span className="text-xl font-black text-on-surface">{formatCurrency(selectedSaleDetail.total)}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      

      <BottomNav />
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) {
   return (
      <div className="bg-white rounded-[2.5rem] p-6 border border-outline/50 shadow-sm flex flex-col gap-4 group hover:scale-[1.02] transition-all">
         <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center group-hover:scale-110 transition-transform">
            {icon}
         </div>
         <div>
            <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xl font-black text-on-surface tracking-tight">{value}</p>
            <p className="text-[8px] font-bold text-secondary/40 uppercase tracking-widest mt-1 leading-none">{sub}</p>
         </div>
      </div>
   );
}
