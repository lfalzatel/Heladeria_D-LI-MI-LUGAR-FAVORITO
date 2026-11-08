/**
 * La colección `gastos` guarda dos cosas distintas:
 *  - Gastos del negocio, registrados desde Gestión → Operación → Gastos (traen `categoryId`).
 *  - Gastos personales de clientes, registrados en "Mis Gastos" (sin `categoryId`; los nuevos traen `origen: 'personal'`).
 * Los reportes de la heladería solo deben sumar los del negocio. No se decide por el rol de quien
 * lo registró: un empleado puede pasar después a cliente y sus gastos del negocio deben seguir contando.
 */
export function isBusinessExpense(gasto: { categoryId?: unknown; origen?: unknown } | null | undefined): boolean {
  return !!gasto?.categoryId && gasto.origen !== 'personal';
}
