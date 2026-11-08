/**
 * Fechas "de calendario" (YYYY-MM-DD) en la hora local del celular (Colombia).
 *
 * No usar `new Date().toISOString().split('T')[0]`: toISOString está en hora UTC,
 * así que después de las 7 p. m. en Colombia da el día SIGUIENTE.
 * Y `new Date('2026-11-07')` se interpreta como medianoche UTC, que en Colombia
 * es el día ANTERIOR a las 7 p. m.
 */

/** Fecha local en formato YYYY-MM-DD (por defecto, hoy) */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convierte lo que venga en un campo de fecha (texto YYYY-MM-DD, Timestamp de Firestore,
 * Date o número) a Date. El texto YYYY-MM-DD se toma como ese día en hora local (al mediodía,
 * para que ningún ajuste de hora lo pase a otro día).
 */
export function parseLocalDate(value: any): Date {
  if (value == null || value === '') return new Date();
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}
