import {
  daysBetween,
  fromIsoDate,
  startOfToday,
  formatFechaCorta,
  formatRecencia,
  toHora,
} from '@reddoc/core';

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
  return `Vence ${formatFechaCorta(fecha)}`;
}

/** La última conexión, en las dos lecturas que pinta el listado. */
export interface UltimaConexion {
  /** Lo que se lee de un vistazo: `hace 3 horas`, `ayer, 08:24`, `7 oct, 08:24`. */
  readonly recencia: string;
  /** El instante exacto, para el `title`: `07/10/2026 08:24`. */
  readonly exacta: string;
}

/**
 * Última conexión de una empresa. Relativa a propósito: lo que sirve al elegir
 * empresa es «cuál usé hace poco y cuál está quieta», no la fecha. `null` sin
 * dato o con una fecha inválida — la línea no se pinta.
 */
export function getUltimaConexion(
  fecha: string | null | undefined,
  ahora: number = Date.now(),
): UltimaConexion | null {
  if (!fecha) return null;
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return null;
  return {
    recencia: formatRecencia(date, ahora),
    exacta: `${formatFechaCorta(date)} ${toHora(date)}`,
  };
}
