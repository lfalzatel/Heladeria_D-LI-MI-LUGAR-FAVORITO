/**
 * Pruebas de las reglas de seguridad de Firestore (firestore.rules).
 * Corren contra el emulador de Firebase: no tocan datos reales.
 *
 *   npm run test:rules        (necesita Java instalado)
 *
 * En GitHub corren solas en cada push (.github/workflows/pruebas.yml).
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, addDoc, updateDoc, collection, query, where, serverTimestamp,
} from 'firebase/firestore';
import { toSalePaymentMethod } from '../src/utils/payments';

let env: RulesTestEnvironment;

const OWNER = 'propietaria1';
const SELLER = 'vendedor1';
const CLIENT = 'cliente1';
const OTHER_CLIENT = 'cliente2';
const ANON = 'anonimo1';

const db = {
  sinCuenta: () => env.unauthenticatedContext().firestore(),
  anonimo: () => env.authenticatedContext(ANON, { firebase: { sign_in_provider: 'anonymous' } }).firestore(),
  cliente: () => env.authenticatedContext(CLIENT, { email: 'cliente@correo.com' }).firestore(),
  vendedor: () => env.authenticatedContext(SELLER, { email: 'vendedor@correo.com' }).firestore(),
  propietaria: () => env.authenticatedContext(OWNER, { email: 'propietaria@correo.com' }).firestore(),
};

const item = { id: 'i1', productId: 'p1', productName: 'Cono', variantLabel: 'Sencillo', description: '', flavors: ['Vainilla'], fruitChoices: [], additions: [], quantity: 1, unitPrice: 4500, subtotal: 4500 };

function tableRequest(over: Record<string, unknown> = {}) {
  return {
    kind: 'pedido', tableId: 'mesa1', tableLabel: 'Mesa 1', key: 'clave-mesa1',
    clienteId: ANON, customerName: 'Ana', items: [item], total: 4500, isTakeout: false, note: '',
    status: 'pendiente', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...over,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-dli-heladeria',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'users', OWNER), { name: 'Propietaria', role: 'propietario', email: 'propietaria@correo.com' });
    await setDoc(doc(f, 'users', SELLER), { name: 'Vendedor', role: 'vendedor', email: 'vendedor@correo.com' });
    await setDoc(doc(f, 'users', CLIENT), { name: 'Cliente', role: 'cliente', email: 'cliente@correo.com' });
    await setDoc(doc(f, 'products', 'p1'), { name: 'Cono', isActive: true, category: 'helados' });
    await setDoc(doc(f, 'categories', 'helados'), { label: 'Helados', order: 1 });
    await setDoc(doc(f, 'tables', 'mesa1'), { type: 'table', label: 'Mesa 1', active: true, qrKey: 'clave-mesa1', order: 1 });
    await setDoc(doc(f, 'tables', 'mesa5'), { type: 'table', label: 'Mesa 5', active: false, qrKey: 'clave-mesa5', order: 5 });
    await setDoc(doc(f, 'sales', 'venta-cliente'), { clienteId: CLIENT, total: 4500, soldBy: SELLER });
    await setDoc(doc(f, 'sales', 'venta-otro'), { clienteId: OTHER_CLIENT, total: 9000, soldBy: SELLER });
    await setDoc(doc(f, 'abonos', 'abono-cliente'), { clienteId: CLIENT, pedidoId: 'venta-cliente', monto: 2000 });
    await setDoc(doc(f, 'supplies', 'leche'), { name: 'Leche', category: 'Lácteos', cost: 3500 });
    await setDoc(doc(f, 'providers', 'prov1'), { name: 'Proveedor' });
    await setDoc(doc(f, 'expenseCategories', 'arriendo'), { name: 'Arriendo' });
    await setDoc(doc(f, 'tableRequests', 'pedido-otro'), tableRequest({ clienteId: OTHER_CLIENT }));
    await setDoc(doc(f, 'pedidos', 'domicilio-pendiente'), { clienteId: CLIENT, status: 'pendiente', total: 10000, items: [] });
    await setDoc(doc(f, 'pedidos', 'domicilio-aceptado'), { clienteId: CLIENT, status: 'aceptado', total: 10000, items: [] });
  });
});

describe('Catálogo (público)', () => {
  it('cualquiera ve productos y categorías, incluso sin cuenta', async () => {
    await assertSucceeds(getDocs(collection(db.sinCuenta(), 'products')));
    await assertSucceeds(getDocs(collection(db.sinCuenta(), 'categories')));
  });

  it('nadie de afuera puede modificar productos', async () => {
    await assertFails(setDoc(doc(db.anonimo(), 'products', 'p1'), { name: 'Hackeado' }));
    await assertFails(setDoc(doc(db.cliente(), 'products', 'p1'), { name: 'Hackeado' }));
  });
});

describe('Ventas', () => {
  it('sin cuenta o anónimo no pueden leer ventas', async () => {
    await assertFails(getDocs(collection(db.sinCuenta(), 'sales')));
    await assertFails(getDocs(collection(db.anonimo(), 'sales')));
  });

  it('el cliente ve solo sus compras', async () => {
    await assertSucceeds(getDocs(query(collection(db.cliente(), 'sales'), where('clienteId', '==', CLIENT))));
    await assertSucceeds(getDoc(doc(db.cliente(), 'sales', 'venta-cliente')));
    await assertFails(getDoc(doc(db.cliente(), 'sales', 'venta-otro')));
    await assertFails(getDocs(collection(db.cliente(), 'sales')));
  });

  it('el personal ve todas las ventas', async () => {
    await assertSucceeds(getDocs(collection(db.vendedor(), 'sales')));
    await assertSucceeds(getDocs(collection(db.propietaria(), 'sales')));
  });
});

describe('Abonos', () => {
  it('el cliente ve sus abonos solo si filtra por su cuenta', async () => {
    const c = db.cliente();
    await assertSucceeds(getDocs(query(collection(c, 'abonos'), where('pedidoId', '==', 'venta-cliente'), where('clienteId', '==', CLIENT))));
    await assertFails(getDocs(query(collection(c, 'abonos'), where('pedidoId', '==', 'venta-cliente'))));
  });

  it('anónimo no ve abonos y el personal sí', async () => {
    await assertFails(getDocs(collection(db.anonimo(), 'abonos')));
    await assertSucceeds(getDocs(query(collection(db.vendedor(), 'abonos'), where('pedidoId', '==', 'venta-cliente'))));
  });
});

describe('Datos internos (costos, proveedores, gastos)', () => {
  for (const col of ['supplies', 'providers', 'expenseCategories']) {
    it(`${col}: solo el personal`, async () => {
      await assertFails(getDocs(collection(db.anonimo(), col)));
      await assertFails(getDocs(collection(db.cliente(), col)));
      await assertSucceeds(getDocs(collection(db.vendedor(), col)));
    });
  }
});

describe('Mesas', () => {
  it('las claves de los QR solo las ve el personal', async () => {
    await assertFails(getDoc(doc(db.anonimo(), 'tables', 'mesa1')));
    await assertFails(getDoc(doc(db.cliente(), 'tables', 'mesa1')));
    await assertSucceeds(getDoc(doc(db.vendedor(), 'tables', 'mesa1')));
  });

  it('solo el personal modifica mesas y sus carritos', async () => {
    await assertFails(setDoc(doc(db.cliente(), 'tables', 'mesa1'), { currentCart: { items: [item] } }, { merge: true }));
    await assertSucceeds(setDoc(doc(db.vendedor(), 'tables', 'mesa1'), { currentCart: { items: [item] } }, { merge: true }));
  });
});

describe('Pedidos por QR de mesa', () => {
  it('un invitado con el QR vigente puede pedir y llamar al personal', async () => {
    await assertSucceeds(addDoc(collection(db.anonimo(), 'tableRequests'), tableRequest()));
    await assertSucceeds(addDoc(collection(db.anonimo(), 'tableRequests'), tableRequest({ kind: 'llamada', items: [], total: 0 })));
  });

  it('se rechaza un QR con clave falsa o de una mesa eliminada', async () => {
    await assertFails(addDoc(collection(db.anonimo(), 'tableRequests'), tableRequest({ key: 'clave-falsa' })));
    await assertFails(addDoc(collection(db.anonimo(), 'tableRequests'), tableRequest({ tableId: 'mesa5', key: 'clave-mesa5' })));
    await assertFails(addDoc(collection(db.anonimo(), 'tableRequests'), tableRequest({ tableId: 'mesa99' })));
  });

  it('no se puede pedir a nombre de otro ni crear pedidos ya aceptados o gigantes', async () => {
    await assertFails(addDoc(collection(db.anonimo(), 'tableRequests'), tableRequest({ clienteId: CLIENT })));
    await assertFails(addDoc(collection(db.anonimo(), 'tableRequests'), tableRequest({ status: 'aceptado' })));
    await assertFails(addDoc(collection(db.anonimo(), 'tableRequests'), tableRequest({ items: Array(31).fill(item) })));
    await assertFails(addDoc(collection(db.sinCuenta(), 'tableRequests'), tableRequest()));
  });

  it('el cliente no ve pedidos de otros ni puede aceptarlos; el personal sí', async () => {
    await assertFails(getDoc(doc(db.anonimo(), 'tableRequests', 'pedido-otro')));
    await assertFails(getDocs(collection(db.anonimo(), 'tableRequests')));
    await assertFails(updateDoc(doc(db.anonimo(), 'tableRequests', 'pedido-otro'), { status: 'aceptado' }));
    await assertSucceeds(getDocs(query(collection(db.vendedor(), 'tableRequests'), where('status', 'in', ['pendiente', 'aceptado']))));
    await assertSucceeds(updateDoc(doc(db.vendedor(), 'tableRequests', 'pedido-otro'), { status: 'aceptado' }));
  });

  it('el cliente ve sus propios pedidos de mesa', async () => {
    const a = db.anonimo();
    await addDoc(collection(a, 'tableRequests'), tableRequest());
    await assertSucceeds(getDocs(query(collection(a, 'tableRequests'), where('clienteId', '==', ANON))));
  });
});

describe('Ingresos personales del cliente', () => {
  const ingreso = (over: Record<string, unknown> = {}) => ({ userId: CLIENT, amount: 500000, category: 'Salario', description: 'Quincena', date: '2026-11-07', ...over });

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'ingresos', 'ing-cliente'), ingreso());
    });
  });

  it('el cliente registra, ve, edita y borra sus ingresos', async () => {
    const c = db.cliente();
    await assertSucceeds(addDoc(collection(c, 'ingresos'), ingreso()));
    await assertSucceeds(getDocs(query(collection(c, 'ingresos'), where('userId', '==', CLIENT))));
    await assertSucceeds(updateDoc(doc(c, 'ingresos', 'ing-cliente'), { amount: 600000 }));
  });

  it('nadie más ve los ingresos de un cliente, ni el personal', async () => {
    await assertFails(getDoc(doc(db.anonimo(), 'ingresos', 'ing-cliente')));
    await assertFails(getDoc(doc(db.vendedor(), 'ingresos', 'ing-cliente')));
    await assertFails(getDocs(collection(db.propietaria(), 'ingresos')));
  });

  it('no se puede registrar a nombre de otro ni montos inválidos', async () => {
    const c = db.cliente();
    await assertFails(addDoc(collection(c, 'ingresos'), ingreso({ userId: OTHER_CLIENT })));
    await assertFails(addDoc(collection(c, 'ingresos'), ingreso({ amount: 0 })));
    await assertFails(addDoc(collection(c, 'ingresos'), ingreso({ amount: '500000' })));
    await assertFails(addDoc(collection(c, 'ingresos'), ingreso({ date: '7/11/2026' })));
    await assertFails(updateDoc(doc(c, 'ingresos', 'ing-cliente'), { userId: OTHER_CLIENT }));
  });
});

describe('Usuarios y roles', () => {
  it('un cliente no puede darse permisos de administrador', async () => {
    await assertFails(updateDoc(doc(db.cliente(), 'users', CLIENT), { role: 'admin' }));
    await assertFails(updateDoc(doc(db.cliente(), 'users', CLIENT), { role: 'propietario' }));
  });

  it('la propietaria no puede crear administradores', async () => {
    await assertFails(updateDoc(doc(db.propietaria(), 'users', CLIENT), { role: 'admin' }));
  });

  it('nadie puede crearse a sí mismo como personal (ni con el QR anónimo)', async () => {
    for (const role of ['propietario', 'vendedor', 'admin']) {
      await assertFails(setDoc(doc(db.anonimo(), 'users', ANON), { name: 'Intruso', role }));
    }
    await assertFails(setDoc(doc(db.anonimo(), 'users', ANON), { name: 'Intruso', role: 'cliente', loyaltyPoints: 50 }));
    await assertSucceeds(setDoc(doc(db.anonimo(), 'users', ANON), { name: 'Nuevo cliente', role: 'cliente' }));
  });

  it('el cliente guarda su teléfono, dirección y notificaciones, pero no sus estrellas', async () => {
    const c = db.cliente();
    await assertSucceeds(updateDoc(doc(c, 'users', CLIENT), { phone: '3001234567', address: 'Calle 1' }));
    await assertSucceeds(setDoc(doc(c, 'users', CLIENT), { fcmTokens: ['token-1'] }, { merge: true }));
    await assertFails(updateDoc(doc(c, 'users', CLIENT), { loyaltyPoints: 99 }));
    await assertFails(updateDoc(doc(c, 'users', OTHER_CLIENT), { phone: '1' }));
  });

  it('el vendedor ve la lista de clientes y solo les suma estrellas', async () => {
    const v = db.vendedor();
    await assertSucceeds(getDocs(query(collection(v, 'users'), where('role', '==', 'cliente'))));
    await assertFails(getDocs(query(collection(db.cliente(), 'users'), where('role', '==', 'cliente'))));
    await assertSucceeds(updateDoc(doc(v, 'users', CLIENT), { loyaltyPoints: 1 }));
    await assertFails(updateDoc(doc(v, 'users', CLIENT), { name: 'Otro nombre' }));
    await assertFails(updateDoc(doc(v, 'users', OWNER), { loyaltyPoints: 1 }));
  });

  it('el personal crea clientes rápidos sin correo, pero no otros vendedores', async () => {
    const v = db.vendedor();
    await assertSucceeds(addDoc(collection(v, 'users'), { name: 'Doña Rosa', role: 'cliente', email: null, phone: null, loyaltyPoints: 0 }));
    await assertFails(addDoc(collection(v, 'users'), { name: 'Otro', role: 'vendedor' }));
  });
});

describe('Ventas del personal', () => {
  const venta = (paymentMethod: string) => ({ items: [{ productName: 'Cono' }], total: 4500, paymentMethod, status: 'completed', soldBy: SELLER });

  it('el pedido a domicilio entregado se registra como venta con el método convertido', async () => {
    await assertSucceeds(addDoc(collection(db.vendedor(), 'sales'), venta(toSalePaymentMethod('efectivo'))));
    await assertSucceeds(addDoc(collection(db.vendedor(), 'sales'), venta(toSalePaymentMethod('datafono'))));
    await assertFails(addDoc(collection(db.vendedor(), 'sales'), venta('efectivo')));
  });

  it('el vendedor registra abonos a un fiado pero no cambia el valor de la venta', async () => {
    await assertSucceeds(updateDoc(doc(db.vendedor(), 'sales', 'venta-cliente'), { totalAbonado: 2000 }));
    await assertFails(updateDoc(doc(db.vendedor(), 'sales', 'venta-cliente'), { total: 0 }));
    await assertFails(updateDoc(doc(db.cliente(), 'sales', 'venta-cliente'), { totalAbonado: 4500 }));
    await assertSucceeds(updateDoc(doc(db.propietaria(), 'sales', 'venta-cliente'), { total: 5000 }));
  });
});

describe('Privacidad de perfiles', () => {
  it('cada quien ve su perfil, el personal ve todos y nadie más ve los ajenos', async () => {
    await assertSucceeds(getDoc(doc(db.cliente(), 'users', CLIENT)));
    await assertFails(getDoc(doc(db.cliente(), 'users', OWNER)));
    await assertFails(getDoc(doc(db.anonimo(), 'users', CLIENT)));
    await assertSucceeds(getDoc(doc(db.vendedor(), 'users', CLIENT)));
  });
});

describe('Pedidos a domicilio', () => {
  it('el cliente escribe en el chat y cancela mientras está pendiente', async () => {
    const c = db.cliente();
    await assertSucceeds(updateDoc(doc(c, 'pedidos', 'domicilio-pendiente'), { messages: [{ text: 'Hola' }], updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(c, 'pedidos', 'domicilio-pendiente'), { status: 'cancelado', updatedAt: serverTimestamp() }));
  });

  it('el cliente no cambia el total, ni se marca entregado, ni cancela un pedido ya aceptado', async () => {
    const c = db.cliente();
    await assertFails(updateDoc(doc(c, 'pedidos', 'domicilio-pendiente'), { total: 1 }));
    await assertFails(updateDoc(doc(c, 'pedidos', 'domicilio-pendiente'), { status: 'entregado' }));
    await assertFails(updateDoc(doc(c, 'pedidos', 'domicilio-aceptado'), { status: 'cancelado' }));
  });

  it('el personal sí cambia el estado del pedido', async () => {
    await assertSucceeds(updateDoc(doc(db.vendedor(), 'pedidos', 'domicilio-pendiente'), { status: 'aceptado' }));
  });
});
