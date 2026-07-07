import type { Periodo } from './periodo.model';

/** Estado mutuamente excluyente de un periodo (la inconsistencia es un flag aparte). */
export type PeriodoEstado = 'abierto' | 'bloqueado' | 'cerrado';

/** Deriva el estado base de un periodo según sus flags (cerrado gana sobre bloqueado). */
export function periodoEstado(p: Periodo): PeriodoEstado {
  if (p.estado_cerrado) return 'cerrado';
  if (p.estado_bloqueado) return 'bloqueado';
  return 'abierto';
}

/** Años con periodos, de más reciente a más antiguo. */
export function aniosDisponibles(periodos: readonly Periodo[]): readonly number[] {
  return [...new Set(periodos.map((p) => p.anio))].sort((a, b) => b - a);
}

/** Periodos de un año, ordenados de diciembre a enero (como el legacy). */
export function mesesDeAnio(periodos: readonly Periodo[], anio: number): readonly Periodo[] {
  return periodos.filter((p) => p.anio === anio).sort((a, b) => b.mes - a.mes);
}
