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

/** Opción del `seleccionar/` de periodos: sin nombre, el front lo arma con mes y año. */
export interface PeriodoOpcion {
  readonly id: number;
  readonly anio: number;
  /** 1..12 (13 = "Cierre"). */
  readonly mes: number;
}

/** Respuesta de las acciones de periodo (crear año, bloquear, desbloquear, cerrar). */
export interface PeriodoAccionResultado {
  readonly mensaje: string;
}
