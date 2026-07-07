/**
 * Tipos de la respuesta de `/general/documento/analitica-horas/`.
 *
 * Reflejan el payload que devuelve el backend para alimentar los KPIs y
 * gráficos del inicio de Turno (etapa 2).
 */

/** Par planeado/ejecutado de horas (usado por diurnas y nocturnas). */
export interface AnaliticaHorasPar {
  readonly planeadas: number;
  readonly ejecutadas: number;
}

/** Bloque `resumen` con los totales del rango consultado. */
export interface AnaliticaHorasResumen {
  readonly horas_planeadas: number;
  readonly horas_ejecutadas: number;
  /** Porcentaje de cumplimiento; `null` cuando no hay horas planeadas. */
  readonly cumplimiento: number | null;
  readonly desviacion: number;
  readonly diurnas: AnaliticaHorasPar;
  readonly nocturnas: AnaliticaHorasPar;
}

/** Punto de la `serie` temporal (uno por periodo según `agrupado_por`). */
export interface AnaliticaHorasPunto {
  /** Periodo del punto, p. ej. `'2026-06'` cuando `agrupado_por: 'mes'`. */
  readonly periodo: string;
  readonly planeadas: number;
  readonly ejecutadas: number;
  /** Porcentaje de cumplimiento del periodo; `null` si no hay planeadas. */
  readonly cumplimiento: number | null;
}

/** Respuesta completa del endpoint de analítica de horas. */
export interface AnaliticaHorasResponse {
  readonly resumen: AnaliticaHorasResumen;
  readonly serie: readonly AnaliticaHorasPunto[];
  /** Granularidad de la serie (`'mes'`, `'dia'`, …). */
  readonly agrupado_por: string;
}
