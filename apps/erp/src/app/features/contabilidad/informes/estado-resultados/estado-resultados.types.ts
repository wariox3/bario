/**
 * Contrato de `/contabilidad/movimiento-informe-resultado/`: el estado de
 * resultados en sus dos presentaciones, que se eligen con `informe` en el body.
 *
 * - `base`: una fila por cuenta de resultado que movió. Trae los asientos de cierre.
 * - `formal`: secciones, subtotales y utilidades, comparado con el mismo rango
 *   del año anterior. Sin asientos de cierre.
 */
export type PresentacionResultado = 'base' | 'formal';

/** Cómo se pinta cada fila del estado formal. */
export type ResultadoFormalFilaTipo = 'SECCION' | 'CUENTA' | 'TOTAL' | 'UTILIDAD';

export interface ResultadoFormalFila {
  readonly tipo: ResultadoFormalFilaTipo;
  readonly codigo: string;
  readonly nombre: string;
  /** Las filas `SECCION` son solo el título: llegan sin importes. */
  readonly actual: string | null;
  readonly anterior: string | null;
  readonly variacion: string | null;
  /** Fracción (0.25 = 25 %). Nula cuando el año anterior está en cero. */
  readonly porcentaje: string | null;
}

/** Lo que va encima del estado: la empresa y los dos cortes que se comparan. */
export interface ResultadoFormalEncabezado {
  readonly empresa: string;
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  readonly fecha_desde_anterior: string;
  readonly fecha_hasta_anterior: string;
}

/** Respuesta de `lista/` con `informe=formal`. */
export interface ResultadoFormal {
  readonly encabezado: ResultadoFormalEncabezado;
  readonly filas: readonly ResultadoFormalFila[];
}
