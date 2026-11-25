import { aDate, formatCop } from '@reddoc/core';
import { Movimiento, MovimientoTipo } from '../models/movimiento.model';

export interface MovimientoGroup {
  readonly key: string;
  readonly label: string;
  readonly items: readonly Movimiento[];
}

const MESES_LARGOS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function formatMonto(valor: string | number): string {
  return formatCop(valor);
}

/**
 * `fecha` llega como datetime con zona (`2026-11-19T08:46:51.007000-05:00`), no
 * como `yyyy-MM-dd`: `fromIsoDate` la parte por `-` y devuelve `null`. `aDate`
 * acepta las dos formas.
 */
export function formatDia(fecha: string): string {
  const d = aDate(fecha);
  return d ? String(d.getDate()) : '';
}

export function formatMesCorto(fecha: string): string {
  const d = aDate(fecha);
  return d ? MESES_CORTOS[d.getMonth()] : '';
}

export function formatMesLargo(fecha: string): string {
  const d = aDate(fecha);
  return d ? `${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}` : '';
}

export function tipoLabel(tipo: MovimientoTipo): string {
  switch (tipo) {
    case 'factura':
      return 'Factura';
    case 'nota_credito':
      return 'Nota crédito';
    case 'ajuste':
      return 'Ajuste';
    default:
      return tipo;
  }
}

export function tipoIcon(tipo: MovimientoTipo): string {
  switch (tipo) {
    case 'nota_credito':
      return 'pi pi-replay';
    case 'ajuste':
      return 'pi pi-pencil';
    case 'factura':
    default:
      return 'pi pi-receipt';
  }
}

export function groupByMonth(movimientos: readonly Movimiento[]): MovimientoGroup[] {
  const buckets = new Map<string, { items: Movimiento[]; firstFecha: string }>();

  for (const m of movimientos) {
    const d = aDate(m.fecha);
    const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '';
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.items.push(m);
    } else {
      buckets.set(key, { items: [m], firstFecha: m.fecha });
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, { items, firstFecha }]) => ({
      key,
      label: formatMesLargo(firstFecha),
      items: items.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id)),
    }));
}
