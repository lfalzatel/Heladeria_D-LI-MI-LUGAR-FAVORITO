export type PeriodFilter = 'today' | 'week' | 'month';
export const PERIOD_LABELS: Record<PeriodFilter, string> = { today: 'Hoy', week: 'Semana', month: 'Mes' };

export const toDateS = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
};

export const getWeekBoundaries = (date: Date) => {
  const d = new Date(date);
  // getDay() returns 0 for Sunday, we want 7
  const day = d.getDay() === 0 ? 7 : d.getDay();
  
  const start = new Date(d);
  start.setDate(d.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const isInPeriod = (
  timestamp: any, 
  period: PeriodFilter, 
  customDate?: Date | null,
  customMonth?: Date | null,
  customWeek?: Date | null
): boolean => {
  const d = toDateS(timestamp);
  if (!d) return false;

  const now = new Date();

  // Compatibilidad con Dashboard actual donde selectedDate se usa para 'today'
  if (period === 'today') {
    const ref = customDate || now;
    return d.toDateString() === ref.toDateString();
  }
  
  if (period === 'week') {
    const ref = customWeek || now;
    // Si no hay customWeek, por defecto 'week' en dashboard es los últimos 7 días.
    // Pero si el usuario quiere que funcione igual, 'week' sin customWeek debería ser la semana actual (lunes a domingo).
    // Para no romper la funcionalidad vieja que decía "últimos 7 días", si customWeek no se pasa, lo dejamos como últimos 7 días?
    // No, la nueva lógica es semana calendario, igual que el selector de mes.
    const { start, end } = getWeekBoundaries(ref);
    return d >= start && d <= end;
  }
  
  if (period === 'month') {
    const ref = customMonth || now;
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  }
  
  return true;
};
