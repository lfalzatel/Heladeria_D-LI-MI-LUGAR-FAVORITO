import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Suma 1 estrella al cliente cuando el personal marca su pedido a domicilio como entregado.
 * (Antes lo intentaba el propio cliente al pedir, pero las reglas no le dejan cambiar sus puntos.)
 * Si el pedido es de un invitado sin perfil, simplemente no hace nada.
 */
export async function awardDeliveredOrderPoint(clienteId?: string | null): Promise<void> {
  if (!clienteId || clienteId.startsWith('guest_')) return;
  try {
    await updateDoc(doc(db, 'users', clienteId), { loyaltyPoints: increment(1) });
  } catch (e) {
    console.warn('No se pudo sumar la estrella del pedido:', e);
  }
}
