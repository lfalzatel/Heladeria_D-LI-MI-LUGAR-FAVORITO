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
  getDocs,
  serverTimestamp,
  increment,
  writeBatch,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
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
  Database,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  BellRing,
  MenuSquare,
  IceCream,
  Utensils,
  GlassWater,
  Eye,
  EyeOff,
  Boxes,
  Construction,
  Phone,
  Mail,
  MapPin,
  Save,
  Trash2,
  Star,
  TrendingUp
} from 'lucide-react';
import { formatCurrency, cn, getAssetUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/useAuthStore';
import { useHeaderStore } from '../stores/useHeaderStore';
import SupplyFormModal from '../components/SupplyFormModal';
import MovementDetailModal from '../components/MovementDetailModal';
import HistoryMovementCard from '../components/HistoryMovementCard';
import ProductFormModal from '../components/ProductFormModal';
import CategoryManager from '../components/CategoryManager';
import { PurchaseModal, PurchaseDetailModal, Supply as SupplyType, PurchaseRecord } from '../components/PurchaseModals';
import { WasteModal } from '../components/WasteModal';
import { generatePurchasesPDF, captureReportImage, generateExpensePDF } from '../utils/pdfGenerator';
import { generatePurchasesExcel, generateExpenseExcel } from '../utils/excelGenerator';
import { ExpenseDetailModal, GastoRecord } from '../components/ExpenseDetailModal';
import { ExpenseRankingModal } from '../components/ExpenseRankingModal';
import { seedDatabase, DEFAULT_SUPPLIES } from '../services/seedService';
import { syncProductImages } from '../services/imageFixService';
import { StatCard, PurchaseCard } from '../components/SupplyStats';
import { PeriodFilter, PERIOD_LABELS, isInPeriod, getWeekBoundaries } from '../lib/dateUtils';
import { TrendChart, CalendarModal } from '../components/DashboardComponents';
import { notifyUser, notifyAdmins } from '../lib/notifications';
import { useFlavorsStore } from '../stores/useFlavorsStore';
import { useCategoriesStore } from '../stores/useCategoriesStore';
import RecipeConfigModal from '../components/RecipeConfigModal';
import { RankingModal, StockCriticoModal } from '../components/ReportsModals';
import { Trophy } from 'lucide-react';
import { ExpenseModal, ExpenseData } from '../components/ExpenseModal';
import { ExpenseCategoryManager } from '../components/ExpenseCategoryManager';
import { useExpenseCategoriesStore } from '../stores/useExpenseCategoriesStore';
import ReportPreviewModal from '../components/ReportPreviewModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = 'inventario' | 'personas' | 'operacion';
type InventarioSubTab = 'insumos' | 'productos' | 'sabores' | 'categorias';
type PersonasSubTab = 'equipo' | 'clientes';
type OperacionSubTab = 'compras' | 'gastos' | 'mesas';

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
  lastPurchasePrice?: number;
  portionsPerUnit?: number;
  yieldPerUnit?: number;
  yieldPerSize?: {
    mini?: number;
    small?: number;
    medium?: number;
    large?: number;
  };
  yieldDetails?: string;
  createdAt?: any;
  updatedAt?: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Management() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = (queryParams.get('tab') as MainTab) || 'inventario';
  const setActiveTab = (tab: MainTab) => navigate(`/admin/management?tab=${tab}`, { replace: true });
  const [inventarioSubTab, setInventarioSubTab] = useState<InventarioSubTab>((queryParams.get('subtab') as InventarioSubTab) || 'insumos');
  const [personasSubTab, setPersonasSubTab] = useState<PersonasSubTab>((queryParams.get('subtab') as PersonasSubTab) || 'equipo');
  const [operacionSubTab, setOperacionSubTab] = useState<OperacionSubTab>((queryParams.get('subtab') as OperacionSubTab) || 'compras');

  useEffect(() => {
    const sub = queryParams.get('subtab');
    if (sub) {
      if (['compras', 'gastos', 'mesas'].includes(sub)) setOperacionSubTab(sub as OperacionSubTab);
      if (['insumos', 'sabores'].includes(sub)) setInventarioSubTab(sub as InventarioSubTab);
      if (['equipo', 'clientes', 'fidelidad'].includes(sub)) setPersonasSubTab(sub as PersonasSubTab);
    }
  }, [location.search]);

  const { profile: currentUser } = useAuthStore();
  const { setHeader, clearHeader } = useHeaderStore();
  const { availableFlavors } = useFlavorsStore();
  const { activeCategories } = useCategoriesStore();
  const { subscribe: subscribeExpenseCategories } = useExpenseCategoriesStore();

  const isStaff =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'propietario' ||
    currentUser?.role === 'vendedor';

  // ── Equipo (Personas) State ──────────────────────────────────────────────
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // ── Insumos (Supplies) State ─────────────────────────────────────────────
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [insumosSubTab, setInsumosSubTab] = useState<'compras' | 'catalogo'>('compras');
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseRecord | null>(null);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [supplyToEdit, setSupplyToEdit] = useState<Supply | null>(null);
  const [gastos, setGastos] = useState<any[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isExpenseCategoryModalOpen, setIsExpenseCategoryModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [syncAction, setSyncAction] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [supplySearch, setSupplySearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // ── Productos State (from Inventory.tsx) ─────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [productForRecipe, setProductForRecipe] = useState<Product | null>(null);

  // ── User History State ───────────────────────────────────────────────────
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<any | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [userSales, setUserSales] = useState<any[]>([]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showHistoryHeatmap, setShowHistoryHeatmap] = useState(false);
  const [showPurchaseCalendar, setShowPurchaseCalendar] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(null);

  // ── User Edit State ──────────────────────────────────────────────────────
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'vendedor' as 'admin' | 'vendedor' | 'propietario' | 'cliente',
    cedula: '',
    phone: '',
    address: '',
  });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // ── Sabores State ────────────────────────────────────────────────────────
  const [isFlavorModalOpen, setIsFlavorModalOpen] = useState(false);
  const [newFlavorName, setNewFlavorName] = useState('');
  const [isSavingFlavor, setIsSavingFlavor] = useState(false);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);

  // ── Category Edit State ──────────────────────────────────────────────────
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ── Purchase Export States ──────────────────────────────────────────────────
  const [showPurchaseExportOptions, setShowPurchaseExportOptions] = useState(false);
  const [isPurchasePreviewModalOpen, setIsPurchasePreviewModalOpen] = useState(false);
  const [isGeneratingPurchasePDF, setIsGeneratingPurchasePDF] = useState(false);
  const [purchasePreviewData, setPurchasePreviewData] = useState<{
    dateStr: string;
    sellerName: string;
    totalGastado: number;
    isExpense?: boolean;
    type: 'pdf' | 'excel' | 'image';
    pdf?: any;
    blobUrl?: string;
    imgData?: string;
  } | null>(null);
  const [purchasePreviewType, setPurchasePreviewType] = useState<'pdf' | 'excel' | 'image' | null>(null);
  const [selectedGastoForDetail, setSelectedGastoForDetail] = useState<any | null>(null);
  const [isExpenseRankingOpen, setIsExpenseRankingOpen] = useState(false);

  // ── Header Actions ──────────────────────────────────────────────────────
  useEffect(() => {
    // Solo mostrar acciones si es admin
    const canAdmin = currentUser?.role === 'admin';
    
    setHeader({
      title: "Gestión D'LI",
      subtitle: "Panel Administrativo",
      actions: canAdmin ? (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={async () => {
              const { notifyAdmins } = await import('../lib/notifications');
              toast.promise(
                notifyAdmins('🔔 Prueba de Sistema', `Notificación enviada por ${currentUser?.name || 'Admin'} a las ${new Date().toLocaleTimeString()}`, { type: 'test' }),
                { loading: 'Enviando...', success: '¡Notificación enviada!', error: 'Error al enviar' }
              );
            }}
            className="p-2 sm:px-3 sm:py-2 bg-surface-container text-on-surface rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-high transition-all shadow-sm border border-outline/20"
            title="Probar Notificaciones"
          >
            <BellRing className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline font-black text-[9px] uppercase tracking-widest">Test</span>
            <span className="sm:hidden font-black text-[8px] uppercase tracking-widest">Test</span>
          </button>
          
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="p-2 sm:px-3 sm:py-2 bg-surface-container text-on-surface rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-high transition-all shadow-sm border border-outline/20"
            title="Sincronizar Datos"
          >
            <Database className="w-3.5 h-3.5 text-success" />
            <span className="hidden sm:inline font-black text-[9px] uppercase tracking-widest">Sinc.</span>
            <span className="sm:hidden font-black text-[8px] uppercase tracking-widest">Sinc.</span>
          </button>
        </div>
      ) : null
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, currentUser, setIsSyncModalOpen]);

  // ── Sync URL with tab ────────────────────────────────────────────────────
  // Removed redundancy - URL is now the source of truth for activeTab

  // ── Firebase Listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('name', 'asc')),
      (snap) => setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })) as UserProfile[]),
      (err) => console.error('Users listener error:', err)
    );

    const unsubSupplies = onSnapshot(
      query(collection(db, 'supplies'), orderBy('name', 'asc')),
      (snap) => setSupplies(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupplyType[]),
      (err) => console.error('Supplies listener error:', err)
    );

    const unsubPurchases = onSnapshot(
      query(collection(db, 'supplyPurchases'), orderBy('createdAt', 'desc')),
      (snap) => setPurchases(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PurchaseRecord[])
    );

    const unsubExpenses = onSnapshot(
      query(collection(db, 'gastos'), orderBy('date', 'desc')),
      (snap) => {
        setGastos(snap.docs.map(d => {
          const item = d.data();
          return { id: d.id, ...item, dateObj: item.date?.toDate ? item.date.toDate() : new Date(item.date) };
        }));
      }
    );

    const unsubExpenseCats = subscribeExpenseCategories();

    const unsubProducts = onSnapshot(
      query(collection(db, 'products')),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
        data.sort((a, b) => {
          const isAddA = a.category === 'adiciones';
          const isAddB = b.category === 'adiciones';
          if (isAddA && !isAddB) return 1;
          if (!isAddA && isAddB) return -1;
          const sA = a.salesCount || 0;
          const sB = b.salesCount || 0;
          if (sB !== sA) return sB - sA;
          return a.name.localeCompare(b.name);
        });
        setProducts(data);
      },
      (err) => console.error('Products listener error:', err)
    );

    return () => {
      unsubUsers();
      unsubSupplies();
      unsubPurchases();
      unsubExpenses();
      unsubExpenseCats();
      unsubProducts();
    };
  }, [currentUser]);

  // ── User History Effect ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedUserForHistory) { setUserSales([]); return; }

    setIsLoadingHistory(true);
    const isClient = selectedUserForHistory.role === 'cliente';
    const colName = isClient ? 'pedidos' : 'sales';
    const idField = isClient ? 'clienteId' : 'soldBy';
    const orderByField = isClient ? 'createdAt' : 'timestamp';

    const unsub = onSnapshot(
      query(collection(db, colName), where(idField, '==', selectedUserForHistory.uid), orderBy(orderByField, 'desc')),
      (snap) => {
        const data = snap.docs.map((d) => {
          const item = d.data();
          const ts = item.createdAt || item.timestamp;
          const dateObj = ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : new Date();
          return {
            id: d.id,
            ...item,
            hour: `${dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} - ${dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
            title: item.tableName || (isClient ? 'Pedido Online' : 'Venta POS'),
          };
        });
        setUserSales(data);
        setIsLoadingHistory(false);
      (err) => { console.error('History error:', err); setIsLoadingHistory(false); }
    );
    
    return () => unsub();
  }, [selectedUserForHistory]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedSaleDetail || !currentUser) return;
    setSending(true);
    try {
      const newMsg = { id: Math.random().toString(36).substr(2, 9), from: currentUser.uid, fromName: currentUser.name, text: chatMessage.trim(), timestamp: new Date().toISOString() };
      const messages = [...(selectedSaleDetail.messages || []), newMsg];
      await updateDoc(doc(db, 'pedidos', selectedSaleDetail.id), { messages });
      setChatMessage('');
      if (isStaff) {
        await notifyUser(selectedSaleDetail.clienteId, '💬 Nuevo mensaje de la Heladería', `Sobre tu pedido #${selectedSaleDetail.id.slice(-6).toUpperCase()}: "${chatMessage.trim()}"`, { type: 'chat_message', pedidoId: selectedSaleDetail.id });
      } else {
        await notifyAdmins(`💬 Mensaje de ${currentUser?.name || 'Cliente'}`, `Pedido #${selectedSaleDetail.id.slice(-6).toUpperCase()}: "${chatMessage.trim()}"`, { type: 'chat_message', pedidoId: selectedSaleDetail.id, fromName: currentUser?.name });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setEditFormData({ name: user.name, role: user.role, cedula: user.cedula || '', phone: user.phone || '', address: user.address || '' });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUserForEdit) return;
    setIsSavingUser(true);
    try {
      await updateDoc(doc(db, 'users', selectedUserForEdit.uid), { ...editFormData, updatedAt: serverTimestamp() });
      toast.success('Información de usuario actualizada');
      setIsEditModalOpen(false);
    } catch {
      toast.error('Error al actualizar usuario');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      if (productToEdit) {
        await updateDoc(doc(db, 'products', productToEdit.id), productData);
        toast.success('Producto actualizado');
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          salesCount: 0,
          createdAt: serverTimestamp()
        });
        toast.success('Producto creado');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar producto');
    }
  };

  const handleSaveRecipe = async (productId: string, recipe: any[], variantLabel?: string) => {
    try {
      const productRef = doc(db, 'products', productId);
      const product = products.find(p => p.id === productId);
      
      if (!product) return;

      if (!variantLabel) {
        // Receta base
        await updateDoc(productRef, { recipe });
      } else {
        // Receta de variante
        const updatedVariants = (product.variants || []).map(v => 
          v.label === variantLabel ? { ...v, recipe } : v
        );
        await updateDoc(productRef, { variants: updatedVariants });
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleSaveExpense = async (data: ExpenseData) => {
    try {
      await addDoc(collection(db, 'gastos'), {
        amount: data.amount,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        categoryEmoji: data.categoryEmoji,
        description: data.description,
        userId: currentUser?.uid,
        userName: currentUser?.name,
        date: serverTimestamp()
      });
      toast.success('Gasto registrado con éxito');
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error('Error al registrar gasto');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gastos', id));
      toast.success('Gasto eliminado exitosamente');
      setSelectedGastoForDetail(null);
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error('Error al eliminar el gasto');
    }
  };

  const handleDeletePurchase = async (id: string) => {
    try {
      const purchase = purchases.find(p => p.id === id);
      if (!purchase) return;
      
      const batch = writeBatch(db);
      
      batch.delete(doc(db, 'supplyPurchases', id));
      
      if (purchase.items && purchase.items.length > 0) {
        for (const item of purchase.items) {
          if (item.supplyId) {
            batch.update(doc(db, 'supplies', item.supplyId), {
              currentStock: increment(-item.quantity)
            });
          }
        }
      }
      
      await batch.commit();
      toast.success('Compra eliminada y stock revertido');
      setDetailPurchase(null);
    } catch (error) {
      console.error("Error deleting purchase:", error);
      toast.error('Error al eliminar la compra');
    }
  };

  const handleSaveSupply = async (data: Partial<SupplyType>) => {
    if (supplyToEdit) {
      await updateDoc(doc(db, 'supplies', supplyToEdit.id), { ...data, updatedAt: serverTimestamp() });
      toast.success('Insumo actualizado exitosamente');
    } else {
      await addDoc(collection(db, 'supplies'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast.success('Nuevo insumo registrado en el catálogo base');
    }
  };

  const toggleProductStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'products', id), { isActive: !currentStatus });
      toast.success(`Producto ${!currentStatus ? 'activado' : 'desactivado'}`);
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const toggleFlavorStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'icecreamFlavors', id), { isAvailable: !currentStatus });
      toast.success(`Sabor ${!currentStatus ? 'activado' : 'desactivado'}`);
    } catch {
      toast.error('Error al actualizar estado del sabor');
    }
  };

  const handleCreateFlavor = async () => {
    if (!newFlavorName.trim()) return;
    setIsSavingFlavor(true);
    try {
      await addDoc(collection(db, 'icecreamFlavors'), {
        name: newFlavorName.trim(),
        isAvailable: true
      });
      toast.success('Sabor creado correctamente');
      setIsFlavorModalOpen(false);
      setNewFlavorName('');
    } catch (error) {
      console.error('Error creating flavor:', error);
      toast.error('Error al crear el sabor');
    } finally {
      setIsSavingFlavor(false);
    }
  };

  const handleFullSeed = async () => {
    if (!window.confirm('¿Estás seguro? Esto borrará todos los productos, sabores e insumos actuales para recargarlos desde el archivo base.')) return;
    setSyncAction('seed');
    try {
      await seedDatabase();
      toast.success('¡Catálogo recargado completamente!');
      setIsSyncModalOpen(false);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSyncAction(null);
    }
  };

  const handleImageSync = async () => {
    try {
      setSyncAction('images');
      const count = await syncProductImages();
      toast.success(`¡Se actualizaron ${count} imágenes correctamente!`);
      setIsSyncModalOpen(false);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSyncAction(null);
    }
  };

  const handleRepairSales = async () => {
    if (!currentUser) return;
    setSyncAction('repair');
    try {
      const pedidosSnap = await getDocs(query(collection(db, 'pedidos'), where('status', '==', 'entregado')));
      const pedidosEntregados = pedidosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (pedidosEntregados.length === 0) { toast.info('No se encontraron pedidos entregados para reparar.'); return; }

      const salesSnap = await getDocs(collection(db, 'sales'));
      let repairedCount = 0;

      for (const pedido of pedidosEntregados as any) {
        const cName = pedido.clienteName || pedido.nombre || pedido.userName || 'Cliente Online';
        const saleDoc = salesSnap.docs.find((d) => d.data().pedidoId === pedido.id);
        if (!saleDoc) {
          const pedidoDate = pedido.date || (pedido.createdAt?.toDate ? pedido.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          const pedidoHour = pedido.hour || (pedido.createdAt?.toDate ? pedido.createdAt.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--');
          await addDoc(collection(db, 'sales'), { items: pedido.items, total: pedido.total, sellerId: currentUser.uid, sellerName: currentUser.name, soldBy: currentUser.uid, tableName: '', clienteName: cName, status: 'entregado', timestamp: pedido.createdAt || serverTimestamp(), createdAt: pedido.createdAt || serverTimestamp(), paymentMethod: pedido.paymentMethod || 'Efectivo', date: pedidoDate, hour: pedidoHour, pedidoId: pedido.id, type: 'online' });
          repairedCount++;
        } else {
          const cur = saleDoc.data();
          if (cur.clienteName !== cName || cur.tableName === 'Pedido Online' || cur.status !== 'entregado') {
            await updateDoc(doc(db, 'sales', saleDoc.id), { clienteName: cName, tableName: '', status: 'entregado' });
            repairedCount++;
          }
        }
      }
      repairedCount > 0 ? toast.success(`Proceso terminado: ${repairedCount} registros actualizados/reparados.`) : toast.info('Todo el historial de ventas está sincronizado correctamente.');
      setIsSyncModalOpen(false);
    } catch (error: any) {
      toast.error('Error al reparar historial: ' + error.message);
    } finally {
      setSyncAction(null);
    }
  };

  const handleRecalculatePoints = async () => {
    if (!window.confirm('Esto revisará todas las compras anteriores y asignará puntos y niveles a los clientes que no los hayan recibido. ¿Continuar?')) return;
    try {
      setSyncAction('points');
      const usersSnap = await getDocs(collection(db, 'users'));
      const salesSnap = await getDocs(collection(db, 'sales'));
      const pedidosSnap = await getDocs(query(collection(db, 'pedidos'), where('status', 'in', ['entregado', 'pendiente', 'en_camino', 'preparando'])));
      
      const batch = writeBatch(db);
      let updatedCount = 0;

      usersSnap.docs.forEach(userDoc => {
        const uid = userDoc.id;
        const data = userDoc.data();
        if (data.role !== 'cliente') return;

        let points = 0;
        
        // Ventas físicas
        salesSnap.docs.forEach(sale => {
          const s = sale.data();
          if (s.clienteId === uid && s.type !== 'online') {
             const hasReward = (s.items || []).some((i:any) => i.isLoyaltyReward);
             if (hasReward) points -= 8; // -9 for reward +1 for the sale = -8
             else points += 1;
          }
        });

        // Pedidos online (independiente de su estado para contar compras que ya hizo)
        pedidosSnap.docs.forEach(pedido => {
          if (pedido.data().clienteId === uid) {
             points += 1;
          }
        });

        if (points < 0) points = 0;

        if (data.loyaltyPoints !== points) {
          batch.update(doc(db, 'users', uid), { loyaltyPoints: points });
          updatedCount++;
        }
      });

      await batch.commit();
      
      if (updatedCount > 0) {
        toast.success(`Se recalcularon y ajustaron los puntos para ${updatedCount} clientes.`);
      } else {
        toast.info('Los puntos ya estaban correctos para todos los clientes.');
      }
      setIsSyncModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Error al recalcular puntos: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadBackup = async () => {
    setSyncAction('backup');
    try {
      const collections = ['products', 'supplies', 'icecreamFlavors', 'tables', 'users', 'pedidos', 'sales', 'supplyPurchases', 'wasteRecords'];
      const data: any = {};
      
      for (const col of collections) {
        try {
          const snap = await getDocs(collection(db, col));
          data[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
          console.warn(`No se pudo respaldar la colección ${col}:`, e);
          // Continue to the next collection even if one fails
        }
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dli_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Copia de seguridad descargada exitosamente');
    } catch (error: any) {
      console.error(error);
      toast.error('Error al descargar backup: ' + error.message);
    } finally {
      setSyncAction(null);
    }
  };

  const handleAddMissingSupplies = async () => {
    setSyncAction('missing_supplies');
    try {
      const masterSupplies = DEFAULT_SUPPLIES;

      const snap = await getDocs(collection(db, 'supplies'));
      const existingNames = snap.docs.map(d => (d.data().name || '').toLowerCase());
      
      let addedCount = 0;
      for (const s of masterSupplies) {
        if (!existingNames.includes(s.name.toLowerCase())) {
          await addDoc(collection(db, 'supplies'), {
            ...s,
            updatedAt: serverTimestamp()
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(`¡Se añadieron ${addedCount} insumos faltantes correctamente!`);
      } else {
        toast.info('Todos los insumos ya existen en el sistema.');
      }
      setIsSyncModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Error: ' + error.message);
    } finally {
      setSyncAction(null);
    }
  };

  const handleDeleteSupply = async (supplyId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este insumo?')) {
      try {
        await deleteDoc(doc(db, 'supplies', supplyId));
      } catch (error) {
        console.error("Error deleting supply:", error);
      }
    }
  };

  const handleRenameCategory = async (oldName: string) => {
    if (!newCategoryName.trim() || newCategoryName === oldName || oldName === 'Varios') {
      setEditingCategory(null);
      return;
    }
    const suppliesToUpdate = supplies.filter(s => (s.category || 'Varios') === oldName);
    const batch = writeBatch(db);
    suppliesToUpdate.forEach(s => {
      batch.update(doc(db, 'supplies', s.id!), { category: newCategoryName.trim() });
    });
    await batch.commit();
    toast.success('Categoría renombrada');
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (catName: string) => {
    if (catName === 'Varios') return;
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${catName}"? Sus insumos pasarán a "Varios".`)) return;
    const suppliesToUpdate = supplies.filter(s => (s.category || 'Varios') === catName);
    const batch = writeBatch(db);
    suppliesToUpdate.forEach(s => {
      batch.update(doc(db, 'supplies', s.id!), { category: 'Varios' });
    });
    await batch.commit();
    toast.success('Categoría eliminada');
  };

  const calculateRecipeCost = (recipe?: any[]) => {
    if (!recipe || recipe.length === 0) return 0;
    return recipe.reduce((acc, ing) => {
      const supply = supplies.find(s => s.id === ing.supplyId);
      if (!supply) return acc;
      const lastPrice = supply.lastPurchasePrice || 0;
      const yieldU = supply.portionsPerUnit || supply.yieldPerUnit || 1;
      const costPerPortion = lastPrice / yieldU;
      return acc + (costPerPortion * (ing.quantity || 1));
    }, 0);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const filtered = purchases.filter((p) => isInPeriod(p.createdAt, period, selectedDate, selectedMonth, selectedWeek));
  const periodTotal = filtered.reduce((a, p) => a + (p.total || 0), 0);
  const totalUnits = filtered.reduce((a, p) => a + (p.items?.length || 0), 0);
  const activeDays = new Set(filtered.map((p) => { const d = p.createdAt?.toDate?.() || (p.createdAt ? new Date(p.createdAt) : null); return d?.toDateString(); }).filter(Boolean)).size;
  const avgPerPurchase = filtered.length > 0 ? periodTotal / filtered.length : 0;
  const criticalSupplies = supplies.filter((s: any) => (s.currentStock || 0) <= (s.minLimit || 0));
  const lowStock = criticalSupplies.length;

  const productMap: Record<string, { name: string; units: number; revenue: number }> = {};
  filtered.forEach(p => {
    p.items?.forEach((item: any) => {
      const k = item.name || 'Desconocido';
      if (!productMap[k]) productMap[k] = { name: k, units: 0, revenue: 0 };
      productMap[k].units += item.quantity || 1;
      productMap[k].revenue += item.cost || 0;
    });
  });
  const ranking = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  const starSupply = ranking[0];

  // Gastos derived values
  const filteredGastos = gastos.filter((g) => isInPeriod(g.dateObj, period, selectedDate, selectedMonth, selectedWeek));
  const periodTotalGastos = filteredGastos.reduce((a, g) => a + (g.amount || 0), 0);
  const gastosCategoryMap: Record<string, { name: string; amount: number; count: number; emoji?: string }> = {};
  filteredGastos.forEach(g => {
    const k = g.categoryName || 'Otro';
    if (!gastosCategoryMap[k]) gastosCategoryMap[k] = { name: k, amount: 0, count: 0, emoji: g.categoryEmoji };
    gastosCategoryMap[k].amount += g.amount || 0;
    gastosCategoryMap[k].count += 1;
  });
  const sortedExpenseCategories = Object.values(gastosCategoryMap).sort((a, b) => b.amount - a.amount);
  const topExpenseCategory = sortedExpenseCategories[0] || null;

  const groupedSupplies = supplies
    .filter(s => s.name.toLowerCase().includes(supplySearch.toLowerCase()) || (s.category || '').toLowerCase().includes(supplySearch.toLowerCase()))
    .reduce((acc, supply) => {
      const cat = supply.category || 'Varios';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(supply);
      return acc;
    }, {} as Record<string, Supply[]>);

  const categories = [
    { id: 'all', label: 'Todos', icon: <MenuSquare className="w-4 h-4" /> },
    ...activeCategories.map(cat => ({
      id: cat.id,
      label: cat.label,
      icon: <MenuSquare className="w-4 h-4" />
    }))
  ];
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REPORT EXPORT HANDLERS (COMPRAS)
  // ─────────────────────────────────────────────────────────────────────────
  const handlePurchasePreview = async (type: 'pdf' | 'excel' | 'image') => {
    setShowPurchaseExportOptions(false);
    setPurchasePreviewType(type);
    setIsPurchasePreviewModalOpen(true);
    setPurchasePreviewData(null);
    setIsGeneratingPurchasePDF(true);
    
    const dateStr = selectedDate ? selectedDate.toLocaleDateString('es-CO') : (PERIOD_LABELS[period as PeriodFilter] || 'Histórico');
    const sellerName = currentUser?.name || 'Administrador';

    try {
      const totalGastado = filtered.reduce((sum, p) => sum + (p.total || 0), 0);

      if (type === 'excel') {
        setPurchasePreviewData({ type, dateStr, sellerName, totalGastado });
        setIsGeneratingPurchasePDF(false);
      } else if (type === 'pdf') {
        const result = await generatePurchasesPDF(sellerName, dateStr, filtered, totalGastado, ranking);
        if (result.success) {
           setPurchasePreviewData({
             type,
             pdf: result.pdf,
             blobUrl: result.blobUrl,
             dateStr,
             sellerName,
             totalGastado
           });
        } else {
           toast.error('Error generando PDF de Compras');
           setIsPurchasePreviewModalOpen(false);
        }
        setIsGeneratingPurchasePDF(false);
      } else if (type === 'image') {
        setTimeout(async () => {
          const imgData = await captureReportImage('hidden-purchase-image-report');
          if (imgData) {
             setPurchasePreviewData({
               type,
               imgData,
               dateStr,
               sellerName,
               totalGastado
             });
          } else {
             toast.error('Error generando Imagen');
             setIsPurchasePreviewModalOpen(false);
          }
          setIsGeneratingPurchasePDF(false);
        }, 100);
      }
    } catch (e) {
      toast.error('Ocurrió un error al procesar el reporte de compras');
      setIsPurchasePreviewModalOpen(false);
      setIsGeneratingPurchasePDF(false);
    }
  };

  const handleExpensePreview = async (type: 'pdf' | 'excel' | 'image') => {
    setShowPurchaseExportOptions(false);
    const dateStr = selectedDate ? selectedDate.toLocaleDateString('es-CO') : (PERIOD_LABELS[period as PeriodFilter] || 'Histórico');
    const sellerName = currentUser?.name || 'Administrador';
    const totalGastado = filteredGastos.reduce((a, g) => a + (g.amount || 0), 0);

    if (type === 'excel') {
      setPurchasePreviewType('excel');
      setPurchasePreviewData({ type, dateStr, sellerName, totalGastado, isExpense: true });
      setIsPurchasePreviewModalOpen(true);
    } else if (type === 'pdf') {
      setIsGeneratingPurchasePDF(true);
      try {
        const { success, pdf, blobUrl } = await generateExpensePDF(sellerName, dateStr, filteredGastos, totalGastado, sortedExpenseCategories);
        if (success && pdf && blobUrl) {
          setPurchasePreviewType('pdf');
          setPurchasePreviewData({ type, pdf, blobUrl, dateStr, sellerName, totalGastado, isExpense: true });
          setIsPurchasePreviewModalOpen(true);
        } else {
          toast.error('Error al generar el PDF de gastos');
        }
      } catch (e) {
        toast.error('Ocurrió un error al procesar el PDF de gastos');
      } finally {
        setIsGeneratingPurchasePDF(false);
      }
    } else if (type === 'image') {
      setIsGeneratingPurchasePDF(true);
      try {
        setTimeout(async () => {
          const imgData = await captureReportImage('hidden-expense-image-report');
          setIsGeneratingPurchasePDF(false);
          if (imgData) {
            setPurchasePreviewType('image');
            setPurchasePreviewData({ type, imgData, dateStr, sellerName, totalGastado, isExpense: true });
            setIsPurchasePreviewModalOpen(true);
          } else {
            toast.error('Error al generar la imagen de gastos');
          }
        }, 100);
      } catch (e) {
        toast.error('Ocurrió un error al procesar la imagen de gastos');
        setIsGeneratingPurchasePDF(false);
      }
    }
  };

  const handlePurchaseDownload = () => {
    if (!purchasePreviewData) return;
    const { type, pdf, imgData, dateStr, sellerName, totalGastado } = purchasePreviewData;
    const fileName = `Compras_${dateStr.replace(/\//g, '-')}_${sellerName}`;
    
    if (type === 'pdf' && pdf) {
      pdf.save(`${fileName}.pdf`);
      toast.success('PDF descargado con éxito');
    } else if (type === 'image' && imgData) {
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${fileName}.jpg`;
      link.click();
      toast.success('Imagen descargada con éxito');
    } else if (type === 'excel') {
      const currentTotal = filtered.reduce((sum, p) => sum + (p.total || 0), 0);
      generatePurchasesExcel(sellerName, dateStr, filtered, currentTotal);
      toast.success('Excel descargado con éxito');
    }
  };

  const handlePurchaseShare = async () => {
    if (!purchasePreviewData) return;
    try {
      const { type, pdf, imgData, dateStr, sellerName } = purchasePreviewData;
      const fileName = `Compras_${dateStr.replace(/\//g, '-')}_${sellerName}`;
      
      let fileToShare: File | null = null;

      if (type === 'pdf' && pdf) {
        const blob = pdf.output('blob');
        fileToShare = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });
      } else if (type === 'image' && imgData) {
        const response = await fetch(imgData);
        const blob = await response.blob();
        fileToShare = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
      } else if (type === 'excel') {
         toast.error('Compartir Excel directamente no soportado aún, usa Descargar.');
         return;
      }

      if (fileToShare && navigator.share) {
        await navigator.share({
          title: `Reporte de Compras ${dateStr}`,
          text: `Adjunto reporte de compras generado por ${sellerName}`,
          files: [fileToShare]
        });
      } else {
        toast.info('Compartir no está soportado en este navegador');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full flex flex-col gap-6 pb-32 overflow-x-hidden min-w-0">
        {/* Main Tab Bar (3 tabs) */}
        <div className="flex p-1.5 bg-surface-container rounded-2xl sm:rounded-full w-full max-w-lg shadow-inner border border-outline/30 mx-auto">
          {(
            [
              { id: 'inventario', label: 'Inventario', labelShort: 'Inv.', icon: <Package className="w-4 h-4" /> },
              { id: 'personas', label: 'Personas', labelShort: 'Pers.', icon: <UsersIcon className="w-4 h-4" /> },
              { id: 'operacion', label: 'Operación', labelShort: 'Op.', icon: <Boxes className="w-4 h-4" /> },
            ] as { id: MainTab; label: string; labelShort: string; icon: React.ReactNode }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-3 px-3 rounded-xl sm:rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                activeTab === tab.id ? 'bg-white text-primary shadow-md' : 'text-secondary hover:text-on-surface'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.labelShort}</span>
            </button>
          ))}
        </div>

        {/* Tab Content ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">

            {/* ═══════════════════════════════════════════════════════════════
                TAB: INVENTARIO
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'inventario' && (
              <motion.div
                key="inventario"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="w-full flex flex-col gap-5 pb-10"
              >
                {/* Sub-tab bar: Insumos | Productos | Sabores */}
                <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner w-full">
                  {(
                    [
                      { id: 'insumos', label: 'Insumos' },
                      { id: 'productos', label: 'Productos' },
                      { id: 'sabores', label: 'Sabores' },
                      { id: 'categorias', label: 'Categorías' },
                    ] as { id: InventarioSubTab; label: string }[]
                  ).map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setInventarioSubTab(sub.id)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                        inventarioSubTab === sub.id
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-secondary hover:bg-surface-container-high'
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">

                  {/* ── Sub-tab: INSUMOS (Solo Catálogo) ────────────────────────── */}
                  {inventarioSubTab === 'insumos' && (
                    <motion.div key="insumos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => { setSupplyToEdit(null); setIsSupplyModalOpen(true); }}
                          className="flex-[2] py-4 bg-on-surface text-white rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all">
                          <Plus className="w-5 h-5 stroke-[3]" /> Añadir Insumo
                        </button>
                        <button onClick={async () => {
                          if(!window.confirm('¿Resetear precios viejos (excepto Helado)?')) return;
                          toast.loading('Limpiando precios...');
                          for (const s of supplies) {
                            if (s.name.toLowerCase().includes('helado')) continue;
                            if (s.lastPurchasePrice && s.lastPurchasePrice > 0) {
                              await updateDoc(doc(db, 'supplies', s.id), { lastPurchasePrice: 0 });
                            }
                          }
                          toast.dismiss();
                          toast.success('Precios reseteados');
                        }}
                          className="flex-1 py-4 bg-orange-100 text-orange-600 rounded-3xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center justify-center transition-all hover:bg-orange-200">
                          Reset Precios Viejos
                        </button>
                        <div className="flex-[2] flex items-center bg-white rounded-3xl px-4 py-2 border border-outline/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
                          <Search className="w-5 h-5 text-secondary/50 mr-3 flex-shrink-0" />
                          <input 
                            type="text" 
                            placeholder="Buscar insumo o categoría..." 
                            value={supplySearch}
                            onChange={(e) => setSupplySearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full font-bold placeholder:text-secondary/40 text-on-surface"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        {Object.entries(groupedSupplies).map(([category, items]) => {
                          const isExpanded = expandedCategory === category || supplySearch !== '';
                          const categoryCritical = items.filter(s => (s.currentStock || 0) <= (s.minLimit || 0)).length;
                          
                          return (
                            <div key={category} className="bg-white rounded-[2rem] border border-outline/50 shadow-sm overflow-hidden transition-all">
                              <div 
                                onClick={() => setExpandedCategory(isExpanded && supplySearch === '' ? null : category)}
                                className="w-full flex items-center justify-between p-5 sm:p-6 bg-surface-container/30 hover:bg-surface-container/50 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner', 
                                    categoryCritical > 0 ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'
                                  )}>
                                    {category.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="text-left flex-1">
                                    {editingCategory === category ? (
                                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                          autoFocus
                                          value={newCategoryName}
                                          onChange={e => setNewCategoryName(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') handleRenameCategory(category); if (e.key === 'Escape') setEditingCategory(null); }}
                                          className="px-2 py-1 border-2 border-primary/40 rounded-xl outline-none focus:border-primary text-sm font-black bg-white shadow-sm w-full max-w-[200px]"
                                        />
                                        <button onClick={(e) => { e.stopPropagation(); handleRenameCategory(category); }} className="p-1 bg-primary text-white rounded-xl"><Save className="w-4 h-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingCategory(null); }} className="p-1 bg-surface-container text-secondary rounded-xl"><X className="w-4 h-4"/></button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight">{category}</h3>
                                        {category !== 'Varios' && (
                                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); setEditingCategory(category); setNewCategoryName(category); }}
                                              className="p-1 hover:bg-primary/10 hover:text-primary text-secondary rounded-lg transition-colors"
                                              title="Renombrar"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                                              className="p-1 hover:bg-red-500/10 hover:text-red-500 text-secondary rounded-lg transition-colors"
                                              title="Eliminar"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <p className="text-xs font-bold text-secondary">{items.length} insumos registrados</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {categoryCritical > 0 && (
                                    <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                      <AlertTriangle className="w-3 h-3" /> {categoryCritical} alertas
                                    </span>
                                  )}
                                  <div className={cn("p-2 rounded-xl transition-all", isExpanded ? "bg-primary text-white" : "bg-surface-container text-secondary")}>
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                  </div>
                                </div>
                              </div>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-outline/10"
                                  >
                                    <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {items.map((s: any) => {
                                        const isLow = s.currentStock <= s.minLimit;
                                        return (
                                          <div key={s.id} className={cn('bg-surface-container/30 rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-all hover:border-primary/30 hover:shadow-md hover:bg-white', isLow && 'border-orange-200 bg-orange-50/30', s.isVirtual && 'border-amber-200 bg-amber-50/30 hover:border-amber-400')}>
                                            <div className="flex justify-between items-start mb-3">
                                              <span className={cn('px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest', s.isVirtual ? 'bg-amber-100 text-amber-600' : isLow ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary')}>
                                                {s.isVirtual ? '👻 Virtual' : isLow ? '⚠ ' + (s.category || 'Varios') : (s.category || 'Varios')}
                                              </span>
                                              <div className="flex gap-1.5 opacity-100">
                                                <button onClick={(e) => { e.stopPropagation(); setSupplyToEdit(s); setIsSupplyModalOpen(true); }}
                                                  className="w-9 h-9 rounded-xl bg-white border border-outline/20 flex items-center justify-center text-secondary hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
                                                  <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSupply(s.id); }}
                                                  className="w-9 h-9 rounded-xl bg-white border border-outline/20 flex items-center justify-center text-secondary hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm">
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                            <h4 className="font-bold text-base text-on-surface leading-tight mb-4">{s.name}</h4>
                                            
                                            {s.isVirtual ? (
                                              <div className="mt-2 mb-4 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">No se descuenta del inventario</p>
                                                <p className="text-[10px] text-amber-700 mt-0.5">Insumo organizativo para recetas. Sin stock real.</p>
                                              </div>
                                            ) : (s.yieldPerSize?.mini || s.yieldPerSize?.small || s.yieldPerSize?.medium || s.yieldPerSize?.large) ? (
                                              <div className="mt-2 mb-4 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter mb-1.5">Rendimiento por Tamaños (1 {s.unit})</p>
                                                <div className="grid grid-cols-4 gap-1">
                                                  {s.yieldPerSize.mini && <div className="text-center bg-white rounded-lg py-1 border border-emerald-100"><p className="text-[8px] font-bold text-emerald-600">Mini</p><p className="text-[10px] font-black text-emerald-900">{s.yieldPerSize.mini}</p></div>}
                                                  {s.yieldPerSize.small && <div className="text-center bg-white rounded-lg py-1 border border-emerald-100"><p className="text-[8px] font-bold text-emerald-600">Peq</p><p className="text-[10px] font-black text-emerald-900">{s.yieldPerSize.small}</p></div>}
                                                  {s.yieldPerSize.medium && <div className="text-center bg-white rounded-lg py-1 border border-emerald-100"><p className="text-[8px] font-bold text-emerald-600">Med</p><p className="text-[10px] font-black text-emerald-900">{s.yieldPerSize.medium}</p></div>}
                                                  {s.yieldPerSize.large && <div className="text-center bg-white rounded-lg py-1 border border-emerald-100"><p className="text-[8px] font-bold text-emerald-600">Gde</p><p className="text-[10px] font-black text-emerald-900">{s.yieldPerSize.large}</p></div>}
                                                </div>
                                              </div>
                                            ) : s.portionsPerUnit > 0 ? (
                                              <div className="mt-2 mb-4 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                                <div>
                                                  <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter mb-0.5">Rendimiento Estándar</p>
                                                  <p className="text-[10px] font-bold text-emerald-900 leading-tight">1 {s.unit} = {s.portionsPerUnit} uds/porc</p>
                                                </div>
                                                {s.lastPurchasePrice > 0 && (
                                                  <div className="text-right">
                                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter mb-0.5">Costo x Unidad</p>
                                                    <p className="text-[10px] font-black text-emerald-700 leading-tight">{formatCurrency(s.lastPurchasePrice / s.portionsPerUnit)}</p>
                                                  </div>
                                                )}
                                              </div>
                                            ) : s.yieldDetails && (
                                              <div className="mt-2 mb-4 p-3 bg-primary/5 rounded-2xl border border-primary/10">
                                                <p className="text-[8px] font-black text-primary uppercase tracking-tighter mb-0.5">Rendimiento Estimado (Legado)</p>
                                                <p className="text-[10px] font-bold text-on-surface leading-tight italic">✨ {s.yieldDetails}</p>
                                              </div>
                                            )}

                                            {!s.isVirtual && (
                                              <div className="flex border-t border-outline/10 pt-4 mt-auto">
                                                <div className="flex-1">
                                                  <p className="text-[9px] text-secondary font-black uppercase tracking-widest">En Stock</p>
                                                  <p className={cn('text-xl font-black mt-0.5', isLow ? 'text-orange-600' : 'text-on-surface')}>{s.currentStock} <span className="text-xs font-bold opacity-60 uppercase">{s.unit}</span></p>
                                                </div>
                                                <div className="flex-1 text-right border-l border-outline/10 pl-4">
                                                  <p className="text-[9px] text-secondary font-bold uppercase tracking-widest">Alerta en</p>
                                                  <p className="text-sm font-bold text-secondary mt-1.5">
                                                    {s.minLimitUnit === 'internal' 
                                                      ? `${Math.round((s.minLimit || 0) * (s.portionsPerUnit || s.yieldPerUnit || 1))} `
                                                      : `${s.minLimit ?? 0} `}
                                                    <span className="text-[10px] uppercase">
                                                      {s.minLimitUnit === 'internal' ? 'UND' : s.unit}
                                                    </span>
                                                  </p>
                                                </div>
                                              </div>
                                            )}
                                            {!s.isVirtual && s.lastRestockDate && (
                                                <div className="mt-3 pt-2 border-t border-outline/5 text-right">
                                                    <p className="text-[8px] font-black text-secondary uppercase tracking-widest">Últ. Abastecimiento</p>
                                                    <p className="text-[10px] font-bold text-secondary mt-0.5">
                                                      {new Date(s.lastRestockDate?.toDate ? s.lastRestockDate.toDate() : s.lastRestockDate).toLocaleDateString('es-CO', {day: '2-digit', month: 'short', year: 'numeric'})}
                                                    </p>
                                                </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                        {Object.keys(groupedSupplies).length === 0 && (
                          <div className="py-24 flex flex-col items-center justify-center opacity-40 bg-white rounded-[2rem] border border-dashed border-outline/50">
                            <Search className="w-16 h-16 mb-4 text-secondary" />
                            <p className="text-lg font-bold text-on-surface">No se encontraron insumos</p>
                            <p className="text-xs text-secondary mt-1">Prueba con otra búsqueda</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ── Sub-tab: PRODUCTOS ────────────────────────────────── */}
                  {inventarioSubTab === 'productos' && (
                    <motion.div 
                      key="productos" 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="flex flex-col gap-5 w-full max-w-full overflow-hidden pb-10"
                    >
                      {/* Add product button */}
                      <button
                        onClick={() => { setProductToEdit(null); setIsProductModalOpen(true); }}
                        className="w-full py-4 bg-on-surface text-white rounded-2xl sm:rounded-[2rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all"
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <span className="truncate">Añadir Nuevo Producto</span>
                      </button>

                      {/* Toolbar: categories + search */}
                      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-3 sm:p-4 rounded-3xl sm:rounded-[2rem] border border-outline/50 shadow-sm w-full min-w-0 overflow-hidden">
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto hide-scrollbar pb-2 sm:pb-0 px-1 min-w-0">
                          {categories.map((cat) => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap shrink-0',
                                activeCategory === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container text-secondary hover:bg-surface-container-high')}>
                              {cat.icon}
                              {cat.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center bg-surface-container rounded-2xl px-4 py-3 border border-outline w-full md:w-64 focus-within:border-primary transition-all">
                          <Search className="w-4 h-4 text-secondary/40 mr-3 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs w-full text-on-surface placeholder:text-secondary/30 font-bold"
                          />
                        </div>
                      </div>

                      {/* Product grid */}
                      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredProducts.map((product, index) => (
                          <motion.div
                            layout
                            key={product.id}
                            className={cn(
                              'rounded-[2.5rem] p-6 border-2 transition-all flex flex-col justify-between group animate-card-mix opacity-0',
                              (!product.cardColor || !product.cardColor.startsWith('#')) && (product.cardColor || 'bg-white'),
                              product.isActive ? 'border-outline/50' : 'border-dashed border-outline opacity-60 bg-surface-container/10'
                            )}
                            style={{
                              ...(product.cardColor?.startsWith('#') ? { backgroundColor: product.cardColor } : {}),
                              animationDelay: `${index * 0.05}s`,
                            }}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-4 mb-4">
                                <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center overflow-hidden shadow-sm shrink-0', product.isActive ? 'bg-primary/5 text-primary' : 'bg-surface-container text-secondary/40')}>
                                  {product.imageUrl ? (
                                    <img src={getAssetUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <IceCream className="w-8 h-8" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-headline font-black text-lg text-on-surface leading-tight mb-1 truncate">{product.name}</h4>
                                  <p className="text-[9px] text-secondary font-black uppercase tracking-widest truncate">
                                    {product.category}
                                  </p>
                                  <div className="mt-3">
                                    <button
                                      onClick={() => toggleProductStatus(product.id, !!product.isActive)}
                                      className={cn('px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest', 
                                        product.isActive ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-400')}
                                    >
                                      {product.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                      {product.isActive ? 'Visible' : 'Oculto'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2 mb-6 bg-surface-container/30 p-4 rounded-[2rem] border border-outline/10">
                                {product.variants ? (
                                  product.variants.map((v, i) => {
                                    const variantRecipeCost = calculateRecipeCost(v.recipe || product.recipe);
                                    const margin = v.price > 0 ? ((v.price - variantRecipeCost) / v.price) * 100 : 0;
                                    return (
                                      <div key={i} className="flex flex-col py-2 border-b border-outline/5 last:border-none">
                                        <div className="flex justify-between items-center text-xs font-bold">
                                          <span className="text-secondary">{v.label}</span>
                                          <span className="text-on-surface">{formatCurrency(v.price)}</span>
                                        </div>
                                        {variantRecipeCost > 0 && (
                                          <div className="flex justify-between items-center mt-1">
                                            <span className="text-[9px] text-secondary/60 font-medium">Costo: {formatCurrency(variantRecipeCost)}</span>
                                            <span className={cn(
                                              "text-[9px] font-black px-1.5 py-0.5 rounded-md",
                                              margin > 50 ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                            )}>
                                              {margin.toFixed(0)}% util.
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <>
                                    <div className="flex justify-between items-center text-sm font-black mb-1">
                                      <span className="text-primary text-[10px] uppercase tracking-widest">Precio Base</span>
                                      <span className="text-on-surface">{formatCurrency(product.basePrice || 0)}</span>
                                    </div>
                                    {calculateRecipeCost(product.recipe) > 0 && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-secondary/60 font-bold">COSTO: {formatCurrency(calculateRecipeCost(product.recipe))}</span>
                                        <span className="text-[10px] font-black text-emerald-600">
                                          {(((product.basePrice || 0) - calculateRecipeCost(product.recipe)) / (product.basePrice || 1) * 100).toFixed(0)}% MARGEN
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 pt-4 border-t border-outline/30">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Estado en Menú</span>
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md', product.isActive ? 'text-success bg-success/10' : 'text-slate-500 bg-slate-100')}>
                                  {product.isActive ? 'Visible' : 'Oculto'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setProductForRecipe(product);
                                    setIsRecipeModalOpen(true);
                                  }}
                                  className="flex-1 h-10 bg-surface-container text-on-surface rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors border border-outline/10"
                                >
                                  <Database className="w-3.5 h-3.5 text-primary" />
                                  Receta
                                </button>
                                <button
                                  onClick={() => {
                                    setProductToEdit(product);
                                    setIsProductModalOpen(true);
                                  }}
                                  className="flex-1 h-10 bg-on-surface text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Editar
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </section>

                      {filteredProducts.length === 0 && (
                        <div className="py-24 flex flex-col items-center justify-center opacity-30">
                          <MenuSquare className="w-16 h-16 mb-4" />
                          <p className="text-lg font-bold">No se encontraron productos</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ── Sub-tab: SABORES ──────────────────────────────────── */}
                  {inventarioSubTab === 'sabores' && (
                    <motion.div key="sabores" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                      {/* Add flavor button */}
                      <button
                        onClick={() => setIsFlavorModalOpen(true)}
                        className="w-full py-4 bg-on-surface text-white rounded-2xl sm:rounded-[2rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all"
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <span className="truncate">Añadir Nuevo Sabor</span>
                      </button>

                      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {availableFlavors.map((flavor) => (
                          <motion.div
                            layout
                            key={flavor.id}
                            onClick={() => toggleFlavorStatus(flavor.id, flavor.isAvailable)}
                            className={cn(
                              'relative bg-white rounded-2xl p-3 shadow-sm border transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-95 select-none',
                              flavor.isAvailable 
                                ? 'border-outline/50 hover:border-primary/40 hover:shadow-md' 
                                : 'border-outline/20 opacity-60 bg-surface-container/30 grayscale-[0.5]'
                            )}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={cn(
                                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110',
                                flavor.isAvailable ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                              )}>
                                <IceCream className="w-4 h-4" />
                              </div>
                              <h3 className="font-brand font-black text-sm text-on-surface leading-tight tracking-tight">{flavor.name}</h3>
                            </div>
                            
                            <div className={cn(
                              'px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shrink-0 border',
                              flavor.isAvailable 
                                ? 'bg-success/10 text-success border-success/20' 
                                : 'bg-secondary/5 text-secondary border-outline/10'
                            )}>
                              {flavor.isAvailable ? 'ON' : 'OFF'}
                            </div>
                          </motion.div>
                        ))}
                      </section>
                    </motion.div>
                  )}

                  {inventarioSubTab === 'categorias' && (
                    <motion.div key="categorias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <CategoryManager />
                    </motion.div>
                  )}

                </AnimatePresence>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: PERSONAS (Equipo y Clientes)
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'personas' && (
              <motion.div
                key="personas"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col gap-5"
              >
                {/* Sub-tab bar: Equipo | Clientes */}
                <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner w-full">
                  {(
                    [
                      { id: 'equipo', label: 'Equipo' },
                      { id: 'clientes', label: 'Clientes' },
                    ] as { id: PersonasSubTab; label: string }[]
                  ).map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setPersonasSubTab(sub.id)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                        personasSubTab === sub.id
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-secondary hover:bg-surface-container-high'
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                <div className="bg-white rounded-[2rem] p-4 border border-outline/50 shadow-sm">
                  <div className="flex-1 w-full bg-surface-container rounded-2xl px-4 py-3 border border-outline/50 flex items-center">
                    <Search className="w-4 h-4 text-secondary/50 mr-2" />
                    <input
                      type="text"
                      placeholder={`Buscar ${personasSubTab === 'equipo' ? 'miembro' : 'cliente'}...`}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm w-full font-bold placeholder:text-secondary/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users
                    .filter((u) => {
                      if (currentUser?.role === 'propietario' && u.role === 'admin') return false;
                      const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                      const isStaff = ['admin', 'propietario', 'vendedor'].includes(u.role);
                      const matchesTab = personasSubTab === 'equipo' ? isStaff : u.role === 'cliente';
                      return matchesSearch && matchesTab;
                    })
                    .map((user, i) => (
                      <motion.div
                        layout
                        key={user.uid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-4 border border-outline/10 shadow-sm flex items-center gap-4 group hover:border-primary/20 transition-all hover:shadow-md"
                      >
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-2xl bg-surface-container overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-primary font-black text-xl">
                            {user.imageUrl ? (
                              <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              user.name[0].toUpperCase()
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-headline font-black text-sm text-on-surface uppercase truncate tracking-tight">{user.name}</h3>
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-2">
                              <span className={cn('text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border',
                                user.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' :
                                user.role === 'propietario' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                user.role === 'cliente' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100')}>
                                {user.role === 'cliente' ? 'CLIENTE' : user.role}
                              </span>
                              {user.phone && (
                                <div className="flex items-center gap-1 text-secondary/60">
                                  <Phone className="w-2.5 h-2.5" />
                                  <span className="text-[9px] font-bold">{user.phone}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[9px] text-secondary/40 font-medium truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => handleEditUser(user)} className="w-8 h-8 rounded-xl bg-surface-container text-secondary flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all border border-outline/10">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setSelectedUserForHistory(user)} className="w-8 h-8 rounded-xl bg-on-surface text-white flex items-center justify-center hover:bg-primary transition-all shadow-sm">
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB: OPERACIÓN (Compras)
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'operacion' && (
              <motion.div
                key="operacion"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="w-full flex flex-col gap-5 pb-10"
              >
                {/* Title and Actions */}
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center justify-between w-full">
                    <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                      {operacionSubTab === 'compras' ? 'Compras' : 'Gastos'}
                    </h2>
                    <div className="flex items-center gap-2 relative">
                      <button 
                        onClick={() => setShowPurchaseCalendar(true)}
                        className="w-10 h-10 bg-white text-secondary rounded-full flex items-center justify-center border border-outline/20 hover:text-primary hover:border-primary/50 transition-all shadow-sm"
                        title="Calendario"
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setShowPurchaseExportOptions(!showPurchaseExportOptions)}
                        className="w-10 h-10 bg-white text-secondary rounded-full flex items-center justify-center border border-outline/20 hover:text-primary hover:border-primary/50 transition-all shadow-sm relative overflow-hidden group"
                        title="Descargar Reporte"
                        disabled={isGeneratingPurchasePDF}
                      >
                        <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>

                      <AnimatePresence>
                        {showPurchaseExportOptions && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-12 right-0 bg-white rounded-3xl p-2 shadow-2xl border border-outline/10 w-64 z-[100] flex flex-col gap-1"
                          >
                            <div className="px-3 py-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-secondary/60">Formato de Salida</p>
                            </div>
                            <button onClick={() => operacionSubTab === 'gastos' ? handleExpensePreview('excel') : handlePurchasePreview('excel')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container transition-colors text-left w-full">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">XLS</div>
                              <span className="font-bold text-on-surface">Descargar Excel</span>
                            </button>
                            <button onClick={() => operacionSubTab === 'gastos' ? handleExpensePreview('pdf') : handlePurchasePreview('pdf')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container transition-colors text-left w-full">
                              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 font-black text-xs">PDF</div>
                              <span className="font-bold text-on-surface">Descargar PDF</span>
                            </button>
                            <button onClick={() => operacionSubTab === 'gastos' ? handleExpensePreview('image') : handlePurchasePreview('image')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container transition-colors text-left w-full">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">JPG</div>
                              <span className="font-bold text-on-surface">Descargar Imagen</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  {/* Operación Sub-tabs */}
                  <div className="flex gap-2 bg-surface-container p-1.5 rounded-2xl">
                    {(['compras', 'gastos'] as OperacionSubTab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => {
                          setOperacionSubTab(tab);
                          navigate(`/admin/management?tab=operacion&subtab=${tab}`, { replace: true });
                        }}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                          operacionSubTab === tab 
                            ? 'bg-white text-on-surface shadow-sm' 
                            : 'text-secondary hover:text-on-surface hover:bg-white/50'
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Header Actions & Date Filter */}
                  {selectedDate ? (
                    <div className="flex items-center justify-between bg-primary/10 rounded-2xl p-3 w-full border border-primary/20">
                      <span className="text-sm font-bold text-primary capitalize">
                        {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <button 
                        onClick={() => { setSelectedDate(null); setPeriod('today'); }}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-primary shadow-sm hover:bg-primary hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner w-full">
                      {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => (
                        <button key={p} onClick={() => {
                          setPeriod(p);
                          setSelectedDate(null);
                          if (p === 'month') setSelectedMonth(new Date());
                          if (p === 'week') setSelectedWeek(new Date());
                        }}
                          className={cn('px-4 py-2.5 rounded-xl transition-all flex-1 text-[10px] font-black uppercase tracking-widest', period === p ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:bg-surface-container-high')}>
                          {PERIOD_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  )}

                  <CalendarModal 
                    isOpen={showPurchaseCalendar}
                    onClose={() => setShowPurchaseCalendar(false)}
                    allActivity={operacionSubTab === 'gastos' 
                      ? gastos.map(g => ({ createdAt: g.dateObj || new Date(g.createdAt) }))
                      : purchases.map(p => {
                          let dateVal = new Date();
                          if (p.createdAt?.toDate) dateVal = p.createdAt.toDate();
                          else if (p.createdAt?.seconds) dateVal = new Date(p.createdAt.seconds * 1000);
                          else if (p.createdAt) dateVal = new Date(p.createdAt);
                          return { createdAt: dateVal };
                        })
                    }
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setPeriod('today');
                    }}
                  />

                  {/* Week Selector */}
                  {!selectedDate && period === 'week' && (
                    <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-outline/10 w-full">
                      <button 
                        onClick={() => {
                          const newD = new Date(selectedWeek);
                          newD.setDate(newD.getDate() - 7);
                          setSelectedWeek(newD);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-bold text-on-surface capitalize tracking-wide text-center leading-tight">
                        {(() => {
                          const { start, end } = getWeekBoundaries(selectedWeek);
                          const isSameMonth = start.getMonth() === end.getMonth();
                          if (isSameMonth) {
                            return `${start.getDate()} al ${end.getDate()} de ${start.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}`;
                          } else {
                            return `${start.getDate()} ${start.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')} al ${end.getDate()} ${end.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}`;
                          }
                        })()}
                      </span>
                      <button 
                        onClick={() => {
                          const newD = new Date(selectedWeek);
                          newD.setDate(newD.getDate() + 7);
                          setSelectedWeek(newD);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Month Selector */}
                  {!selectedDate && period === 'month' && (
                    <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-outline/10 w-full">
                      <button 
                        onClick={() => {
                          const newD = new Date(selectedMonth);
                          newD.setMonth(newD.getMonth() - 1);
                          setSelectedMonth(newD);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-bold text-on-surface capitalize tracking-wide">
                        {selectedMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                      </span>
                      <button 
                        onClick={() => {
                          const newD = new Date(selectedMonth);
                          newD.setMonth(newD.getMonth() + 1);
                          setSelectedMonth(newD);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-surface-container rounded-full transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {operacionSubTab === 'compras' && (
                  <>
                    <div className="flex gap-3 w-full">
                      <button onClick={() => setIsPurchaseOpen(true)}
                        className="flex-1 py-4 bg-on-surface text-white rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all">
                        <Plus className="w-5 h-5 stroke-[3]" /> Registrar Compra
                      </button>
                      <button onClick={() => setIsWasteModalOpen(true)}
                        className="flex-1 py-4 bg-red-50 text-red-500 rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-sm border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 active:scale-[0.98] transition-all">
                        Merma
                      </button>
                    </div>

                    {lowStock > 0 && (
                      <motion.button 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setIsStockModalOpen(true)}
                        className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-all group"
                      >
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-bold text-orange-700">{lowStock} insumo{lowStock > 1 ? 's' : ''} con stock crítico.</p>
                        <ChevronRight className="w-4 h-4 text-orange-400 ml-auto" />
                      </motion.button>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard index={0} icon={<Wallet className="w-5 h-5 text-primary" />} label="Inversión" value={formatCurrency(periodTotal)} numericValue={periodTotal} isCurrency={true} sub={`Gasto total en ${PERIOD_LABELS[period].toLowerCase()}`} accent="primary" />
                      <StatCard index={1} icon={<Package className="w-5 h-5 text-blue-500" />} label="Lotes Ingresados" value={totalUnits.toString()} numericValue={totalUnits} sub="Total de insumos adquiridos" accent="blue" />
                      <StatCard index={2} icon={<Calendar className="w-5 h-5 text-orange-500" />} label="Días de Actividad" value={activeDays.toString()} numericValue={activeDays} sub="Días con registros de compra" accent="orange" />
                      <StatCard index={3} icon={<Trophy className="w-5 h-5 text-amber-500" />} label="Insumo Estrella" value={starSupply?.name || 'N/A'} sub={starSupply ? `${formatCurrency(starSupply.revenue)} invertidos` : 'Sin datos'} accent="amber" onOpen={() => setIsRankingModalOpen(true)} />
                    </div>

                    <div className="bg-white rounded-[2rem] border border-outline/10 shadow-sm p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center"><Wallet className="w-5 h-5 text-primary" /></div>
                        <div>
                          <h4 className="font-black text-base text-on-surface">Tendencia de Inversión</h4>
                          <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Historial de gastos en mercancía</p>
                        </div>
                      </div>
                      <TrendChart data={filtered} color="#b30069" label="Tendencia de Inversión" />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Actividad Reciente</h3>
                        <span className="px-2.5 py-0.5 bg-surface-container text-secondary rounded-full text-[10px] font-black">{filtered.length} compras</span>
                      </div>
                      {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-20">
                          <ShoppingCart className="w-12 h-12 mb-3" />
                          <p className="text-sm font-bold">Sin compras en este período</p>
                        </div>
                      ) : (
                        filtered.map((p) => <PurchaseCard key={p.id} purchase={p} onClick={() => setDetailPurchase(p)} />)
                      )}
                    </div>
                  </>
                )}

                {operacionSubTab === 'gastos' && (
                  <>
                    <div className="flex gap-3 w-full">
                      <button onClick={() => setIsExpenseModalOpen(true)}
                        className="flex-1 py-4 bg-red-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all">
                        <Plus className="w-5 h-5 stroke-[3]" /> Registrar Gasto
                      </button>
                      <button onClick={() => setIsExpenseCategoryModalOpen(true)}
                        className="flex-1 py-4 bg-red-50 text-red-600 rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-sm border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 active:scale-[0.98] transition-all">
                        Categorías
                      </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard index={0} icon={<Wallet className="w-5 h-5 text-red-600" />} label="Gastos Totales" value={formatCurrency(periodTotalGastos)} numericValue={periodTotalGastos} isCurrency={true} sub={`En ${PERIOD_LABELS[period].toLowerCase()}`} accent="primary" onOpen={() => setIsExpenseRankingOpen(true)} />
                      <StatCard index={1} icon={<Package className="w-5 h-5 text-orange-500" />} label="Total Registros" value={filteredGastos.length.toString()} numericValue={filteredGastos.length} sub="Cantidad de gastos" accent="orange" onOpen={() => setIsExpenseRankingOpen(true)} />
                      <StatCard index={2} icon={<span className="text-xl">{topExpenseCategory ? gastosCategoryMap[topExpenseCategory.name]?.emoji || '🏷️' : '🏷️'}</span>} label="Mayor Gasto" value={topExpenseCategory?.name || 'N/A'} sub={topExpenseCategory ? formatCurrency(topExpenseCategory.amount) : 'Sin datos'} accent="amber" onOpen={() => setIsExpenseRankingOpen(true)} />
                    </div>
                    
                    <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-outline/10">
                      <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h4 className="font-black text-base text-on-surface">Tendencia de Gastos</h4>
                            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">{PERIOD_LABELS[period]}</p>
                          </div>
                        </div>
                      </div>
                      <TrendChart 
                        data={filteredGastos.map(g => ({ createdAt: g.dateObj || new Date(g.createdAt), total: g.amount }))} 
                        color="#dc2626" 
                        label="Tendencia de Gastos" 
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Historial de Gastos</h3>
                        <span className="px-2.5 py-0.5 bg-surface-container text-secondary rounded-full text-[10px] font-black">{filteredGastos.length} registros</span>
                      </div>
                      {filteredGastos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-20">
                          <Wallet className="w-12 h-12 mb-3" />
                          <p className="text-sm font-bold">Sin gastos registrados</p>
                        </div>
                      ) : (
                        filteredGastos.map((g) => (
                          <div key={g.id} onClick={() => setSelectedGastoForDetail(g)} className="cursor-pointer bg-white rounded-2xl p-4 border border-outline/10 flex items-center justify-between shadow-sm hover:border-red-200 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-lg">{g.categoryEmoji || '💸'}</div>
                              <div>
                                <p className="font-black text-sm text-on-surface">{g.categoryName}</p>
                                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">{g.description || 'Sin descripción'}</p>
                                <p className="text-[10px] font-bold text-primary mt-1">{new Date(g.dateObj).toLocaleDateString()} · {g.userName}</p>
                              </div>
                            </div>
                            <p className="font-black text-red-600">{formatCurrency(g.amount)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── MODALS (todos preservados) ──────────────────────────────────── */}

        <ExpenseCategoryManager 
          isOpen={isExpenseCategoryModalOpen}
          onClose={() => setIsExpenseCategoryModalOpen(false)}
        />

        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onConfirm={handleSaveExpense}
          onOpenCategoryManager={() => setIsExpenseCategoryModalOpen(true)}
        />

        <SupplyFormModal
          isOpen={isSupplyModalOpen}
          onClose={() => setIsSupplyModalOpen(false)}
          supplyToEdit={supplyToEdit}
          existingCategories={Object.keys(groupedSupplies)}
          onSave={handleSaveSupply}
        />

        <PurchaseModal
          isOpen={isPurchaseOpen}
          onClose={() => setIsPurchaseOpen(false)}
          supplies={supplies as any}
          onConfirm={async (provider, items) => {
            const total = items.reduce((a, i) => a + i.cost, 0); // Cost is now total cost per item
            await addDoc(collection(db, 'supplyPurchases'), { provider, items, total, createdAt: serverTimestamp() });
            for (const item of items) {
              const unitCost = item.quantity > 0 ? item.cost / item.quantity : 0;
              const supplyUpdate: any = { 
                currentStock: increment(item.quantity),
                lastPurchasePrice: unitCost,
                lastRestockDate: serverTimestamp(),
                updatedAt: serverTimestamp()
              };
              if (item.portions > 0) {
                supplyUpdate.portionsPerUnit = item.portions;
                supplyUpdate.yieldPerUnit = item.portions; // compatibilidad
              }
              await updateDoc(doc(db, 'supplies', item.supplyId), supplyUpdate);
            }
            toast.success('¡Compra registrada y stock actualizado!');
          }}
        />
        <WasteModal
          isOpen={isWasteModalOpen}
          onClose={() => setIsWasteModalOpen(false)}
          supplies={supplies as any}
          onConfirm={async (supplyId, quantity, note) => {
            await addDoc(collection(db, 'wasteRecords'), { supplyId, quantity, note, createdAt: serverTimestamp() });
            await updateDoc(doc(db, 'supplies', supplyId), { currentStock: increment(-quantity) });
            toast.success('¡Merma registrada exitosamente!');
          }}
        />
        <PurchaseDetailModal purchase={detailPurchase} onClose={() => setDetailPurchase(null)} onDelete={handleDeletePurchase} />

        {isProductModalOpen && (
          <ProductFormModal
            isOpen={isProductModalOpen}
            onClose={() => {
              setIsProductModalOpen(false);
              setProductToEdit(null);
            }}
            productToEdit={productToEdit}
            onSave={handleSaveProduct}
          />
        )}

        {isRecipeModalOpen && (
          <RecipeConfigModal
            isOpen={isRecipeModalOpen}
            onClose={() => {
              setIsRecipeModalOpen(false);
              setProductForRecipe(null);
            }}
            product={products.find(p => p.id === productForRecipe?.id) || productForRecipe}
            supplies={supplies}
            onSave={handleSaveRecipe}
          />
        )}

        {/* User History Modal */}
        <AnimatePresence>
          {selectedUserForHistory && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedUserForHistory(null)} />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="bg-primary p-8 pb-12 relative flex flex-col items-center flex-shrink-0">
                  <button onClick={() => setSelectedUserForHistory(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-5 w-full">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-3xl font-black overflow-hidden shadow-xl">
                      {selectedUserForHistory.imageUrl ? <img src={selectedUserForHistory.imageUrl} alt="" className="w-full h-full object-cover" /> : selectedUserForHistory.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-brand font-black text-xl leading-tight uppercase truncate">{selectedUserForHistory.name}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/10">
                          {selectedUserForHistory.role === 'cliente' ? 'CLIENTE' : selectedUserForHistory.role}
                        </span>
                        {selectedUserForHistory.phone && (
                          <div className="flex items-center gap-1 text-white/80">
                            <Phone className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-bold">{selectedUserForHistory.phone}</span>
                          </div>
                        )}
                        {selectedUserForHistory.email && (
                          <div className="flex items-center gap-1 text-white/80">
                            <Mail className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-bold truncate max-w-[120px]">{selectedUserForHistory.email}</span>
                          </div>
                        )}
                        {selectedUserForHistory.address && (
                          <div className="flex items-center gap-1 text-white/80 w-full mt-1">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-bold truncate">{selectedUserForHistory.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-fuchsia-300 w-full">
                          <Star className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
                          <span className="text-[10px] font-bold">
                            Fidelidad: {selectedUserForHistory.loyaltyPoints || 0}/9 compras
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest flex-1 px-6 sm:px-8 py-10 -mt-8 rounded-t-[3rem] shadow-[0_-8px_30px_rgb(0,0,0,0.04)] overflow-y-auto custom-scrollbar">
                  <button 
                    onClick={() => setShowHistoryHeatmap(!showHistoryHeatmap)} 
                    className="flex items-center gap-2 mb-6 px-2 w-full text-left outline-none group"
                  >
                    <Calendar className={cn("w-4 h-4 transition-colors", showHistoryHeatmap ? "text-primary" : "text-secondary/50 group-hover:text-secondary")} />
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] transition-colors", showHistoryHeatmap ? "text-primary" : "text-secondary group-hover:text-on-surface")}>
                      Calendario de Actividad
                    </span>
                    <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showHistoryHeatmap ? "rotate-90 text-primary" : "text-secondary/50")} />
                  </button>
                  
                  <AnimatePresence>
                    {showHistoryHeatmap && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {(() => {
                          const currentMonth = viewDate.getMonth();
                          const currentYear = viewDate.getFullYear();
                          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                          const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
                          const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
                          const activityMap: Record<number, number> = {};
                          userSales.forEach((sale) => {
                            const ts = sale.timestamp || sale.createdAt;
                            if (!ts) return;
                            const date = ts.toDate ? ts.toDate() : new Date(ts);
                            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                              const day = date.getDate();
                              activityMap[day] = (activityMap[day] || 0) + 1;
                            }
                          });
                          const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                          return (
                            <div className="bg-surface-container/30 rounded-3xl p-4 mb-6 border border-outline/5">
                              <div className="flex items-center justify-between mb-6 px-2">
                                <button onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))} className="p-2 hover:bg-white rounded-full transition-colors text-secondary shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                                <div className="text-center">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Actividad</p>
                                  <h4 className="text-sm font-bold text-on-surface">{monthNames[currentMonth]} {currentYear}</h4>
                                </div>
                                <button onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))} disabled={currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()} className="p-2 hover:bg-white rounded-full transition-colors text-secondary shadow-sm disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
                              </div>
                              <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                                {['L','M','X','J','V','S','D'].map((d) => <div key={d} className="text-[8px] font-black text-secondary/30 text-center uppercase mb-1">{d}</div>)}
                                {Array.from({ length: firstDayAdjusted }).map((_, i) => <div key={`empty-${i}`} />)}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                  const day = i + 1;
                                  const count = activityMap[day] || 0;
                                  const isSelected = selectedHistoryDate?.getDate() === day && selectedHistoryDate?.getMonth() === currentMonth && selectedHistoryDate?.getFullYear() === currentYear;
                                  
                                  return (
                                    <div key={day} className="flex flex-col items-center justify-center">
                                      <button
                                        disabled={count === 0}
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedHistoryDate(null);
                                          } else {
                                            setSelectedHistoryDate(new Date(currentYear, currentMonth, day));
                                            setShowHistoryHeatmap(false);
                                          }
                                        }}
                                        className={cn('w-7 h-9 rounded-xl flex flex-col items-center justify-center transition-all', 
                                          count > 0 
                                            ? isSelected
                                              ? 'bg-primary text-white shadow-md ring-2 ring-primary ring-offset-1 scale-110'
                                              : 'bg-primary/80 text-white shadow-sm hover:scale-105 hover:bg-primary cursor-pointer' 
                                            : 'bg-surface-container text-on-surface cursor-default', 
                                          day === new Date().getDate() && currentMonth === new Date().getMonth() && count === 0 && 'ring-1 ring-primary ring-inset'
                                        )}
                                      >
                                        <span className="text-[9px] font-bold">{day}</span>
                                        {count > 0 && <span className="text-[6px] font-black opacity-80 mt-0.5">{count}</span>}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 mb-4">
                      <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">
                        Movimientos Recientes
                      </h4>
                      {selectedHistoryDate && (
                        <button 
                          onClick={() => setSelectedHistoryDate(null)}
                          className="text-[9px] font-black uppercase text-primary bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 flex items-center gap-1"
                        >
                          {selectedHistoryDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {isLoadingHistory ? (
                      <div className="flex justify-center p-12"><div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>
                    ) : userSales.length === 0 ? (
                      <div className="text-center py-10 opacity-30 italic text-[10px] uppercase font-black">Sin actividad registrada</div>
                    ) : (
                      userSales
                        .filter(sale => {
                          if (!selectedHistoryDate) return true;
                          const ts = sale.timestamp || sale.createdAt;
                          if (!ts) return false;
                          const d = ts.toDate ? ts.toDate() : new Date(ts);
                          return d.getDate() === selectedHistoryDate.getDate() &&
                                 d.getMonth() === selectedHistoryDate.getMonth() &&
                                 d.getFullYear() === selectedHistoryDate.getFullYear();
                        })
                        .slice(0, 50).map((sale, index) => {
                          const cName = sale.clienteName || sale.userName || sale.customerName || sale.nombre || sale.clientName;
                        const tName = sale.tableName || sale.mesa;
                        const origin = cName || (tName && tName !== 'Pedido Online' ? `Mesa: ${tName}` : 'Pedido Online');
                        return (
                          <HistoryMovementCard
                            key={sale.id ? `sale-${sale.id}` : `idx-${index}`}
                            id={sale.id || `temp-${index}`}
                            title={sale.title}
                            total={sale.total || 0}
                            date={sale.hour}
                            paymentMethod={sale.splitDetails || sale.isMixto ? 'Mixto' : (sale.paymentMethod || 'Efectivo')}
                            status={sale.status || 'aceptado'}
                            itemCount={sale.items?.length || 0}
                            items={sale.items}
                            customerName={origin}
                            onClick={() => setSelectedSaleDetail(sale)}
                          />
                        );
                      })
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
                  onToggleItemPrepared={async (itemId, currentPrepared) => {
                    if (!selectedSaleDetail) return;
                    try {
                      const collectionName = selectedSaleDetail.type === 'online' ? 'pedidos' : 'sales';
                      const updatedItems = selectedSaleDetail.items.map((item: any) => 
                        item.id === itemId || (!item.id && item.productId === itemId) ? { ...item, prepared: !currentPrepared } : item
                      );
                      
                      setSelectedSaleDetail({ ...selectedSaleDetail, items: updatedItems });
                      
                      const { doc, updateDoc } = await import('firebase/firestore');
                      await updateDoc(doc(db, collectionName, selectedSaleDetail.id), {
                        items: updatedItems
                      });
                    } catch (error) {
                      console.error("Error updating item preparation state:", error);
                      toast.error("Error al actualizar el estado de preparación");
                    }
                  }}
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
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black">Editar Perfil</h2>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-full hover:bg-surface-container text-secondary transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {selectedUserForEdit && (
                  <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl mb-6 border border-outline/10">
                    <div className="w-14 h-14 rounded-full bg-surface-container border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0 text-primary font-black">
                      {selectedUserForEdit.imageUrl ? (
                        <img src={selectedUserForEdit.imageUrl} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">{selectedUserForEdit.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-on-surface truncate">{selectedUserForEdit.name}</p>
                      <div className="flex items-center gap-1 text-xs text-secondary truncate">
                        <Mail className="w-3 h-3" />
                        <span>{selectedUserForEdit.email}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={editFormData.name} 
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full h-12 bg-surface-container rounded-xl px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  {['admin', 'administrador', 'propietario'].includes(currentUser?.role?.toLowerCase() || '') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Rol</label>
                      <select
                        value={editFormData.role}
                        onChange={e => setEditFormData({ ...editFormData, role: e.target.value as any })}
                        className="w-full h-12 bg-surface-container rounded-xl px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      >
                        <option value="cliente">Cliente</option>
                        <option value="vendedor">Vendedor</option>
                        <option value="admin">Administrador</option>
                        {['admin', 'propietario'].includes(currentUser?.role || '') && <option value="propietario">Propietario</option>}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Cédula</label>
                    <input 
                      type="text" 
                      value={editFormData.cedula} 
                      onChange={e => setEditFormData({ ...editFormData, cedula: e.target.value })}
                      className="w-full h-12 bg-surface-container rounded-xl px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Teléfono</label>
                    <input 
                      type="tel" 
                      value={editFormData.phone} 
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full h-12 bg-surface-container rounded-xl px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Dirección</label>
                    <input 
                      type="text" 
                      value={editFormData.address} 
                      onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full h-12 bg-surface-container rounded-xl px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-surface-container text-secondary font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-high transition-all">
                    Cancelar
                  </button>
                  <button 
                    onClick={handleUpdateUser} 
                    disabled={isSavingUser || !editFormData.name.trim()}
                    className="flex-1 py-4 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingUser ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Sync Modal */}
        <AnimatePresence>
          {isSyncModalOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !syncAction && setIsSyncModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Database className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-xl font-black text-on-surface">Sincronización</h3>
                    <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Base de datos D'LI</p>
                  </div>
                </div>
                <p className="text-xs text-secondary font-medium leading-relaxed mb-8">Selecciona el tipo de actualización que deseas realizar en el sistema.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleImageSync} disabled={!!syncAction} className="w-full py-4 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {syncAction === 'images' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    Sincronizar Solo Imágenes
                  </button>
                  <button onClick={handleRepairSales} disabled={!!syncAction} className="w-full py-4 rounded-2xl bg-success/10 text-success font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-success/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {syncAction === 'sales' ? <div className="w-4 h-4 border-2 border-success/30 border-t-success rounded-full animate-spin" /> : <History className="w-4 h-4" />}
                    Reparar Todo el Historial de Ventas
                  </button>
                  <button onClick={handleFullSeed} disabled={!!syncAction} className="w-full py-4 rounded-2xl bg-surface-container text-secondary font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {syncAction === 'full' ? <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    Recargar Catálogo Completo
                  </button>
                  <button onClick={handleAddMissingSupplies} disabled={!!syncAction} className="w-full py-4 rounded-2xl bg-success/10 text-success font-black text-[10px] uppercase tracking-widest hover:bg-success/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-2">
                    {syncAction === 'missing_supplies' ? <div className="w-4 h-4 border-2 border-success/30 border-t-success rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    Añadir Insumos Faltantes (Seguro)
                  </button>
                  <button 
                    onClick={async () => {
                      setSyncAction('recipes');
                      try {
                        const { default: menuData } = await import('../data/menu.json');
                        const snap = await getDocs(collection(db, 'products'));
                        let count = 0;
                        for (const d of snap.docs) {
                          const localProd = menuData.products.find((p: any) => p.id === d.id);
                          if (!localProd) continue;

                          const dbData = d.data();
                          let updated = false;
                          const updates: any = {};

                          if (localProd.description && localProd.description !== dbData.description) {
                            updates.description = localProd.description;
                            updated = true;
                          }

                          if ((!dbData.recipe || dbData.recipe.length === 0) && localProd.recipe && localProd.recipe.length > 0) {
                            updates.recipe = localProd.recipe;
                            updated = true;
                          }

                          if (localProd.variants && localProd.variants.length > 0) {
                            let dbVariants = dbData.variants || [];
                            let variantsUpdated = false;

                            if (dbVariants.length > 0) {
                              dbVariants = dbVariants.map((v: any) => {
                                const localV = localProd.variants.find((lv: any) => lv.label === v.label);
                                if (localV && localV.recipe && localV.recipe.length > 0 && (!v.recipe || v.recipe.length <= 1)) {
                                  variantsUpdated = true;
                                  return { ...v, recipe: localV.recipe };
                                }
                                return v;
                              });
                            } else {
                              dbVariants = localProd.variants;
                              variantsUpdated = true;
                            }

                            if (variantsUpdated) {
                              updates.variants = dbVariants;
                              updated = true;
                            }
                          }

                          if (updated) {
                            await updateDoc(d.ref, updates);
                            count++;
                          }
                        }
                        toast.success(`¡Se actualizaron recetas y descripciones de ${count} productos!`);
                      } catch(e: any) {
                        toast.error('Error: ' + e.message);
                      } finally {
                        setSyncAction(null);
                        setIsSyncModalOpen(false);
                      }
                    }} 
                    disabled={!!syncAction} 
                    className="w-full py-4 rounded-2xl bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-2"
                  >
                    {syncAction === 'recipes' ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    Sincronizar Recetas Nuevas (Seguro)
                  </button>
                  <button 
                    onClick={async () => {
                      setSyncAction('supplies');
                      try {
                        const { default: menuData } = await import('../data/menu.json');
                        let count = 0;
                        for (const flavor of menuData.icecreamFlavors) {
                          if (flavor.id === 'sin-helado') continue;
                          const ns = {
                            id: 'helado_' + flavor.id,
                            name: 'Helado de ' + flavor.name,
                            category: 'Helado base',
                            unit: 'g',
                            currentStock: 0,
                            minLimit: 1000,
                            minLimitUnit: 'base',
                            portionsPerUnit: 1,
                            stockMinimum: 1000,
                            stockQuantity: 0,
                            purchaseUnit: 'g',
                            yieldPerSize: { mini: 80, small: 90, medium: 100, large: null },
                            yieldPerUnit: 1,
                            isVirtual: false
                          };
                          // Check if exists first
                          const docs = await getDocs(query(collection(db, 'supplies'), where('name', '==', ns.name)));
                          if (docs.empty) {
                            await setDoc(doc(db, 'supplies', ns.id), ns);
                            count++;
                          }
                        }
                        toast.success(`¡Se añadieron ${count} insumos de helado!`);
                      } catch(e: any) {
                        toast.error('Error: ' + e.message);
                      } finally {
                        setSyncAction(null);
                        setIsSyncModalOpen(false);
                      }
                    }} 
                    disabled={!!syncAction} 
                    className="w-full py-4 rounded-2xl bg-orange-50 text-orange-600 font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-2"
                  >
                    {syncAction === 'supplies' ? <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    Crear Insumos de Helado Base
                  </button>
                  <button onClick={handleDownloadBackup} disabled={!!syncAction} className="w-full py-4 rounded-2xl bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-2">
                    {syncAction === 'backup' ? <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                    Descargar Copia de Seguridad
                  </button>
                  <button onClick={handleRecalculatePoints} disabled={!!syncAction} className="w-full py-4 rounded-2xl bg-fuchsia-50 text-fuchsia-600 font-black text-[10px] uppercase tracking-widest hover:bg-fuchsia-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-2">
                    {syncAction === 'points' ? <div className="w-4 h-4 border-2 border-fuchsia-300 border-t-fuchsia-600 rounded-full animate-spin" /> : <Star className="w-4 h-4 fill-fuchsia-600" />}
                    Recalcular Puntos de Fidelidad
                  </button>
                </div>
                <button onClick={() => setIsSyncModalOpen(false)} disabled={!!syncAction} className="w-full mt-6 py-2 text-[10px] font-black text-secondary/40 uppercase tracking-widest hover:text-secondary transition-colors disabled:opacity-0">
                  Cancelar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* New Flavor Modal */}
        <AnimatePresence>
          {isFlavorModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFlavorModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden p-8">
                <h2 className="text-2xl font-black mb-6">Añadir Nuevo Sabor</h2>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-secondary/40 ml-4 tracking-widest">Nombre del Sabor</label>
                    <input 
                      type="text" 
                      value={newFlavorName} 
                      onChange={(e) => setNewFlavorName(e.target.value)} 
                      className="w-full h-14 bg-surface-container rounded-2xl px-5 font-bold focus:ring-2 ring-primary transition-all outline-none" 
                      placeholder="Ej: Chocolate, Vainilla..." 
                    />
                  </div>
                </div>
                <button 
                  onClick={handleCreateFlavor} 
                  disabled={isSavingFlavor || !newFlavorName.trim()}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black mt-8 uppercase shadow-xl disabled:opacity-50"
                >
                  {isSavingFlavor ? 'Guardando...' : 'Crear Sabor'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      <StockCriticoModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        criticalSupplies={criticalSupplies}
      />

      <RankingModal 
        isOpen={isRankingModalOpen} 
        onClose={() => setIsRankingModalOpen(false)} 
        filter={PERIOD_LABELS[period]} 
        ranking={ranking} 
      />

      <ExpenseDetailModal 
        gasto={selectedGastoForDetail} 
        onClose={() => setSelectedGastoForDetail(null)} 
        onDelete={handleDeleteExpense}
      />
      
      <ExpenseRankingModal 
        isOpen={isExpenseRankingOpen} 
        onClose={() => setIsExpenseRankingOpen(false)} 
        filter={PERIOD_LABELS[period]} 
        ranking={sortedExpenseCategories.map(c => ({
          name: c.name,
          emoji: c.emoji || '🏷️',
          amount: c.amount,
          percentage: periodTotalGastos > 0 ? (c.amount / periodTotalGastos) * 100 : 0
        }))} 
      />

      <ReportPreviewModal
        isOpen={isPurchasePreviewModalOpen}
        onClose={() => setIsPurchasePreviewModalOpen(false)}
        type={purchasePreviewType}
        previewUrl={purchasePreviewData?.type === 'image' ? purchasePreviewData.imgData : (purchasePreviewData?.blobUrl || null)}
        onDownload={handlePurchaseDownload}
        onShare={handlePurchaseShare}
      />

      {/* Hidden Component for Purchase Image Report */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="hidden-purchase-image-report" className="bg-white p-8 w-[800px]">
          <div className="text-center mb-6 border-b border-outline/10 pb-4">
            <h1 className="text-3xl font-black text-primary mb-2">D'LI - LUGAR FAVORITO</h1>
            <h2 className="text-xl font-bold text-secondary">Reporte de Compras</h2>
            <p className="text-sm text-secondary/70 mt-2">
              Fecha: {selectedDate ? selectedDate.toLocaleDateString('es-CO') : (PERIOD_LABELS[period as PeriodFilter] || 'Histórico')} | 
              Generado por: {currentUser?.name || 'Administrador'}
            </p>
          </div>

          <div className="mb-6 bg-red-50 p-6 rounded-2xl border border-red-100">
            <h3 className="text-lg font-black text-red-900 mb-4 border-b border-red-200 pb-2">Resumen de Gastos</h3>
            <div className="flex justify-between items-center text-xl">
              <span className="font-bold text-red-700">Total Gastado en Compras</span>
              <span className="font-black text-red-700">
                {formatCurrency(filtered.reduce((sum, p) => sum + (p.total || 0), 0))}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-black text-secondary mb-4 border-b border-outline/10 pb-2">Detalle de Compras</h3>
            {filtered.length === 0 ? (
              <p className="text-secondary/70 italic text-center py-4">No hay compras registradas en este período.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-container text-secondary">
                    <th className="p-3 font-bold rounded-l-xl">Fecha/Hora</th>
                    <th className="p-3 font-bold">Proveedor</th>
                    <th className="p-3 font-bold">Insumos</th>
                    <th className="p-3 font-bold text-right rounded-r-xl">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/5">
                  {filtered.map(p => {
                    const dateObj = p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate() : (p.createdAt.seconds ? new Date(p.createdAt.seconds * 1000) : new Date(p.createdAt))) : new Date();
                    return (
                      <tr key={p.id}>
                        <td className="p-3 align-top whitespace-nowrap text-secondary font-medium">
                          {dateObj.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                        </td>
                        <td className="p-3 align-top font-bold text-on-surface">
                          {p.provider || 'Proveedor Gral'}
                        </td>
                        <td className="p-3 align-top text-secondary">
                          {p.items && Array.isArray(p.items) ? p.items.map((i: any, idx: number) => (
                            <div key={idx}>{i.quantity}x {i.name}</div>
                          )) : 'N/A'}
                        </td>
                        <td className="p-3 align-top text-right font-black text-on-surface whitespace-nowrap">
                          {formatCurrency(p.total || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="text-center mt-8 pt-4 border-t border-outline/10 text-xs font-bold text-secondary/50">
            Sistema Integrado de Control - D'LI
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="hidden-expense-image-report" className="bg-white p-8 w-[800px]">
          <div className="text-center mb-6 border-b border-outline/10 pb-4">
            <h1 className="text-3xl font-black text-primary mb-2">D'LI - LUGAR FAVORITO</h1>
            <h2 className="text-xl font-bold text-secondary">Reporte de Gastos</h2>
            <p className="text-sm text-secondary/70 mt-2">
              Fecha: {selectedDate ? selectedDate.toLocaleDateString('es-CO') : (PERIOD_LABELS[period as PeriodFilter] || 'Histórico')} | 
              Generado por: {currentUser?.name || 'Administrador'}
            </p>
          </div>

          <div className="mb-6 bg-red-50 p-6 rounded-2xl border border-red-100">
            <h3 className="text-lg font-black text-red-900 mb-4 border-b border-red-200 pb-2">Resumen de Gastos</h3>
            <div className="flex justify-between items-center text-xl">
              <span className="font-bold text-red-700">Total Gastado</span>
              <span className="font-black text-red-700">
                {formatCurrency(filteredGastos.reduce((sum, g) => sum + (g.amount || 0), 0))}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-black text-secondary mb-4 border-b border-outline/10 pb-2">Detalle de Gastos</h3>
            {filteredGastos.length === 0 ? (
              <p className="text-secondary/70 italic text-center py-4">No hay gastos registrados en este período.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-container text-secondary">
                    <th className="p-3 font-bold rounded-l-xl">Fecha/Hora</th>
                    <th className="p-3 font-bold">Responsable</th>
                    <th className="p-3 font-bold">Categoría</th>
                    <th className="p-3 font-bold">Descripción</th>
                    <th className="p-3 font-bold text-right rounded-r-xl">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/5">
                  {filteredGastos.map(g => {
                    const dateObj = g.dateObj || new Date();
                    return (
                      <tr key={g.id}>
                        <td className="p-3 align-top whitespace-nowrap text-secondary font-medium">
                          {dateObj.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                        </td>
                        <td className="p-3 align-top font-bold text-on-surface">
                          {g.userName || 'Usuario'}
                        </td>
                        <td className="p-3 align-top text-secondary">
                          {g.categoryEmoji || ''} {g.categoryName || 'Sin Categoría'}
                        </td>
                        <td className="p-3 align-top text-secondary">
                          {g.description || '-'}
                        </td>
                        <td className="p-3 align-top text-right font-black text-on-surface whitespace-nowrap">
                          {formatCurrency(g.amount || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="text-center mt-8 pt-4 border-t border-outline/10 text-xs font-bold text-secondary/50">
            Sistema Integrado de Control - D'LI
          </div>
        </div>
      </div>
    </>
  );
}

