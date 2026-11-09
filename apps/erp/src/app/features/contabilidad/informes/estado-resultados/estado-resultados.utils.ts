import { toFiniteNumber } from '@reddoc/core';
import type { InformeEstadoRow, InformeTotales } from '../../shared/movimiento-informe.types';

/**
 * Total de la presentación base. El endpoint no tiene `totales/`, pero `lista/`
 * no pagina: las filas recibidas son el informe completo y se pueden sumar.
 * Se fija a los 6 decimales del backend para no arrastrar ruido de coma flotante.
 */
export function totalesDeBase(rows: readonly InformeEstadoRow[]): InformeTotales {
  const saldo = rows.reduce((total, row) => total + (toFiniteNumber(row.saldo) ?? 0), 0);
  return { saldo: saldo.toFixed(6) };
}

/** Pinta la fracción del backend como porcentaje; vacío si no viene. */
export function formatPorcentaje(value: string | null, locale = 'es-CO'): string {
  const n = toFiniteNumber(value);
  if (n === null) return '';
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(n);
}
