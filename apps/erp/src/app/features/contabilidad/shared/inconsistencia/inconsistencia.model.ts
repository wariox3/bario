/**
 * Inconsistencia guardada de un periodo (`ConInconsistencia`). La escriben
 * `periodo/analizar` y `periodo/bloquear`; la leen, paginada, la utilidad
 * Inconsistencias (lo que responde `analizar/`) y el modal del master de
 * periodos (`inconsistencia/lista/`).
 */
export interface InconsistenciaGuardada {
  readonly id: number;
  readonly numero: number | null;
  readonly descripcion: string;
  /** Cuándo se registró: date-time. */
  readonly fecha: string;
  readonly inconsistencia_tipo: number;
  readonly inconsistencia_tipo_nombre: string;
  /** El backend la sabe corregir sola (`inconsistencia/resolver/`). */
  readonly inconsistencia_tipo_resolver_automatico: boolean;
  readonly periodo: number;
  readonly comprobante: number | null;
  readonly comprobante_nombre: string | null;
  readonly movimiento: number | null;
  readonly movimiento_cuenta_codigo: string | null;
  readonly documento: number | null;
  readonly documento_documento_tipo_nombre: string | null;
}
