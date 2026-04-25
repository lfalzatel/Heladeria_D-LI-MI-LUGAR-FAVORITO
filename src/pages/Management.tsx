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
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users as UsersIcon, 
  Package, 
  Search, 
  History, 
  Plus, 
  ShoppingCart,
  X,
  Calendar,
  Wallet,
  Edit3,
  UserCheck,
  Filter,
  Database,
  AlertTriangle,
  Download,
  BarChart3
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppHeader, { PageTitle } from '../components/AppHeader';
import HistoryMovementCard from '../components/HistoryMovementCard';
import MovementDetailModal from '../components/MovementDetailModal';
import { useAuthStore } from '../stores/useAuthStore';
import AdminSidebar from '../components/AdminSidebar';
import SupplyFormModal from '../components/SupplyFormModal';
import BottomNav from '../components/BottomNav';
import { PurchaseModal, PurchaseDetailModal, Supply as SupplyType, PurchaseItem as PurchaseItemType, PurchaseRecord } from '../components/PurchaseModals';
import { seedDatabase } from '../services/seedService';
import { syncProductImages } from '../services/imageFixService';
import { TrendChart, StatCard, PurchaseCard, PeriodFilter, PERIOD_LABELS, isInPeriod } from './Supplies';

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

  // Purchases (compras) state
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [insumosSubTab, setInsumosSubTab] = useState<'compras' | 'catalogo'>('compras');
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseRecord | null>(null);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [supplyToEdit, setSupplyToEdit] = useState<SupplyType | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);


  // User History State
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserProfile | null>(null);
  const [userSales, setUserSales] = useState<any[]>([]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);

  // User Edit State
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

  // Sync URL with tab
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
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupplyType[];
        setSupplies(data);
      },
      (error) => { console.error("Supplies listener error:", error); }
    );

    // Fetch Supply Purchases
    const purchasesQ = query(collection(db, 'supplyPurchases'), orderBy('createdAt', 'desc'));
    const unsubPurchases = onSnapshot(purchasesQ, snap => setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PurchaseRecord[]));

    return () => {
      unsubscribeUsers();
      unsubscribeSupplies();
      unsubPurchases();
    };
  }, [currentUser]);


  // History Fetching Logic
  useEffect(() => {
    if (!selectedUserForHistory) {
      setUserSales([]);
      return;
    }

    setIsLoadingHistory(true);
    const isClient = selectedUserForHistory.role === 'cliente';
    const colName = isClient ? 'pedidos' : 'sales';
    const idField = isClient ? 'clienteId' : 'soldBy';
    const orderByField = isClient ? 'createdAt' : 'timestamp';
    
    const salesQ = query(
      collection(db, colName),
      where(idField, '==', selectedUserForHistory.uid),
      orderBy(orderByField, 'desc')
    );

    const unsubscribe = onSnapshot(salesQ, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data();
        let hourStr = item.hour;
        if (!hourStr) {
          const ts = item.createdAt || item.timestamp;
          if (ts) {
            const dateObj = ts.toDate ? ts.toDate() : new Date(ts);
            hourStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
          }
        }

        return { 
          id: doc.id, 
          ...item, 
          hour: hourStr || 'Reciente',
          title: item.tableName || (isClient ? 'Pedido Online' : 'Venta POS')
        };
      });
      setUserSales(data);
      setIsLoadingHistory(false);
    }, (error) => {
      console.error("Error fetching user history:", error);
      setIsLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [selectedUserForHistory]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedSaleDetail || !currentUser) return;
    setSending(true);
    try {
      const newMsg = {
        id: Math.random().toString(36).substr(2, 9),
        from: currentUser.uid,
        fromName: currentUser.name,
        text: chatMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      const messages = [...(selectedSaleDetail.messages || []), newMsg];
      await updateDoc(doc(db, 'pedidos', selectedSaleDetail.id), { messages });
      setChatMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

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

  const updatePurchaseItem = (id: string, updates: Partial<PurchaseItem>) => {
    setPurchaseItems(items => items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleConfirmPurchaseAll = async () => {
    try {
      const total = purchaseItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
      
      await addDoc(collection(db, 'supplyPurchases'), {
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

      for (const item of purchaseItems) {
        if (item.isNew && item.name) {
          await addDoc(collection(db, 'supplies'), {
            name: item.name,
            category: item.category || 'Insumos',
            unit: item.unit || 'Unidad',
            currentStock: item.quantity,
            minLimit: 1,
            costPerUnit: item.cost,
            portionsPerUnit: item.portions,
            updatedAt: serverTimestamp()
          });
        } else if (!item.isNew && item.id) {
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

  // Purchases confirm
  const handleConfirmPurchase = async (provider: string, items: PurchaseItemType[]) => {
    const total = items.reduce((a, i) => a + i.cost * i.quantity, 0);
    await addDoc(collection(db, 'supplyPurchases'), { provider, items, total, createdAt: serverTimestamp() });
    for (const item of items) {
      await updateDoc(doc(db, 'supplies', item.supplyId), { currentStock: increment(item.quantity) });
    }
    toast.success('¡Compra registrada y stock actualizado!');
  };

  // Period-filtered purchases
  const filtered = purchases.filter(p => isInPeriod(p.createdAt, period));
  const periodTotal = filtered.reduce((a, p) => a + (p.total || 0), 0);
  const totalUnits = filtered.reduce((a, p) => a + (p.items?.reduce((b, i) => b + (i.quantity || 0), 0) || 0), 0);
  const activeDays = new Set(filtered.map(p => { const d = p.createdAt?.toDate?.() || (p.createdAt ? new Date(p.createdAt) : null); return d?.toDateString(); }).filter(Boolean)).size;
  const avgPerPurchase = filtered.length > 0 ? periodTotal / filtered.length : 0;
  const lowStock = supplies.filter((s: any) => s.currentStock <= s.minLimit).length;

  const handleSaveSupply = async (data: Partial<SupplyType>) => {
    if (supplyToEdit) {
      await updateDoc(doc(db, 'supplies', supplyToEdit.id), { ...data, updatedAt: serverTimestamp() });
      toast.success('Insumo actualizado exitosamente');
    } else {
      await addDoc(collection(db, 'supplies'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast.success('Nuevo insumo registrado en el catálogo base');
    }
  };

  const handleFullSeed = async () => {
    if (!window.confirm('¿Estás seguro? Esto borrará todos los productos, sabores e insumos actuales para recargarlos desde el archivo base.')) return;
    setIsSyncing(true);
    try {
      await seedDatabase();
      toast.success('¡Catálogo recargado completamente!');
      setIsSyncModalOpen(false);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImageSync = async () => {
    setIsSyncing(true);
    try {
      const count = await syncProductImages();
      toast.success(`¡Se actualizaron ${count} imágenes correctamente!`);
      setIsSyncModalOpen(false);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen relative pb-32">
        <AppHeader showBell />
        <div className="flex justify-between items-start pr-4 sm:pr-6">
          <PageTitle title="Gestión del Sistema" subtitle="Control Administrativo" />
          <button 
            onClick={() => setIsSyncModalOpen(true)}
            className="mt-6 px-4 py-2.5 bg-primary/10 text-primary font-black text-[10px] rounded-xl uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-colors shadow-sm"
          >
            <Database className="w-4 h-4" /> 
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-6">
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
                </div>
              </div>

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
                      <h3 className="font-brand font-black text-lg text-on-surface uppercase tracking-tight truncate max-w-[200px] mx-auto sm:mx-0">{user.name}</h3>
                      <p className="text-secondary text-xs font-medium mb-2">{user.email}</p>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                        user.role === 'admin' ? "bg-red-50 text-red-600 border-red-100" : 
                        user.role === 'propietario' ? "bg-purple-50 text-purple-600 border-purple-100" :
                        user.role === 'cliente' ? "bg-blue-50 text-blue-600 border-blue-100" :
                        "bg-primary/5 text-primary border-primary/10"
                      )}>
                        {user.role}
                      </span>
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
              className="w-full flex flex-col gap-5 pb-10"
            >
              {/* Sub-tabs */}
              <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner max-w-sm mx-auto w-full">
                <button onClick={() => setInsumosSubTab('compras')}
                  className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", insumosSubTab === 'compras' ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high")}>
                  Compras &amp; Historial
                </button>
                <button onClick={() => setInsumosSubTab('catalogo')}
                  className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", insumosSubTab === 'catalogo' ? "bg-white text-primary shadow-sm" : "text-secondary hover:bg-surface-container-high")}>
                  Catálogo Base
                </button>
              </div>

              {insumosSubTab === 'compras' ? (
                <>
                  {/* Period filter */}
                  <div className="flex gap-1.5 p-1 bg-surface-container rounded-xl text-[10px] font-black uppercase">
                    {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map(p => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={cn("px-4 py-2 rounded-lg transition-all flex-1", period === p ? "bg-on-surface text-white shadow-sm" : "text-secondary hover:bg-surface")}>
                        {PERIOD_LABELS[p]}
                      </button>
                    ))}
                  </div>

                  {/* Register + Download */}
                  <div className="flex gap-3">
                    <button onClick={() => setIsPurchaseOpen(true)}
                      className="flex-1 py-4 bg-on-surface text-white rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all">
                      <Plus className="w-5 h-5 stroke-[3]" /> Registrar Compra
                    </button>
                    <button onClick={() => toast.info('Exportando informe...')}
                      className="w-14 h-14 bg-surface-container text-secondary rounded-2xl flex items-center justify-center border border-outline/20 hover:bg-surface hover:text-on-surface transition-all">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 4 Stat cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={<Wallet className="w-5 h-5 text-primary" />} label="Inversión" value={formatCurrency(periodTotal)} sub={`Gasto total en ${PERIOD_LABELS[period].toLowerCase()}`} accent="primary" />
                    <StatCard icon={<Package className="w-5 h-5 text-blue-500" />} label="Productos Ingresados" value={totalUnits.toString()} sub="Total unidades compradas" accent="blue" />
                    <StatCard icon={<Calendar className="w-5 h-5 text-orange-500" />} label="Días de Actividad" value={activeDays.toString()} sub="Días con registros de compra" accent="orange" />
                    <StatCard icon={<ShoppingCart className="w-5 h-5 text-secondary" />} label="Promedio por Compra" value={formatCurrency(avgPerPurchase)} sub="Costo promedio de abastecimiento" accent="slate" />
                  </div>

                  {/* Low stock alert */}
                  {lowStock > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-2xl">
                      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <p className="text-xs font-bold text-orange-700">{lowStock} insumo{lowStock > 1 ? 's' : ''} con stock crítico.</p>
                    </div>
                  )}

                  {/* Trend chart */}
                  <div className="bg-white rounded-[2rem] border border-outline/10 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center"><Wallet className="w-5 h-5 text-primary" /></div>
                      <div>
                        <h4 className="font-black text-base text-on-surface">Tendencia de Inversión</h4>
                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Historial de gastos en mercancía</p>
                      </div>
                    </div>
                    <TrendChart purchases={filtered} period={period} />
                  </div>

                  {/* Purchase history */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Actividad</h3>
                      <span className="px-2.5 py-0.5 bg-surface-container text-secondary rounded-full text-[10px] font-black">{filtered.length} compras</span>
                    </div>
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 opacity-20">
                        <ShoppingCart className="w-12 h-12 mb-3" />
                        <p className="text-sm font-bold">Sin compras en este período</p>
                      </div>
                    ) : (
                      filtered.map(p => <PurchaseCard key={p.id} purchase={p} onClick={() => setDetailPurchase(p)} />)
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => { setSupplyToEdit(null); setIsSupplyModalOpen(true); }}
                    className="w-full py-4 bg-on-surface text-white rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all">
                    <Plus className="w-5 h-5 stroke-[3]" /> Añadir Insumo Base
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {supplies.map((s: any) => {
                      const isLow = s.currentStock <= s.minLimit;
                      return (
                        <div key={s.id} className={cn("bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-all hover:border-primary/30", isLow && "border-orange-200")}>
                          <div className="flex justify-between items-start mb-3">
                            <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", isLow ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary")}>
                              {isLow && '⚠ '}{s.category || 'Varios'}
                            </span>
                            <button onClick={() => { setSupplyToEdit(s); setIsSupplyModalOpen(true); }}
                              className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-all">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                          <h4 className="font-bold text-base text-on-surface leading-tight mb-4">{s.name}</h4>
                          <div className="flex border-t border-outline/10 pt-4">
                            <div className="flex-1">
                              <p className="text-[10px] text-secondary font-black uppercase tracking-widest">En Stock</p>
                              <p className={cn("text-xl font-black", isLow ? "text-orange-500" : "text-on-surface")}>{s.currentStock} <span className="text-sm font-bold opacity-60">{s.unit}</span></p>
                            </div>
                            <div className="flex-1 text-right border-l border-outline/10 pl-4">
                              <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Alerta en</p>
                              <p className="text-sm font-bold text-secondary mt-1">{s.minLimit ?? 0} {s.unit}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

      <PurchaseModal
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
        supplies={supplies as any}
        onConfirm={handleConfirmPurchase}
      />
      <PurchaseDetailModal purchase={detailPurchase} onClose={() => setDetailPurchase(null)} />

      <AnimatePresence>
        {selectedUserForHistory && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedUserForHistory(null)} />
             <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* RESTORED PREMIUM HEADER (PINK) */}
                <div className="bg-primary p-8 pb-12 relative flex flex-col items-center flex-shrink-0">
                   <button onClick={() => setSelectedUserForHistory(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all">
                      <X className="w-6 h-6" />
                   </button>
                   <div className="flex items-center gap-5 w-full">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-3xl font-black overflow-hidden shadow-xl">
                         {selectedUserForHistory.imageUrl ? (
                            <img src={selectedUserForHistory.imageUrl} alt="" className="w-full h-full object-cover" />
                         ) : (
                            selectedUserForHistory.name[0]
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h3 className="text-white font-brand font-black text-2xl leading-tight uppercase truncate">
                            {selectedUserForHistory.name}
                         </h3>
                         <p className="text-[10px] font-black text-white/60 tracking-[0.2em] uppercase mt-1">
                            Historial de Registros
                         </p>
                      </div>
                   </div>
                </div>

                {/* RESTORED CALENDAR HEATMAP CONTENT */}
                <div className="bg-surface-container-lowest flex-1 px-6 sm:px-8 py-10 -mt-8 rounded-t-[3rem] shadow-[0_-8px_30px_rgb(0,0,0,0.04)] overflow-y-auto custom-scrollbar">
                   {(() => {
                      const now = new Date();
                      const currentMonth = now.getMonth();
                      const currentYear = now.getFullYear();
                      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
                      const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

                      const activityMap: Record<number, number> = {};
                      userSales.forEach(sale => {
                        const ts = sale.timestamp || sale.createdAt;
                        if (!ts) return;
                        const date = ts.toDate ? ts.toDate() : new Date(ts);
                        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                          const day = date.getDate();
                          activityMap[day] = (activityMap[day] || 0) + 1;
                        }
                      });

                      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

                      return (
                        <>
                          <div className="flex items-center justify-between mb-8 px-2">
                             <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Mapa de actividad</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60">{monthNames[currentMonth]} {currentYear}</span>
                             </div>
                          </div>

                          <div className="grid grid-cols-7 gap-y-4 gap-x-1 mb-10">
                             {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                               <div key={d} className="text-[8px] font-black text-secondary/30 text-center uppercase">{d}</div>
                             ))}
                             {Array.from({ length: firstDayAdjusted }).map((_, i) => <div key={`empty-${i}`} />)}
                             {Array.from({ length: daysInMonth }).map((_, i) => {
                               const day = i + 1;
                               const count = activityMap[day] || 0;
                               const hasActivity = count > 0;
                               return (
                                 <div key={day} className="flex flex-col items-center justify-center">
                                   <div className={cn(
                                     "w-9 h-9 rounded-2xl flex flex-col items-center justify-center transition-all",
                                     hasActivity ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-secondary/20 bg-surface-container/30"
                                   )}>
                                      <span className="text-[10px] font-black">{day}</span>
                                      {hasActivity && <span className="text-[6px] font-bold opacity-60 leading-none">{count}</span>}
                                   </div>
                                 </div>
                               );
                             })}
                          </div>
                        </>
                      );
                   })()}

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] px-2 mb-4">Movimientos Recientes</h4>
                      {isLoadingHistory ? (
                        <div className="flex justify-center p-12"><div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>
                      ) : userSales.length === 0 ? (
                        <div className="text-center py-10 opacity-30 italic text-[10px] uppercase font-black">Sin actividad registrada</div>
                      ) : (
                        userSales.slice(0, 10).map((sale, index) => (
                           <HistoryMovementCard 
                             key={sale.id ? `sale-${sale.id}` : `idx-${index}`}
                             id={sale.id || `temp-${index}`}
                             title={sale.title}
                             total={sale.total || 0}
                             date={sale.hour}
                             paymentMethod={sale.paymentMethod || 'Efectivo'}
                             status={sale.status || 'aceptado'}
                             itemCount={sale.items?.length || 0}
                             onClick={() => setSelectedSaleDetail(sale)}
                           />
                        ))
                      )}
                   </div>
                </div>

                <MovementDetailModal 
                  isOpen={!!selectedSaleDetail}
                  onClose={() => setSelectedSaleDetail(null)}
                  data={selectedSaleDetail}
                  profile={currentUser}
                  chatMessage={chatMessage}
                  setChatMessage={setChatMessage}
                  onSendMessage={handleSendMessage}
                  isSending={sending}
                />
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden p-8">
               <h2 className="text-2xl font-black mb-6">Editar Usuario</h2>
               <div className="space-y-4">
                 <input type="text" value={editFormData.name} onChange={e=>setEditFormData({...editFormData, name: e.target.value})} className="w-full h-14 bg-surface-container rounded-2xl px-5 font-bold" placeholder="Nombre" />
                 <select value={editFormData.role} onChange={e=>setEditFormData({...editFormData, role: e.target.value as any})} className="w-full h-14 bg-surface-container rounded-2xl px-5 font-bold">
                   <option value="vendedor">Vendedor</option>
                   <option value="cliente">Cliente</option>
                   <option value="admin">Administrador</option>
                 </select>
               </div>
               <button onClick={handleUpdateUser} className="w-full h-14 bg-primary text-white rounded-2xl font-black mt-8 uppercase shadow-xl">{isSavingUser ? 'Guardando...' : 'Actualizar'}</button>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
      
      {/* Sync Catalog Modal */}
      <AnimatePresence>
        {isSyncModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSyncing && setIsSyncModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-on-surface">Sincronización</h3>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Base de datos D'LI</p>
                </div>
              </div>

              <p className="text-xs text-secondary font-medium leading-relaxed mb-8">
                Selecciona el tipo de actualización que deseas realizar en el sistema.
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleImageSync}
                  disabled={isSyncing}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSyncing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  Sincronizar Solo Imágenes
                </button>
                
                <button 
                  onClick={handleFullSeed}
                  disabled={isSyncing}
                  className="w-full py-4 rounded-2xl bg-surface-container text-secondary font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSyncing ? <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Recargar Catálogo Completo
                </button>
              </div>

              <button 
                onClick={() => setIsSyncModalOpen(false)}
                disabled={isSyncing}
                className="w-full mt-6 py-2 text-[10px] font-black text-secondary/40 uppercase tracking-widest hover:text-secondary transition-colors disabled:opacity-0"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <BottomNav />
      </div>
    </div>
  );
}
