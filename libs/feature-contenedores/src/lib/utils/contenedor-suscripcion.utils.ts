import { daysBetween, fromIsoDate, startOfToday } from '@reddoc/core';

function daysUntilExpiry(fecha: string): number {
  return daysBetween(startOfToday(), fromIsoDate(fecha));
}

export function isSuscripcionExpired(fecha: string | undefined): boolean {
  if (!fecha) return false;
  return daysUntilExpiry(fecha) < 0;
}

export function isSuscripcionExpiringSoon(fecha: string | undefined): boolean {
  if (!fecha) return false;
  const days = daysUntilExpiry(fecha);
  return days >= 0 && days <= 30;
}

export function getSuscripcionExpiryLabel(fecha: string | undefined): string {
  if (!fecha) return '';
  const days = daysUntilExpiry(fecha);
  if (days < 0) return 'Vencida';
  if (days === 0) return 'Vence hoy';
  if (days <= 7) return `Vence en ${days}d`;
  const date = fromIsoDate(fecha);
  return `Vence ${date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
