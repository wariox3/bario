/**
 * Modelo del informe **Balance de prueba** (módulo Contabilidad).
 *
 * Este informe rompe con la convención de listados del ERP y por eso vale la
 * pena leerlo antes de portar los demás informes contables, que comparten forma:
 *
 * - Se pide con `POST` y un objeto **`parametros`**, no con
 *   `{ filtros, ordenamientos }`.
 * - La respuesta es `{ registros }` **sin paginar ni contar**: el balance se
 *   entrega completo porque el usuario necesita ver los totales cuadrados.
 * - No hay "listado inicial": la página arranca vacía y el usuario **genera** el
 *   reporte con los parámetros que eligió.
 *
 * **Supuestos pendientes de confirmar con backend**: el endpoint, la forma del
 * body (`{ parametros }`), los nombres de los parámetros y de los campos de la
 * fila, y que las descargas se pidan con `excel: true` / `pdf: true` en el mismo
 * body. Todo tomado del ERP legacy.
 */

/** Parámetros con los que se genera el balance. Viajan dentro de `{ parametros }`. */
export interface BalancePruebaParams {
  /** Inicio del periodo (`yyyy-MM-dd`). */
  readonly fecha_desde: string;
  /** Fin del periodo (`yyyy-MM-dd`). Debe caer en el mismo año que `fecha_desde`. */
  readonly fecha_hasta: string;
  /** Incluir los movimientos del comprobante de cierre del periodo. */
  readonly incluir_cierre: boolean;
  /** Ocultar las cuentas que no tuvieron movimiento en el rango. */
  readonly cuenta_con_movimiento: boolean;
  /** Extremos del rango de cuentas (opcional). El backend recibe id y código. */
  readonly cuenta_desde: number | null;
  readonly cuenta_hasta: number | null;
  readonly cuenta_codigo_desde: string;
  readonly cuenta_codigo_hasta: string;
}

/**
 * Fila del balance: una cuenta contable con su saldo inicial, el movimiento del
 * periodo y el saldo final.
 *
 * `nivel` indica la profundidad en el plan de cuentas (clase, grupo, cuenta,
 * subcuenta…). El informe original no lo usaba para pintar jerarquía; queda
 * disponible por si se quiere indentar más adelante.
 */
export interface BalancePruebaRow {
  readonly id: number;
  readonly codigo: string | null;
  readonly nombre: string | null;
  readonly nivel: number | null;
  /** Saldo al día anterior a `fecha_desde`. */
  readonly saldo_anterior: number | null;
  /** Movimiento débito del periodo. */
  readonly debito: number | null;
  /** Movimiento crédito del periodo. */
  readonly credito: number | null;
  /** Saldo al cierre de `fecha_hasta`. */
  readonly saldo_actual: number | null;
}

/** Respuesta del endpoint: el balance completo, sin envelope paginado. */
export interface BalancePruebaResponse {
  readonly registros: readonly BalancePruebaRow[];
}
