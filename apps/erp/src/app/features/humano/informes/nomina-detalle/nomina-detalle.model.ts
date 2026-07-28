/**
 * Fila del informe **Nómina detallada**
 * (`POST /general/documento-detalle/lista/`, `serializador: 'nomina'`).
 *
 * Es un **concepto liquidado** —una línea de nómina— aplanado con los datos de
 * su documento padre: el empleado, el periodo y la fecha. Mientras la ficha de
 * nómina muestra los conceptos de *un* documento, este informe los recorre
 * todos, así que sirve para cruzar un concepto a través de varias nóminas.
 *
 * `operacion` dice cómo entra el concepto al total: `1` suma (devengado),
 * `-1` resta (deducción), `0` es neutro (informativo).
 *
 * **Supuestos pendientes de confirmar con backend**: los nombres siguen el
 * lookup de Django del ERP legacy (`documento__contacto__nombre_corto`), porque
 * su tabla pintaba las llaves crudas de la respuesta. Si el API nuevo los
 * devuelve aplanados (`documento_contacto_nombre_corto`), el fix es local: este
 * archivo y `nomina-detalle.constants.ts`.
 */
export interface NominaDetalleInforme {
  readonly id: number;
  /** Documento (nómina) al que pertenece la línea. */
  readonly documento: number | null;
  readonly documento__numero: number | string | null;
  /** Fecha de la nómina (`yyyy-MM-dd`). */
  readonly documento__fecha: string | null;
  /** Periodo liquidado. La nómina usa el rango, no `fecha`. */
  readonly documento__fecha_desde: string | null;
  readonly documento__fecha_hasta: string | null;
  readonly documento__contacto__numero_identificacion: string | null;
  readonly documento__contacto__nombre_corto: string | null;
  /** Texto que el proceso de liquidación escribe en la línea. */
  readonly detalle: string | null;
  readonly porcentaje: number | string | null;
  readonly dias: number | string | null;
  /** Valor de la hora aplicado. */
  readonly hora: number | string | null;
  /** Sentido del concepto: 1 suma, -1 resta, 0 neutro. */
  readonly operacion: number | null;
  /** Valor de la línea **con el signo de `operacion` aplicado**. */
  readonly pago_operado: number | string | null;
  /** Ingreso base de prestaciones (IBP). */
  readonly base_prestacion: number | string | null;
  /** Ingreso base de cotización (IBC). */
  readonly base_cotizacion: number | string | null;
}
