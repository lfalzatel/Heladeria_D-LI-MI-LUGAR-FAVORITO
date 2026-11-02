import {
  collection, doc, onSnapshot, query, where, addDoc, updateDoc, setDoc,
  serverTimestamp, runTransaction, getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import type { CartItem } from '../types';

/**
 * Pedidos desde la mesa por QR.
 * El cliente NO escribe en el carrito de la mesa: crea una solicitud en `tableRequests`
 * y el personal la acepta, lo que pasa los productos a `tables/{mesa}.currentCart`.
 */

export type TableRequestStatus = 'pendiente' | 'aceptado' | 'listo' | 'rechazado' | 'atendido';

export interface TableRequest {
  id: string;
  kind: 'pedido' | 'llamada';
  tableId: string;
  tableLabel: string;
  clienteId: string;
  customerName: string;
  items: CartItem[];
  total: number;
  isTakeout: boolean;
  note: string;
  status: TableRequestStatus;
  createdAt?: any;
  updatedAt?: any;
}

export interface TableMeta {
  id: string;
  label: string;
  order: number;
  active: boolean;
  qrKey?: string;
}

// ---------- Sesión de mesa del cliente (se guarda al escanear el QR) ----------

const SESSION_KEY = 'dli_mesa_session';
const SESSION_HOURS = 6;

export interface TableSession {
  tableId: string;
  key: string;
  label: string;
  savedAt: number;
}

export function saveTableSession(tableId: string, key: string, label?: string | null) {
  try {
    const session: TableSession = { tableId, key, label: label?.trim().slice(0, 30) || tableLabelFromId(tableId), savedAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function getTableSession(): TableSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TableSession;
    if (!s.tableId || !s.key || Date.now() - s.savedAt > SESSION_HOURS * 3600_000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearTableSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export function tableLabelFromId(tableId: string) {
  return tableId.startsWith('mesa') ? `Mesa ${tableId.replace('mesa', '')}` : tableId;
}

export function tableQrUrl(tableId: string, key: string, label: string) {
  return `${window.location.origin}/mesa/${tableId}?k=${key}&n=${encodeURIComponent(label)}`;
}

// ---------- Cliente ----------

/** Los invitados necesitan una sesión (anónima) para que Firestore acepte la solicitud */
async function ensureUid(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const { signInAnonymously } = await import('firebase/auth');
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

export async function sendTableRequest(params: {
  session: TableSession;
  kind: 'pedido' | 'llamada';
  customerName: string;
  items?: CartItem[];
  isTakeout?: boolean;
  note?: string;
}) {
  const clienteId = await ensureUid();
  const items = JSON.parse(JSON.stringify(params.items || [])) as CartItem[];
  const ref = await addDoc(collection(db, 'tableRequests'), {
    kind: params.kind,
    tableId: params.session.tableId,
    tableLabel: params.session.label || tableLabelFromId(params.session.tableId),
    key: params.session.key,
    clienteId,
    customerName: params.customerName.trim().slice(0, 40),
    items,
    total: items.reduce((s, i) => s + (i.subtotal || 0), 0),
    isTakeout: !!params.isTakeout,
    note: (params.note || '').trim().slice(0, 200),
    status: 'pendiente',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Solicitudes de este dispositivo en la mesa actual (últimas horas) */
export function listenMyTableRequests(tableId: string, onChange: (reqs: TableRequest[]) => void) {
  const since = Date.now() - SESSION_HOURS * 3600_000;
  let unsubQuery: (() => void) | null = null;
  // Al recargar, Firebase tarda un momento en restaurar la sesión: se espera antes de consultar
  const unsubAuth = onAuthStateChanged(auth, user => {
    unsubQuery?.();
    unsubQuery = null;
    if (!user) {
      onChange([]);
      return;
    }
    unsubQuery = onSnapshot(
      query(collection(db, 'tableRequests'), where('clienteId', '==', user.uid)),
      snap => {
        const reqs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as TableRequest)
          .filter(r => r.tableId === tableId && (r.createdAt?.toMillis?.() ?? Date.now()) > since)
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? Date.now()) - (a.createdAt?.toMillis?.() ?? Date.now()));
        onChange(reqs);
      },
      err => console.error('Error escuchando pedidos de mesa:', err)
    );
  });
  return () => {
    unsubAuth();
    unsubQuery?.();
  };
}

// ---------- Personal ----------

/** Solicitudes abiertas de todas las mesas (pendientes de aceptar o en preparación) */
export function listenOpenTableRequests(onChange: (reqs: TableRequest[]) => void) {
  return onSnapshot(
    query(collection(db, 'tableRequests'), where('status', 'in', ['pendiente', 'aceptado'])),
    snap => {
      const reqs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }) as TableRequest)
        .sort((a, b) => (a.createdAt?.toMillis?.() ?? Date.now()) - (b.createdAt?.toMillis?.() ?? Date.now()));
      onChange(reqs);
    },
    err => console.error('Error escuchando solicitudes de mesas:', err)
  );
}

const emptyCart = { items: [], openedAt: null, note: '', isLocked: false, isTakeout: false, packagingSupplies: [] };

/**
 * Pasa los productos de la solicitud al carrito de la mesa en una transacción,
 * para no pisar cambios hechos al mismo tiempo desde otro celular.
 */
export async function acceptTableRequest(req: TableRequest, staffUid: string) {
  const tableRef = doc(db, 'tables', req.tableId);
  const reqRef = doc(db, 'tableRequests', req.id);
  await runTransaction(db, async tx => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists() || reqSnap.data().status !== 'pendiente') {
      throw new Error('Esta solicitud ya fue atendida');
    }
    const tableSnap = await tx.get(tableRef);
    const cart = { ...emptyCart, ...(tableSnap.data()?.currentCart || {}) };
    const who = req.customerName ? `👤 ${req.customerName} (QR)` : '👤 Pedido por QR';
    const newItems = req.items.map(i => ({
      ...i,
      id: Math.random().toString(36).slice(2, 11),
      notes: i.notes ? `${who} · ${i.notes}` : who,
    }));
    const newCart = {
      ...cart,
      items: [...(cart.items || []), ...newItems],
      openedAt: cart.openedAt || new Date().toISOString(),
      isTakeout: cart.isTakeout || req.isTakeout,
      note: req.note ? [cart.note, `${req.customerName || 'Cliente'}: ${req.note}`].filter(Boolean).join(' | ') : cart.note,
    };
    tx.set(tableRef, { currentCart: JSON.parse(JSON.stringify(newCart)) }, { merge: true });
    tx.update(reqRef, { status: 'aceptado', handledBy: staffUid, updatedAt: serverTimestamp() });
  });
}

export async function setTableRequestStatus(reqId: string, status: TableRequestStatus, staffUid: string) {
  await updateDoc(doc(db, 'tableRequests', reqId), { status, handledBy: staffUid, updatedAt: serverTimestamp() });
}

// ---------- Gestión de mesas (propietaria / admin) ----------

function newQrKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 14);
}

export function sortTables(metas: TableMeta[]) {
  return metas.filter(t => t.active).sort((a, b) => a.order - b.order);
}

/** Número de la siguiente mesa: el primero libre entre las activas (reutiliza el de una eliminada) */
export function nextTableNumber(existing: TableMeta[]): number {
  const used = new Set(existing.filter(t => t.active).map(t => t.id));
  let n = 1;
  while (used.has(`mesa${n}`)) n++;
  return n;
}

/** Crea la siguiente mesa (Mesa N) con su clave de QR; reactiva números libres */
export async function createTable(existing: TableMeta[]): Promise<TableMeta> {
  const n = nextTableNumber(existing);
  const meta: TableMeta = { id: `mesa${n}`, label: `Mesa ${n}`, order: n, active: true, qrKey: newQrKey() };
  await setDoc(doc(db, 'tables', meta.id), {
    label: meta.label, type: 'table', order: meta.order, active: true, qrKey: meta.qrKey,
    status: 'free', currentCart: emptyCart,
  }, { merge: true });
  return meta;
}

export async function renameTable(tableId: string, label: string) {
  await setDoc(doc(db, 'tables', tableId), { label: label.trim().slice(0, 30) }, { merge: true });
}

export async function regenerateTableKey(tableId: string) {
  const qrKey = newQrKey();
  await setDoc(doc(db, 'tables', tableId), { qrKey }, { merge: true });
  return qrKey;
}

/** Elimina (oculta) la mesa. El historial de ventas conserva su nombre. */
export async function deleteTable(tableId: string, cartItemCount: number) {
  if (cartItemCount > 0) throw new Error('La mesa tiene productos. Cóbrala o vacíala primero.');
  const open = await getDocs(query(collection(db, 'tableRequests'), where('status', 'in', ['pendiente', 'aceptado'])));
  if (open.docs.some(d => d.data().tableId === tableId)) {
    throw new Error('La mesa tiene pedidos por QR sin terminar.');
  }
  await setDoc(doc(db, 'tables', tableId), { active: false, qrKey: newQrKey() }, { merge: true });
}
