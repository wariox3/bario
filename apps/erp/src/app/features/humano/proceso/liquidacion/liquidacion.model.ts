/**
 * Contratos de datos de la **liquidación** de un contrato terminado.
 *
 * Es el cierre de la relación laboral: cesantías, intereses, prima y vacaciones
 * pendientes, más las adiciones y deducciones que se carguen a mano.
 *
 * **No se crea desde su propia pantalla.** La fabrica el backend al terminar un
 * contrato (`POST /humano/contrato/terminar/`), y por eso el listado no tiene
 * "Nuevo" ni edición de cabecera — igual que en el ERP anterior.
 *
 * Nombres y tipos verificados contra el schema del backend (`HumLiquidacion`):
 * las FK llegan sin `_id` con su `_nombre` al lado, y los importes y los días
 * como decimal en string.
 */

/**
 * Las cuatro prestaciones que se liquidan, con lo que cada una necesita para
 * explicarse: desde cuándo se cuenta, cuántos días y cuánto da.
 *
 * Se tipan aparte porque son también la forma del resumen: la pantalla las
 * recorre como datos (ver `liquidacion.constants.ts`) en vez de repetir cuatro
 * bloques de tabla como el legacy.
 *
 * El **interés de cesantías** no tiene días propios ni fecha de último pago: se
 * calcula sobre la cesantía, así que ahí esos dos campos van vacíos.
 */
export interface LiquidacionPrestaciones {
  readonly cesantia: string | number | null;
  readonly interes: string | number | null;
  readonly prima: string | number | null;
  readonly vacacion: string | number | null;

  readonly dias_cesantia: string | number | null;
  readonly dias_prima: string | number | null;
  readonly dias_vacacion: string | number | null;

  readonly fecha_ultimo_pago_cesantia: string | null;
  readonly fecha_ultimo_pago_prima: string | null;
  readonly fecha_ultimo_pago_vacacion: string | null;
}

/** Read-model de la liquidación (listado y workspace). */
export interface Liquidacion extends LiquidacionPrestaciones {
  readonly id: number;

  /** Fecha de la liquidación; el periodo liquidado va en `fecha_desde`/`fecha_hasta`. */
  readonly fecha: string | null;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  /** Último pago general del contrato, del que arranca el conteo de días. */
  readonly fecha_ultimo_pago: string | null;
  readonly dias: string | number | null;

  readonly contrato: number | null;
  /** Empleado del contrato, resuelto a través de él (`contrato → contacto`). */
  readonly contrato_contacto_nombre_corto: string | null;
  readonly contrato_contacto_numero_identificacion: string | null;
  /** Salario con el que se liquidó. */
  readonly salario: string | number | null;

  /** Suma de los adicionales cargados a mano. */
  readonly adicion: string | number | null;
  /** Suma de las deducciones cargadas a mano. */
  readonly deduccion: string | number | null;
  /** Neto a pagar. */
  readonly total: string | number | null;

  readonly comentario: string | null;

  readonly estado_generado: boolean;
  readonly estado_aprobado: boolean;
}

/**
 * Lo que se edita de la cabecera (`PATCH`): el comentario y desde cuándo se
 * cuenta cada prestación. Lo demás lo calcula el backend; después de editar hay
 * que reliquidar para que el cálculo use las fechas nuevas.
 */
export interface LiquidacionPatch {
  readonly fecha_ultimo_pago: string | null;
  readonly fecha_ultimo_pago_cesantia: string | null;
  readonly fecha_ultimo_pago_prima: string | null;
  readonly fecha_ultimo_pago_vacacion: string | null;
  readonly comentario: string | null;
}

/**
 * Un concepto cargado a mano sobre la liquidación.
 *
 * El registro guarda **los dos** campos, `adicional` y `deduccion`, con uno en
 * cero: cuál se llena lo decide la operación del concepto elegido (ver
 * `liquidacion.adicionales.ts`).
 */
export interface LiquidacionAdicional {
  readonly id: number;
  readonly liquidacion: number | null;
  readonly concepto: number | null;
  readonly concepto_nombre: string | null;
  readonly detalle: string | null;
  readonly adicional: string | number | null;
  readonly deduccion: string | number | null;
}

/** Payload de creación y edición de un adicional. */
export interface LiquidacionAdicionalPayload {
  readonly liquidacion: number;
  readonly concepto: number | null;
  readonly detalle: string | null;
  readonly adicional: number;
  readonly deduccion: number;
}
