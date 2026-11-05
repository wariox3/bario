import { formatFechaCorta } from '@reddoc/core';

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** `05/11/2026 08:12`; vacío si no hay fecha (un turno abierto no tiene cierre). */
export function formatFechaHora(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  return `${formatFechaCorta(fecha)} ${hora}`;
}

/** `$ 200.000`. Los decimales del backend llegan como string. */
export function formatPesos(valor: string | number): string {
  return PESOS.format(Number(valor));
}

/** Tiempo corrido del turno: `45 min`, `3 h 24 min`, `1 d 2 h`. */
export function duracion(desdeIso: string, ahora: number): string {
  const minutos = Math.max(0, Math.floor((ahora - new Date(desdeIso).getTime()) / 60_000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h ${minutos % 60} min`;
  return `${Math.floor(horas / 24)} d ${horas % 24} h`;
}

/** Diferencia con signo: `+$ 3.500`, `−$ 2.000`, `$ 0`. */
export function formatDiferencia(valor: string | number): string {
  const n = Number(valor);
  if (n === 0) return formatPesos(0);
  return `${n > 0 ? '+' : '−'}${formatPesos(Math.abs(n))}`;
}

export type Cuadre = 'cuadra' | 'falta' | 'sobra';

/** Cómo quedó un arqueo según su diferencia (contado − esperado). */
export function cuadreDe(diferencia: number): Cuadre {
  if (diferencia === 0) return 'cuadra';
  return diferencia < 0 ? 'falta' : 'sobra';
}
