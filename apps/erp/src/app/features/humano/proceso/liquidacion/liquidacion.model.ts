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
 * ⚠️ Contratos **supuestos** a partir del ERP legacy (nombres y tipos), sin
 * verificar contra el backend. Los campos del empleado llegan con el lookup
 * completo (`contrato__contacto__…`) porque así los aplana el serializador
 * `detalle`.
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

  readonly dias_cesantia: number | null;
  readonly dias_prima: number | null;
  readonly dias_vacacion: number | null;

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
  readonly dias: number | null;

  readonly contrato_id: number | null;
  readonly contrato__salario: string | number | null;
  readonly contrato__contacto__numero_identificacion: string | null;
  readonly contrato__contacto__nombre_corto: string | null;

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
  readonly concepto__nombre: string | null;
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
