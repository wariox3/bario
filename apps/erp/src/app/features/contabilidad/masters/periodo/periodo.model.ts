/**
 * Periodo contable. Master del módulo Contabilidad (camino B) con UI **especial**:
 * no se lista en `lib-data-table` como el resto, sino en una vista de dos paneles
 * (años a la izquierda, los 12 meses del año activo a la derecha) — ver
 * `pages/periodo-anio`.
 *
 * Un periodo representa un mes de un año (`mes` 1..12; el backend reserva 13 para
 * el "Cierre" anual). Su ciclo de vida es abierto → bloqueado → cerrado, más un
 * flag transversal de `estado_inconsistencia`.
 *
 * El GET responde paginado (`{ count, results }`); `PeriodoService.listAll()`
 * desempaqueta `results`.
 */
export interface Periodo {
  readonly id: number;
  readonly anio: number;
  /** 1..12 (13 = "Cierre"). Ver `deNumeroAMes` en la vista. */
  readonly mes: number;
  readonly estado_bloqueado: boolean;
  readonly estado_cerrado: boolean;
  readonly estado_inconsistencia: boolean;
}

/**
 * Fila del visor de inconsistencias de un periodo
 * (GET `/contabilidad/periodo/{id}/inconsistencias/`).
 *
 * Todo puede venir nulo menos el texto: cada fila describe un problema distinto y
 * no todos apuntan a un comprobante o a un documento.
 */
export interface PeriodoInconsistencia {
  readonly comprobante_id: number | null;
  readonly comprobante_nombre: string | null;
  readonly numero: number | null;
  readonly cuenta_id: number | null;
  readonly documento_id: number | null;
  readonly documento_tipo_id: number | null;
  readonly documento_tipo_nombre: string | null;
  readonly inconsistencia: string;
}

/** Opción del `seleccionar/` de periodos: sin nombre, el front lo arma con mes y año. */
export interface PeriodoOpcion {
  readonly id: number;
  readonly anio: number;
  /** 1..12 (13 = "Cierre"). */
  readonly mes: number;
}

/**
 * Inconsistencia guardada (`ConInconsistencia`): lo que responde, paginado,
 * `POST /contabilidad/periodo/{id}/analizar/`. Misma fila que
 * `inconsistencia/lista/`, distinta de la del visor del master.
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

/** Respuesta de las acciones de periodo (crear año, bloquear, desbloquear, cerrar). */
export interface PeriodoAccionResultado {
  readonly mensaje: string;
}
